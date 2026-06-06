# VendorAssist 🛒

> **Financial Inclusion for the Informal Sector** — A simple, powerful accounting tool built for small-scale traders and informal vendors.

---

## Table of Contents

- [Overview](#overview)
- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Offline Resilience](#offline-resilience)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**VendorAssist** is a FinTech application designed to bring financial literacy and bookkeeping to informal sector vendors — market traders, roadside sellers, and small business owners — who have historically been excluded from formal financial tools. With voice-based transaction logging, AI-powered receipt scanning, and an intuitive visual dashboard, VendorAssist makes accounting accessible to everyone, regardless of their technical background.

---

## Problem Statement

Small-scale traders and informal vendors often lack formal tools to track their cash flow, making it difficult to know whether they are making a profit or a loss. Traditional accounting software is too complex, expensive, or requires reliable internet access — barriers that shut out millions of entrepreneurs at the grassroots level.

VendorAssist solves this by providing:

- A **zero-friction** interface that requires no accounting knowledge
- **Voice-first** transaction logging in natural language
- **Offline-first** architecture for low-connectivity areas
- **Visual dashboards** that translate numbers into clear, actionable insights

---

## Key Features

### 🎙️ Voice-to-Ledger
Log transactions using natural language voice commands without typing a single character.

- Example: *"Sold 2kg of tomatoes for 200 shillings"*
- Supports local languages and conversational phrasing
- Automatically categorizes transactions as income or expense
- Confirms entries before saving to prevent errors

### 📷 Photo-to-Text Receipt Scanning
Snap a photo of any receipt and let AI extract the details automatically.

- Powered by OCR and AI parsing via the Anthropic Claude API
- Captures vendor name, items, amounts, and dates
- Eliminates manual data entry for supplier purchases
- Works with handwritten and printed receipts

### 📊 Visual Financial Health Dashboard
Understand your business at a glance through clean, simple charts.

- Daily, weekly, and monthly profit vs. loss charts
- Top-selling products and highest expense categories
- Running cash balance tracker
- Color-coded health indicators (green = profit, red = loss)
- Plain-language summaries (e.g., *"You made a profit of KSh 450 today"*)

### 📡 Offline Resilience
Built to work in areas with limited or no internet connectivity.

- All core features function fully offline using IndexedDB
- Transactions queued locally and automatically synced when online
- Sync status indicator visible at all times
- Conflict resolution for any data discrepancies during sync

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript |
| Backend | Node.js + Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| AI / OCR | Anthropic Claude API |
| Speech Recognition | Web Speech API / Whisper |
| Offline Storage | IndexedDB (via Dexie.js) |
| Auth | JWT + bcrypt |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Testing | Jest + React Testing Library |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  VendorAssist Client                │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  Voice Input │  │ Receipt Scan │  │ Dashboard │  │
│  └──────┬──────┘  └──────┬───────┘  └─────┬─────┘  │
│         │                │                │         │
│  ┌──────▼────────────────▼────────────────▼──────┐  │
│  │           React + TypeScript (UI Layer)       │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼────────────────────────┐  │
│  │        IndexedDB (Offline Queue / Cache)      │  │
│  └──────────────────────┬────────────────────────┘  │
└─────────────────────────┼───────────────────────────┘
                          │ HTTP / REST (when online)
┌─────────────────────────▼───────────────────────────┐
│                  Node.js + Express API              │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Auth      │  │ Transactions │  │ AI/OCR      │  │
│  │  Routes    │  │ Routes       │  │ Routes      │  │
│  └─────┬──────┘  └──────┬───────┘  └──────┬──────┘  │
│        │                │                 │          │
│  ┌─────▼────────────────▼─────────────────▼──────┐  │
│  │                 Prisma ORM                    │  │
│  └──────────────────────┬────────────────────────┘  │
│                         │                           │
│  ┌──────────────────────▼────────────────────────┐  │
│  │              PostgreSQL Database              │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │            Anthropic Claude API               │  │
│  │    (Receipt OCR + Voice NLP Processing)       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [npm](https://www.npmjs.com/) v9 or higher
- [PostgreSQL](https://www.postgresql.org/) v14 or higher
- An [Anthropic API key](https://console.anthropic.com/) for AI features

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/your-org/vendor-assist.git
cd vendor-assist
```

2. **Install dependencies for both client and server**

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..

# Install backend dependencies
cd server && npm install && cd ..
```

3. **Set up the database**

```bash
# Create the PostgreSQL database
createdb vendor_assist_db

# Run Prisma migrations
cd server
npx prisma migrate dev --name init
npx prisma generate
```

### Environment Variables

Create a `.env` file inside the `/server` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://your_user:your_password@localhost:5432/vendor_assist_db

# Auth
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# Anthropic AI
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Create a `.env` file inside the `/client` directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the App

**Development mode (run both simultaneously):**

```bash
# From the project root
npm run dev
```

Or run separately:

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm start
```

The app will be available at:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

**Production build:**

```bash
# Build the frontend
cd client && npm run build

# Start the production server
cd server && npm start
```

---

## Project Structure

```
vendor-assist/
├── client/                     # React + TypeScript frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard/      # Financial health charts
│   │   │   ├── VoiceInput/     # Voice-to-ledger component
│   │   │   ├── ReceiptScanner/ # Photo-to-text scanner
│   │   │   ├── Ledger/         # Transaction list & history
│   │   │   └── shared/         # Reusable UI components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/
│   │   │   ├── api.ts          # Axios API client
│   │   │   └── offlineSync.ts  # IndexedDB sync service
│   │   ├── store/              # State management (Context/Redux)
│   │   ├── types/              # TypeScript interfaces
│   │   └── utils/
│   └── package.json
│
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── transactions.controller.ts
│   │   │   └── ai.controller.ts
│   │   ├── routes/
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   └── error.middleware.ts
│   │   ├── services/
│   │   │   ├── anthropic.service.ts  # Claude AI integration
│   │   │   └── voice.service.ts      # Voice NLP parsing
│   │   └── app.ts
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── migrations/
│   └── package.json
│
├── README.md
└── package.json
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new vendor account |
| POST | `/api/auth/login` | Login and receive JWT token |
| POST | `/api/auth/refresh` | Refresh access token |

### Transactions
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | Get all transactions (paginated) |
| POST | `/api/transactions` | Create a new transaction |
| PUT | `/api/transactions/:id` | Update a transaction |
| DELETE | `/api/transactions/:id` | Delete a transaction |
| POST | `/api/transactions/bulk-sync` | Sync offline transactions |

### AI Features
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/parse-voice` | Parse voice command into a transaction |
| POST | `/api/ai/scan-receipt` | Extract data from a receipt image |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Get profit/loss summary |
| GET | `/api/dashboard/chart-data` | Get time-series data for charts |

---

## Offline Resilience

VendorAssist is built **offline-first**. Here is how it works:

1. **All transactions** are written to IndexedDB immediately, regardless of connectivity.
2. A **background sync service** monitors network status using the `navigator.onLine` API.
3. When connectivity is restored, pending transactions are automatically **flushed to the server**.
4. The UI displays a **sync status badge** so users always know their data state:
   - 🟢 Synced — All data is up to date
   - 🟡 Pending — Changes waiting to sync
   - 🔴 Offline — Working in offline mode
5. **Conflict resolution** follows a "last-write-wins" strategy with server timestamp authority.

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

> Built with ❤️ to empower informal sector vendors across Africa and beyond.
