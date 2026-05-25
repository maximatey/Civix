import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Permintaan Tidak Valid", message: "Session ID wajib dikirim." },
        { status: 400 }
      );
    }

    // 1. Verify session exists in our DB
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Session Tidak Ditemukan", message: "Sesi analisis CV tidak valid." },
        { status: 404 }
      );
    }

    const grossAmount = 25000;
    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // 2. Check if we should use Mock Mode (no API Key configured)
    if (!serverKey) {
      console.warn("MIDTRANS_SERVER_KEY is missing. Falling back to Mock Payment QRIS.");
      
      // Generate a mock QRIS EMVCo string
      const mockQrString = `00020101021226300016ID.CO.CIVIX.WWW01189360000200000222040215order_${sessionId}5204000053033605405250005802ID5910Civix Shop6007Jakarta61051216062180714order_${sessionId}6304abcd`;
      
      // Use free QR Code Generator API to produce a QR image URL
      const mockQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(mockQrString)}`;

      return NextResponse.json({
        isMock: true,
        qrString: mockQrString,
        qrImageUrl: mockQrImageUrl,
        grossAmount,
        orderId: `order-session-${sessionId}`,
      });
    }

    // 3. Request actual Midtrans QRIS charge
    const authHeader = Buffer.from(serverKey + ":").toString("base64");
    const midtransUrl = "https://api.sandbox.midtrans.com/v2/charge";

    const response = await fetch(midtransUrl, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        payment_type: "qris",
        transaction_details: {
          order_id: `order-session-${sessionId}`,
          gross_amount: grossAmount,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Midtrans API Error:", data);
      throw new Error(data.status_message || "Gagal memproses pembayaran ke Midtrans.");
    }

    // 4. Extract QR Code properties from Midtrans response
    const qrString = data.qr_string;
    const qrAction = data.actions?.find((a: any) => a.name === "generate-qr-code");
    const qrImageUrl = qrAction ? qrAction.url : null;

    if (!qrString && !qrImageUrl) {
      throw new Error("Midtrans tidak mengembalikan data QRIS.");
    }

    return NextResponse.json({
      isMock: false,
      qrString,
      qrImageUrl: qrImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrString)}`,
      grossAmount,
      orderId: data.order_id,
    });

  } catch (error: any) {
    console.error("Error in checkout route:", error);
    return NextResponse.json(
      {
        error: "Checkout Error",
        message: error?.message || "Gagal membuat transaksi pembayaran. Silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
