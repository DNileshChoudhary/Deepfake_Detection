"use client";

import React from "react";
import { X, Layers, Cpu, Eye, Mic, Disc3, ShieldCheck, BookOpen, GitBranch } from "lucide-react";

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArchitectureModal({ isOpen, onClose }: ArchitectureModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Multimodal AI Architecture & Review Q&A
              </h3>
              <p className="text-xs text-zinc-400">
                System specification for college project evaluation & technical defense
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pipeline Architecture Diagram / Flowchart */}
        <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
            <GitBranch className="h-4 w-4 text-cyan-400" />
            <span>End-to-End Multimodal Pipeline Flow</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {/* Box 1: Visual */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-indigo-500/30 space-y-1.5">
              <div className="font-semibold text-indigo-400 flex items-center space-x-1.5">
                <Eye className="h-3.5 w-3.5" />
                <span>1. Visual Branch (ViT)</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                OpenCV extracts and normalizes the face bbox. A pretrained Vision Transformer (ViT-Base-Patch16-224) computes spatial self-attention over 196 image patches to detect generative blending boundaries and artifacts.
              </p>
              <div className="pt-1 text-[10px] text-zinc-500 font-mono">
                Model: dima806/deepfake_vs_real
              </div>
            </div>

            {/* Box 2: Audio */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-cyan-500/30 space-y-1.5">
              <div className="font-semibold text-cyan-400 flex items-center space-x-1.5">
                <Mic className="h-3.5 w-3.5" />
                <span>2. Audio Branch (Wav2Vec2)</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Audio is downmixed to 16kHz mono. Pretrained Wav2Vec2 audio transformer analyzes phoneme frequency latents, complemented by librosa extraction of 13 MFCCs, pitch (F0), and spectral flatness to detect neural TTS/vocoders.
              </p>
              <div className="pt-1 text-[10px] text-zinc-500 font-mono">
                Model: MelodyMachine/Deepfake-audio
              </div>
            </div>

            {/* Box 3: Lip-Sync */}
            <div className="p-3 rounded-lg bg-zinc-950 border border-purple-500/30 space-y-1.5">
              <div className="font-semibold text-purple-400 flex items-center space-x-1.5">
                <Disc3 className="h-3.5 w-3.5" />
                <span>3. Cross-Modal Lip-Sync</span>
              </div>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Google MediaPipe FaceLandmarker tracks 478 3D landmarks and computes the <code className="text-purple-300">jawOpen</code> blendshape across frames, measuring Pearson correlation against speech acoustic RMS energy.
              </p>
              <div className="pt-1 text-[10px] text-zinc-500 font-mono">
                Framework: MediaPipe Blendshapes
              </div>
            </div>
          </div>

          {/* Fusion Equation */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
            <span className="font-semibold text-zinc-300 block mb-1">
              Multimodal Fusion Formulation:
            </span>
            <code className="text-emerald-400 font-mono text-[11px]">
              S_authenticity = (0.45 × S_visual) + (0.35 × S_audio) + (0.20 × S_sync)
            </code>
            <p className="text-[11px] text-zinc-500 mt-1">
              Dynamic weight recalibration automatically engages if one modality is absent (e.g. silent clip) or if extreme phoneme-viseme desynchronization is detected.
            </p>
          </div>
        </div>

        {/* College Review Q&A Cheatsheet */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center space-x-2">
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span>Key Project Review Q&A (Defense Points)</span>
          </h4>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
              <div className="font-semibold text-zinc-200">
                Q1: Why use Multimodal AI instead of just visual CNNs?
              </div>
              <p className="text-zinc-400 mt-1 text-[11px] leading-relaxed">
                State-of-the-art visual deepfakes (e.g. Diffusion faces) are increasingly imperceptible in individual frames. However, multimodal spoofing reveals cross-domain incongruities: synthetic vocoder noise in audio, acoustic phase anomalies, and temporal lag between mouth movements and phoneme audio bursts.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
              <div className="font-semibold text-zinc-200">
                Q2: How is Grad-CAM explainability computed for the Vision Transformer?
              </div>
              <p className="text-zinc-400 mt-1 text-[11px] leading-relaxed">
                Hooks intercept activations and gradients at the final layernorm before the classifier head. The positive gradients are pooled across the 196 patch tokens (representing a 14×14 grid), reshaped to 2D, interpolated to the face dimensions, and colorized with a Jet thermal overlay to reveal exactly which facial boundaries triggered the detection.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800">
              <div className="font-semibold text-zinc-200">
                Q3: How does the system achieve near-real-time latency under 2 seconds?
              </div>
              <p className="text-zinc-400 mt-1 text-[11px] leading-relaxed">
                The frontend streams 2.5s rolling audio/video chunks via the browser's MediaRecorder API. The backend samples 6 strategic frames for visual inference and executes asynchronous feature extraction in parallel, delivering end-to-end turnaround in ~1.2 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Close Specifications
          </button>
        </div>
      </div>
    </div>
  );
}
