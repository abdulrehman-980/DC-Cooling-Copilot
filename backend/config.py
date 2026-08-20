"""
City configs for the two demo locations.
Polygons are small (~5km x 5km) — well under the 130 km^2 / 50 mi^2 AOI cap.
Coordinates are [longitude, latitude] per FortyGuard's GeoJSON convention.
"""

CITIES = {
    "northern_virginia": {
        "display_name": "Northern Virginia",
        "point": {"lat": 39.0438, "lon": -77.4874},  # Ashburn, VA — "Data Center Alley"
        "polygon_aoi": {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-77.510, 39.025],
                        [-77.465, 39.025],
                        [-77.465, 39.065],
                        [-77.510, 39.065],
                        [-77.510, 39.025],
                    ]]
                }
            }]
        },
    },
    "phoenix": {
        "display_name": "Phoenix",
        "point": {"lat": 33.4484, "lon": -112.0740},
        "polygon_aoi": {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [[
                        [-112.095, 33.428],
                        [-112.050, 33.428],
                        [-112.050, 33.468],
                        [-112.095, 33.468],
                        [-112.095, 33.428],
                    ]]
                }
            }]
        },
    },
}

# Default granularity for dev (bump to 60 only for final demo polish — costs more credits)
DEFAULT_GRANULARITY = 100
