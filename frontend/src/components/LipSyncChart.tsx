"use client";

import React from "react";
import { Activity, Waves, Volume2, ShieldAlert } from "lucide-react";

interface PlotPoint {
  time_s: number;
  mouth_aperture: number;
  audio_energy: number;
}

interface LipSyncChartProps {
  plotSeries: PlotPoint[];
  correlation: number;
  isMismatch: boolean;
}

export default function LipSyncChart({
  plotSeries,
  correlation,
  isMismatch,
}: LipSyncChartProps) {
  if (!plotSeries || plotSeries.length < 2) return null;

  // Chart dimensions
  const width = 600;
  const height = 140;
  const padding = 25;

  const minTime = plotSeries[0].time_s;
  const maxTime = plotSeries[plotSeries.length - 1].time_s || 1.0;
  const timeRange = Math.max(0.1, maxTime - minTime);

  // Map data to SVG coordinates
  const getX = (t: number) => padding + ((t - minTime) / timeRange) * (width - 2 * padding);
  const getY = (val: number) => height - padding - val * (height - 2 * padding);

  const mouthPoints = plotSeries
    .map((p) => `${getX(p.time_s).toFixed(1)},${getY(p.mouth_aperture).toFixed(1)}`)
    .join(" ");

  const audioPoints = plotSeries
    .map((p) => `${getX(p.time_s).toFixed(1)},${getY(p.audio_energy).toFixed(1)}`)
    .join(" ");

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Waves className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">
              Lip-Sync Consistency: Viseme-Phoneme Alignment
            </h4>
            <p className="text-xs text-zinc-400">
              MediaPipe mouth opening (aperture) vs Audio RMS energy envelope over time
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-3 rounded-full bg-cyan-400 inline-block" />
            <span className="text-zinc-300">Mouth Aperture</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2 w-3 rounded-full bg-amber-400 inline-block" />
            <span className="text-zinc-300">Audio RMS Energy</span>
          </div>
          <span
            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
              isMismatch
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
            }`}
          >
            r = {correlation.toFixed(2)}
          </span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-36 bg-zinc-950/80 rounded-lg border border-zinc-800/80"
        >
          {/* Grid lines */}
          <line
            x1={padding}
            y1={padding}
            x2={width - padding}
            y2={padding}
            stroke="#27272a"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#27272a"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#3f3f46"
          />

          {/* Polyline for Mouth Aperture (Cyan) */}
          <polyline
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={mouthPoints}
          />

          {/* Polyline for Audio Energy (Amber) */}
          <polyline
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={audioPoints}
          />

          {/* Data Points */}
          {plotSeries.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={getX(p.time_s)}
                cy={getY(p.mouth_aperture)}
                r="3"
                className="fill-cyan-400 stroke-zinc-950 stroke-2"
              />
              <circle
                cx={getX(p.time_s)}
                cy={getY(p.audio_energy)}
                r="3"
                className="fill-amber-400 stroke-zinc-950 stroke-2"
              />
            </g>
          ))}
        </svg>
      </div>

      <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-2 px-1 font-mono">
        <span>Start: {minTime.toFixed(1)}s</span>
        <span className="text-zinc-400">
          {isMismatch
            ? "Noticeable discrepancy: mouth movement and speech acoustics diverge."
            : "Strong temporal cross-correlation indicates authentic synchronized speech."}
        </span>
        <span>End: {maxTime.toFixed(1)}s</span>
      </div>
    </div>
  );
}
