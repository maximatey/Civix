import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

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

    return NextResponse.json({
      sessionId,
      status: session.status,
    });
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    return NextResponse.json(
      { error: "Internal Error", message: "Gagal memeriksa status pembayaran." },
      { status: 500 }
    );
  }
}
