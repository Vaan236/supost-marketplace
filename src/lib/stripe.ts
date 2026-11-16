import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY?.trim() || "sk_test_placeholder";

export const stripe = new Stripe(secretKey);