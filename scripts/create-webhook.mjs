import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const endpoints = await stripe.webhookEndpoints.list({ limit: 20 });

for (const ep of endpoints.data) {
  console.log(ep.id, "|", ep.status, "|", new Date(ep.created * 1000).toISOString(), "|", ep.url);
}