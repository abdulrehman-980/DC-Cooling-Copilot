"""
Wraps the quickstart's FortyGuardClient. Runs in MOCK mode until you have
a live API key + the quickstart's `fortyguard` package installed —
so the rest of the team can build against you starting today, not
whenever your credentials land.

Once you have both, flip MOCK_MODE to False (or set env var
FORTYGUARD_MOCK_MODE=false).

STATIC DATA: on Vercel's free tier, live FortyGuard calls risk timing out
(10s function limit vs FortyGuard's 15-20s+ processing time), and the
file cache doesn't reliably persist between requests on serverless.
Instead, run `refresh_data.py` locally to pre-fetch real data into
backend/data/*.json — those are served instantly, no live call needed,
zero timeout risk. Falls back to a live call only if no static file
exists yet for that city.
"""
import json
import os
import random

from config import CITIES, DEFAULT_GRANULARITY
from cache import get as cache_get, set as cache_set, make_key
from models import EnvironmentalData


class FortyGuardShapeError(Exception):
    """Raised when the live API response doesn't match our expected shape —
    carries diagnostic detail so we can fix field mapping without more
    blind guessing."""


MOCK_MODE = os.getenv("FORTYGUARD_MOCK_MODE", "true").lower() != "false"
STATIC_DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def _load_static(city_key: str, kind: str):
    """kind: 'snapshot' | 'hourly' | 'heatmap'. Returns None if not fetched yet."""
    path = os.path.join(STATIC_DATA_DIR, f"{city_key}_{kind}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


# The real client is created lazily, on first actual use — NOT at import
# time. Constructing it eagerly at import time means any problem (missing
# API key, bad env var, etc.) crashes the ENTIRE app immediately, including
# /api/health and /docs. Lazy + wrapped in try/except means a live-data
# problem only affects the specific request that needed it.
_client = None
_client_error = None


def _get_client():
    global _client, _client_error
    if _client is not None:
        return _client
    if _client_error is not None:
        raise _client_error
    try:
        from fortyguard_client import FortyGuardClient  # flat file, not a subfolder
        _client = FortyGuardClient()
        return _client
    except Exception as e:
        _client_error = e
        raise


def _hour_of(time_value: str) -> int:
    """
    Extract the hour as an int from either format:
    - mock / normalized: "00:00"
    - raw live ISO timestamp: "2026-08-22T00:00:00-05:00"
    """
    if "T" in time_value:
        time_value = time_value.split("T")[1]
    return int(time_value.split(":")[0])


def _mock_env_params(city_key: str) -> dict:
    """Plausible mock values so downstream (Person 2/3) can build today."""
    if city_key == "phoenix":
        base = dict(temperature=44.0, humidity=15, heat_index=45.5,
                    wet_bulb=21.0, solar_irradiance=850)
    else:  # northern_virginia
        base = dict(temperature=35.0, humidity=60, heat_index=39.0,
                    wet_bulb=26.5, solar_irradiance=680)
    # small jitter so repeated calls aren't suspiciously identical
    return {k: round(v * random.uniform(0.97, 1.03), 1) for k, v in base.items()}


def get_environmental_data(city_key: str, date: str, time_str: str) -> EnvironmentalData:
    if city_key not in CITIES:
        raise ValueError(f"Unknown city: {city_key}")

    city = CITIES[city_key]

    # Static pre-fetched data (from refresh_data.py) — instant, no timeout risk.
    if not MOCK_MODE:
        static = _load_static(city_key, "snapshot")
        if static:
            return EnvironmentalData(**static)

    cache_key = make_key(city_key, date, time_str, "env_params")

    cached = cache_get(cache_key)
    if cached:
        return EnvironmentalData(**cached)

    if MOCK_MODE:
        raw = _mock_env_params(city_key)
    else:
        # Reuses the hourly fetch (filter_type=2, full-day range) since that
        # exact pattern is the one already confirmed to return real,
        # non-empty data — then picks the hour closest to the requested time.
        hourly_data = get_hourly_environmental_data(city_key, date)
        raw = _closest_hour(hourly_data["hourly"], time_str)

    result = EnvironmentalData(
        location=city["display_name"],
        temperature=raw["temperature"],
        humidity=raw["humidity"],
        heat_index=raw["heat_index"],
        wet_bulb=raw["wet_bulb"],
        solar_irradiance=raw["solar_irradiance"],
    )
    cache_set(cache_key, result.model_dump())
    return result


def _closest_hour(hourly: list, time_str: str) -> dict:
    """Pick the hourly entry whose hour is closest to the requested time."""
    if not hourly:
        raise FortyGuardShapeError("Hourly data was empty — nothing to pick a snapshot from.")
    try:
        target_hour = _hour_of(time_str)
    except (ValueError, IndexError):
        target_hour = 12
    best = min(hourly, key=lambda h: abs(_hour_of(h["time"]) - target_hour))
    return best


def _unwrap(value):
    """
    Live FortyGuard responses wrap each parameter in a list (time-series
    style) even for a single-hour request. Take the first real value out
    of that list; pass scalars through unchanged.
    """
    if isinstance(value, list):
        return value[0] if value else None
    return value


def _mock_hourly_series(city_key: str) -> list:
    """
    24 hourly mock readings with a realistic diurnal curve (peaks mid-
    afternoon, lowest before dawn) — good enough for Adeel to build and
    test peak-window detection against today, without live data.
    """
    import math
    base = _mock_env_params(city_key)
    hourly = []
    for hour in range(24):
        # peak around 15:00, trough around 05:00 — simple sine curve
        swing = math.sin((hour - 9) / 24 * 2 * math.pi - math.pi / 2)
        factor = 1 + 0.15 * swing
        hourly.append({
            "time": f"{hour:02d}:00",
            "temperature": round(base["temperature"] * factor, 1),
            "humidity": round(base["humidity"] * (2 - factor), 1),
            "heat_index": round(base["heat_index"] * factor, 1),
            "wet_bulb": round(base["wet_bulb"] * factor, 1),
            "solar_irradiance": round(max(0, base["solar_irradiance"] * factor * (1 if 6 <= hour <= 19 else 0.05)), 1),
        })
    return hourly


def get_hourly_environmental_data(city_key: str, date: str) -> dict:
    """
    Returns a full day (24 hourly readings) for peak-risk-window detection.
    This is what Adeel needs for his risk engine — a single snapshot isn't
    enough to find when risk peaks across a day.
    """
    if city_key not in CITIES:
        raise ValueError(f"Unknown city: {city_key}")

    city = CITIES[city_key]

    # Static pre-fetched data (from refresh_data.py) — instant, no timeout risk.
    if not MOCK_MODE:
        static = _load_static(city_key, "hourly")
        if static:
            return static

    cache_key = make_key(city_key, date, "hourly", "env_params_hourly")

    cached = cache_get(cache_key)
    if cached:
        return cached

    if MOCK_MODE:
        hourly = _mock_hourly_series(city_key)
    else:
        client = _get_client()
        response = client.environmental_parameters(
            latitude=city["point"]["lat"],
            longitude=city["point"]["lon"],
            temperature=35.0,
            start_date=date,
            start_time="00:00",
            end_time="23:00",
            end_date=date,
            filter_type=2,  # range of hours
        )
        result = response["result"]
        location = result["locations"][0]
        timestamps = result["metadata"]["timestamps"]
        params = location["parameters"]

        def _series(key):
            val = params.get(key)
            return val if isinstance(val, list) else []

        temps = _series("apparent_temperature_celsius")
        humids = _series("relative_humidity_percent")
        heats = _series("heat_index_celsius")
        wets = _series("wet_bulb_temperature_celsius")

        if not any([temps, humids, heats, wets]):
            raise FortyGuardShapeError(
                f"Hourly live response had no data for any field. "
                f"Raw parameters keys: {list(params.keys())}. "
                f"Raw parameters (truncated): {str(params)[:800]}"
            )

        hourly = []
        for i, ts in enumerate(timestamps):
            # Normalize to "HH:MM" so the format matches mock mode exactly —
            # teammates shouldn't see two different time formats depending
            # on which mode the backend happens to be running in.
            hour_part = ts.split("T")[1] if "T" in ts else ts
            time_label = hour_part[:5]  # "HH:MM"
            hourly.append({
                "time": time_label,
                "temperature": temps[i] if i < len(temps) else None,
                "humidity": humids[i] if i < len(humids) else None,
                "heat_index": heats[i] if i < len(heats) else None,
                "wet_bulb": wets[i] if i < len(wets) else None,
                "solar_irradiance": 0,  # solar not confirmed shaped as array yet — verify in notebook
            })

    output = {
        "location": city["display_name"],
        "date": date,
        "hourly": hourly,
    }
    cache_set(cache_key, output)
    return output


def _mock_heatmap(city_key: str, city: dict) -> dict:
    """
    A small set of fake tiles matching the real FortyGuard heatmap shape
    (map_data.features, each with a value + tile_id, plus stats_data) —
    so the frontend can build the real structure now instead of a
    throwaway flat shape that would need rebuilding later.
    """
    base = _mock_env_params(city_key)
    features = []
    lat, lon = city["point"]["lat"], city["point"]["lon"]
    for i in range(9):  # small 3x3 mock grid
        offset = (i % 3 - 1) * 0.01, (i // 3 - 1) * 0.01
        features.append({
            "type": "Feature",
            "properties": {"tile_id": i, "value": round(base["temperature"] + random.uniform(-2, 2), 1)},
            "geometry": {"type": "Point", "coordinates": [lon + offset[0], lat + offset[1]]},
        })
    values = [f["properties"]["value"] for f in features]
    return {
        "mock": True,
        "map_data": {"type": "FeatureCollection", "features": features},
        "stats_data": {
            "analytic_type": "tcm", "units": "celsius", "n_cells": len(features),
            "min": min(values), "max": max(values), "mean": round(sum(values) / len(values), 1),
        },
    }


def get_heatmap(city_key: str, date: str, time_str: str) -> dict:
    if city_key not in CITIES:
        raise ValueError(f"Unknown city: {city_key}")

    city = CITIES[city_key]

    # Static pre-fetched data (from refresh_data.py) — instant, no timeout risk.
    # Heatmap is the slowest/largest endpoint — most likely to time out live.
    if not MOCK_MODE:
        static = _load_static(city_key, "heatmap")
        if static:
            return static

    cache_key = make_key(city_key, date, time_str, "heatmap")

    cached = cache_get(cache_key)
    if cached:
        return cached

    if MOCK_MODE:
        heatmap_data = _mock_heatmap(city_key, city)
    else:
        client = _get_client()

        def _try(analytic_type, filter_type=1, **extra_kwargs):
            kwargs = dict(
                polygon_aoi=city["polygon_aoi"],
                start_date=date,
                granularity=DEFAULT_GRANULARITY,
                analytic_type=analytic_type,
                filter_type=filter_type,
            )
            if filter_type in (1, 2):
                kwargs["start_time"] = time_str
            kwargs.update(extra_kwargs)
            response = client.create_heatmap(**kwargs)
            data = response["result"]
            has_tiles = bool(data.get("map_data", {}).get("features"))
            return data, has_tiles

        # Try the ideal case first: a true temperature snapshot at one hour.
        heatmap_data, ok = _try("tcm", filter_type=1)
        if not ok:
            # Fall back to "exceedance" (hours past a threshold) — this is
            # the combination already proven to return real, non-empty
            # tile data earlier today. Crucially it needs filter_type=3
            # (a whole day), since "hours past threshold" is meaningless
            # within a single hour — that mismatch was the actual bug.
            # Units differ (hours, not °C) — the response's stats_data.units
            # field tells the frontend which one it actually got.
            heatmap_data, ok = _try("exceedance", filter_type=3, threshold=35.0, direction="above")
        if not ok:
            raise FortyGuardShapeError(
                f"Heatmap live response had no tile features, even with fallback. "
                f"Raw response keys: {list(heatmap_data.keys())}. "
                f"Raw response (truncated): {str(heatmap_data)[:800]}"
            )

    output = {
        "location": city["display_name"],
        "date": date,
        "time": time_str,
        "heatmap": heatmap_data,
    }
    cache_set(cache_key, output)
    return output