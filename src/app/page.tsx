"use client";

import React, { useState } from "react";
import { LandingHero } from "@/components/landing-hero";
import { CVUploadForm } from "@/components/cv-upload-form";
import { ScanningLoader } from "@/components/scanning-loader";
import { ResultScore } from "@/components/result-score";
import { Sparkles, Terminal, FileText, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AppState = "idle" | "loading" | "result";

interface UploadedFileInfo {
  name: string;
  size: number;
}

interface APIResult {
  score: number;
  missingKeywords: string[];
  roast: string;
  cvText: string;
  jobDescription: string;
  pdfName: string;
}

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [fileInfo, setFileInfo] = useState<UploadedFileInfo>({ name: "", size: 0 });
  const [result, setResult] = useState<APIResult>({ score: 0, missingKeywords: [], roast: "", cvText: "", jobDescription: "", pdfName: "" });
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const handleAnalyze = async (payload: {
    pdfBase64: string;
    pdfName: string;
    pdfSize: number;
    jobDescription: string;
    file: File;
  }) => {
    // Clear previous errors
    setError(null);

    // Store uploaded file info
    setFileInfo({
      name: payload.pdfName,
      size: payload.pdfSize,
    });

    // Move to loading state
    setState("loading");

    try {
      const formData = new FormData();
      formData.append("cv", payload.file);
      formData.append("jobDescription", payload.jobDescription);

      const response = await fetch("/api/score-cv", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Gagal menganalisis CV.");
      }

      setResult({
        score: data.score,
        missingKeywords: data.missingKeywords || [],
        roast: data.roast || "",
        cvText: data.cvText || "",
        jobDescription: payload.jobDescription,
        pdfName: data.pdfName || payload.pdfName,
      });
      setState("result");
    } catch (err: any) {
      console.error("Error calling score-cv API:", err);
      setError({
        title: "Gagal Menganalisis CV",
        message: err?.message || "Terjadi kesalahan koneksi internet atau masalah pada server. Silakan coba lagi.",
      });
      setState("idle");
    }
  };

  const handleReset = () => {
    setState("idle");
    setFileInfo({ name: "", size: 0 });
    setResult({ score: 0, missingKeywords: [], roast: "", cvText: "", jobDescription: "", pdfName: "" });
    setError(null);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-foreground">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-violet-500 flex items-center justify-center shadow-md shadow-primary/20">
              <Sparkles className="w-5 h-5 text-primary-foreground fill-primary-foreground/20" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Civix
            </span>
          </div>


          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              AI Model Active v1.2
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
            >
              <LandingHero />
              
              {/* API Connection Error Card */}
              {error && (
                <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in slide-in-from-top-2 duration-300 flex flex-col gap-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-ping" />
                    {error.title}
                  </span>
                  <span className="text-muted-foreground text-xs md:text-sm">{error.message}</span>
                </div>
              )}

              <CVUploadForm onAnalyze={handleAnalyze} />
            </motion.div>
          )}

          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <ScanningLoader />
            </motion.div>
          )}

          {state === "result" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
            >
              <ResultScore
                score={result.score}
                missingKeywords={result.missingKeywords}
                roast={result.roast}
                pdfName={result.pdfName || fileInfo.name}
                cvText={result.cvText}
                jobDescription={result.jobDescription}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-secondary/10 mt-16 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4">
          <p className="opacity-80">
            &copy; {new Date().getFullYear()} Civix. Hak Cipta Dilindungi Undang-Undang.
          </p>
        </div>
      </footer>
    </div>
  );
}
