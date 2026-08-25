function RiskDrivers({ data }) {

  /*
   * ============================================================
   * ENVIRONMENTAL DATA
   * ============================================================
   *
   * These values come directly from the live environmental
   * endpoint.
   *
   * IMPORTANT:
   * Missing values remain null instead of being converted to 0.
   * This prevents missing API data from appearing as a real
   * environmental measurement.
   *
   * ============================================================
   */

  const temperature =
    data?.temperature != null
      ? Number(data.temperature)
      : null;

  const humidity =
    data?.humidity != null
      ? Number(data.humidity)
      : null;

  const heatIndex =
    data?.heat_index != null
      ? Number(data.heat_index)
      : null;

  const wetBulb =
    data?.wet_bulb != null
      ? Number(data.wet_bulb)
      : null;

  const solar =
    data?.solar_irradiance != null
      ? Number(data.solar_irradiance)
      : null;

  const persistence =
    data?.persistence_hours != null
      ? Number(data.persistence_hours)
      : null;


  /*
   * ============================================================
   * SAFE NUMBER CHECK
   * ============================================================
   */

  const isValidNumber = (value) =>
    value !== null &&
    Number.isFinite(value);


  /*
   * ============================================================
   * ENVIRONMENTAL SIGNAL NORMALIZATION
   * ============================================================
   *
   * These are ONLY visual signal-intensity indicators.
   *
   * They are NOT the official DC-ECSS cooling-stress score.
   *
   * The authoritative cooling-stress score and risk level
   * will come from Adeel's Risk Engine.
   *
   * ============================================================
   */

  const normalizeTemperature = isValidNumber(temperature)
    ? Math.min(
        100,
        Math.max(
          0,
          ((temperature - 20) / 25) * 100
        )
      )
    : null;


  const normalizeHumidity = isValidNumber(humidity)
    ? Math.min(
        100,
        Math.max(
          0,
          humidity
        )
      )
    : null;


  const normalizeHeatIndex = isValidNumber(heatIndex)
    ? Math.min(
        100,
        Math.max(
          0,
          ((heatIndex - 20) / 25) * 100
        )
      )
    : null;


  const normalizeWetBulb = isValidNumber(wetBulb)
    ? Math.min(
        100,
        Math.max(
          0,
          ((wetBulb - 15) / 15) * 100
        )
      )
    : null;


  const normalizeSolar = isValidNumber(solar)
    ? Math.min(
        100,
        Math.max(
          0,
          (solar / 1000) * 100
        )
      )
    : null;


  const normalizePersistence =
    isValidNumber(persistence)
      ? Math.min(
          100,
          Math.max(
            0,
            (persistence / 12) * 100
          )
        )
      : null;


  /*
   * ============================================================
   * DRIVER DEFINITIONS
   * ============================================================
   *
   * These weights describe the current DC-ECSS model structure.
   *
   * IMPORTANT:
   * We are NOT calculating the official overall risk score
   * here.
   *
   * ============================================================
   */

  const drivers = [

    {
      name: "Temperature",
      value: temperature,
      unit: "°C",
      weight: "30%",
      score: normalizeTemperature,
    },

    {
      name: "Wet-Bulb",
      value: wetBulb,
      unit: "°C",
      weight: "20%",
      score: normalizeWetBulb,
    },

    {
      name: "Heat Index",
      value: heatIndex,
      unit: "°C",
      weight: "15%",
      score: normalizeHeatIndex,
    },

    {
      name: "Humidity",
      value: humidity,
      unit: "%",
      weight: "10%",
      score: normalizeHumidity,
    },

    {
      name: "Solar",
      value: solar,
      unit: "W/m²",
      weight: "10%",
      score: normalizeSolar,
    },

    {
      name: "Persistence",
      value: persistence,
      unit: "hours",
      weight: "15%",
      score: normalizePersistence,
    },

  ];


  /*
   * ============================================================
   * VISUAL SIGNAL CLASS
   * ============================================================
   *
   * Used ONLY for the visual indicator.
   *
   * This does NOT determine the official DC-ECSS risk level.
   *
   * ============================================================
   */

  const getSignalClass = (score) => {

    if (!isValidNumber(score)) {
      return "unavailable";
    }

    if (score >= 85) {
      return "critical";
    }

    if (score >= 65) {
      return "high";
    }

    if (score >= 40) {
      return "moderate";
    }

    return "low";

  };


  /*
   * ============================================================
   * FORMAT VALUE
   * ============================================================
   */

  const formatValue = (value, unit) => {

    if (!isValidNumber(value)) {
      return "N/A";
    }

    return `${value.toFixed(1)} ${unit}`;

  };


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (

    <section className="risk-drivers-card">


      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="risk-drivers-header">

        <div>

          <span className="section-eyebrow">
            RISK ENGINE
          </span>

          <h2>
            Environmental Risk Drivers
          </h2>

          <p>
            Environmental signals contributing to thermal load.
          </p>

        </div>


        <div className="risk-engine-label">

          <span className="risk-engine-dot" />

          DC-ECSS ENGINE

        </div>

      </div>



      {/* ======================================================
          DRIVER LIST
          ====================================================== */}

      <div className="drivers-list">

        {drivers.map((driver, index) => {

          const signalClass =
            getSignalClass(
              driver.score
            );


          const hasScore =
            isValidNumber(
              driver.score
            );


          return (

            <div
              className="driver-row"
              key={driver.name}
              style={{
                animationDelay: `${index * 55}ms`,
              }}
            >


              {/* ============================================
                  DRIVER INFORMATION
                  ============================================ */}

              <div className="driver-info">

                <div className="driver-name">

                  <strong>
                    {driver.name}
                  </strong>

                  <span>
                    {driver.weight}
                  </span>

                </div>


                <div className="driver-value">

                  {formatValue(
                    driver.value,
                    driver.unit
                  )}

                </div>

              </div>



              {/* ============================================
                  SIGNAL LEVEL
                  ============================================ */}

              <div className="driver-progress">

                <div className="driver-track">

                  <div
                    className={`driver-fill ${signalClass}`}
                    style={{
                      width: hasScore
                        ? `${driver.score}%`
                        : "0%",
                    }}
                  />

                </div>


                <span
                  className={`driver-score driver-score-${signalClass}`}
                >

                  {hasScore
                    ? Math.round(
                        driver.score
                      )
                    : "N/A"}

                </span>

              </div>


            </div>

          );

        })}

      </div>



      {/* ======================================================
          FOOTER
          ====================================================== */}

      <div className="risk-drivers-footer">

        <span className="risk-drivers-footer-label">
          Model weighting
        </span>

        <span className="risk-drivers-footer-total">
          Total 100%
        </span>

        {/*
          Full technical distinction preserved verbatim in the
          title attribute (accessible on hover/focus) so the
          meaning is never lost — only the always-visible
          paragraph is removed from the production layout.
        */}
        <span
          className="risk-drivers-note-compact"
          title="Signal levels are visual indicators of current environmental conditions. They are not the official DC-ECSS cooling-stress score. The authoritative cooling-stress score and risk classification are supplied by the connected Risk Engine."
          tabIndex={0}
        >
          <span aria-hidden="true">ⓘ</span>
          Model inputs
        </span>

      </div>


    </section>

  );

}


export default RiskDrivers;