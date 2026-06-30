"use client"
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { CldImage, getCldImageUrl } from 'next-cloudinary';
import { Trash2, Image as ImageIcon, Sparkles, ChevronDown } from 'lucide-react';

const socialFormats = {
  "Instagram Square (1:1)": { width: 1080, height: 1080, aspectRatio: "1:1" },
  "Instagram Portrait (4:5)": { width: 1080, height: 1350, aspectRatio: "4:5" },
  "Twitter Post (16:9)": { width: 1200, height: 675, aspectRatio: "16:9" },
  "Twitter Header (3:1)": { width: 1500, height: 500, aspectRatio: "3:1" },
  "Facebook Cover (205:78)": { width: 820, height: 312, aspectRatio: "205:78" },
};

type SocialFormat = keyof typeof socialFormats;

interface ImageRecord {
  id: string;
  publicId: string;
  createdAt: string;
}

export default function SocialShare() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<SocialFormat>("Instagram Square (1:1)");
  const [isUploading, setIsUploading] = useState(false);
  const [isTransforming, setIsTransforming] = useState(false);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const imageRef = useRef<HTMLImageElement>(null);

  // AI states
  const [aiRemoveBg, setAiRemoveBg] = useState(false);
  const [aiReplaceBgPrompt, setAiReplaceBgPrompt] = useState("");
  const [aiReplaceFrom, setAiReplaceFrom] = useState("");
  const [aiReplaceTo, setAiReplaceTo] = useState("");

  const fetchImages = useCallback(async (search = "") => {
    try {
      const response = await fetch(`/api/images?search=${encodeURIComponent(search)}`);
      if (response.ok) {
        const data = await response.json();
        setImages(data);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
    } finally {
      setLoadingImages(false);
    }
  }, []);

  useEffect(() => {
    fetchImages(searchQuery);
  }, [fetchImages, searchQuery]);

  useEffect(() => {
    if(uploadedImage){
      setIsTransforming(true);
    }
  }, [selectedFormat, uploadedImage, aiRemoveBg, aiReplaceBgPrompt, aiReplaceFrom, aiReplaceTo])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if(!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/image-upload", {
        method: "POST",
        body: formData 
      })

      if(!response.ok) throw new Error("Failed to upload image");

      const data = await response.json();
      setUploadedImage(data.publicId);
      setImages((prev) => [data, ...prev]);

    } catch (error) {
      console.log(error)
      alert("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmDelete = window.confirm("Are you sure you want to delete this image?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/images?id=${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setImages((prev) => prev.filter((img) => img.id !== id));
        const targetImage = images.find((img) => img.id === id);
        if (targetImage && uploadedImage === targetImage.publicId) {
          setUploadedImage(null);
        }
      } else {
        alert("Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Error deleting image");
    }
  };

  const handleDownload = () => {
    if (!imageRef.current) return;

    fetch(imageRef.current.src)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${selectedFormat
          .replace(/\s+/g, "_")
          .toLowerCase()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-8">
      <h1 className="text-3xl font-bold text-center text-white">
        Social Media Image Creator
      </h1>

      <div className="card bg-base-200 border border-zinc-800 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4 text-white">Upload an Image</h2>
          <div className="form-control">
            <label className="label">
              <span className="label-text text-zinc-400">Choose an image file</span>
            </label>
            <input
              type="file"
              onChange={handleFileUpload}
              className="file-input file-input-bordered file-input-primary w-full"
            />
          </div>

          {isUploading && (
            <div className="mt-4">
              <progress className="progress progress-primary w-full"></progress>
            </div>
          )}

          {uploadedImage && (
            <div className="mt-6">
              <h2 className="card-title mb-4 text-white">Select Social Media Format</h2>
              <div className="form-control">
                <select
                  className="select select-bordered w-full bg-zinc-900 border-zinc-700 text-white"
                  value={selectedFormat}
                  onChange={(e) =>
                    setSelectedFormat(e.target.value as SocialFormat)
                  }
                >
                  {Object.keys(socialFormats).map((format) => (
                    <option key={format} value={format}>
                      {format}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Workspace Tools */}
              <div className="collapse collapse-arrow bg-zinc-900 border border-zinc-800 rounded-xl mt-6">
                <input type="checkbox" /> 
                <div className="collapse-title text-md font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  AI Workspace Tools
                </div>
                <div className="collapse-content space-y-4 pt-2">
                  {/* AI Background Removal */}
                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-4">
                      <input 
                        type="checkbox" 
                        checked={aiRemoveBg} 
                        onChange={(e) => setAiRemoveBg(e.target.checked)}
                        className="checkbox checkbox-primary" 
                      />
                      <span className="label-text text-zinc-300 font-medium">Remove Background (AI)</span>
                    </label>
                  </div>

                  {/* AI Generative Background Replace */}
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text text-zinc-400">Generative Background Replace (AI)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. on a sandy beach at sunset, hyperrealistic"
                      value={aiReplaceBgPrompt}
                      onChange={(e) => setAiReplaceBgPrompt(e.target.value)}
                      className="input input-bordered bg-zinc-950 border-zinc-800 text-white w-full text-sm"
                      disabled={aiRemoveBg} // Overridden by full background removal
                    />
                  </div>

                  {/* AI Generative Object Replace */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-zinc-400">Replace Object (AI)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. coffee cup"
                        value={aiReplaceFrom}
                        onChange={(e) => setAiReplaceFrom(e.target.value)}
                        className="input input-bordered bg-zinc-950 border-zinc-800 text-white w-full text-sm"
                      />
                    </div>
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text text-zinc-400">With (AI)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. glass of orange juice"
                        value={aiReplaceTo}
                        onChange={(e) => setAiReplaceTo(e.target.value)}
                        className="input input-bordered bg-zinc-950 border-zinc-800 text-white w-full text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 relative">
                <h3 className="text-lg font-semibold mb-2 text-zinc-300">Preview:</h3>
                <div className="flex justify-center bg-black/40 rounded-xl p-4 border border-zinc-800">
                  {isTransforming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-base-100 bg-opacity-50 z-10">
                      <span className="loading loading-spinner loading-lg"></span>
                    </div>
                  )}
                  <CldImage
                    width={socialFormats[selectedFormat].width}
                    height={socialFormats[selectedFormat].height}
                    src={uploadedImage}
                    sizes="100vw"
                    alt="transformed image"
                    crop="fill"
                    aspectRatio={socialFormats[selectedFormat].aspectRatio}
                    gravity='auto'
                    ref={imageRef}
                    onLoad={() => setIsTransforming(false)}
                    removeBackground={aiRemoveBg}
                    replaceBackground={aiReplaceBgPrompt || undefined}
                    replace={aiReplaceFrom && aiReplaceTo ? [aiReplaceFrom, aiReplaceTo] : undefined}
                  />
                </div>
              </div>

              <div className="card-actions justify-end mt-6">
                <button className="btn btn-primary text-white" onClick={handleDownload}>
                  Download for {selectedFormat}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery History */}
      <div className="card bg-base-200 border border-zinc-800 shadow-xl">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <h2 className="card-title text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Your Uploaded Images
            </h2>
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-xs text-sm"
            />
          </div>
          
          {loadingImages ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner text-primary"></span>
            </div>
          ) : images.length === 0 ? (
            <p className="text-center text-zinc-500 py-8 border border-dashed border-zinc-800 rounded-xl">
              No images uploaded yet. Upload one above to get started!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  onClick={() => setUploadedImage(img.publicId)}
                  className={`relative group aspect-square rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
                    uploadedImage === img.publicId
                      ? "border-primary ring-2 ring-primary"
                      : "border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  <img
                    src={getCldImageUrl({
                      src: img.publicId,
                      width: 200,
                      height: 200,
                      crop: "fill",
                      gravity: "auto",
                    })}
                    alt="gallery thumbnail"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteImage(e, img.id)}
                    className="btn btn-error btn-xs btn-circle absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg text-white"
                    title="Delete image"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

