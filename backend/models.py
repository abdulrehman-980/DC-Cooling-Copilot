"""
This is the data contract the whole team agreed on. Person 1 (you) fills in
everything except cooling_stress_score / risk_level / peak_period — those
are Person 2's Risk Engine output. Keep this file in sync with theirs.
"""
from pydantic import BaseModel
from typing import Optional


class EnvironmentalData(BaseModel):
    """What Person 1's pipeline produces — the raw ingredients."""
    location: str
    temperature: float          # Celsius
    humidity: float             # %
    heat_index: float           # Celsius
    wet_bulb: float              # Celsius
    solar_irradiance: float      # W/m^2
    persistence_hours: Optional[float] = None  # hours above threshold, if computed


class FullRiskContract(EnvironmentalData):
    """
    The complete contract, as it appears in the team plan. Person 2 adds
    the three fields below on top of what you return from /environmental.
    Your endpoint can return EnvironmentalData; the frontend/AI layer
    merges in the rest.
    """
    cooling_stress_score: Optional[int] = None
    risk_level: Optional[str] = None       # LOW / MODERATE / HIGH / CRITICAL
    peak_period: Optional[str] = None      # "14:00-17:00"
