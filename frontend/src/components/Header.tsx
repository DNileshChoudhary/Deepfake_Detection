"use client";

import React, { useState } from "react";
import { ShieldAlert, ShieldCheck, Cpu, Info, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { SystemHealth } from "@/lib/api";

interface HeaderProps {
  health: SystemHealth | null;
  onOpenSpecs: () => void;
}

export default function Header({ health, onOpenSpecs }: HeaderProps) {
  const isOnline = health !== null && health.status === "online";

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Project Branding */}
        <div className="flex items-center space-x-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="h-full w-full bg-zinc-950 rounded-[11px] flex items-center justify-center">
              <ShieldAlert className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                Multimodal AI Deepfake Detector
              </h1>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                Prototype v1.0
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Real-Time Visual (ViT) • Audio (Wav2Vec2) • MediaPipe Lip-Sync Fusion
            </p>
          </div>
        </div>

        {/* Status and Action Buttons */}
        <div className="flex items-center space-x-3">
          {/* Backend Health Indicator */}
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
              isOnline
                ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
                : "bg-rose-950/40 text-rose-400 border-rose-500/30"
            }`}
            title={isOnline ? `Backend running on ${health?.device.toUpperCase()}` : "Backend offline - start FastAPI"}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
              }`}
            />
            <span className="hidden sm:inline">
              {isOnline ? `API Online (${health?.device.toUpperCase()})` : "API Disconnected"}
            </span>
          </div>

          {/* Architecture & Review Q&A Modal Trigger */}
          <button
            onClick={onOpenSpecs}
            className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/60 transition-colors shadow-sm"
          >
            <Info className="h-3.5 w-3.5 text-indigo-400" />
            <span>Project Specs & Q&A</span>
          </button>
        </div>
      </div>
    </header>
  );
}
