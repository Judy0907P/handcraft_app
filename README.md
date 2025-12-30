# Handcraft Management App (Web + Mobile)

A lightweight inventory management system for my handcraft business. It supports user creation and login, store (orgnization) creations. Within each store, it can help a user to manage parts inventory, product inventory, keep track of costs, record selling price for each selling activity, keep trakc of profits, how to make certain products with parts (recipe), and dynamically update inventory based on production/sale events.

---

## High-level roadmap

### Phase 1 — Database first (foundation)
**Goal:** reliable schema + ability to simulate business workflows via SQL queries.

Deliverables:
- PostgreSQL running locally (WSL + Mac compatible)
- Schema for parts, product styles, BOM, production, orders
- Sample data (seed) + useful queries
- (Recommended) Alembic migrations as the source of truth

### Phase 2 — Backend API (FastAPI)
**Goal:** provide a clean REST API for the frontend and future mobile app.

Deliverables:
- FastAPI + SQLAlchemy project
- CRUD APIs for parts/products/BOM/orders/production
- Business logic services (inventory deduction, BOM calculation, etc.)
- OpenAPI docs (Swagger) auto-generated

### Phase 3 — Web admin UI
**Goal:** manage everything from a browser (desktop-friendly operations UI).

Deliverables:
- React or Next.js frontend
- Pages: Dashboard, Parts, Product Styles, BOM Editor, Production Plans, Orders
- Authentication may come later (optional depending on needs)

### Phase 4 — Cloud deployment
**Goal:** run everything on a cloud server.

Deliverables:
- Deploy backend + DB + frontend
- Options: Railway / Render / Fly.io (low ops overhead)
- Environment variables & basic monitoring

### Phase 5 — Mobile app
**Goal:** quick operations on phone (especially useful during craft fairs).

Deliverables:
- React Native / Expo app (reuses API)
- Quick views & actions: stock check, order creation, inventory adjustments
- Potential add-ons: barcode scanning, photo attachments

---

## Recommended tech stack

- **Database:** PostgreSQL
- **Backend:** Python + FastAPI + SQLAlchemy
- **Migrations:** Alembic (recommended)
- **Web frontend:** React or Next.js + Tailwind CSS
- **Mobile (later):** React Native / Expo
- **Local dev:** Docker Compose
- **Cloud (later):** Railway / Render / Fly.io

---

## Expected repository structure (monorepo)

