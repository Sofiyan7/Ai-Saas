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

export async function GET(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";

        const images = await prisma.image.findMany({
            where: { 
                userId,
                publicId: search ? { contains: search, mode: "insensitive" } : undefined
            },
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(images);
    } catch (error) {
        console.error("Error fetching images", error);
        return NextResponse.json({ error: "Error fetching images" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
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
            return NextResponse.json({ error: "Missing image ID" }, { status: 400 });
        }

        // Find the image and verify ownership
        const image = await prisma.image.findUnique({
            where: { id }
        });

        if (!image) {
            return NextResponse.json({ error: "Image not found" }, { status: 404 });
        }

        if (image.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Delete from Cloudinary (defaults to resource_type: "image")
        await new Promise((resolve, reject) => {
            cloudinary.uploader.destroy(
                image.publicId,
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
        });

        // Delete from Database
        await prisma.image.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error("Delete image failed", error);
        return NextResponse.json({ error: "Delete image failed" }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
