"""
Single-file version of the FortyGuard quickstart's client, flattened
(no subfolder) so Vercel's Python builder reliably includes it — sibling
files next to main.py get bundled automatically; subfolders needed extra
config that wasn't working reliably.

Original source: temperature-api-quickstart/fortyguard/client.py + exceptions.py
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Iterable

import requests


class FortyGuardError(Exception):
    """Base exception for FortyGuard API errors."""


class ActivityNotReadyError(FortyGuardError):
    """Raised when the status endpoint returns 404 shortly after submission."""

    def __init__(self, activity_id: str):
        super().__init__(f"Activity {activity_id} not yet queryable")
        self.activity_id = activity_id


class TaskFailedError(FortyGuardError):
    """Raised when an async task terminates with status failed/error."""


class TaskTimeoutError(FortyGuardError):
    """Raised when polling exceeds the configured timeout."""


DEFAULT_BASE_URL = "https://api.fortyguard.com"
_TERMINAL_SUCCESS = {"succeeded", "completed"}
_TERMINAL_FAILURE = {"failed", "error"}


class FortyGuardClient:
    """Thin wrapper around the tOS Enterprise API."""

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.api_key = api_key or os.getenv("FORTYGUARD_API_KEY")
        if not self.api_key:
            raise FortyGuardError(
                "No API key provided. Pass api_key=... or set FORTYGUARD_API_KEY."
            )
        self.base_url = (base_url or os.getenv("FORTYGUARD_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")
        self.timeout = timeout
        self._session = requests.Session()
        self._session.headers.update(
            {"api-key": self.api_key, "Content-Type": "application/json"}
        )

    def _request(self, method: str, path: str, **kwargs: Any) -> requests.Response:
        url = f"{self.base_url}{path}"
        kwargs.setdefault("timeout", self.timeout)
        resp = self._session.request(method, url, **kwargs)
        if not resp.ok:
            raise FortyGuardError(f"{method} {path} -> {resp.status_code}: {resp.text[:500]}")
        return resp

    def _submit(self, path: str, payload: dict) -> str:
        body = self._request("POST", path, json=payload).json()
        if body.get("error"):
            raise FortyGuardError(body.get("message", "Submission failed"))
        try:
            return body["data"]["activity_id"]
        except KeyError as exc:
            raise FortyGuardError(f"Unexpected response shape: {body}") from exc

    def get_status(self, activity_id: str) -> dict:
        resp = self._session.get(f"{self.base_url}/v1/status/{activity_id}", timeout=self.timeout)
        if resp.status_code == 404:
            raise ActivityNotReadyError(activity_id)
        if not resp.ok:
            raise FortyGuardError(f"GET /v1/status/{activity_id} -> {resp.status_code}: {resp.text[:500]}")
        body = resp.json()
        if body.get("error"):
            raise FortyGuardError(body.get("message", "Status lookup failed"))
        return body["data"]

    def wait_for(
        self,
        activity_id: str,
        poll_interval: float = 3.0,
        timeout: float = 600.0,
        on_tick=None,
    ) -> dict:
        deadline = time.monotonic() + timeout
        while True:
            try:
                data = self.get_status(activity_id)
            except ActivityNotReadyError:
                if on_tick:
                    on_tick("pending", {})
                if time.monotonic() >= deadline:
                    raise TaskTimeoutError(f"Activity {activity_id} never became visible within {timeout:.0f}s")
                time.sleep(poll_interval)
                continue
            status = str(data.get("status", "")).lower()
            if on_tick:
                on_tick(status, data)
            if status in _TERMINAL_SUCCESS:
                return data.get("result", data)
            if status in _TERMINAL_FAILURE:
                raise TaskFailedError(f"Activity {activity_id} failed: {data.get('message') or data}")
            if time.monotonic() >= deadline:
                raise TaskTimeoutError(f"Activity {activity_id} still '{status}' after {timeout:.0f}s")
            time.sleep(poll_interval)

    def _submit_and_wait(self, path: str, payload: dict, *, poll_interval: float, timeout: float, verbose: bool) -> dict:
        activity_id = self._submit(path, payload)
        if verbose:
            print(f"Submitted -> activity_id={activity_id}")

        def _tick(status: str, _data: dict) -> None:
            if verbose:
                print(f"  status: {status}")

        result = self.wait_for(activity_id, poll_interval=poll_interval, timeout=timeout, on_tick=_tick if verbose else None)
        if verbose:
            print("Done.")
        return {"activity_id": activity_id, "result": result}

    ANALYTIC_TYPES: tuple[str, ...] = ("tcm", "time_of_measure", "exceedance", "persistence")

    def create_heatmap(
        self,
        polygon_aoi: dict,
        start_date: str,
        filter_type: int,
        granularity: int = 100,
        start_time: str | None = None,
        end_time: str | None = None,
        end_date: str | None = None,
        analytic_type: str = "tcm",
        threshold: float | None = None,
        direction: str | None = None,
        *,
        wait: bool = True,
        poll_interval: float = 3.0,
        timeout: float = 600.0,
        verbose: bool = True,
    ) -> dict | str:
        if analytic_type not in self.ANALYTIC_TYPES:
            raise ValueError(f"Unknown analytic_type {analytic_type!r}. Valid options: {self.ANALYTIC_TYPES}")
        if analytic_type in ("exceedance", "persistence"):
            if threshold is None:
                raise ValueError(f"analytic_type={analytic_type!r} requires a threshold (°C).")
            if direction not in ("above", "below"):
                raise ValueError(f"analytic_type={analytic_type!r} requires direction 'above' or 'below'.")

        date_time: dict[str, Any] = {"start_date": start_date, "filter_type": filter_type}
        if start_time is not None:
            date_time["start_time"] = start_time
        if end_time is not None:
            date_time["end_time"] = end_time
        if end_date is not None:
            date_time["end_date"] = end_date

        payload: dict[str, Any] = {
            "polygon_aoi": polygon_aoi,
            "date_time": date_time,
            "granularity": granularity,
            "analytic_type": analytic_type,
        }
        if threshold is not None:
            payload["threshold"] = threshold
        if direction is not None:
            payload["direction"] = direction

        if not wait:
            return self._submit("/v1/heatmap", payload)
        return self._submit_and_wait("/v1/heatmap", payload, poll_interval=poll_interval, timeout=timeout, verbose=verbose)

    _ENV_PARAMS_ANALYSES: tuple[str, ...] = (
        "heat_index_celsius", "apparent_temperature_celsius", "wet_bulb_temperature_celsius",
        "relative_humidity_percent", "precipitation_mm", "cloud_cover_octas",
        "air_quality:idx", "air_quality_no2:idx", "air_quality_o3:idx",
        "air_quality_pm2p5:idx", "air_quality_pm10:idx", "air_quality_so2:idx",
        "aqi_us_co", "methane_ppb", "co2_ppm", "elevation", "solar_irradiance",
    )

    def environmental_parameters(
        self,
        latitude: float,
        longitude: float,
        temperature: float,
        start_date: str,
        filter_type: int,
        start_time: str | None = None,
        end_time: str | None = None,
        end_date: str | None = None,
        analysis: Iterable[str] | None = None,
        *,
        wait: bool = True,
        poll_interval: float = 3.0,
        timeout: float = 600.0,
        verbose: bool = True,
    ) -> dict | str:
        if analysis is not None:
            analysis = list(analysis)
            unknown = set(analysis) - set(self._ENV_PARAMS_ANALYSES)
            if unknown:
                raise ValueError(f"Unknown env-params analysis {unknown}. Valid options: {self._ENV_PARAMS_ANALYSES}")
        date_time: dict[str, Any] = {"start_date": start_date, "filter_type": filter_type}
        if start_time is not None:
            date_time["start_time"] = start_time
        if end_time is not None:
            date_time["end_time"] = end_time
        if end_date is not None:
            date_time["end_date"] = end_date

        payload: dict[str, Any] = {
            "latitude": latitude,
            "longitude": longitude,
            "temperature": temperature,
            "date_time": date_time,
        }
        if analysis is not None:
            payload["analysis"] = analysis
        if not wait:
            return self._submit("/v1/env_params", payload)
        return self._submit_and_wait("/v1/env_params", payload, poll_interval=poll_interval, timeout=timeout, verbose=verbose)

    def fetch_api_key_usage(self) -> dict:
        body = self._request("POST", "/v1/system/fetch-api-key-usage", json={"api_key": self.api_key}).json()
        return body

    def fetch_api_key_custom_usage(self, start_date: str, end_date: str) -> dict:
        def _to_iso(value: str, end_of_day: bool) -> str:
            if "T" in value:
                return value
            return f"{value}T{'23:59:59' if end_of_day else '00:00:00'}Z"

        body = self._request(
            "POST",
            "/v1/system/fetch-api-key-custom-usage",
            json={
                "api_key": self.api_key,
                "start_date": _to_iso(start_date, end_of_day=False),
                "end_date": _to_iso(end_date, end_of_day=True),
            },
        ).json()
        return body