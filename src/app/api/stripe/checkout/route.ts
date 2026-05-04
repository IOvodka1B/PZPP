import Stripe from "stripe";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { extractABFromRequestCookies } from "@/lib/ab/cookies";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

function getStripe() {
  if (!stripeSecretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY env var");
  }
  return new Stripe(stripeSecretKey, { apiVersion: "2026-03-25.dahlia" });
}

type ABPayload = {
  abTestId?: string | null;
  abVariantId?: string | null;
  abLandingId?: string | null;
  abVisitorId?: string | null;
};

async function resolveABPayload(courseId: string, payload: ABPayload) {
  const abTestId = payload.abTestId || null;
  const abVariantId = payload.abVariantId || null;
  const landingPageId = payload.abLandingId || null;
  const abVisitorId = payload.abVisitorId || null;

  if (!abTestId || !abVariantId) {
    return { abTestId: null, abVariantId: null, landingPageId, abVisitorId };
  }

  const abVariantDelegate = prisma.aBVariant ?? prisma.abVariant;
  const variant = await abVariantDelegate.findUnique({
    where: { id: abVariantId },
    include: {
      abTest: true,
    },
  });
  if (!variant || variant.abTestId !== abTestId) {
    return { abTestId: null, abVariantId: null, landingPageId, abVisitorId };
  }
  if (variant.abTest.courseId && variant.abTest.courseId !== courseId) {
    return { abTestId: null, abVariantId: null, landingPageId, abVisitorId };
  }

  return {
    abTestId,
    abVariantId,
    landingPageId: landingPageId || variant.landingPageId,
    abVisitorId,
  };
}

async function createCheckoutUrl(params: { courseId: string; origin: string; abPayload?: ABPayload }) {
  const { courseId, origin, abPayload } = params;
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, title: true, price: true },
  });

  if (!course) {
    return { ok: false as const, error: "Nie znaleziono kursu." };
  }

  if (!course.price || course.price <= 0) {
    return {
      ok: false as const,
      error: "Kurs nie ma ustawionej ceny. Ustaw cenę kursu przed sprzedażą.",
    };
  }

  const stripe = getStripe();
  const unitAmount = Math.round(course.price * 100);

  const resolvedAB = await resolveABPayload(course.id, abPayload || {});
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "pln",
          product_data: { name: course.title },
          unit_amount: unitAmount,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?stripe=cancel`,
    metadata: {
      courseId: course.id,
      abTestId: resolvedAB.abTestId || "",
      abVariantId: resolvedAB.abVariantId || "",
      landingPageId: resolvedAB.landingPageId || "",
      abVisitorId: resolvedAB.abVisitorId || "",
    },
  });

  if (!session.url) {
    return { ok: false as const, error: "Nie udało się utworzyć sesji Stripe." };
  }

  await prisma.order.create({
    data: {
      stripeSessionId: session.id,
      amount: unitAmount,
      status: "PENDING",
      courseId: course.id,
      abTestId: resolvedAB.abTestId,
      abVariantId: resolvedAB.abVariantId,
      landingPageId: resolvedAB.landingPageId,
      abVisitorId: resolvedAB.abVisitorId,
    },
  });

  if (resolvedAB.abVariantId) {
    const abVariantDelegate = prisma.aBVariant ?? prisma.abVariant;
    await abVariantDelegate.update({
      where: { id: resolvedAB.abVariantId },
      data: { checkoutStarts: { increment: 1 } },
    });
  }

  return { ok: true as const, url: session.url };
}

export async function GET(req: Request) {
  try {
    const { searchParams, origin } = new URL(req.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json({ error: "courseId jest wymagane." }, { status: 400 });
    }

    const cookieAB = extractABFromRequestCookies(req.headers.get("cookie"));
    const result = await createCheckoutUrl({
      courseId,
      origin,
      abPayload: {
        abVisitorId: cookieAB.visitorId,
      },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.redirect(result.url, { status: 303 });
  } catch (error) {
    console.error("stripe checkout GET:", error);
    const details =
      process.env.NODE_ENV !== "production"
        ? typeof (error as any)?.message === "string"
          ? (error as any).message
          : String(error)
        : undefined;
    return NextResponse.json({ error: "Błąd tworzenia płatności.", details }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const body = await req.json().catch(() => null);
    const courseId = body?.courseId;
    if (!courseId || typeof courseId !== "string") {
      return NextResponse.json({ error: "courseId jest wymagane." }, { status: 400 });
    }

    const cookieAB = extractABFromRequestCookies(req.headers.get("cookie"));
    const result = await createCheckoutUrl({
      courseId,
      origin,
      abPayload: {
        abTestId: typeof body?.abTestId === "string" ? body.abTestId : null,
        abVariantId: typeof body?.abVariantId === "string" ? body.abVariantId : null,
        abLandingId: typeof body?.abLandingId === "string" ? body.abLandingId : null,
        abVisitorId:
          typeof body?.abVisitorId === "string" ? body.abVisitorId : cookieAB.visitorId,
      },
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    console.error("stripe checkout POST:", error);
    const details =
      process.env.NODE_ENV !== "production"
        ? typeof (error as any)?.message === "string"
          ? (error as any).message
          : String(error)
        : undefined;
    return NextResponse.json({ error: "Błąd tworzenia płatności.", details }, { status: 500 });
  }
}

