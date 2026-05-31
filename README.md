# LinkForge

![LinkForge Hero](https://via.placeholder.com/1200x400.png?text=LinkForge+-+Production+Ready+URL+Shortener)

A high-performance, production-ready URL shortening service built with a focus on speed, security, and scalability. 

LinkForge offers JWT authentication, asynchronous click tracking analytics, and utilizes advanced Redis patterns for cache-aside reads and sliding-window rate limiting.

## 🚀 Key Features

- **Link Management:** Create, manage, and delete custom shortened URLs.
- **Analytics Dashboard:** Track click counts and monitor link performance via an asynchronous "fire-and-forget" tracking pipeline.
- **Lightning Fast Redirects:** Implements a Redis cache-aside pattern to ensure single-digit millisecond latency for redirecting users.
- **Robust Security:** 
  - JWT-based authentication with token refresh mechanisms.
  - Sliding-window rate limiting (via Redis sorted sets) to prevent abuse and brute-force attacks.
- **End-to-End Type Safety:** Strict TypeScript typing from the database schema to the React components.

## 🛠️ Technology Stack

**Frontend:**
- [React 18](https://react.dev/) initialized with [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Lucide React](https://lucide.dev/) for iconography

**Backend:**
- [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
- [Zod](https://zod.dev/) for strict runtime validation
- [Prisma ORM](https://www.prisma.io/)

**Data & Infrastructure:**
- **PostgreSQL**: Primary data store for Users, URLs, and Click analytics.
- **Redis**: High-speed caching layer and rate limiter state store.
- **Docker**: Containerized infrastructure for easy local development and deployment.
- **GitHub Actions**: Automated CI pipeline.

## 📦 Getting Started

### Prerequisites
Make sure you have the following installed on your machine:
- [Node.js](https://nodejs.org/en/) (v18 or higher)
- [Docker](https://www.docker.com/) and Docker Compose

### 1. Clone the Repository
```bash
git clone https://github.com/Akshansh0519/LinkForge.git
cd LinkForge
```

### 2. Environment Setup
Create a `.env` file in the root directory based on the `.env.example` file.
```bash
cp .env.example .env
```
Ensure you have the connection strings for Postgres, Redis, and a JWT Secret set.

### 3. Start Infrastructure (Docker)
Spin up PostgreSQL and Redis using Docker Compose:
```bash
docker-compose up -d
```

### 4. Setup the Backend
Install dependencies and run database migrations:
```bash
npm install
npx prisma generate
npx prisma migrate dev
```
Start the backend development server:
```bash
npm run dev
```

### 5. Setup the Frontend
Open a new terminal window, navigate to the `client` folder, and start the Vite app:
```bash
cd client
npm install
npm run dev
```

## 🧪 Testing

A load testing script is included to test the resilience of the rate limiters and cache layers under high concurrent traffic.

```bash
node scripts/load-test.js
```

## 📄 License
This project is licensed under the MIT License.
