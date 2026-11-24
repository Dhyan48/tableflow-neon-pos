@"
# TableFlow POS — Neon Serverless PostgreSQL Demo

A full-stack Restaurant Point-of-Sale (POS) and Live Kitchen Display System built to demonstrate **Neon Serverless PostgreSQL** features:
- **Storage & Compute Separation** with automatic scale-to-zero
- **Connection Pooling** (`-pooler`) for high-concurrency order bursts
- **Copy-on-Write Database Branching** for safe menu/schema testing
- **3NF Relational Schema** (`MenuItem`, `Order`, `OrderItem`) + `live_order_details` SQL View

## Tech Stack
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Prisma ORM
- **Database:** Neon Serverless PostgreSQL

## Setup
1. Clone the repo and copy `backend/.env.example` to `backend/.env` with your Neon pooled URL.
2. Backend: `cd backend && npm install && npx prisma db push && node seed.js && node index.js`
3. Frontend: `cd frontend && npm install && npm run dev`
"@ | Out-File -Encoding utf8 README.md
