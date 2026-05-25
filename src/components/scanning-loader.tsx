"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Search, CheckCircle } from "lucide-react";

const STEPS = [
  "Membaca file PDF CV...",
  "Mengekstrak teks & struktur resume...",
  "Memindai kualifikasi lowongan...",
  "Menganalisis kecocokan kata kunci...",
  "Mengevaluasi format & layout ATS...",
  "Menghitung skor akhir kecocokan...",
];

export function ScanningLoader() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prevIndex) => {
        if (prevIndex < STEPS.length - 1) {
          return prevIndex + 1;
        }
        return prevIndex; // Hold on the last step
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 max-w-md mx-auto text-center min-h-[500px]">
      {/* Document Scanner Visual */}
      <div className="relative w-44 h-56 bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xl p-4 flex flex-col justify-between mb-8">
        {/* Scanner radar scanning bar */}
        <motion.div
          animate={{
            top: ["0%", "100%", "0%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_12px_4px_rgba(99,102,241,0.5)] z-10"
        />

        {/* Mock Document Content representation */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-full bg-secondary/80 flex-shrink-0" />
            <div className="space-y-1 w-full">
              <div className="h-2 w-16 bg-muted rounded-full" />
              <div className="h-1.5 w-10 bg-muted rounded-full opacity-60" />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="h-1.5 w-full bg-muted rounded-full" />
            <div className="h-1.5 w-[90%] bg-muted rounded-full" />
            <div className="h-1.5 w-[95%] bg-muted rounded-full" />
            <div className="h-1.5 w-[75%] bg-muted rounded-full" />
          </div>
          
          <div className="space-y-2 pt-2">
            <div className="h-1.5 w-full bg-muted rounded-full" />
            <div className="h-1.5 w-[85%] bg-muted rounded-full" />
          </div>
        </div>

        {/* Small bottom visual */}
        <div className="flex justify-between items-center pt-2 border-t border-border/40">
          <div className="h-1.5 w-8 bg-muted rounded-full" />
          <div className="h-1.5 w-6 bg-muted rounded-full" />
        </div>
      </div>

      {/* Pulsing Radar Loader */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
        <div className="relative w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Cpu className="w-5 h-5 text-primary-foreground animate-spin [animation-duration:3s]" />
        </div>
      </div>

      {/* Primary Scanning Status */}
      <h3 className="text-xl font-bold text-foreground tracking-tight mb-2">
        AI sedang membedah CV kamu...
      </h3>
      
      {/* Cycling Micro-logs */}
      <div className="h-6 overflow-hidden flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="text-sm text-muted-foreground flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            {STEPS[currentStepIndex]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress check list simulation */}
      <div className="mt-8 space-y-2 text-left w-full border border-border/40 rounded-xl p-4 bg-card/25 text-xs text-muted-foreground max-w-sm">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <div key={idx} className="flex items-center gap-2">
              {isDone ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              ) : isCurrent ? (
                <div className="w-3.5 h-3.5 flex items-center justify-center flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                </div>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full border border-border flex-shrink-0" />
              )}
              <span className={isDone ? "text-muted-foreground/50 line-through" : isCurrent ? "text-foreground font-medium" : "text-muted-foreground/60"}>
                {step.replace("...", "")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
