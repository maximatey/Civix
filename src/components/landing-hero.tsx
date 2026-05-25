"use client";

import React from "react";
import { Sparkles, FileText, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export function LandingHero() {
  return (
    <div className="relative overflow-hidden pt-16 pb-8 md:pt-24 md:pb-12 text-center">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-radial from-primary/10 via-transparent to-transparent blur-3xl -z-10 pointer-events-none" />

      {/* Hero Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary-foreground/90 text-xs font-medium mb-6 md:mb-8 shadow-sm backdrop-blur-md"
      >
        <Sparkles className="w-3.5 h-3.5 text-primary-foreground/80 animate-pulse" />
        <span>Optimalkan CV Anda dengan AI Teknologi ATS</span>
      </motion.div>

      {/* Main Hook */}
      <motion.h1
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-4xl mx-auto px-4 leading-[1.15] md:leading-[1.1]"
      >
        CV Keren Belum Tentu{" "}
        <span className="bg-gradient-to-r from-primary via-violet-400 to-indigo-400 bg-clip-text text-transparent">
          Lolos ATS.
        </span>
        <br />
        Cek Skor CV Kamu Sekarang{" "}
        <span className="text-emerald-400 font-semibold">(Gratis).</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4 leading-relaxed"
      >
        Khusus fresh graduate Indonesia! Bandingkan CV-mu secara instan dengan kualifikasi lowongan impian. Cari tahu kata kunci yang kurang sebelum mengirim lamaran.
      </motion.p>

      {/* Trust factors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="flex flex-wrap justify-center items-center gap-y-2 gap-x-6 mt-8 text-xs text-muted-foreground/80"
      >
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Format PDF Standar HRD</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Analisis Kata Kunci Instan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>100% Aman & Rahasia</span>
        </div>
      </motion.div>
    </div>
  );
}
