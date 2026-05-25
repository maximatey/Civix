import { NextRequest, NextResponse } from "next/server";
import { createPaymentToken } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "Session ID wajib dilampirkan." },
        { status: 400 }
      );
    }

    // Create a signed payment proof token — no DB lookup needed
    const paymentToken = createPaymentToken(sessionId);
    console.log(`[SIMULATOR] Payment simulated for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      status: "PAID",
      paymentToken,
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
