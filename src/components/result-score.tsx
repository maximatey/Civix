"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Lock, 
  CheckCircle, 
  AlertTriangle, 
  ArrowLeft, 
  Zap, 
  Sparkles, 
  Search, 
  FileCheck,
  Download,
  Loader2,
  QrCode,
  Check
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResultScoreProps {
  score?: number; // 0 to 100
  missingKeywords?: string[];
  roast?: string;
  pdfName: string;
  sessionId: string;
  onReset: () => void;
}

export function ResultScore({ 
  score = 68, 
  missingKeywords = ["React Native", "State Management", "TypeScript"], 
  roast = "CV lu kurang menjual bro, HRD duluan yang ngantuk sebelum kelar baca.",
  pdfName,
  sessionId,
  onReset 
}: ResultScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  // Checkout & Payment States
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID">("PENDING");
  const [isDownloading, setIsDownloading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Animate score from 0 to actual score on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 400);
    return () => clearTimeout(timer);
  }, [score]);

  // SVG parameters for circle
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Poll payment status while modal is open
  useEffect(() => {
    if (isCheckoutOpen && paymentStatus !== "PAID") {
      // Start polling status
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/check-payment?sessionId=${sessionId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.status === "PAID") {
              setPaymentStatus("PAID");
              setIsCheckoutOpen(false);
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            }
          }
        } catch (e) {
          console.error("Gagal memeriksa status pembayaran:", e);
        }
      }, 3000);
    } else {
      // Stop polling when closed
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isCheckoutOpen, paymentStatus, sessionId]);

  const handleCheckout = async () => {
    setLoadingCheckout(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal menghubungi API Checkout.");
      }
      setQrImageUrl(data.qrImageUrl);
      setIsCheckoutOpen(true);
    } catch (err: any) {
      console.error("Error checkout:", err);
      setCheckoutError(err?.message || "Koneksi internet bermasalah. Coba lagi.");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      const res = await fetch("/api/simulate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setPaymentStatus("PAID");
        setIsCheckoutOpen(false);
      } else {
        alert("Simulasi gagal dilakukan.");
      }
    } catch (e) {
      console.error(e);
      alert("Koneksi gagal.");
    } finally {
      setIsSimulating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (paymentStatus !== "PAID") return;
    setIsDownloading(true);
    try {
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Gagal mengunduh PDF.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CV_ATS_Optimized_${pdfName.replace(/\.pdf$/i, "")}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error downloading PDF:", err);
      alert(err?.message || "Terjadi kesalahan saat mengunduh PDF CV Anda.");
    } finally {
      setIsDownloading(false);
    }
  };

  // Determine score colors & comments
  const getScoreDetails = (val: number) => {
    if (val >= 80) {
      return {
        color: "text-emerald-400",
        stroke: "oklch(0.75 0.15 140)",
        bg: "bg-emerald-500/10 border-emerald-500/20",
        verdict: "Lolos Seleksi Awal (Bagus)",
        desc: "CV kamu memiliki kecocokan yang sangat tinggi dengan kualifikasi lowongan ini. Peluang lolos screening ATS sangat besar!",
      };
    } else if (val >= 60) {
      return {
        color: "text-amber-400",
        stroke: "oklch(0.78 0.14 85)",
        bg: "bg-amber-500/10 border-amber-500/20",
        verdict: "Perlu Penyesuaian (Cukup)",
        desc: "CV kamu cukup baik, namun masih ada beberapa kata kunci penting yang hilang yang bisa menurunkan kemungkinan lolos screening otomatis.",
      };
    } else {
      return {
        color: "text-rose-400",
        stroke: "oklch(0.65 0.22 25)",
        bg: "bg-rose-500/10 border-rose-500/20",
        verdict: "Kecocokan Rendah (Kurang)",
        desc: "Skor kecocokan CV kamu dengan lowongan ini masih rendah. HRD mungkin melewatkan CV kamu karena kekurangan kata kunci vital.",
      };
    }
  };

  const details = getScoreDetails(score);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 mt-6">
      {/* Header Back & Info Bar */}
      <div className="flex items-center justify-between">
        <Button 
          onClick={onReset} 
          variant="ghost" 
          size="sm" 
          className="text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Uji CV Lain
        </Button>
        <span className="text-xs text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-full border border-border flex items-center gap-1.5 max-w-[240px] truncate">
          <FileCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="truncate">{pdfName}</span>
        </span>
      </div>

      {/* Main Score Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Score Gauge & Summary Details */}
        <Card className="md:col-span-7 border-border/80 bg-card/60 backdrop-blur-xl shadow-lg">
          <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row items-start gap-6 md:gap-8">
            {/* Animated Circular Progress Gauge */}
            <div className="relative w-36 h-36 flex-shrink-0 flex items-center justify-center mx-auto sm:mx-0">
              <svg className="w-full h-full transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="stroke-secondary/80 fill-transparent"
                  strokeWidth={strokeWidth}
                />
                {/* Foreground Progress Ring */}
                <motion.circle
                  cx="72"
                  cy="72"
                  r={radius}
                  className="fill-transparent"
                  strokeWidth={strokeWidth}
                  stroke={details.stroke}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Central Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-foreground">
                  {animatedScore}
                  <span className="text-sm font-semibold text-muted-foreground">%</span>
                </span>
                <span className="text-[10px] text-muted-foreground tracking-wider uppercase font-bold mt-0.5">
                  Skor ATS
                </span>
              </div>
            </div>

            {/* Verdict summary details */}
            <div className="space-y-3 text-center sm:text-left flex-1 w-full">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${details.bg}`}>
                {score >= 80 ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
                {details.verdict}
              </span>
              <h3 className="text-lg font-bold text-foreground">Hasil Analisis Instan</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {details.desc}
              </p>

              {/* Roast Callout */}
              {roast && (
                <div className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/25 text-foreground text-xs md:text-sm relative animate-in fade-in slide-in-from-top-1 duration-300">
                  <div className="absolute -top-2 left-4 px-1.5 py-0.5 rounded bg-rose-500 text-[9px] uppercase tracking-wider font-extrabold flex items-center gap-1 text-white shadow-sm">
                    <span>🔥 Recruiter Roast</span>
                  </div>
                  <p className="italic font-medium text-foreground/90 mt-1 leading-relaxed">
                    "{roast}"
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Missing Keywords Box */}
        <Card className="md:col-span-5 border-border/80 bg-card/60 backdrop-blur-xl shadow-lg flex flex-col justify-between">
          <CardContent className="p-6 md:p-8 flex flex-col h-full justify-between space-y-4">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground tracking-wide uppercase flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                3 Kata Kunci yang Hilang
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Kata kunci di bawah ini sering dicari oleh bot ATS untuk lowongan ini, tambahkan ke dalam deskripsi pengalaman kerja Anda:
              </p>
            </div>

            {/* Keyword tags */}
            <div className="flex flex-wrap gap-2 py-3">
              {missingKeywords.map((kw, i) => (
                <span 
                  key={i} 
                  className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium flex items-center gap-1.5 shadow-sm"
                >
                  <Search className="w-3 h-3 text-amber-400" />
                  {kw}
                </span>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground/80 italic">
              *Tips: Gunakan kata kunci ini dalam deskripsi pencapaian kerja, bukan sekadar daftar skill.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Checkout Error Callout */}
      {checkoutError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm max-w-4xl mx-auto flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* Locked / Unlocked Content Panel */}
      <div className="relative rounded-2xl border border-border/80 overflow-hidden bg-card/30">
        
        {/* Blurry Layout Content Preview (Locked state) / Full preview (Unlocked state) */}
        <div className={`p-6 md:p-8 space-y-6 transition-all duration-700 ${
          paymentStatus !== "PAID" ? "filter blur-sm opacity-25 pointer-events-none select-none" : ""
        }`}>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              1. Rekomendasi Format & Keterbacaan Harvard Style
            </h3>
            <div className="p-5 bg-secondary/20 rounded-xl border border-border/60 space-y-3 text-sm text-muted-foreground leading-relaxed">
              <p>✔ **Layout Satu Kolom**: Format layout telah dirapikan menjadi satu kolom penuh untuk mempermudah parser bot ATS membaca urutan karir secara linear.</p>
              <p>✔ **Verba Aksi Harvard**: Pengalaman kerja Anda telah ditulis menggunakan formula (Action Verb + Task + Metric) untuk mendokumentasikan dampak pekerjaan Anda secara kuantitatif.</p>
              <p>✔ **Font Bersih**: Menggunakan rasio font serif klasik Times New Roman 10-12pt yang disukai mesin penilai rekrutmen.</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              2. Contoh Kalimat Hasil Tulis Ulang AI (Format Harvard)
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-secondary/25 border border-border/40 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-primary uppercase">Sebelum (Format Deskriptif):</span>
                <p className="text-xs text-muted-foreground">"Bertanggung jawab membuat landing page baru untuk kebutuhan pendaftaran program internship perusahaan."</p>
                <div className="border-t border-border/30 my-2" />
                <span className="text-xs font-bold text-emerald-400 uppercase">Sesudah (Format Harvard - Action + Task + Metric):</span>
                <p className="text-sm text-foreground font-medium">"**Designed and deployed** a high-converting landing page for the internship intake using React and Tailwind CSS, **increasing student registration conversion rates by 22%** within 30 days."</p>
              </div>

              <div className="p-4 bg-secondary/25 border border-border/40 rounded-xl space-y-1.5">
                <span className="text-xs font-bold text-primary uppercase">Sebelum (Format Deskriptif):</span>
                <p className="text-xs text-muted-foreground">"Membantu mengoptimalkan database SQL dan merapikan kueri lambat."</p>
                <div className="border-t border-border/30 my-2" />
                <span className="text-xs font-bold text-emerald-400 uppercase">Sesudah (Format Harvard - Action + Task + Metric):</span>
                <p className="text-sm text-foreground font-medium">"**Refactored legacy SQL queries** and implemented database indexes, **reducing average system response latency by 350ms** and improving overall dashboard rendering speeds."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conditional Layer based on payment state */}
        {paymentStatus !== "PAID" ? (
          /* Lock Overlay with payment call to action */
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-radial from-background/90 via-background/95 to-background/98 backdrop-blur-[2px]">
            <div className="max-w-md text-center space-y-6 px-4 animate-in fade-in zoom-in duration-500">
              {/* Lock Icon */}
              <div className="mx-auto w-14 h-14 bg-primary/10 border border-primary/20 rounded-full flex items-center justify-center shadow-lg shadow-primary/5">
                <Lock className="w-6 h-6 text-primary-foreground" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-extrabold text-foreground tracking-tight">
                  Tingkatkan Peluang Panggilan Kerja
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Buka evaluasi format penuh, perbaikan ejaan, dan **tulis ulang deskripsi kerja otomatis oleh AI** agar 100% cocok dengan lowongan target.
                </p>
              </div>

              {/* Payment card CTA */}
              <div className="p-5 rounded-2xl bg-secondary/40 border border-border/80 flex flex-col items-center space-y-4 shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="text-xs text-muted-foreground/80 line-through">Rp 80.000</span>
                  <span className="text-2xl font-black text-foreground flex items-center gap-1.5">
                    Rp 25.000
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                      Diskon 70%
                    </span>
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 mt-1">Satu kali bayar per lowongan</span>
                </div>

                {/* Glowing unlock button */}
                <Button 
                  disabled={loadingCheckout}
                  className="relative group bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-5 h-auto text-sm rounded-xl transition-all duration-300 w-full shadow-lg shadow-primary/20 disabled:opacity-50"
                  onClick={handleCheckout}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {loadingCheckout ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" />
                    ) : (
                      <Zap className="w-4 h-4 text-amber-400 fill-amber-400 animate-bounce" />
                    )}
                    Buka Full ATS Rewrite (Rp 25.000)
                  </span>
                  <div className="absolute inset-0 -z-10 rounded-xl bg-primary/20 blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                
                {/* Payment Methods Info */}
                <div className="flex items-center gap-3 justify-center text-[10px] text-muted-foreground/80 pt-1">
                  <span>Metode Pembayaran:</span>
                  <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">QRIS</span>
                  <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">GoPay</span>
                  <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">OVO</span>
                </div>
              </div>
              
              <p className="text-[10px] text-muted-foreground/60">
                Jaminan garansi: Hubungi kami jika nilai kecocokan ATS tidak naik setelah menerapkan saran kami.
              </p>
            </div>
          </div>
        ) : (
          /* Unlocked State Footer with Download Button */
          <div className="p-6 border-t border-border/80 bg-secondary/15 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 bg-emerald-500/10 border border-emerald-500/25 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Akses Premium Terbuka</h4>
                <p className="text-xs text-muted-foreground">Silakan klik unduh di sebelah kanan untuk mendownload CV baru Anda.</p>
              </div>
            </div>

            <Button
              disabled={isDownloading}
              onClick={handleDownloadPdf}
              className="relative group bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 py-5 h-auto text-sm rounded-xl transition-all duration-300 shadow-md shadow-emerald-600/15 w-full md:w-auto"
            >
              <span className="flex items-center justify-center gap-2">
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    Menyusun & Mengunduh PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-white" />
                    Unduh CV Hasil Optimalisasi AI (PDF)
                  </>
                )}
              </span>
            </Button>
          </div>
        )}
      </div>

      {/* Midtrans QRIS Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border/80 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-lg font-bold flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Pembayaran QRIS Civix
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Scan kode QR di bawah menggunakan aplikasi GoPay, OVO, ShopeePay, LinkAja, atau Mobile Banking BCA/Mandiri Anda.
            </DialogDescription>
          </DialogHeader>

          {/* QR Display Area */}
          <div className="flex flex-col items-center justify-center py-6 bg-secondary/15 rounded-xl border border-border/40 relative">
            {qrImageUrl ? (
              <div className="bg-white p-4 rounded-xl border border-white/10 shadow-md">
                {/* Embedded QR code */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={qrImageUrl} 
                  alt="QRIS Code" 
                  className="w-52 h-52 object-contain"
                />
              </div>
            ) : (
              <div className="w-52 h-52 bg-muted rounded-xl flex items-center justify-center animate-pulse">
                <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
              </div>
            )}
            
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Menunggu Pembayaran (Rp 25.000)...</span>
            </div>
          </div>

          {/* Checkout Footer Instruction / Bypass Mode */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground/80">
              <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">GoPay</span>
              <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">OVO</span>
              <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">ShopeePay</span>
              <span className="font-semibold text-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border">BCA</span>
            </div>

            {/* Developer simulation bypass button (Highly useful for testing) */}
            <div className="pt-2 border-t border-border/30 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={isSimulating}
                onClick={handleSimulatePayment}
                className="text-[10px] h-8 text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-500/5 hover:border-amber-400/50 rounded-lg flex items-center gap-1 w-full"
              >
                {isSimulating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3 text-amber-400" />
                )}
                Simulasikan Pembayaran Sukses (Dev Mode Bypass)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
