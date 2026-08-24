"""
Run this LOCALLY (not on Vercel) whenever you want to refresh the data
your live site serves. It fetches real FortyGuard data once and saves it
as static JSON files — the deployed backend then serves these instantly,
with zero risk of timing out, since it's not making a live API call on
every single request.

Usage:
    cd backend
    python refresh_data.py

Requires FORTYGUARD_API_KEY in your local .env (same one you've been using).
Run this again anytime you want fresher numbers (e.g. once before your demo).
"""
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

from config import CITIES, DEFAULT_GRANULARITY
from fortyguard_client import FortyGuardClient

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def safe_now():
    return datetime.now() - timedelta(hours=4)


def fetch_snapshot(client, city_key, city):
    date = safe_now().strftime("%Y-%m-%d")
    time_str = safe_now().strftime("%H:%M")
    response = client.environmental_parameters(
        latitude=city["point"]["lat"], longitude=city["point"]["lon"],
        temperature=35.0, start_date=date, start_time=time_str,
        end_time=time_str, end_date=date, filter_type=2,
    )
    result = response["result"]
    params = result["locations"][0]["parameters"]

    def unwrap(v):
        return v[0] if isinstance(v, list) and v else v

    return {
        "location": city["display_name"],
        "temperature": unwrap(params.get("apparent_temperature_celsius")),
        "humidity": unwrap(params.get("relative_humidity_percent")),
        "heat_index": unwrap(params.get("heat_index_celsius")),
        "wet_bulb": unwrap(params.get("wet_bulb_temperature_celsius")),
        "solar_irradiance": 0,
        "persistence_hours": None,
    }


def fetch_hourly(client, city_key, city):
    date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    response = client.environmental_parameters(
        latitude=city["point"]["lat"], longitude=city["point"]["lon"],
        temperature=35.0, start_date=date, start_time="00:00",
        end_time="23:00", end_date=date, filter_type=2,
    )
    result = response["result"]
    timestamps = result["metadata"]["timestamps"]
    params = result["locations"][0]["parameters"]

    def series(key):
        v = params.get(key)
        return v if isinstance(v, list) else []

    temps, humids = series("apparent_temperature_celsius"), series("relative_humidity_percent")
    heats, wets = series("heat_index_celsius"), series("wet_bulb_temperature_celsius")

    hourly = []
    for i, ts in enumerate(timestamps):
        hour_part = ts.split("T")[1] if "T" in ts else ts
        hourly.append({
            "time": hour_part[:5],
            "temperature": temps[i] if i < len(temps) else None,
            "humidity": humids[i] if i < len(humids) else None,
            "heat_index": heats[i] if i < len(heats) else None,
            "wet_bulb": wets[i] if i < len(wets) else None,
            "solar_irradiance": 0,
        })
    return {"location": city["display_name"], "date": date, "hourly": hourly}


def fetch_heatmap(client, city_key, city):
    date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    time_str = "14:00"
    response = client.create_heatmap(
        polygon_aoi=city["polygon_aoi"], start_date=date, start_time=time_str,
        filter_type=1, granularity=DEFAULT_GRANULARITY, analytic_type="tcm",
    )
    data = response["result"]
    if not data.get("map_data", {}).get("features"):
        response = client.create_heatmap(
            polygon_aoi=city["polygon_aoi"], start_date=date,
            filter_type=3, granularity=DEFAULT_GRANULARITY,
            analytic_type="exceedance", threshold=35.0, direction="above",
        )
        data = response["result"]
    return {"location": city["display_name"], "date": date, "time": time_str, "heatmap": data}


def main():
    client = FortyGuardClient()
    for city_key, city in CITIES.items():
        print(f"Fetching {city_key}...")

        snapshot = fetch_snapshot(client, city_key, city)
        with open(os.path.join(OUTPUT_DIR, f"{city_key}_snapshot.json"), "w") as f:
            json.dump(snapshot, f)
        print(f"  snapshot saved")

        hourly = fetch_hourly(client, city_key, city)
        with open(os.path.join(OUTPUT_DIR, f"{city_key}_hourly.json"), "w") as f:
            json.dump(hourly, f)
        print(f"  hourly saved ({len(hourly['hourly'])} entries)")

        heatmap = fetch_heatmap(client, city_key, city)
        n_tiles = len(heatmap["heatmap"].get("map_data", {}).get("features", []))
        with open(os.path.join(OUTPUT_DIR, f"{city_key}_heatmap.json"), "w") as f:
            json.dump(heatmap, f)
        print(f"  heatmap saved ({n_tiles} tiles)")

    print("\nDone. Now commit backend/data/*.json and push + redeploy.")


if __name__ == "__main__":
    main()