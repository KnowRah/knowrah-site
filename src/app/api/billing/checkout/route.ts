// src/app/api/billing/checkout/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";

type Plan = "personal" | "family" | "business";
const okPlans: Plan[] = ["personal", "family", "business"];

const PROVIDER = (process.env.BILLING_PROVIDER || "").toLowerCase();
const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3001";

const MAP = {
  personal: { paddle: process.env.PADDLE_LINK_PERSONAL, stripe: process.env.STRIPE_PRICE_PERSONAL },
  family:   { paddle: process.env.PADDLE_LINK_FAMILY,   stripe: process.env.STRIPE_PRICE_FAMILY   },
  business: { paddle: process.env.PADDLE_LINK_BUSINESS, stripe: process.env.STRIPE_PRICE_BUSINESS },
} as const;

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json().catch(() => ({}))) as { plan?: Plan };
    if (!plan || !okPlans.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // PADDLE (default)
    if (PROVIDER === "paddle") {
      const url = MAP[plan].paddle;
      if (!url) return NextResponse.json({ error: "Missing Paddle link" }, { status: 500 });
      return NextResponse.json({ url });
    }

    // STRIPE (optional fallback)
    if (PROVIDER === "stripe") {
      const price = MAP[plan].stripe;
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key || !price) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

      // Lazy import; no apiVersion to avoid TS literal mismatch on different SDKs.
      // @ts-ignore - tolerate absence of stripe types when using Paddle-only
      const StripeMod = (await import("stripe")) as any;
      const stripe = new StripeMod.default(key);

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: `${PUBLIC_URL}/app`,
        cancel_url: `${PUBLIC_URL}/pricing`,
        allow_promotion_codes: true,
        billing_address_collection: "auto",
      });

      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json(
      { error: "Set BILLING_PROVIDER to 'paddle' or 'stripe' in .env.local" },
      { status: 500 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Checkout error" }, { status: 500 });
  }
}
