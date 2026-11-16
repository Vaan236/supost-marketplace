# SUpost Marketplace

A Facebook-style Marketplace application built with Next.js (App Router), React, TypeScript, Tailwind CSS, and Supabase.

## Features
- **Create Listings:** Specialized flows for single items, batch multiple listings, vehicles, and homes for sale/rent with photo uploads to Supabase Storage and a live side-by-side preview.
- **Browse & Search:** Responsive product grid with category filtering and real-time keyword search.
- **Item Details & Messaging:** Dedicated listing pages (`/item/[id]`) with full details and a Message Seller form stored in Supabase PostgreSQL.

## Running Locally
1. Install dependencies: `npm install`
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
3. Start the dev server: `npm run dev`