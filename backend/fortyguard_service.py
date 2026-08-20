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
    """
    response = _client.environmental_parameters(
        point={"lat": city["point"]["lat"], "lon": city["point"]["lon"]},
        start_date=date,
        start_time=time_str,
    )
    data = response["result"]
    return {
        "temperature": data["temperature"],
        "humidity": data["humidity"],
        "heat_index": data["heat_index"],
        "wet_bulb": data["wet_bulb_temperature"],
        "solar_irradiance": data["solar_irradiance"],
    }


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
