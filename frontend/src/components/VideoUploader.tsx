"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, Film, Play, AlertCircle, RefreshCw, FileCheck } from "lucide-react";
import { uploadVideoForDetection, DetectionResult } from "@/lib/api";

interface VideoUploaderProps {
  onResult: (result: DetectionResult) => void;
  onLoading: (isLoading: boolean) => void;
  onError: (err: string | null) => void;
  isLoading: boolean;
}

export default function VideoUploader({
  onResult,
  onLoading,
  onError,
  isLoading,
}: VideoUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/")) {
      onError("Please select a valid video file (MP4, WebM, MOV, AVI).");
      return;
    }
    setFile(selectedFile);
    onError(null);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    const url = URL.createObjectURL(selectedFile);
    setVideoPreviewUrl(url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const loadSampleVideo = async (samplePath: string, name: string) => {
    try {
      onLoading(true);
      onError(null);
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const sampleFile = new File([blob], name, { type: "video/mp4" });
      handleFileChange(sampleFile);
    } catch (e: any) {
      onError("Failed to load sample clip: " + e.message);
    } finally {
      onLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    onLoading(true);
    onError(null);

    try {
      const res = await uploadVideoForDetection(file);
      onResult(res);
    } catch (err: any) {
      onError(err.message || "Failed to analyze video. Check backend server.");
    } finally {
      onLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Dropzone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? "border-cyan-400 bg-cyan-950/20 ring-4 ring-cyan-500/10"
            : file
            ? "border-zinc-700 bg-zinc-900/40 hover:border-zinc-600"
            : "border-zinc-800 bg-zinc-900/20 hover:border-zinc-700 hover:bg-zinc-900/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileChange(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="p-3 rounded-2xl bg-zinc-800/80 text-cyan-400 border border-zinc-700/80 shadow-md">
            {file ? <FileCheck className="h-7 w-7 text-emerald-400" /> : <UploadCloud className="h-7 w-7" />}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              {file ? file.name : "Drag & drop video clip or click to browse"}
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Supports MP4, WebM, MOV (recommended duration: 3 to 15 seconds)
            </p>
          </div>

          {file && (
            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800/60 px-3 py-1 rounded-full border border-zinc-700">
              Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
            </span>
          )}
        </div>
      </div>

      {/* Quick Demo Pre-Packaged Sample Buttons */}
      {!file && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-xs">
          <span className="text-zinc-400 font-medium">Quick Demo Samples:</span>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSampleVideo("/samples/sample_authentic.mp4", "sample_authentic.mp4");
              }}
              className="px-2.5 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition-colors font-medium text-[11px]"
            >
              Load Authentic Clip
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                loadSampleVideo("/samples/sample_manipulated.mp4", "sample_manipulated.mp4");
              }}
              className="px-2.5 py-1 rounded-md bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-700/50 transition-colors font-medium text-[11px]"
            >
              Load Manipulated Clip
            </button>
          </div>
        </div>
      )}

      {/* Video Player Preview and Analyze Button */}
      {videoPreviewUrl && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-72 flex items-center justify-center">
            <video
              src={videoPreviewUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => {
                setFile(null);
                setVideoPreviewUrl(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white transition-colors"
            >
              Clear Video
            </button>

            <button
              onClick={handleAnalyze}
              disabled={isLoading}
              className={`flex-1 flex items-center justify-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg transition-all ${
                isLoading
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-indigo-500/25"
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-400" />
                  <span>Processing Multimodal AI Pipeline...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Run Multimodal Deepfake Detection</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
