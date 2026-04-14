import Stripe from "stripe";
import { NextResponse } from "next/server";

import { provisionPaidCheckout } from "@/lib/stripe/provisioning";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const platformUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

function getStripe() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  return new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId;
    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId jest wymagane." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return NextResponse.json({ error: "Nie znaleziono sesji Stripe." }, { status: 404 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: `Płatność nie jest opłacona (status: ${session.payment_status}).` },
        { status: 400 }
      );
    }

    const courseId = session.metadata?.courseId;
    const customerEmail =
      session.customer_details?.email ||
      (typeof session.customer_email === "string" ? session.customer_email : null) ||
      null;
    const customerName = session.customer_details?.name || null;

    if (!courseId) {
      return NextResponse.json({ error: "Brak courseId w metadanych sesji." }, { status: 400 });
    }
    if (!customerEmail) {
      return NextResponse.json({ error: "Brak emaila w sesji Stripe." }, { status: 400 });
    }

    const provisioning = await provisionPaidCheckout({
      stripeSessionId: session.id,
      courseId,
      customerEmail,
      customerName,
      amountTotal: session.amount_total,
      platformUrl,
    });

    return NextResponse.json({
      ok: true,
      courseTitle: provisioning.courseTitle,
      email: provisioning.loginEmail,
      userCreated: provisioning.userCreated,
      enrollmentCreated: provisioning.enrollmentCreated,
    });
  } catch (error) {
    console.error("stripe confirm:", error);
    return NextResponse.json({ error: "Błąd potwierdzania płatności." }, { status: 500 });
  }
}

