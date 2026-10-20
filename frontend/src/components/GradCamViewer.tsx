"use client";

import React, { useState } from "react";
import { Sparkles, Eye, Layers, ZoomIn } from "lucide-react";

interface GradCamViewerProps {
  gradcamBase64: string | null;
  dominantModality?: string;
  isFake?: boolean;
}

export default function GradCamViewer({
  gradcamBase64,
  dominantModality,
  isFake,
}: GradCamViewerProps) {
  if (!gradcamBase64) return null;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Visual Explainability: ViT Grad-CAM Attention Map
            </h4>
            <p className="text-xs text-zinc-400">
              Thermal saliency showing which facial regions triggered the classification decision
            </p>
          </div>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono">
          14x14 Patch Rollout
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Heatmap Image Container */}
        <div className="relative rounded-xl overflow-hidden border-2 border-indigo-500/30 bg-black flex-shrink-0 shadow-lg shadow-black/50 group">
          <img
            src={gradcamBase64}
            alt="Grad-CAM Facial Heatmap"
            className="w-48 h-48 sm:w-56 sm:h-56 object-cover"
          />
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-white/10">
            Layer: vit.layernorm
          </div>
        </div>

        {/* Heatmap Legend and Interpretation */}
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
              Thermal Gradient Interpretation
            </h5>
            <div className="h-3 w-full rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-yellow-400 to-red-600 shadow-inner" />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
              <span>Low Activation (Neutral)</span>
              <span>High Anomaly Focus (Discriminative)</span>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-950/60 p-3 border border-zinc-800/80 text-xs text-zinc-300 space-y-1">
            <p className="font-medium text-white flex items-center space-x-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>What is this heatmap showing?</span>
            </p>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              {isFake
                ? "Red and yellow hotspots identify localized facial boundaries, blending seam discontinuities, or warped eye/mouth textures that strongly influenced the 'Manipulated' prediction."
                : "Balanced, dispersed attention signifies natural facial skin grain, coherent illumination, and organic feature geometry consistent with genuine recordings."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
