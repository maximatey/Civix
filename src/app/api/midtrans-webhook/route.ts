import { NextRequest, NextResponse } from "next/server";
import { createPaymentToken } from "@/lib/db";

// Midtrans webhook — when a real payment is confirmed, create and return a payment token.
// For the MVP, the token is embedded in the webhook response (logged server-side).
// In production, you'd store this token in a database and notify the frontend via WebSocket/polling.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("Received Midtrans Webhook Notification:", body);

    const { order_id, transaction_status } = body;

    if (!order_id) {
      return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
    }

    if (order_id.startsWith("order-session-")) {
      const sessionId = order_id.replace("order-session-", "");

      if (transaction_status === "settlement" || transaction_status === "capture") {
        // Create a signed payment token for this session
        const paymentToken = createPaymentToken(sessionId);
        console.log(`Session ${sessionId} payment confirmed via Webhook. Token: ${paymentToken}`);
        // In production: push this token to the frontend via a real-time channel
      } else if (
        transaction_status === "deny" ||
        transaction_status === "cancel" ||
        transaction_status === "expire"
      ) {
        console.log(`Session ${sessionId} payment was declined/cancelled/expired.`);
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
