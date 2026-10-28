# IMovies — Full-Stack Cinema Management & Online Movie Ticket Booking Platform

[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://react.dev/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas%20%2F%20Mongoose%208.x-brightgreen.svg)](https://www.mongodb.com/atlas)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black.svg)](https://socket.io/)
[![Build Status](https://img.shields.io/badge/Build-Passing-success.svg)]()
[![Tests](https://img.shields.io/badge/Tests-104%20Passed%20(100%25)-success.svg)]()

**IMovies** is a full-stack cinema management and real-time movie ticket booking platform built with the MERN stack (MongoDB Atlas, Express.js, React.js with Vite, and Node.js). It offers real-time seat availability updates via WebSockets, atomic concurrency-controlled reservation holds, a development payment simulator, printable tickets with dynamic QR codes, and a comprehensive administration dashboard.

---

## 🏛️ System Architecture

```text
┌─────────────────────────┐          HTTP REST / JSON          ┌─────────────────────────┐
│     React 18 Frontend   │ ─────────────────────────────────> │    Express.js Backend   │
│   (Vite, Redux, Axios)  │ <───────────────────────────────── │    (Node 22 LTS, API)   │
└─────────────────────────┘      WebSocket (Socket.IO Rooms)   └────────────┬────────────┘
            ▲                                                               │
            │                      Real-Time Seat Hold Broadcasts           │ Mongoose 8 ODM
            └───────────────────────────────────────────────────────────────┘       │
                                                                                    ▼
                                                                       ┌─────────────────────────┐
                                                                       │   MongoDB Atlas Cluster │
                                                                       │     (Cloud Database)    │
                                                                       └─────────────────────────┘
```

- **Frontend (`client/`)**: Single-Page Application (SPA) with React 18, Vite, Redux Toolkit, and Bootstrap 5.
- **Backend (`server/`)**: Modular REST API with Express.js, Socket.IO, JWT authentication, and atomic seat reservation engine.
- **Database Layer**: Mongoose 8 ODM connected to MongoDB Atlas with strict schemas, indexes, and connection resilience.

---

## 🌟 Features

### 🎬 Customer Discovery & Experience
- **Cinematic Visuals**: Dark obsidian theme with rich crimson accents, movie backdrops, and trailer modal previews.
- **Dynamic Search & Filtering**: Debounced search by title, director, or cast; filters by status (Now Showing / Coming Soon), genres, and languages; multiple sorting modes.
- **Theatre & Showtime Discovery**: Browse auditoriums (IMAX Laser, 4DX, Dolby Atmos) and multi-day showtimes across major metro cities.
- **Authoritative Real-Time Seat Selection**: Interactive curved auditorium layout with silver, gold, and platinum tiers, aisle gaps, and live seat locks.
- **Instant WebSocket Synchronization**: Real-time broadcast of seat holds, releases, and confirmations using show-scoped Socket.IO rooms.

### 🛡️ Booking Engine & Concurrency Protection
- **Atomic Seat Holds**: Server-authoritative locks prevent race conditions and double bookings through atomic conditional MongoDB operations.
- **Hold Expiry Countdown**: Visual countdown timer (8-minute hold window) with background job release and on-the-fly cleanup.
- **Server-Authoritative Pricing**: Ticket pricing and convenience fees are computed exclusively on the server.
- **Payment Sandbox / Simulator**: Out-of-the-box interactive payment simulator supporting Card, UPI, and NetBanking with simulated decline tests, plus Razorpay and Stripe compatibility.
- **Printable E-Tickets with QR Code**: Base64 verification QR code with clean printable stylesheet.
- **Cancellations & Refunds**: Cancellation cutoff policy (up to 2 hours prior to showtime) with automatic seat inventory release and refund tracking.

### 👑 Administration Dashboard
- **Database-Derived Analytics**: Real metrics for total revenue (verified payments only), confirmed bookings, active movies, upcoming shows, and registered users.
- **Full Movie CRUD**: Create, edit, and delete movies with poster URLs and metadata.
- **Theatre & Screen Layout Configuration**: Customize seating layouts, rows, and screen amenities.
- **Show Scheduling with Overlap Prevention**: Intelligent scheduler that blocks conflicting shows on the same screen during the same time window.
- **Audit & Cancellation Override**: Search customer bookings and perform administrative refunds.
- **User Management**: View user accounts and toggle suspensions.

---

## 💻 Technology Stack

- **Frontend**: React 18, Vite, React Router v6, Redux Toolkit, Axios, Bootstrap 5, Lucide React, React Toastify, Socket.IO client, Canvas-Confetti.
- **Backend**: Node.js 22 LTS, Express.js, MongoDB Atlas / Mongoose 8, Socket.IO, JSON Web Tokens (JWT), bcryptjs, Helmet, express-rate-limit, Multer, QRCode.
- **Testing**: Vitest, Supertest, React Testing Library, and MongoMemoryServer.

---

## 📋 Prerequisites & macOS Setup

- **Node.js**: v20+ LTS (Tested on Node v22.x).
- **npm**: v10+.
- **MongoDB Atlas**: MongoDB Atlas cluster URI (`mongodb+srv://...`).
- **macOS Port Note**: On macOS Monterey, Ventura, and Sonoma, Apple's AirPlay Receiver occupies port 5000 (`ControlCenter`). The backend is pre-configured to port **5001** to avoid this port conflict.

---

## 🚀 Quick Start & Installation

### 1. Install Dependencies
```bash
# In the project root:
npm run install:all
```

### 2. Configure MongoDB Atlas Credentials
You can provide your credentials in either of two ways:

#### Option A: `atlas-credentials.env` (Automatic Discovery)
Place your `atlas-credentials.env` file in the project workspace (or `server/` directory):
```env
MONGODB_USERNAME="<your_atlas_user>"
MONGODB_PASSWORD="<your_atlas_password>"
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>"
```
The server automatically detects this file, sanitizes the URI, appends the database name (`/imovies`), and connects.

#### Option B: `server/.env`
Configure `MONGODB_URI` directly in `server/.env`:
```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/imovies?retryWrites=true&w=majority
JWT_ACCESS_SECRET=your_super_secret_jwt_access_token_key_change_in_production_2026
PAYMENT_PROVIDER=simulated
```

> [!IMPORTANT]
> **MongoDB Atlas Network Access (IP Whitelist)**:
> In your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/) -> **Network Access**:
> Ensure your IP address is whitelisted, or add `0.0.0.0/0` ("Allow Access From Anywhere"). If not whitelisted, Atlas terminates the connection during TLS handshake with `SSL alert number 80`.

### 3. Verify Database Connection
```bash
npm run db:check
```
This script connects to your MongoDB Atlas cluster, verifies the connection, and prints document counts across all collections.

### 4. Seed Database with Cinema Catalog
```bash
npm run seed
```
This populates:
- 5 feature movies (Interstellar, Cyberpunk 2099, Shadows of the Realm, etc.)
- 6 flagship multiplexes across Mumbai, Delhi, and Bengaluru
- 12 auditoriums with 60-seat layouts (Rows A–F with Silver, Gold, Platinum pricing)
- 72 scheduled shows across today and subsequent days
- Initialized 4,320 seat inventory records
- Pre-configured demo accounts.

### 5. Launch the Application
```bash
# Concurrently start backend (port 5001) and frontend (port 5173):
npm run dev
```

Visit **http://localhost:5173** in your browser!

---

## 🔑 Pre-Configured Demo Credentials

- **Admin Account**: `admin@imovies.com` / `Admin@123456`
- **Demo User Account**: `john@example.com` / `User@123456`

---

## 🧪 Running Automated Tests

```bash
# Run all automated tests (104/104 passing)
npm test

# Run backend integration tests (Auth, Seat concurrency, Double-booking protection)
npm run test:server

# Run frontend tests (Redux slices, SeatLegend, MovieCard components)
npm run test:client

# Verify frontend production build
npm run build
```

---

## 📁 Monorepo Structure

```text
imovies/
├── client/                     # React 18 + Vite Frontend
│   ├── src/
│   │   ├── components/         # Common, Movies, Booking, Admin UI components
│   │   ├── layouts/            # MainLayout & AdminLayout
│   │   ├── pages/              # 12 complete responsive pages
│   │   ├── services/           # Axios API services & Socket.IO client
│   │   ├── store/              # Redux Toolkit store (authSlice, bookingSlice)
│   │   └── styles/             # Cinematic dark theme tokens
├── server/                     # Express REST API & Socket.IO Real-Time Engine
│   ├── src/
│   │   ├── config/             # DB & environment config (Atlas connector)
│   │   ├── controllers/        # Request controllers
│   │   ├── models/             # 10 Mongoose schemas with indexes
│   │   ├── routes/             # REST routes under /api/v1
│   │   ├── services/           # SeatReservationService, PaymentService
│   │   ├── sockets/            # Socket.IO handlers
│   │   └── jobs/               # Expiry background worker
├── docs/                       # Technical specs & architecture documentation
└── postman/                    # Postman Collection
```

---

## 🤝 Troubleshooting

1. **Atlas Connection Rejected (`SSL alert number 80` / `ReplicaSetNoPrimary`)**:
   - Cause: Your current public IP is not in your MongoDB Atlas Network Access whitelist.
   - Solution: Log into [MongoDB Atlas](https://cloud.mongodb.com/) -> **Network Access** -> Click **+ Add IP Address** -> Select **Allow Access From Anywhere** (`0.0.0.0/0`) or add your current IP, and click **Confirm**.
2. **macOS Port 5000 in use (`EADDRINUSE`)**:
   - On macOS Monterey+, Apple ControlCenter / AirPlay Receiver listens on port 5000.
   - Solution: The project is pre-configured to port **5001** in `server/.env` and `client/.env`.
3. **Database Inspection**:
   - Run `npm run db:check` anytime to verify connection status and inspect collection counts.
