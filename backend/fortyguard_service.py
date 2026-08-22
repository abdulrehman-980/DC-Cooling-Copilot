"""
Wraps the quickstart's FortyGuardClient. Runs in MOCK mode until you have
a live API key + the quickstart's `fortyguard` package installed —
so the rest of the team can build against you starting today, not
whenever your credentials land.

Once you have both, flip MOCK_MODE to False (or set env var
FORTYGUARD_MOCK_MODE=false).
"""
import os
import random
import time as time_module

from config import CITIES, DEFAULT_GRANULARITY
from cache import get as cache_get, set as cache_set, make_key
from models import EnvironmentalData

MOCK_MODE = os.getenv("FORTYGUARD_MOCK_MODE", "true").lower() != "false"

# Only import + construct the real client if we're not in mock mode,
# so this file works even before the quickstart package is installed.
_client = None
if not MOCK_MODE:
    from fortyguard import FortyGuardClient  # from the quickstart repo
    _client = FortyGuardClient()


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
    cache_key = make_key(city_key, date, time_str, "env_params")

    cached = cache_get(cache_key)
    if cached:
        return EnvironmentalData(**cached)

    if MOCK_MODE:
        raw = _mock_env_params(city_key)
    else:
        raw = _fetch_live_env_params(city, date, time_str)

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


def _fetch_live_env_params(city: dict, date: str, time_str: str) -> dict:
    """
    Real call, following the handbook's submit -> poll pattern.
    The quickstart client handles polling internally when wait=True (default).
    Poll backoff (if you ever do this manually): 3s -> 6s -> 12s.

    Field names confirmed from a live notebook run on 2026-08-20:
    heat_index_celsius, wet_bulb_temperature_celsius, relative_humidity_percent,
    and solar_irradiance nested under clear_sky.ghi.
    `temperature` param is a required threshold value the endpoint uses
    internally (e.g. for exceedance-style stats) — 35.0 is a reasonable
    default, not something we display directly.
    """
    response = _client.environmental_parameters(
        latitude=city["point"]["lat"],
        longitude=city["point"]["lon"],
        temperature=35.0,
        start_date=date,
        start_time=time_str,
        filter_type=1,  # single hour
    )
    result = response["result"]
    location = result["locations"][0]
    params = location["parameters"]
    return {
        "temperature": params.get("apparent_temperature_celsius", params.get("temperature_celsius")),
        "humidity": params["relative_humidity_percent"],
        "heat_index": params["heat_index_celsius"],
        "wet_bulb": params["wet_bulb_temperature_celsius"],
        "solar_irradiance": params.get("solar_irradiance", {}).get("clear_sky", {}).get("ghi", 0),
    }


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
    cache_key = make_key(city_key, date, "hourly", "env_params_hourly")

    cached = cache_get(cache_key)
    if cached:
        return cached

    if MOCK_MODE:
        hourly = _mock_hourly_series(city_key)
    else:
        response = _client.environmental_parameters(
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
        hourly = []
        for i, ts in enumerate(timestamps):
            hourly.append({
                "time": ts,
                "temperature": params.get("apparent_temperature_celsius", [None])[i],
                "humidity": params.get("relative_humidity_percent", [None])[i],
                "heat_index": params.get("heat_index_celsius", [None])[i],
                "wet_bulb": params.get("wet_bulb_temperature_celsius", [None])[i],
                "solar_irradiance": 0,  # solar not confirmed shaped as array yet — verify in notebook
            })

    output = {
        "location": city["display_name"],
        "date": date,
        "hourly": hourly,
    }
    cache_set(cache_key, output)
    return output


def get_heatmap(city_key: str, date: str, time_str: str) -> dict:
    if city_key not in CITIES:
        raise ValueError(f"Unknown city: {city_key}")

    city = CITIES[city_key]
    cache_key = make_key(city_key, date, time_str, "heatmap")

    cached = cache_get(cache_key)
    if cached:
        return cached

    if MOCK_MODE:
        result = {"city": city_key, "mock": True, "tiles": "mock-heatmap-payload"}
    else:
        response = _client.create_heatmap(
            polygon_aoi=city["polygon_aoi"],
            start_date=date,
            start_time=time_str,
            filter_type=1,
            granularity=DEFAULT_GRANULARITY,
        )
        result = response["result"]

    cache_set(cache_key, result)
    return result