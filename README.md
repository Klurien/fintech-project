# 🛒 Duka Ledger — Financial Inclusion for the Informal Sector

> Empowering small-scale traders and informal vendors with simple, intuitive tools to track their cash flow — no accounting knowledge required.

---

## 📌 Problem Statement

Millions of small-scale traders and informal vendors across Africa and the Global South operate without formal financial tools. This makes it nearly impossible to answer the most basic business question: *"Am I making a profit?"*

Manual bookkeeping is time-consuming, literacy barriers exist, and most accounting software is designed for formal businesses. **Duka Ledger** bridges this gap.

---

## 🎯 Challenge Goal

Build an **intuitive, accessible interface** that simplifies accounting for non-technical users in low-resource environments — enabling them to log sales, track expenses, and understand their financial health at a glance.

---

## ✨ Key Features

### 🎙️ 1. Voice-to-Ledger
Log transactions hands-free using natural language voice commands.

- Say *"Sold 2kg of tomatoes for 200 shillings"* and the app automatically parses and records the transaction.
- Supports local languages and informal phrasing.
- Powered by on-device speech recognition + AI intent parsing.
- Ideal for busy vendors who can't stop to type.

**Example commands:**
```
"Bought 10 litres of cooking oil for 1500 shillings"
"Sold a bag of maize for 800 bob"
"Paid 300 for transport"
```

---

### 📷 2. Photo-to-Text Receipt Scanning
Capture expenses instantly by photographing receipts — no manual typing needed.

- Point your camera at any receipt or supplier invoice.
- AI-powered OCR extracts vendor name, items, amounts, and date automatically.
- Parsed data is previewed for quick confirmation before saving.
- Works with handwritten receipts and printed slips.

---

### 📊 3. Visual Financial Health Dashboard
Understand your business performance through simple, beautiful visuals.

- **Daily Profit vs. Loss** bar chart — at-a-glance overview of each day.
- **Weekly & Monthly Trends** — spot patterns over time.
- **Top Expenses Breakdown** — pie chart showing where money is going.
- **Running Balance** — always know your current position.
- Designed with **low-literacy users** in mind: big numbers, color-coded indicators (green = profit, red = loss), and minimal jargon.

---

### 📶 4. Offline Resilience
Built for areas with unreliable or no internet connectivity.

- All core features (voice logging, receipt scanning, dashboard) work **fully offline**.
- Data is stored locally on-device using an embedded database.
- Automatic **background sync** when connectivity is restored.
- Conflict resolution ensures no data is lost during sync.
- Lightweight app size optimized for low-end Android devices.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native / Flutter |
| Voice Recognition | Web Speech API / Whisper (on-device) |
| OCR / Receipt Parsing | Google ML Kit / Tesseract + Claude AI |
| Local Storage | SQLite / Realm |
| Backend & Sync | Node.js + PostgreSQL |
| Auth | Phone number OTP (no email required) |
| Charts | Victory Native / fl_chart |

---

## 📁 Project Structure

```
duka-ledger/
├── app/                    # Mobile application source
│   ├── screens/            # UI screens (Dashboard, Ledger, Scan, etc.)
│   ├── components/         # Reusable UI components
│   ├── services/
│   │   ├── voice/          # Voice recognition & NLP parsing
│   │   ├── ocr/            # Receipt scanning & text extraction
│   │   ├── sync/           # Offline sync logic
│   │   └── storage/        # Local database layer
│   └── utils/              # Helpers & formatters
├── backend/                # API server
│   ├── routes/             # REST API endpoints
│   ├── models/             # Database models
│   └── sync/               # Sync conflict resolution
├── ai/                     # AI/NLP models & prompts
│   ├── voice_parser/       # Transaction intent extraction
│   └── receipt_parser/     # OCR post-processing
├── docs/                   # Documentation & design assets
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- React Native CLI or Flutter SDK
- Android Studio (for emulator) or a physical Android device
- PostgreSQL (for backend)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/duka-ledger.git
cd duka-ledger

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys and database URL

# Start the backend
cd backend && npm run dev

# Run the mobile app
cd app && npx react-native run-android
```

---

## 🌍 Target Users

- **Market vendors** — selling produce, goods, or food in open-air markets.
- **Kiosk operators** — running small neighbourhood shops (dukas).
- **Boda boda / transport operators** — tracking daily earnings and fuel costs.
- **Artisans & service providers** — tailors, mechanics, salons tracking income and supplies.

---

## 🔐 Privacy & Data

- All transaction data is **stored locally first** and only synced with explicit user consent.
- No personally identifiable financial data is shared with third parties.
- Users own their data and can export or delete it at any time.

---

## 🤝 Contributing

We welcome contributions! Please read our [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines on how to submit issues, propose features, or open pull requests.

---

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.

---

## 💡 Inspiration

> *"If you can't measure it, you can't improve it."*

Most financial tools are built for people who already have money and know how to manage it. Duka Ledger is built for the people who are *building* their financial future — one sale at a time.

---

*Built with ❤️ for the FinTech: Financial Inclusion Hackathon*
