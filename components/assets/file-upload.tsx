"use client";

import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon, Video, Loader2 } from "lucide-react";

interface Asset {
  id: string;
  fileName: string;
  cdnUrl: string;
  type: string;
  fileSize: number;
  width?: number;
  height?: number;
}

interface FileUploadProps {
  projectId: string;
  type?: "IMAGE" | "VIDEO" | "LOGO";
  accept?: string;
  maxSizeMB?: number;
  onUploadComplete?: (asset: Asset) => void;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function FileUpload({
  projectId,
  type = "IMAGE",
  accept = "image/*",
  maxSizeMB = 10,
  onUploadComplete,
  onUploadError,
  className,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const error = `File size exceeds ${maxSizeMB}MB limit`;
      onUploadError?.(error);
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);
      formData.append("type", type);

      // Simulate progress (real progress would need server streaming)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/assets/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      onUploadComplete?.(data.asset);
    } catch (error) {
      console.error("Upload error:", error);
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className || ""}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={uploading}
      />

      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center space-y-3 text-center">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <div className="w-full max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">{uploadProgress}%</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3 bg-gray-100 rounded-full">
                {type === "VIDEO" ? (
                  <Video className="h-6 w-6 text-gray-600" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Drop your file here, or{" "}
                  <button
                    type="button"
                    onClick={onButtonClick}
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Max size: {maxSizeMB}MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface AssetGalleryProps {
  assets: Asset[];
  onRemove?: (assetId: string) => void;
  onSelect?: (asset: Asset) => void;
  selectedAssetIds?: string[];
  className?: string;
}

export function AssetGallery({
  assets,
  onRemove,
  onSelect,
  selectedAssetIds = [],
  className,
}: AssetGalleryProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;

    setRemoving(assetId);
    try {
      const response = await fetch(`/api/assets?id=${assetId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }

      onRemove?.(assetId);
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete asset");
    } finally {
      setRemoving(null);
    }
  };

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 ${className || ""}`}>
      {assets.map((asset) => {
        const isSelected = selectedAssetIds.includes(asset.id);
        const isRemoving = removing === asset.id;

        return (
          <div
            key={asset.id}
            className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
              isSelected
                ? "border-blue-500 ring-2 ring-blue-200"
                : "border-gray-200 hover:border-gray-300"
            } ${isRemoving ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => onSelect?.(asset)}
          >
            {/* Preview */}
            <div className="aspect-video bg-gray-100 flex items-center justify-center">
              {asset.type === "VIDEO" ? (
                <Video className="h-8 w-8 text-gray-400" />
              ) : (
                <img
                  src={asset.cdnUrl}
                  alt={asset.fileName}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* Info */}
            <div className="p-2 bg-white">
              <p className="text-xs font-medium text-gray-900 truncate">
                {asset.fileName}
              </p>
              <p className="text-xs text-gray-500">
                {(asset.fileSize / 1024).toFixed(0)} KB
              </p>
            </div>

            {/* Remove button */}
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(asset.id);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                disabled={isRemoving}
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-2 left-2 p-1 bg-blue-500 text-white rounded-full">
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
