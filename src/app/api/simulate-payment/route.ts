import { NextRequest, NextResponse } from "next/server";
import { saveSession, getSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "Session ID wajib dilampirkan." },
        { status: 400 }
      );
    }

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session Tidak Ditemukan", message: "Sesi tidak valid." },
        { status: 404 }
      );
    }

    // Force update status in database
    saveSession(sessionId, { status: "PAID" });
    console.log(`[SIMULATOR] Session ${sessionId} payment status was manually set to PAID.`);

    return NextResponse.json({
      success: true,
      sessionId,
      status: "PAID",
      message: "Pembayaran disimulasikan berhasil!",
    });
  } catch (error: any) {
    console.error("Error simulating payment:", error);
    return NextResponse.json(
      { error: "Internal Error", message: "Gagal mensimulasikan pembayaran." },
      { status: 500 }
    );
  }
}
