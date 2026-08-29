function StatusCards({ data, loading, error }) {
  /*
   * ============================================================
   * LOADING STATE
   * ============================================================
   */

  if (loading) {
    return (
      <section className="environment-section">
        <div className="section-heading environment-heading">
          <div className="environment-heading-row">
            <span className="section-eyebrow">
              LIVE ENVIRONMENTAL DATA
            </span>

            <span className="system-status fallback">
              <span className="status-dot"></span>
              SYNCING
            </span>
          </div>

          <h2>Loading environmental conditions&hellip;</h2>
        </div>

        <div className="environment-grid">
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <div
              className="environment-card loading-card"
              key={item}
              style={{
                animationDelay: `${(item - 1) * 45}ms`,
              }}
            >
              <div className="skeleton-line small"></div>
              <div className="skeleton-line large"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  /*
   * ============================================================
   * ERROR STATE
   * ============================================================
   */

  if (error || !data) {
    return (
      <section className="environment-section">
        <div className="section-heading environment-heading">
          <div className="environment-heading-row">
            <span className="section-eyebrow">
              ENVIRONMENTAL DATA
            </span>

            <span className="system-status fallback">
              <span className="status-dot"></span>
              UNAVAILABLE
            </span>
          </div>
        </div>

        <div className="environment-error-panel">
          <span className="environment-error-icon">!</span>

          <div>
            <strong>Environmental data unavailable</strong>

            <p>
              The dashboard could not load environmental
              conditions at this time.
            </p>
          </div>
        </div>
      </section>
    );
  }

  /*
   * ============================================================
   * SAFE NUMBER FORMATTER
   * ============================================================
   *
   * The backend is authoritative.
   *
   * This component only formats values.
   * It does not calculate or invent environmental data.
   */

  function formatValue(value, decimals = 1) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "N/A";
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return "N/A";
    }

    return numericValue.toFixed(decimals);
  }

  /*
   * ============================================================
   * PERSISTENCE
   * ============================================================
   */

  const persistence =
    data.persistence_hours;

  const hasPersistence =
    persistence !== null &&
    persistence !== undefined &&
    persistence !== "" &&
    Number.isFinite(Number(persistence));

  /*
   * ============================================================
   * METRICS
   * ============================================================
   */

  const metrics = [
    {
      label: "Temperature",
      value: formatValue(data.temperature),
      unit: "°C",
      accent: "warm",
    },

    {
      label: "Humidity",
      value: formatValue(data.humidity),
      unit: "%",
      accent: "cool",
    },

    {
      label: "Heat Index",
      value: formatValue(data.heat_index),
      unit: "°C",
      accent: "warm",
    },

    {
      label: "Wet-Bulb",
      value: formatValue(data.wet_bulb),
      unit: "°C",
      accent: "amber",
    },

    {
      label: "Solar Irradiance",
      value: formatValue(data.solar_irradiance),
      unit: "W/m²",
      accent: "amber",
    },

    {
      label: "Persistence",
      value: hasPersistence
        ? formatValue(persistence)
        : "N/A",
      unit: hasPersistence ? "hrs" : "",
      accent: "neutral",
    },
  ];

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <section className="environment-section">
      <div className="section-heading environment-heading">
        <div className="environment-heading-row">
          <span className="section-eyebrow">
            LIVE ENVIRONMENTAL DATA
          </span>

          <span className="system-status online">
            <span className="status-dot"></span>
            LIVE
          </span>
        </div>

        <h2>
          {data.location || "Unknown Location"}
        </h2>
      </div>

      <div className="environment-grid">
        {metrics.map((metric, index) => (
          <div
            className={`environment-card accent-${metric.accent}`}
            key={metric.label}
            style={{
              animationDelay: `${index * 45}ms`,
            }}
          >
            <span className="environment-label">
              {metric.label}
            </span>

            <div className="environment-value">
              <strong>
                {metric.value}
              </strong>

              {metric.unit && (
                <span>
                  {metric.unit}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default StatusCards;