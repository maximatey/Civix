"use client";

import React, { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Trash2, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface CVUploadFormProps {
  onAnalyze: (payload: {
    pdfBase64: string;
    pdfName: string;
    pdfSize: number;
    jobDescription: string;
    file: File;
  }) => void;
}

export function CVUploadForm({ onAnalyze }: CVUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validator
  const validateFile = (selectedFile: File): boolean => {
    setError(null);
    
    // Check extension
    if (selectedFile.type !== "application/pdf" && !selectedFile.name.endsWith(".pdf")) {
      setError("File harus berformat PDF.");
      return false;
    }
    
    // Check file size (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError("Ukuran file maksimal adalah 2MB.");
      return false;
    }
    
    setFile(selectedFile);
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Silakan unggah CV PDF terlebih dahulu.");
      return;
    }
    if (!jobDescription.trim()) {
      setError("Silakan isi target lowongan / deskripsi pekerjaan.");
      return;
    }

    // Convert PDF to Base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = reader.result as string;
      
      // Log for developer verification
      console.group("Client-side Payload Conversion");
      console.log("PDF File Name:", file.name);
      console.log("PDF File Size:", `${(file.size / 1024).toFixed(2)} KB`);
      console.log("Base64 String Preview (first 100 chars):", base64String.substring(0, 100) + "...");
      
      // Construct FormData mock representation
      const formData = new FormData();
      formData.append("cv", file);
      formData.append("jobDescription", jobDescription);
      console.log("FormData constructed with fields 'cv' and 'jobDescription'");
      console.groupEnd();

      // Trigger callback
      onAnalyze({
        pdfBase64: base64String,
        pdfName: file.name,
        pdfSize: file.size,
        jobDescription: jobDescription,
        file: file,
      });
    };
    reader.onerror = (err) => {
      console.error("Gagal membaca file PDF:", err);
      setError("Gagal memproses file PDF. Silakan coba lagi.");
    };
  };

  // Helper to format file size
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <Card className="w-full max-w-4xl mx-auto border-border/80 bg-card/60 backdrop-blur-xl shadow-xl overflow-hidden mt-6">
      <CardContent className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input A: File Upload Zone */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-foreground tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Unggah CV Kamu (Format PDF)
              </label>
              
              <div
                className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 transition-all duration-300 cursor-pointer h-64 text-center select-none ${
                  dragActive
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                    : file
                    ? "border-emerald-500/50 bg-emerald-500/5"
                    : "border-border/80 hover:border-primary/50 hover:bg-secondary/20"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  onChange={handleChange}
                />

                {file ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                    <div className="mx-auto w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                    </div>
                    <div className="space-y-1 px-4">
                      <p className="text-sm font-medium text-foreground line-clamp-1 max-w-[200px] md:max-w-[280px]">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Ganti File
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-14 h-14 bg-secondary/80 border border-border rounded-full flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-primary/40 group-hover:bg-primary/5 duration-300">
                      <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="space-y-1.5 px-4">
                      <p className="text-sm font-medium text-foreground">
                        Tarik & lepas file PDF di sini
                      </p>
                      <p className="text-xs text-muted-foreground">
                        atau klik untuk memilih file dari perangkat
                      </p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded border border-border">
                      Maksimal 2MB
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Input B: Job Description (Target Lowongan) */}
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-semibold text-foreground tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Target Lowongan (Kualifikasi Kerja)
              </label>
              
              <div className="relative flex-1">
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Tempel syarat atau kualifikasi lowongan pekerjaan di sini.&#10;Contoh:&#10;- Minimal lulusan S1 Teknik Informatika&#10;- Menguasai React, Next.js, dan Tailwind CSS&#10;- Berpengalaman menggunakan REST API / Git..."
                  className="w-full h-64 min-h-[256px] resize-none bg-secondary/10 border-border/80 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 rounded-xl p-4 text-sm leading-relaxed transition-all scrollbar-thin placeholder:text-muted-foreground/60"
                />
              </div>
            </div>
          </div>

          {/* Validation Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs md:text-sm animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Action Button */}
          <div className="flex justify-center pt-2">
            <Button
              type="submit"
              className="relative group bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-4 h-auto text-sm md:text-base rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-primary/30 w-full md:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                Mulai Analisis Gratis
                <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 -z-10 rounded-xl bg-primary/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
