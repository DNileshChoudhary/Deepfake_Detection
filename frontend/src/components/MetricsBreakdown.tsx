"use client";

import React from "react";
import { Eye, Mic, Disc3, CheckCircle, AlertTriangle, Cpu, Volume2, Shield } from "lucide-react";
import { DetectionResult } from "@/lib/api";

interface MetricsBreakdownProps {
  result: DetectionResult | null;
}

export default function MetricsBreakdown({ result }: MetricsBreakdownProps) {
  if (!result) return null;

  const { visual, audio, sync, fusion } = result;

  const getScoreColor = (score: number) => {
    if (score >= 0.65) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
    if (score <= 0.40) return "text-rose-400 bg-rose-500/10 border-rose-500/30";
    return "text-amber-400 bg-amber-500/10 border-amber-500/30";
  };

  const getBarColor = (score: number) => {
    if (score >= 0.65) return "bg-emerald-500";
    if (score <= 0.40) return "bg-rose-500";
    return "bg-amber-500";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Visual Branch Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Visual Branch</h4>
                <p className="text-[10px] text-zinc-400">Vision Transformer (ViT)</p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor(
                visual.visual_score
              )}`}
            >
              {(visual.visual_score * 100).toFixed(0)}% Real
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800/80 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getBarColor(
                visual.visual_score
              )}`}
              style={{ width: `${Math.max(5, visual.visual_score * 100)}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
            {visual.explanation}
          </p>
        </div>

        {/* Telemetry Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Frames: {visual.frames_analyzed}</span>
          <span>Faces Detected: {visual.faces_detected}</span>
          <span>Fake Prob: {(visual.fake_score * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* 2. Audio Branch Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Mic className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Audio Branch</h4>
                <p className="text-[10px] text-zinc-400">Wav2Vec2 + Spectral</p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                audio.has_audio
                  ? getScoreColor(audio.audio_score)
                  : "text-zinc-500 bg-zinc-800 border-zinc-700"
              }`}
            >
              {audio.has_audio ? `${(audio.audio_score * 100).toFixed(0)}% Real` : "No Audio"}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800/80 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                audio.has_audio ? getBarColor(audio.audio_score) : "bg-zinc-600"
              }`}
              style={{ width: `${audio.has_audio ? Math.max(5, audio.audio_score * 100) : 0}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
            {audio.explanation}
          </p>
        </div>

        {/* Telemetry Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Pitch: {audio.spectral_features?.pitch_f0_hz || 0} Hz</span>
          <span>Flatness: {audio.spectral_features?.spectral_flatness || 0}</span>
          <span>Duration: {audio.duration_s || 0}s</span>
        </div>
      </div>

      {/* 3. Lip-Sync Branch Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col justify-between hover:border-zinc-700/80 transition-all">
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Disc3 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Lip-Sync Coherence</h4>
                <p className="text-[10px] text-zinc-400">MediaPipe Mesh vs Audio RMS</p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${getScoreColor(
                sync.sync_score
              )}`}
            >
              {(sync.sync_score * 100).toFixed(0)}% Sync
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-zinc-800/80 rounded-full h-2 mb-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${getBarColor(
                sync.sync_score
              )}`}
              style={{ width: `${Math.max(5, sync.sync_score * 100)}%` }}
            />
          </div>

          <p className="text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
            {sync.explanation}
          </p>
        </div>

        {/* Telemetry Footer */}
        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Correlation: {sync.correlation}</span>
          <span className={sync.lip_sync_mismatch ? "text-rose-400 font-semibold" : "text-emerald-400"}>
            {sync.lip_sync_mismatch ? "Desync Mismatch!" : "In Sync"}
          </span>
          <span>Confidence: {(sync.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );
}
