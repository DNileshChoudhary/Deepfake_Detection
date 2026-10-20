"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, Video, AlertCircle, RefreshCw } from "lucide-react";
import Header from "@/components/Header";
import VideoUploader from "@/components/VideoUploader";
import WebcamDetector from "@/components/WebcamDetector";
import VerdictBadge from "@/components/VerdictBadge";
import MetricsBreakdown from "@/components/MetricsBreakdown";
import GradCamViewer from "@/components/GradCamViewer";
import LipSyncChart from "@/components/LipSyncChart";
import ArchitectureModal from "@/components/ArchitectureModal";
import { checkBackendHealth, DetectionResult, SystemHealth } from "@/lib/api";

export default function DeepfakeDetectionDashboard() {
  const [activeTab, setActiveTab] = useState<"upload" | "webcam">("upload");
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // Poll backend health status
  useEffect(() => {
    const fetchHealth = async () => {
      const h = await checkBackendHealth();
      setHealth(h);
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleResult = (result: DetectionResult) => {
    setDetectionResult(result);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header health={health} onOpenSpecs={() => setIsSpecsOpen(true)} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Error notification banner if any */}
        {errorMessage && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-4 flex items-center justify-between text-rose-300 text-sm">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs underline hover:text-white transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Navigator */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex space-x-2 bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setActiveTab("upload");
                setErrorMessage(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "upload"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload Video</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("webcam");
                setErrorMessage(null);
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "webcam"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Video className="h-4 w-4" />
              <span>Live Webcam</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-xs text-zinc-500">
            <span>FastAPI REST Engine:</span>
            <span className="font-mono text-zinc-400">
              {health?.status === "online" ? "Connected (Port 8000)" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Master 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Media Input (Upload or Live Webcam) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 shadow-lg shadow-black/20">
              <div className="mb-4">
                <h3 className="text-base font-bold text-white">
                  {activeTab === "upload" ? "Video Clip Ingestion" : "Real-Time Camera Stream"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {activeTab === "upload"
                    ? "Select or drop an MP4/WebM video file with audio for end-to-end multimodal inspection."
                    : "Browser captures 2.5s rolling audio/video chunks and streams to the backend in real-time."}
                </p>
              </div>

              {activeTab === "upload" ? (
                <VideoUploader
                  onResult={handleResult}
                  onLoading={setIsLoading}
                  onError={setErrorMessage}
                  isLoading={isLoading}
                />
              ) : (
                <WebcamDetector
                  onResult={handleResult}
                  onError={setErrorMessage}
                />
              )}
            </div>
          </div>

          {/* Right Column: Multimodal Analysis Dashboard */}
          <div className="lg:col-span-7 space-y-6">
            {/* Master Verdict Badge */}
            <VerdictBadge result={detectionResult} loading={isLoading} />

            {/* 3-Branch Modality Breakdown */}
            <MetricsBreakdown result={detectionResult} />

            {/* Visual Explainability: Grad-CAM Heatmap Overlay */}
            {detectionResult && (
              <GradCamViewer
                gradcamBase64={detectionResult.visual.gradcam_base64}
                dominantModality={detectionResult.fusion.dominant_modality}
                isFake={detectionResult.fusion.verdict_badge === "FAKE"}
              />
            )}

            {/* Cross-Modal Lip-Sync Temporal Waveform Chart */}
            {detectionResult && (
              <LipSyncChart
                plotSeries={detectionResult.sync.plot_series}
                correlation={detectionResult.sync.correlation}
                isMismatch={detectionResult.sync.lip_sync_mismatch}
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/80 py-6 mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4">
          <p>
            Real-Time Deepfake Detection using Multimodal AI • College Project Prototype
          </p>
          <p className="text-[11px] text-zinc-600 mt-1">
            PyTorch • ViT Image Classifier • Wav2Vec2 Audio Transformer • Google MediaPipe • FastAPI • Next.js
          </p>
        </div>
      </footer>

      {/* Architecture & Review Q&A Modal */}
      <ArchitectureModal
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
      />
    </div>
  );
}
