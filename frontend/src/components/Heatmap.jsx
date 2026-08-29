import { useEffect, useState } from "react";

const API_BASE_URL =
  "https://backend-zeta-three-93.vercel.app/api";

function Heatmap({
  selectedCity = "northern_virginia",
}) {
  const [heatmapData, setHeatmapData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  /*
   * ============================================================
   * DEMO VISUALIZATION
   * ============================================================
   *
   * IMPORTANT:
   *
   * These values are NOT claimed to be live FortyGuard values.
   *
   * The current backend heatmap endpoint returns:
   *
   * {
   *   city: "...",
   *   mock: true,
   *   tiles: "mock-heatmap-payload"
   * }
   *
   * Therefore these cells are only a visual placeholder
   * until the backend provides the actual heatmap payload.
   *
   * DO NOT use these values for the DC-ECSS risk calculation.
   */

  const previewCells = [
    18, 22, 28, 34, 42, 51, 63, 72,

    26, 31, 38, 47, 58, 68, 79, 86,

    21, 29, 36, 49, 61, 73, 84, 92,

    17, 24, 33, 44, 55, 67, 78, 88,

    12, 20, 27, 39, 48, 59, 71, 82,

    10, 16, 23, 31, 43, 52, 65, 76,
  ];

  /*
   * ============================================================
   * CITY VALIDATION
   * ============================================================
   */

  const validCities = [
    "northern_virginia",
    "phoenix",
  ];

  const safeCity = validCities.includes(selectedCity)
    ? selectedCity
    : "northern_virginia";

  /*
   * ============================================================
   * HEAT CLASSIFICATION
   * ============================================================
   */

  function getHeatClass(value) {
    if (value >= 80) {
      return "heat-critical";
    }

    if (value >= 60) {
      return "heat-high";
    }

    if (value >= 40) {
      return "heat-moderate";
    }

    return "heat-low";
  }

  /*
   * ============================================================
   * LOAD HEATMAP DATA
   * ============================================================
   */

  useEffect(() => {
    const controller = new AbortController();

    async function loadHeatmap() {
      try {
        setLoading(true);
        setError(null);
        setHeatmapData(null);

        console.log(
          `[HEATMAP] Requesting heatmap for ${safeCity}`
        );

        const response = await fetch(
          `${API_BASE_URL}/heatmap/${safeCity}`,
          {
            method: "GET",

            headers: {
              Accept: "application/json",
            },

            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Heatmap request failed: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();

        console.log(
          `[HEATMAP] Data received for ${safeCity}:`,
          data
        );

        if (!data || typeof data !== "object") {
          throw new Error(
            "Heatmap API returned an invalid response."
          );
        }

        setHeatmapData(data);
      } catch (err) {
        if (err?.name === "AbortError") {
          console.log(
            `[HEATMAP] Request cancelled for ${safeCity}`
          );

          return;
        }

        console.error(
          `[HEATMAP] Request failed for ${safeCity}:`,
          err
        );

        setError(
          err?.message ||
            "Unable to load heatmap data."
        );

        setHeatmapData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadHeatmap();

    return () => {
      controller.abort();
    };
  }, [safeCity]);

  /*
   * ============================================================
   * LOCATION NAME
   * ============================================================
   */

  const locationName =
    safeCity === "phoenix"
      ? "Phoenix"
      : "Northern Virginia";

  /*
   * ============================================================
   * BACKEND STATE
   * ============================================================
   */

  const isMock =
    heatmapData?.mock === true;

  const hasLiveHeatmap =
    heatmapData &&
    heatmapData.mock !== true;

  /*
   * ============================================================
   * STATUS LABEL
   * ============================================================
   */

  let statusLabel =
    "LOADING HEATMAP DATA";

  if (!loading) {
    if (error) {
      statusLabel = "HEATMAP UNAVAILABLE";
    } else if (isMock) {
      statusLabel = "BACKEND PREVIEW";
    } else if (hasLiveHeatmap) {
      statusLabel = "LIVE HEATMAP DATA";
    }
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <section className="heatmap-section">

      <div className="heatmap-card">

        {/* ======================================================
            HEADER
            ====================================================== */}

        <div className="heatmap-header">

          <div>

            <span className="section-eyebrow">
              FORTYGUARD
            </span>

            <h2>
              Heat Exposure Map
            </h2>

            <p>
              Campus-scale thermal conditions
            </p>

          </div>


          <div className="heatmap-location">

            <span>
              ACTIVE AREA
            </span>

            <strong>
              {locationName}
            </strong>

          </div>

        </div>


        {/* ======================================================
            STATUS
            ====================================================== */}

        <div className="heatmap-status">

          <span
            className={`heatmap-status-dot ${
              loading
                ? "loading"
                : error
                  ? "error"
                  : isMock
                    ? "preview"
                    : "live"
            }`}
          />

          <span>
            {statusLabel}
          </span>

        </div>


        {/* ======================================================
            ERROR
            ====================================================== */}

        {error && (

          <div className="heatmap-error">

            Unable to load heatmap data.

          </div>

        )}


        {/* ======================================================
            HEATMAP VISUALIZATION
            ====================================================== */}

        <div className="heatmap-container">

          <div className="heatmap-grid">

            {previewCells.map(
              (value, index) => (

                <div
                  key={index}
                  className={`heat-cell ${getHeatClass(
                    value
                  )}`}
                  title={
                    isMock
                      ? "Demo visualization — not live heatmap data"
                      : hasLiveHeatmap
                        ? "Live heatmap visualization"
                        : "Heatmap visualization"
                  }
                />

              )
            )}

          </div>


          <div className="heatmap-overlay">

            <span className="map-label north">
              N
            </span>

            <span className="map-label campus">
              DATA CENTER CAMPUS
            </span>

          </div>

        </div>


        {/* ======================================================
            LEGEND
            ====================================================== */}

        <div className="heatmap-footer">

          <div className="heatmap-legend">

            <span>
              LOW
            </span>

            <div className="legend-gradient"></div>

            <span>
              CRITICAL
            </span>

          </div>


          <span className="heatmap-resolution">

            {loading
              ? "Loading"
              : isMock
                ? "Demo visualization"
                : hasLiveHeatmap
                  ? "Live thermal data"
                  : "Unavailable"}

          </span>

        </div>


        {/* ======================================================
            BACKEND INFORMATION
            ====================================================== */}

        <div className="heatmap-note">

          <span>

            {error
              ? "!"
              : isMock
                ? "ⓘ"
                : hasLiveHeatmap
                  ? "✓"
                  : "ⓘ"}

          </span>


          <p>

            {error

              ? "The heatmap service could not be reached. No live heatmap data is being claimed."

              : isMock

                ? "The FortyGuard heatmap endpoint is connected, but the backend is currently returning a mock payload. This visualization is only a frontend preview and is not used for DC-ECSS risk calculations."

                : hasLiveHeatmap

                  ? "Live heatmap data is being supplied by the connected backend."

                  : "Waiting for heatmap data from the connected backend."}

          </p>

        </div>


        {/* ======================================================
            DEBUG / BACKEND PAYLOAD
            ====================================================== */}

        {isMock && heatmapData && (

          <div className="heatmap-note">

            <span>
              API
            </span>

            <p>
              Backend response received successfully for{" "}
              <strong>
                {locationName}
              </strong>
              . The endpoint currently identifies this
              payload as mock data.
            </p>

          </div>

        )}

      </div>

    </section>
  );
}

export default Heatmap;