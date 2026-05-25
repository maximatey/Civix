import { NextRequest, NextResponse } from "next/server";
import { verifyPaymentToken } from "@/lib/db";

// Stateless payment check — verifies HMAC token, no DB needed
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentToken = searchParams.get("paymentToken");

    if (!paymentToken) {
      return NextResponse.json({ status: "PENDING" });
    }

    const { valid } = verifyPaymentToken(paymentToken);
    return NextResponse.json({ status: valid ? "PAID" : "PENDING" });
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    return NextResponse.json({ status: "PENDING" });
  }
}
