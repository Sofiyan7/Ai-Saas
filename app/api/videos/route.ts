import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient();

export async function GET(request: NextRequest){
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";

        const videos = await prisma.video.findMany({
            where: { 
                userId,
                OR: search ? [
                    { title: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } }
                ] : undefined
            },
            orderBy: {createdAt: "desc"}
        })
        return NextResponse.json(videos);
    } catch (error) {
        return NextResponse.json({ error: "Error fetching videos" }, { status: 500 });
    } finally {
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "Missing video ID" }, { status: 400 });
        }

        // Find the video and verify ownership
        const video = await prisma.video.findUnique({
            where: { id }
        });

        if (!video) {
            return NextResponse.json({ error: "Video not found" }, { status: 404 });
        }

        if (video.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete from Cloudinary (requires resource_type: "video")
        await new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(
                video.publicId,
                { resource_type: "video" },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
        });

        // Delete from Database
        await prisma.video.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Video deleted successfully" });
    } catch (error) {
        console.error("Delete video failed", error);
        return NextResponse.json({ error: "Delete video failed" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}