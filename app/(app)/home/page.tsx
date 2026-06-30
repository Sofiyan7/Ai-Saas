"use client";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import VideoCard from "@/components/VideoCard";
import { Video } from "@prisma/client";

function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>("");

  const fetchVideos = useCallback(async (search = "") => {
    try {
      const response = await axios.get(`/api/videos?search=${encodeURIComponent(search)}`);
      if (Array.isArray(response.data)) {
        setVideos(response.data);
      } else {
        throw new Error(" Unexpected response format");
      }
    } catch (error) {
      console.log(error);
      setError("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos(searchQuery);
  }, [fetchVideos, searchQuery]);

  const handleDownload = useCallback((url: string, title: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${title}.mp4`);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleDeleteComplete = useCallback((deletedId: string) => {
    setVideos((prevVideos) => prevVideos.filter((video) => video.id !== deletedId));
  }, []);

  const handlePlayClick = useCallback((url: string, title: string) => {
    setActiveVideoUrl(url);
    setActiveVideoTitle(title);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-white">Your Videos</h1>
        <input
          type="text"
          placeholder="Search videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input input-bordered bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-xs text-sm"
        />
      </div>

      {videos.length === 0 ? (
        <div className="text-center text-lg text-zinc-500 py-12 border-2 border-dashed border-zinc-800 rounded-2xl">
          {searchQuery ? "No matching videos found." : "No videos available. Click 'Video Upload' to add one!"}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              onDownload={handleDownload}
              onDeleteComplete={handleDeleteComplete}
              onPlayClick={handlePlayClick}
            />
          ))}
        </div>
      )}

      {/* Video Playback Modal */}
      {activeVideoUrl && (
        <div 
          className="modal modal-open bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
          onClick={() => setActiveVideoUrl(null)}
        >
          <div 
            className="modal-box max-w-4xl bg-zinc-900 border border-zinc-850 p-6 rounded-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="btn btn-sm btn-circle btn-ghost absolute right-4 top-4 text-zinc-400 hover:text-white"
              onClick={() => setActiveVideoUrl(null)}
            >
              ✕
            </button>
            <h3 className="text-xl font-bold text-white mb-4 pr-12 truncate">{activeVideoTitle}</h3>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-zinc-800">
              <video 
                src={activeVideoUrl} 
                controls 
                autoPlay 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
