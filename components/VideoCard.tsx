import React, { useState, useEffect, useCallback } from "react";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { Download, Clock, FileDown, FileUp, Trash2 } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { filesize } from "filesize";
import { Video } from "@prisma/client";
import axios from "axios";

dayjs.extend(relativeTime);

interface VideoCardProps {
  video: Video;
  onDownload: (url: string, title: string) => void;
  onDeleteComplete: (id: string) => void;
  onPlayClick: (url: string, title: string) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onDownload, onDeleteComplete, onPlayClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getThumbnailUrl = useCallback((publicId: string) => {
    return getCldImageUrl({
      src: publicId,
      width: 400,
      height: 225,
      crop: "fill",
      gravity: "auto",
      format: "jpg",
      quality: "auto",
      assetType: "video",
    });
  }, [])

  const getFullVideoUrl = useCallback((publicId: string) => {
    return getCldVideoUrl({
      src: publicId,
      width: 1920,
      height: 1080,
    });
  }, []);

  const getPreviewVideoUrl = useCallback((publicId: string) => {
    return getCldVideoUrl({
      src: publicId,
      width: 400,
      height: 225,
      rawTransformations: ["e_preview:duration_15:max_seg_9:min_seg_dur_1"],
    });
  }, []);

  const getVerticalVideoUrl = useCallback((publicId: string) => {
    return getCldVideoUrl({
      src: publicId,
      width: 1080,
      height: 1920,
      crop: "fill",
      gravity: "auto",
    });
  }, []);

  const formatSize = useCallback((size: number) => {
    return filesize(size);
  }, []);

  const formatDuration = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  const compressionPercentage = Math.round(
    (1 - Number(video.compressedSize) / Number(video.originalSize)) * 100
  );

  useEffect(() => {
    setPreviewError(false);
  }, [isHovered]);

  const handlePreviewError = () => {
    setPreviewError(true);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this video?");
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      const response = await axios.delete(`/api/videos?id=${video.id}`);
      if (response.status === 200) {
        onDeleteComplete(video.id);
      }
    } catch (error) {
      console.error("Error deleting video", error);
      alert("Failed to delete video");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="card bg-base-100 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group border border-zinc-800"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onPlayClick(getFullVideoUrl(video.publicId), video.title)}
    >
      <figure className="aspect-video relative">
        {isHovered ? (
          previewError ? (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
              <p className="text-red-500 text-sm">Preview not available</p>
            </div>
          ) : (
            <video
              src={getPreviewVideoUrl(video.publicId)}
              autoPlay
              muted
              loop
              className="w-full h-full object-cover"
              onError={handlePreviewError}
            />
          )
        ) : (
          <img
            src={getThumbnailUrl(video.publicId)}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 px-2 py-1 rounded-lg text-sm flex items-center text-white">
          <Clock size={16} className="mr-1 text-primary" />
          {formatDuration(video.duration)}
        </div>
      </figure>
      <div className="card-body p-4">
        <h2 className="card-title text-lg font-bold text-white group-hover:text-primary transition-colors">
          {video.title}
        </h2>
        <p className="text-sm text-zinc-400 line-clamp-2 min-h-[40px]">
          {video.description}
        </p>
        <p className="text-xs text-zinc-500 mb-2">
          Uploaded {dayjs(video.createdAt).fromNow()}
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs mt-2 border-t border-zinc-800 pt-3">
          <div className="flex items-center">
            <FileUp size={16} className="mr-2 text-primary" />
            <div>
              <div className="text-zinc-500">Original</div>
              <div className="font-semibold text-white">{formatSize(Number(video.originalSize))}</div>
            </div>
          </div>
          <div className="flex items-center">
            <FileDown size={16} className="mr-2 text-secondary" />
            <div>
              <div className="text-zinc-500">Compressed</div>
              <div className="font-semibold text-white">{formatSize(Number(video.compressedSize))}</div>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 border-t border-zinc-800 pt-3">
          <div className="text-xs font-semibold text-zinc-400">
            Saved:{" "}
            <span className="text-accent text-sm font-bold">{compressionPercentage}%</span>
          </div>
          <div className="flex space-x-2">
            <button
              className="btn btn-error btn-outline btn-sm"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                <Trash2 size={16} />
              )}
            </button>
            <div className="dropdown dropdown-end">
              <label
                tabIndex={0}
                className="btn btn-primary btn-sm text-white flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={16} />
                Download
              </label>
              <ul
                tabIndex={0}
                className="dropdown-content menu p-2 shadow-2xl bg-zinc-900 border border-zinc-800 rounded-xl w-52 mt-1 z-10 text-zinc-200"
                onClick={(e) => e.stopPropagation()}
              >
                <li>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(getFullVideoUrl(video.publicId), video.title);
                    }}
                    className="flex items-center gap-2 hover:bg-zinc-800 text-white rounded-lg px-3 py-2 text-xs"
                  >
                    Original Format
                  </button>
                </li>
                <li>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload(getVerticalVideoUrl(video.publicId), `${video.title}_vertical`);
                    }}
                    className="flex items-center gap-2 hover:bg-zinc-800 text-white rounded-lg px-3 py-2 text-xs"
                  >
                    TikTok/Shorts (9:16 AI Crop)
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;