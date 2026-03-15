# VaastuGPT 🏠✨

> **AI-Powered Floor Plan Generation with Vaastu Shastra Principles**

VaastuGPT is a full-stack web application that generates house floor plans in seconds by combining machine learning (K-Nearest Neighbors) with ancient Indian architectural science (Vaastu Shastra). Users describe their ideal home through a conversational AI chat or a manual controls panel, and the app instantly returns a matching floor plan along with a Vaastu compatibility score and insights.

---

## Table of Contents

1. [What is VaastuGPT?](#1-what-is-vaastugpt)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture Overview](#4-architecture-overview)
5. [End-to-End User Flow](#5-end-to-end-user-flow)
6. [Backend Deep-Dive](#6-backend-deep-dive)
7. [Frontend Deep-Dive](#7-frontend-deep-dive)
8. [API Reference](#8-api-reference)
9. [Setup & Installation](#9-setup--installation)
10. [Environment Variables](#10-environment-variables)
11. [Running the App](#11-running-the-app)
12. [Key Design Decisions](#12-key-design-decisions)

---

## 1. What is VaastuGPT?

Traditional architectural drafting takes weeks. VaastuGPT's goal is to eliminate that wait for the initial ideation phase. A user provides four simple requirements:

| Parameter        | Range         | Example |
|-----------------|---------------|---------|
| Square Footage  | 500 – 8,000 ft² | 2,500   |
| Bedrooms        | 1 – 5         | 3       |
| Bathrooms       | 1 – 4         | 2       |
| Garage capacity | 1 – 3 cars    | 2       |

The system searches a dataset of **2 640 real house plans**, finds the closest match using KNN, and returns the floor-plan image together with:
- **Match Confidence** (75 – 100 %) — how similar the found plan is to the request
- **Vaastu Score** (82 – 98) — a deterministic score based on the plan's filename hash
- **Vaastu Insights** — 2–3 traditional architectural recommendations for the matched plan

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend framework** | Next.js 16 (React 19, TypeScript 5) | Pages, routing, server-side API routes |
| **Frontend styling** | Tailwind CSS 4, Radix UI, shadcn/ui, Framer Motion | UI components and animations |
| **AI chat** | Google Gemini 1.5 Flash (`@google/generative-ai`) | Conversational parameter gathering |
| **Form handling** | React Hook Form + Zod | Manual-mode input validation |
| **Backend** | Python 3, Flask, Flask-CORS | REST API server |
| **Machine learning** | scikit-learn (`NearestNeighbors`, `StandardScaler`) | Floor-plan matching |
| **Data processing** | pandas, numpy | CSV loading & feature scaling |
| **Icons** | lucide-react | UI icons |
| **Toast notifications** | sonner | In-app alerts |

---

## 3. Project Structure

```
VaastuGPT/
│
├── README.md                          ← You are here
│
├── Backend/
│   ├── app.py                         ← Flask API server (all backend logic)
│   └── dataset/
│       ├── house_plans_details.csv    ← 2 640 rows: Image Path, Sq Ft, Beds, Baths, Garages
│       └── images/images/             ← 2 640 floor-plan JPEG images (~69 MB)
│
└── Frontend/
    ├── app/
    │   ├── layout.tsx                 ← Root HTML layout
    │   ├── globals.css                ← Global CSS (Tailwind base)
    │   ├── page.tsx                   ← Landing / home page
    │   ├── chat/
    │   │   └── page.tsx               ← Chat-mode page
    │   ├── manual/
    │   │   └── page.tsx               ← Manual-mode page
    │   └── api/
    │       └── chat/
    │           └── route.ts           ← Next.js API route → Gemini AI bridge
    ├── components/
    │   ├── chatbot-panel.tsx          ← Chat UI (messages, Gemini calls, JSON parsing)
    │   ├── input-panel.tsx            ← Manual controls (sliders, buttons)
    │   ├── loading-state.tsx          ← 4-step animated loading screen
    │   ├── theme-provider.tsx         ← Light/dark theme wrapper
    │   └── ui/                        ← 20+ Radix UI / shadcn components
    ├── hooks/                         ← Custom React hooks
    ├── lib/                           ← Utility functions (cn, etc.)
    ├── public/                        ← Static assets
    ├── package.json
    ├── tsconfig.json
    ├── next.config.mjs
    ├── tailwind.config.js
    └── components.json                ← shadcn/ui configuration
```

---

## 4. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER BROWSER                         │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  Landing     │   │  Chat Mode   │   │  Manual Mode   │  │
│  │  page.tsx    │   │  /chat       │   │  /manual       │  │
│  └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│         │                  │                   │           │
└─────────┼──────────────────┼───────────────────┼───────────┘
          │                  │                   │
          │          ┌───────▼───────┐           │
          │          │  Next.js      │           │
          │          │  API Route    │           │
          │          │  /api/chat    │           │
          │          └───────┬───────┘           │
          │                  │                   │
          │          ┌───────▼───────┐           │
          │          │ Google Gemini │           │
          │          │ 1.5 Flash API │           │
          │          └───────────────┘           │
          │                                      │
          │          POST /generate              │
          └──────────────────┬───────────────────┘
                             │
                   ┌─────────▼──────────┐
                   │   Flask Backend    │
                   │   (Port 5001)      │
                   │                   │
                   │  StandardScaler   │
                   │       ↓           │
                   │  KNN Model (k=10) │
                   │       ↓           │
                   │  CSV Dataset      │
                   │  (2 640 plans)    │
                   │       ↓           │
                   │  Vaastu Scorer    │
                   └────────┬──────────┘
                            │
                   ┌────────▼──────────┐
                   │  GET /image/<fn>  │
                   │  (JPEG file)      │
                   └───────────────────┘
```

**Data flow in one sentence:** The browser sends 4 numbers → Flask scales them, runs KNN, picks the closest floor plan from disk, attaches a Vaastu profile → browser displays the image and metadata.

---

## 5. End-to-End User Flow

### Landing Page (`/`)
- Amber-themed hero with branding, tagline, and a feature grid
- Two CTAs: **"Try Chat Assistant"** and **"Manual Builder"**
- Waitlist email sign-up form (UI only; backend integration not yet wired)

---

### Chat Mode (`/chat`)

```
User opens /chat
       │
       ▼
ChatbotPanel renders with an initial greeting message
       │
       ▼
User types a message  ──►  POST /api/chat (Next.js route)
                                   │
                            Google Gemini 1.5 Flash
                            (system prompt: VaastuGPT persona)
                                   │
                     ◄─────────── AI replies with next question
                                   │
                     Repeat until all 4 params are collected
                                   │
                     AI sends final JSON:
                     {"COMPLETE": true, "sq_ft": 2500,
                      "bedrooms": 3, "bathrooms": 2, "garage": 2}
                                   │
                     ChatbotPanel detects "COMPLETE" key,
                     parses JSON, calls onSubmit()
                                   │
                     LoadingState shown  →  POST /generate (Flask)
                                   │
                     Result displayed: image + Vaastu card
```

**Gemini System Prompt (summarised):** The model plays "VaastuGPT, a master traditional Indian architect". It asks for one parameter at a time with warmth and light Vaastu commentary. Once all four values are confirmed it outputs **only** the JSON completion object — no surrounding text.

---

### Manual Mode (`/manual`)

```
User opens /manual
       │
       ▼
InputPanel rendered:
  • Floor Area  slider  500 – 8,000 ft²
  • Bedrooms    buttons 1 / 2 / 3 / 4 / 5
  • Bathrooms   buttons 1 / 2 / 3 / 4
  • Garages     buttons 1 / 2 / 3
       │
User clicks "Generate Layout"
       │
       ▼
LoadingState shown  →  POST /generate (Flask)
       │
Result displayed: image + Vaastu card
```

---

### Result Display (both modes)
- Floor-plan image rendered via `<img src="http://127.0.0.1:5001/image/<filename>">` (served live by Flask)
- **Match Confidence** badge (e.g. "92 % match")
- **Vaastu Score** badge (e.g. "94 / 100")
- Plan details: actual sq ft, beds, baths, garage from the matched row
- **2–3 Vaastu insights** displayed as bullet points
- "Clear Canvas" button to reset and try again

---

## 6. Backend Deep-Dive

File: `Backend/app.py`

### Startup sequence

```python
init_ml_model()   # runs once at import time
```

1. Reads `house_plans_details.csv` with pandas.
2. Cleans & converts columns (`Square Feet`, `Beds`, `Baths`, `Garages`) to numbers.
3. Extracts just the filename from the `Image Path` column.
4. Fits a `StandardScaler` on the 4 feature columns.
5. Trains a `NearestNeighbors(n_neighbors=10, metric='minkowski')` model on the scaled features.

### `POST /generate`

```
Request body:  { "sq_ft": int, "bedrooms": int, "bathrooms": int, "garage": int }
Response body: { "image_url": string, "details": { ...plan fields, "vaastu": {...} } }
```

**Step-by-step:**

| Step | Code action |
|------|-------------|
| 1. Parse input | Extract 4 ints from JSON body |
| 2. Track history | `query_history[key]` increments so repeated identical queries return different (rotating) results |
| 3. Artificial delay | `time.sleep(3–4.5 s)` — simulates a real ML inference pipeline for UX purposes |
| 4. Scale input | `scaler.transform([[sq_ft, beds, baths, garage]])` |
| 5. KNN search | `nn_model.kneighbors(scaled_query)` → top-10 distances + indices |
| 6. Pick result | Cycles through the 10 neighbours on repeated queries |
| 7. Match % | `max(75, min(100, int(100 - dist * 10)))` — converts Euclidean distance to a readable percentage |
| 8. Vaastu profile | `generate_vaastu_score(filename)` — deterministic hash-based score + insight sample |
| 9. Return | JSON with `image_url` pointing to `/image/<filename>` and full details |

### `GET /image/<filename>`

Serves the raw JPEG from `Backend/dataset/images/images/<filename>`.

### `generate_vaastu_score(filename)`

```python
hash_val = int(hashlib.md5(filename.encode()).hexdigest(), 16)
score    = 82 + (hash_val % 17)          # always 82–98
insights = random.sample(VAASTU_NOTES, 2 + hash_val % 2)  # 2 or 3 items
```

Because the hash is deterministic, the **same floor-plan always gets the same Vaastu score** — no random variance between page reloads.

### Vaastu note pool (`VAASTU_NOTES`)

Eight traditional insights that are randomly sampled per plan:

- Master Bedroom → South-West corner
- Kitchen → South-East (Agni/Fire element)
- Main entrance → East or North-East
- Central space (Brahmasthan) kept open
- Guest room → North-West
- Bathrooms isolated from living areas
- Staircase → South or West
- Water elements → North-East

---

## 7. Frontend Deep-Dive

### `app/api/chat/route.ts` — Gemini bridge

This **Next.js API Route** is the only server-side piece of the frontend. It:

1. Validates the `GEMINI_API_KEY` environment variable.
2. Formats the incoming `messages` array into Gemini's `history` format (renaming `"assistant"` → `"model"`).
3. Calls `model.startChat({ history }).sendMessage(latestMessage)`.
4. Returns `{ text: responseText }` to the browser.

The route keeps the API key secret — the browser never touches the Gemini API directly.

---

### `components/chatbot-panel.tsx`

| Responsibility | Detail |
|----------------|--------|
| Message state | `useState<Message[]>` — array of `{ role, content }` |
| Auto-scroll | `useEffect` + `ref.scrollIntoView` after every new message |
| Send message | `POST /api/chat` with full message history |
| JSON detection | Checks response for `"COMPLETE":` substring → tries `JSON.parse` |
| Trigger generation | Calls `onSubmit(params)` after 1 s delay so user sees the confirmation message |
| Loading indicator | Three bouncing dots animated via Tailwind `animate-bounce` with staggered delays |
| Error display | Red banner above input box |

---

### `components/input-panel.tsx`

| Control | Type | Range / Options |
|---------|------|----------------|
| Floor Area | `<input type="range">` | 500 – 8,000 ft² |
| Bedrooms | Toggle button group | 1, 2, 3, 4, 5 |
| Bathrooms | Toggle button group | 1, 2, 3, 4 |
| Garages | Toggle button group | 1, 2, 3 |
| Generate Layout | Submit button | Calls `onSubmit()` |

Default values: 2,500 ft², 3 beds, 2 baths, 2 garages.

---

### `components/loading-state.tsx`

Animated 4-step progress display shown while waiting for the Flask response:

1. Analysing requirements
2. Searching floor-plan database
3. Applying Vaastu optimisation
4. Finalising layout

---

### Page components

| Page | Route | Purpose |
|------|-------|---------|
| `app/page.tsx` | `/` | Landing page — hero, feature cards, waitlist form, footer |
| `app/chat/page.tsx` | `/chat` | Two-column layout: `ChatbotPanel` (left) + canvas/result (right) |
| `app/manual/page.tsx` | `/manual` | Two-column layout: `InputPanel` (left) + canvas/result (right) |

Both `/chat` and `/manual` follow the same state machine:

```
"idle"  →  "loading"  →  "result"
                ↑
           (clear button)
```

---

## 8. API Reference

### `POST /generate`  _(Flask, port 5001)_

**Request**
```json
{
  "sq_ft":     2500,
  "bedrooms":  3,
  "bathrooms": 2,
  "garage":    2
}
```

**Response**
```json
{
  "image_url": "http://127.0.0.1:5001/image/plan_0042.jpg?t=1710000000",
  "details": {
    "filename":         "plan_0042.jpg",
    "sq_ft":            2480,
    "bedrooms":         3,
    "bathrooms":        2,
    "garage":           2,
    "match_confidence": 94,
    "vaastu": {
      "score": 91,
      "insights": [
        "Master Bedroom aligns with South-West corner for stability and leadership.",
        "Kitchen mapped near South-East region, optimizing Agni (Fire) elements."
      ]
    }
  }
}
```

**Error response** (ML model not ready)
```json
{ "error": "ML Model not initialized" }   // HTTP 500
```

---

### `GET /image/<filename>`  _(Flask, port 5001)_

Returns the raw JPEG bytes for the given filename.  
Returns `"Not found"` with HTTP 404 if the file doesn't exist.

---

### `POST /api/chat`  _(Next.js, port 3000)_

**Request**
```json
{
  "messages": [
    { "role": "assistant", "content": "Hello! What size home..." },
    { "role": "user",      "content": "Around 2500 sqft" }
  ]
}
```

**Response** (mid-conversation)
```json
{ "text": "Great choice! How many bedrooms would you like?" }
```

**Response** (all 4 params collected)
```json
{ "text": "{\"COMPLETE\": true, \"sq_ft\": 2500, \"bedrooms\": 3, \"bathrooms\": 2, \"garage\": 2}" }
```

**Error response**
```json
{ "error": "Please add GEMINI_API_KEY to your .env.local file..." }  // HTTP 500
```

---

## 9. Setup & Installation

### Prerequisites

- **Node.js** ≥ 18 and npm
- **Python** ≥ 3.9
- A **Google Gemini API key** (free tier available at [aistudio.google.com](https://aistudio.google.com/))

---

### Backend setup

```bash
cd Backend

# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# Install Python dependencies
pip install flask flask-cors pandas numpy scikit-learn
```

Ensure the dataset files are present:
```
Backend/dataset/house_plans_details.csv
Backend/dataset/images/images/*.jpg   (2 640 images)
```

---

### Frontend setup

```bash
cd Frontend

# Install Node dependencies
npm install
```

---

## 10. Environment Variables

Create a file called `.env.local` inside the `Frontend/` folder:

```
# Frontend/.env.local
GEMINI_API_KEY=your_google_gemini_api_key_here
```

> **Note:** This file is listed in `.gitignore` and will never be committed.  
> The Manual Builder mode does **not** need this key — it only communicates with Flask.  
> The Chat Assistant mode **requires** this key to talk to Gemini.

---

## 11. Running the App

You need **two terminal windows** running simultaneously.

### Terminal 1 — Start the Flask backend

```bash
cd Backend
source venv/bin/activate        # if using a venv
python app.py
```

Expected output:
```
✅ LOADED DATASET: 2640 entries.
✅ ML MODEL INITIALIZED.
🚀 Backend Running (Port 5001)
 * Running on http://127.0.0.1:5001
```

### Terminal 2 — Start the Next.js frontend

```bash
cd Frontend
npm run dev
```

Expected output:
```
▲ Next.js 16.0.3
- Local:   http://localhost:3000
```

Open **http://localhost:3000** in your browser.

---

### Other frontend commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot-reload |
| `npm run build` | Production build |
| `npm run start` | Start production server (after build) |
| `npm run lint` | Run ESLint |

---

## 12. Key Design Decisions

### Why KNN instead of a generative model?
KNN on a curated 2 640-plan dataset is fast, deterministic, and produces real, proven floor plans rather than hallucinated ones. The system prompt in `route.ts` acknowledges this is "Private Beta v1.0" — a generative model is mentioned as a future premium feature.

### Why the artificial delay?
`time.sleep(3–4.5 seconds)` in `/generate` is intentional. It makes the experience feel like a real ML pipeline is running and gives the animated loading screen time to play through all four steps. This improves perceived quality.

### Why is the Vaastu score deterministic?
The MD5 hash of the filename seeds the score and insight selection. This means the same floor plan always shows the same Vaastu profile — refreshing the page or regenerating with identical inputs won't cause confusing score changes.

### Why Next.js API Routes for Gemini?
The `GEMINI_API_KEY` must stay server-side. Using a Next.js API route (`/api/chat`) means the key is never exposed to the browser's network tab or bundled JavaScript.

### Rotating KNN results
`query_history` in the Flask global state tracks how many times each `(sq_ft, beds, baths, garage)` combination has been requested. Subsequent identical requests cycle through neighbours 1–10, giving users variety on repeated generation attempts.
