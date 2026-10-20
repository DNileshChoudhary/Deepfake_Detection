"use client";

import React from "react";
import { CheckCircle2, AlertOctagon, HelpCircle, Activity, Sparkles, Clock, Target } from "lucide-react";
import { DetectionResult } from "@/lib/api";

interface VerdictBadgeProps {
  result: DetectionResult | null;
  loading?: boolean;
}

export default function VerdictBadge({ result, loading }: VerdictBadgeProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 flex flex-col items-center justify-center min-h-[160px] animate-pulse">
        <Activity className="h-8 w-8 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm font-medium text-zinc-300">Executing Multimodal Inference...</p>
        <p className="text-xs text-zinc-500 mt-1">ViT Face Check • Wav2Vec2 Audio • MediaPipe Lip-Sync</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-6 flex flex-col items-center justify-center min-h-[160px] text-center">
        <Sparkles className="h-8 w-8 text-zinc-600 mb-2" />
        <h4 className="text-sm font-semibold text-zinc-400">Awaiting Media Input</h4>
        <p className="text-xs text-zinc-500 max-w-sm mt-1">
          Upload a short video clip or activate the live webcam stream to run multimodal deepfake classification.
        </p>
      </div>
    );
  }

  const { fusion, processing_time_s } = result;
  const isFake = fusion.verdict_badge === "FAKE";
  const isReal = fusion.verdict_badge === "REAL";
  const isUncertain = !isFake && !isReal;

  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-300 ${
        isFake
          ? "border-rose-500/40 bg-gradient-to-br from-rose-950/40 via-zinc-900/80 to-zinc-950 shadow-lg shadow-rose-950/30"
          : isReal
          ? "border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-zinc-900/80 to-zinc-950 shadow-lg shadow-emerald-950/30"
          : "border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-zinc-900/80 to-zinc-950 shadow-lg shadow-amber-950/30"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Main Verdict Indicator */}
        <div className="flex items-start sm:items-center space-x-4">
          <div
            className={`p-3.5 rounded-2xl flex-shrink-0 ${
              isFake
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 ring-4 ring-rose-500/10"
                : isReal
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 ring-4 ring-emerald-500/10"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/30 ring-4 ring-amber-500/10"
            }`}
          >
            {isFake ? (
              <AlertOctagon className="h-8 w-8" />
            ) : isReal ? (
              <CheckCircle2 className="h-8 w-8" />
            ) : (
              <HelpCircle className="h-8 w-8" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Multimodal Assessment
              </span>
              <span className="inline-flex items-center space-x-1 text-[11px] text-zinc-500">
                <Clock className="h-3 w-3" />
                <span>{processing_time_s}s</span>
              </span>
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                isFake ? "text-rose-400" : isReal ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {fusion.verdict}
            </h2>
            <p className="text-xs text-zinc-300 mt-1 line-clamp-2 max-w-xl">
              {fusion.summary_explanation}
            </p>
          </div>
        </div>

        {/* Confidence Gauge */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-zinc-800/80 pt-3 sm:pt-0 sm:pl-6">
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mb-1">
            <Target className="h-3.5 w-3.5 text-indigo-400" />
            <span>Confidence</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {fusion.confidence_pct}%
          </div>
          <div className="text-[11px] font-medium text-zinc-500">
            Authenticity: {(fusion.authenticity_score * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Primary Flag Attribution Banner */}
      <div className="mt-4 pt-4 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="text-zinc-400 font-medium">Dominant Modality Factor:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full font-semibold border ${
              isFake
                ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                : isReal
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-300 border-amber-500/20"
            }`}
          >
            {fusion.dominant_modality}
          </span>
        </div>
        <div className="text-zinc-500 text-[11px]">
          Weights: Visual {Math.round(fusion.weights_used.visual * 100)}% • Audio {Math.round(fusion.weights_used.audio * 100)}% • Sync {Math.round(fusion.weights_used.sync * 100)}%
        </div>
      </div>
    </div>
  );
}
