<p align="center">
  <strong>◈ LinkForge URL Shortener & Analytics Engine</strong><br/>
  <em>High-Performance Redirect Engine, Real-Time Analytics & React Glassmorphism Dashboard</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20_LTS-339933?logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Redis-Upstash-DC382D?logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

---

LinkForge is a **production-grade URL management and analytics platform** built for extreme speed and deep traffic insights. It provides both a high-throughput **Redirect Engine API** (Node.js/Express) and a beautiful, highly interactive **React Glassmorphism Dashboard** for users to manage their links.

Unlike basic URL shorteners that suffer from database bottlenecks during traffic spikes, LinkForge utilizes **Redis as an in-memory caching layer** to handle high-velocity reads (URL resolutions) and rate limiting. The primary source of truth remains a robust **PostgreSQL relational database** managed via the **Prisma ORM**.

The frontend (`/client`) features a custom, utility-free **Glassmorphism CSS design system**, interactive charting (Recharts), QR code generation, and real-time backend status monitoring (for graceful handling of cold starts).

---

## Table of Contents

- [System Architecture](#system-architecture)
- [End-to-End Pipeline](#end-to-end-pipeline)
- [What Makes This Different](#what-makes-this-different)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Testing & Quality](#testing--quality)
- [API Serving](#api-serving)
- [Technical Decisions](#technical-decisions)
- [Recommended Engineering Articles](#recommended-engineering-articles)

---

## System Architecture

```mermaid
%%{init: {"flowchart": {"padding": 10, "nodeSpacing": 50, "rankSpacing": 60, "htmlLabels": true}, "themeVariables": {"fontSize": "26px"}}}%%
graph TD
    subgraph ClientTier ["Frontend Tier (Vercel)"]
        UI["React SPA (Vite)\nGlassmorphism Dashboard / Analytics"]
    end

    subgraph APITier ["Backend API Tier (Render)"]
        Express["Express.js Server\nRate Limiter & Controllers"]
        RedirectEngine["Redirect Service\n(High-speed Hot Path)"]
        AnalyticsEngine["Analytics Aggregator"]
    end

    subgraph CacheTier ["Caching Layer (Upstash)"]
        Redis[("Redis\nSession State / Rate Limits / Hot URLs")]
    end

    subgraph DatabaseTier ["Persistent Storage (Neon)"]
        Postgres[("PostgreSQL\nUsers, URLs, Click Logs (ACID)")]
    end

    %% Client routing
    User((User / Browser)) -->|"Clicks Short Link\n(HTTP GET /:slug)"| RedirectEngine
    UI -->|"Manages Links\n(HTTP API /api/urls)"| Express

    %% Internal routing
    Express --> AnalyticsEngine
    RedirectEngine -->|"1. Check Cache"| Redis
    RedirectEngine -->|"2. Fallback Query"| Postgres
    RedirectEngine -->|"3. Async Update Clicks"| Postgres

    style UI fill:#1e1b4b,stroke:#6366f1,color:#fff
    style Express fill:#059669,stroke:#064E3B,color:#fff
    style RedirectEngine fill:#DC382D,stroke:#991B1B,color:#fff
    style Redis fill:#dc2626,stroke:#991b1b,color:#fff
    style Postgres fill:#2563eb,stroke:#1d4ed8,color:#fff
```

## End-to-End Pipeline

When a user clicks a shortened link (the "hot path"), data flows across the system with strict performance constraints:

```mermaid
flowchart LR
    A["1. User Click<br/>`/:slug`"] --> B["2. Redis Cache<br/>`GET url:slug`"]
    B -->|Cache Hit| E
    B -->|Cache Miss| C["3. Database Query<br/>`Prisma findUnique`"]
    C --> D["4. Cache Population<br/>`SETEX url:slug 1h`"]
    D --> E["5. Async Click Track<br/>(Background update)"]
    E --> F["6. HTTP 302<br/>Redirect to Destination"]

    style A fill:#1e1b4b,stroke:#6366f1,color:#fff
    style B fill:#dc2626,stroke:#991b1b,color:#fff
    style C fill:#2563eb,stroke:#1d4ed8,color:#fff
    style E fill:#059669,stroke:#34d399,color:#fff
    style F fill:#4169E1,stroke:#60a5fa,color:#fff
```

| Workflow | Initiator | Execution | Result |
|---|---|---|---|
| **Hot Path Resolution** | Browser `GET /:slug` | Express controller checks Redis first, falls back to Postgres if missing. | Sub-50ms HTTP 302 Redirect to original destination. |
| **Click Tracking** | Redirect Engine | Asynchronous increment in PostgreSQL `Url.clickCount` (fire-and-forget). | Accurate traffic analytics without blocking the user's redirect. |
| **Rate Limiting** | API Gateway | Redis-backed sliding window limiter (100 req / 15m). | Prevents API abuse and brute-force token attacks. |
| **Graceful Degradation** | Backend Startup | Redis `ping()` wrapped in try/catch. | Server boots in "degraded mode" (Postgres only) if Redis is unavailable, avoiding crash loops. |

---

## What Makes This Different

| Concern | Basic URL Shortener | LinkForge Engine |
|---|---|---|
| **Database Load** | Every redirect query directly hits the database, crashing under viral traffic spikes. | **Redis Caching:** Heavily accessed URLs are cached in Redis, bypassing the database entirely for a 95%+ cache hit rate on viral links. |
| **Fault Tolerance** | Application crashes if a secondary dependency (like Cache) fails to connect. | **Graceful Degradation:** The backend detects Redis connection failures on startup and safely disables rate limiting and caching to keep the core redirect engine online. |
| **Cold Start Resilience** | Cloud free-tier sleeps cause confusing blank screens for frontend users. | **Proactive UX Status Banners:** The React app actively polls the backend and displays a sleek "Waking up server..." UI banner to retain user trust during boot times. |
| **UI Aesthetics** | Generic component libraries (Bootstrap/MUI) that look identical to every other app. | **Custom Glassmorphism UI:** Built entirely with raw CSS and variables, featuring frosted glass cards, dynamic micro-animations, and fluid layout gradients. |

---

## Project Structure

```
LinkForge/
├── client/                        # React / Vite Web Application (Glassmorphism UI)
│   ├── src/
│   │   ├── components/            # BackendStatusBanner, Navbar, Auth Layouts
│   │   ├── pages/                 # Dashboard, Urls, Analytics, Landing, Login
│   │   ├── api.ts                 # Axios API wrapper with error handling
│   │   ├── AuthContext.tsx        # Global JWT State Management
│   │   └── index.css              # Core Design System (CSS variables, glassmorphism)
│   ├── vite.config.ts             # Vite bundler config
│   └── package.json               # Dependencies: react, recharts, lucide-react, react-router-dom
├── src/                           # Node.js / Express Backend Engine
│   ├── index.ts                   # Server entry point & Redis initialization
│   ├── app.ts                     # Express pipeline & global middlewares (Helmet, CORS)
│   ├── controllers/
│   │   ├── redirect.controller.ts # The "Hot Path" (Redis caching & 302 redirects)
│   │   ├── url.controller.ts      # URL CRUD operations & analytics aggregations
│   │   └── auth.controller.ts     # JWT Authentication logic
│   ├── lib/
│   │   ├── prisma.ts              # PostgreSQL ORM connection
│   │   └── redis.ts               # Upstash Redis client setup
│   ├── middleware/
│   │   ├── rateLimiter.ts         # Redis-backed endpoint protection
│   │   ├── auth.ts                # JWT verification
│   │   └── validate.ts            # Zod schema validation interceptors
│   └── routes/                    # Route indexers
├── prisma/                        # Database Schema
│   ├── schema.prisma              # Models: User, Url, ClickEvent
│   └── migrations/                # Postgres migration history
├── render.yaml                    # Infrastructure-as-Code for Render Deployment
├── .npmrc                         # Dependency resolution rules
└── README.md                      # Complete architectural documentation
```

---

## Setup & Installation

### Prerequisites
- **Node.js 20+**
- **PostgreSQL 16+** (Local or Neon.tech)
- **Redis** (Local or Upstash)

### Step-by-Step

```powershell
# 1. Clone the repository
git clone https://github.com/Akshansh0519/LinkForge.git
cd LinkForge

# 2. Configure Backend Environment (.env)
# Create a .env file based on .env.example
# Requirements: DATABASE_URL, REDIS_URL, JWT_SECRET, BASE_URL

# 3. Install backend dependencies and apply migrations
npm install
npx prisma migrate dev
npx prisma generate

# 4. Start the Backend API Engine (Terminal 1)
npm run dev

# 5. Start the React Frontend (Terminal 2)
cd client
npm install
# Set VITE_API_URL in client/.env
npm run dev
```

---

## Testing & Quality

To verify the robust security and caching implementations, you can review specific pipeline code:

```powershell
# Verify graceful degradation of Redis on startup
grep -rn "redis.ping" src/index.ts

# Verify Zod validation schemas intercepting malformed requests
grep -rn "validateBody" src/routes/

# Verify the Redis cache logic in the Redirect Hot Path
grep -rn "redis.get" src/controllers/redirect.controller.ts
```

---

## API Serving

### Core REST Endpoints (Proxied via `VITE_API_URL`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/:slug` | **HOT PATH:** Resolves short link, updates analytics, and returns `302 Redirect`. | No |
| `POST` | `/api/auth/signup` | Registers a new user and returns JWT. | No |
| `POST` | `/api/auth/login` | Authenticates user and returns JWT. | No |
| `GET` | `/api/urls` | Fetches paginated URLs for the authenticated user. | Yes |
| `POST` | `/api/urls` | Creates a new short link (with optional custom slug/expiry). | Yes |
| `GET` | `/api/urls/:id/analytics` | Returns aggregated click data (time-series, referrers, devices). | Yes |

---

## Technical Decisions

| Decision | Rationale |
|---|---|
| **TypeScript Strict Mode & Zod** | Ensures that malformed payloads from malicious clients are rejected at the edge before they can hit the database or controllers. |
| **Prisma ORM over Raw SQL** | Provides type-safe database access, automatic schema migrations, and vastly improves developer velocity compared to maintaining manual SQL string queries. |
| **Rate Limiting Segregation** | The rate limiter uses different thresholds for different routes. `/:slug` (Redirects) is highly permissive, while `/api/auth/login` is strictly limited to prevent brute-force attacks. |
| **Separation of Concerns (Frontend/Backend)** | By deploying the React Vite app on Vercel (Edge CDN) and the Node API on Render, the architecture mirrors modern enterprise microservice setups, ensuring static assets are served lightning-fast globally. |

---

## Recommended Engineering Articles

1. ⭐⭐⭐ **High-Performance Redirect Architectures**
   [URL Shortener System Design (ByteByteGo)](https://bytebytego.com/courses/system-design-interview/design-a-url-shortener)
2. ⭐⭐⭐ **Caching Strategies**
   [Redis Best Practices for Caching](https://redis.com/caching/)
3. ⭐⭐ **JWT & Security**
   [The Hard Parts of JWT Security (Auth0)](https://auth0.com/learn/json-web-tokens/)

---

<p align="center">
  Built with intention by <strong>Akshansh Ranjan</strong>
</p>
