# DC-ECSS — AI Data Center Cooling Copilot

An AI-powered environmental cooling stress copilot for data centers, built for **FortyGuard Hackathon'26**, using FortyGuard's Temperature API.

🔗 **Live Demo:** https://dc-ecss-dashboard.vercel.app
🔗 **Live Backend API:** https://backend-zeta-three-93.vercel.app
📄 **API Docs:** https://backend-zeta-three-93.vercel.app/docs

---

## 🎯 The Problem

Data centers already monitor their internal systems, but external environmental conditions also affect cooling requirements. There's a gap between:

**Environmental Conditions → Cooling Risk → Operational Decision Support**

We estimate **Environmental Cooling Stress** — not actual server/GPU temperature — using real hyperlocal FortyGuard data, and provide an AI copilot that explains the risk in plain language.

---

## 🧠 Our Core Innovation: DC-ECSS

**Data Center Environmental Cooling Stress Score** — a 0–100 score representing external environmental stress that could increase cooling challenges.

**Weighting:**
| Factor | Weight |
|---|---|
| Temperature | 30% |
| Wet-bulb temperature | 20% |
| Heat Index | 15% |
| Humidity | 10% |
| Solar irradiance | 10% |
| Heat Persistence | 15% |

**Risk levels:** 0–25 🟢 LOW · 26–50 🟡 MODERATE · 51–75 🟠 HIGH · 76–100 🔴 CRITICAL

*Note: these weights are our own prototype methodology for this hackathon, not an established industry standard.*

---

## 🖥️ Features

- **Live environmental data** — temperature, humidity, heat index, wet-bulb, solar irradiance
- **DC-ECSS risk score** with real-time risk level classification
- **24-hour risk timeline** for peak-window detection
- **Spatial heatmap** — tile-by-tile thermal data across the data center area
- **AI Copilot chat** — ask "why is risk high?", "when will it peak?", "compare cities" and get plain-language answers grounded in real data
- **City comparison mode** — Northern Virginia vs Phoenix

---

## 🌎 Demo Locations

| City | Why |
|---|---|
| **Northern Virginia** (Ashburn) | "Data Center Alley" — largest U.S. data-center market, humid-hot climate |
| **Phoenix, AZ** | Dry-hot climate — strong contrast for comparison mode |

---

## 🏗️ Architecture

```
User
  ↓
Frontend (React) — dashboard, charts, chat UI
  ↓
Backend (FastAPI) — FortyGuard integration, caching, AI copilot
  ↓
FortyGuard API — real environmental + spatial data
  ↓
Risk Engine — DC-ECSS scoring
  ↓
AI Copilot (Groq LLM) — explains the score, never invents it
```

**Key principle:** the AI Copilot explains results computed elsewhere — it never calculates or invents the risk score itself.

---

## 📁 Repo Structure

```
DC-Cooling-Copilot/
│
├── backend/           # FastAPI — FortyGuard integration, API, AI copilot
│   ├── main.py
│   ├── fortyguard_service.py
│   ├── fortyguard_client.py
│   ├── copilot.py
│   ├── config.py
│   ├── models.py
│   ├── cache.py
│   ├── refresh_data.py
│   └── data/           # pre-fetched real data (see note below)
│
├── frontend/          # React — dashboard, charts, copilot chat UI
│
├── risk_engine/        # DC-ECSS scoring + AI logic
│
├── README.md
└── LICENSE
```

---

## 👥 Team

| Person | Role | Owns |
|---|---|---|
| **Abdul Rehman** (Lead) | API + Backend + Data | `backend/` |
| **Adeel Shahid** | Risk Engine + AI Copilot | `risk_engine/` |
| **Hardik Suno** | Frontend + Dashboard + Demo | `frontend/` |

---

## 🔌 Backend API Reference

**Base URL:** `https://backend-zeta-three-93.vercel.app`

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check |
| `/api/cities` | GET | List available demo cities |
| `/api/environmental/{city}` | GET | Current environmental snapshot |
| `/api/environmental/{city}/hourly` | GET | 24-hour readings (peak-window detection) |
| `/api/heatmap/{city}` | GET | Spatial tile-by-tile thermal data |
| `/api/copilot/ask` | POST | AI copilot Q&A |

`city` = `northern_virginia` or `phoenix`

### Data Contract

```json
{
  "location": "Northern Virginia",
  "temperature": 38.2,
  "humidity": 45,
  "heat_index": 40.1,
  "wet_bulb": 27.4,
  "solar_irradiance": 720,
  "persistence_hours": 6,
  "cooling_stress_score": 78,
  "risk_level": "HIGH",
  "peak_period": "14:00-17:00"
}
```
`backend/` produces the first 6 fields. `risk_engine/` adds the last 3.

### Copilot request/response

```json
// POST /api/copilot/ask
{
  "question": "Why is the risk high?",
  "cityData": { "...": "environmental + risk engine output" },
  "comparison": null
}
```
```json
{
  "answer": "..."
}
```

---

## 🛠️ Tech Stack

- **Frontend:** React
- **Backend:** Python, FastAPI
- **Data:** FortyGuard Temperature API
- **AI:** Groq (LLM)
- **Hosting:** Vercel (frontend + backend)

---

## 🚀 Local Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your FORTYGUARD_API_KEY and GROQ_API_KEY
uvicorn main:app --reload --port 8000
```
Visit `http://localhost:8000/docs`

To refresh real data (avoids live-call timeouts):
```bash
python refresh_data.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 🎬 Demo Flow

1. Select **Northern Virginia**
2. View live environmental data + DC-ECSS score
3. View the spatial heatmap
4. Ask the Copilot: *"Why is the risk high?"*
5. Ask: *"What should we do?"*
6. Switch to **Phoenix**
7. Compare both cities

---

## ⚠️ Important Limitation

FortyGuard environmental data alone cannot tell us the actual cooling load, server temperature, or GPU temperature. We estimate **environmental cooling stress** and provide AI-powered operational decision support — not a prediction of actual hardware temperature.

*For a future enterprise version: combine FortyGuard data with BMS data, server telemetry, and cooling-system data to predict actual cooling demand, energy consumption, and PUE.*

---

## 📋 Submission (FortyGuard Hackathon'26)

- Submission deadline: **Aug 30, 2026, 11:59 PM GST**
- `hackathon@fortyguard.com` added as repo collaborator

---

## 📄 License

MIT — see [LICENSE](./LICENSE)
