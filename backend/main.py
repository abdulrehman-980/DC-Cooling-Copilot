"""
Run: uvicorn main:app --reload --port 8000
Then check: http://localhost:8000/docs

This is what Person 2 (Risk Engine/AI) and Person 3 (Dashboard) build
against. Ships in MOCK_MODE=true by default so they're never blocked
waiting on your live API key.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta

from config import CITIES
from fortyguard_service import get_environmental_data, get_heatmap, get_hourly_environmental_data
from models import EnvironmentalData

app = FastAPI(title="DC Cooling Copilot — Data API")

# Allow the frontend (local dev + deployed) to call this API from the browser.
# Without this, browsers block cross-origin requests by default (CORS policy) —
# this is what Hardik's "blocked by CORS" error is about.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hackathon setting: open to any origin, simplest fix.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _safe_now():
    """
    A few hours in the past, not the exact current moment — FortyGuard's
    data pipeline needs a short delay to compute the latest hour, and our
    server's UTC clock doesn't match the demo cities' local time zones.
    Requesting "right now" can come back empty; a small buffer avoids that.
    """
    return datetime.now() - timedelta(hours=4)


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/cities")
def list_cities():
    return {key: c["display_name"] for key, c in CITIES.items()}


@app.get("/api/environmental/{city_key}", response_model=EnvironmentalData)
def environmental(city_key: str, date: str = None, time: str = None):
    """
    date: YYYY-MM-DD (defaults to today)
    time: HH:MM (defaults to now)
    """
    date = date or _safe_now().strftime("%Y-%m-%d")
    time = time or _safe_now().strftime("%H:%M")
    try:
        return get_environmental_data(city_key, date, time)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FortyGuard live data error: {e}")


@app.get("/api/environmental/{city_key}/hourly")
def environmental_hourly(city_key: str, date: str = None):
    """
    24 hourly readings for one day — for peak-risk-window detection.
    date: YYYY-MM-DD (defaults to a recent day, not today, since today may
    have hours the data pipeline hasn't computed yet)
    """
    date = date or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")  # yesterday — full day guaranteed computed
    try:
        return get_hourly_environmental_data(city_key, date)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FortyGuard live data error: {e}")


@app.get("/api/heatmap/{city_key}")
def heatmap(city_key: str, date: str = None, time: str = None):
    date = date or _safe_now().strftime("%Y-%m-%d")
    time = time or _safe_now().strftime("%H:%M")
    try:
        return get_heatmap(city_key, date, time)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FortyGuard live data error: {e}")