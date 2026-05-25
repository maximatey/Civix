import { NextRequest, NextResponse } from "next/server";
import { saveSession, getSession } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Received Midtrans Webhook Notification:", body);

    const { order_id, transaction_status } = body;

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    // Identify if this order belongs to our CV session
    if (order_id.startsWith("order-session-")) {
      const sessionId = order_id.replace("order-session-", "");

      // Verify the session exists in database
      const session = getSession(sessionId);
      if (session) {
        // Settlement and capture represent successful transactions
        if (
          transaction_status === "settlement" ||
          transaction_status === "capture"
        ) {
          saveSession(sessionId, { status: "PAID" });
          console.log(`Session ${sessionId} payment status updated to PAID via Webhook.`);
        } else if (
          transaction_status === "deny" ||
          transaction_status === "cancel" ||
          transaction_status === "expire"
        ) {
          saveSession(sessionId, { status: "PENDING" });
          console.log(`Session ${sessionId} payment was declined/cancelled/expired.`);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error processing Midtrans Webhook:", error);
    return NextResponse.json(
      { error: "Webhook Processing Failed", details: error?.message },
      { status: 500 }
    );
  }
}
