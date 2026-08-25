function Comparison({
  northernVirginia,
  phoenix,
  loading,
}) {


  /*
   * ============================================================
   * LOCATIONS
   * ============================================================
   */

  const locations = [

    {
      key: "northern_virginia",

      name: "Northern Virginia",

      shortName: "NOVA",

      data: northernVirginia,

    },

    {
      key: "phoenix",

      name: "Phoenix",

      shortName: "PHX",

      data: phoenix,

    },

  ];


  /*
   * ============================================================
   * SAFE VALUE FORMATTERS
   * ============================================================
   */

  function getNumber(value) {

    const number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return null;
    }

    return number;

  }


  function formatValue(
    value,
    unit = "",
    decimals = 1
  ) {

    const number =
      getNumber(value);


    if (number === null) {
      return "—";
    }


    return `${number.toFixed(
      decimals
    )}${unit}`;

  }


  /*
   * ============================================================
   * AUTHORITATIVE DC-ECSS DATA
   * ============================================================
   *
   * IMPORTANT:
   *
   * The frontend NEVER calculates the official
   * DC-ECSS score.
   *
   * These values are simply read from the backend.
   */

  function getRiskScore(data) {

    const score =
      getNumber(
        data?.cooling_stress_score
      );


    if (score === null) {
      return null;
    }


    return Math.max(
      0,
      Math.min(
        100,
        score
      )
    );

  }


  function getRiskLevel(data) {

    if (
      !data?.risk_level
    ) {

      return "UNAVAILABLE";

    }


    return String(
      data.risk_level
    ).toUpperCase();

  }


  /*
   * ============================================================
   * CURRENT RISK VALUES
   * ============================================================
   */

  const northernVirginiaScore =
    getRiskScore(
      northernVirginia
    );


  const phoenixScore =
    getRiskScore(
      phoenix
    );


  /*
   * ============================================================
   * RISK COMPARISON
   * ============================================================
   *
   * We only identify the higher-risk city when both
   * authoritative scores are available.
   */

  let higherRisk =
    "COMPARISON PENDING";


  if (
    northernVirginiaScore !== null &&
    phoenixScore !== null
  ) {

    if (
      northernVirginiaScore >
      phoenixScore
    ) {

      higherRisk =
        "Northern Virginia";

    } else if (
      phoenixScore >
      northernVirginiaScore
    ) {

      higherRisk =
        "Phoenix";

    } else {

      higherRisk =
        "Equal";

    }

  }


  /*
   * ============================================================
   * TEMPERATURE COMPARISON
   * ============================================================
   *
   * This is ONLY a temperature comparison.
   *
   * It is NOT a DC-ECSS risk calculation.
   */

  const northernVirginiaTemperature =
    getNumber(
      northernVirginia?.temperature
    );


  const phoenixTemperature =
    getNumber(
      phoenix?.temperature
    );


  let warmerLocation =
    "UNAVAILABLE";


  if (
    northernVirginiaTemperature !== null &&
    phoenixTemperature !== null
  ) {

    if (
      northernVirginiaTemperature >
      phoenixTemperature
    ) {

      warmerLocation =
        "Northern Virginia";

    } else if (
      phoenixTemperature >
      northernVirginiaTemperature
    ) {

      warmerLocation =
        "Phoenix";

    } else {

      warmerLocation =
        "Equal";

    }

  }


  /*
   * ============================================================
   * TABLE METRICS
   * ============================================================
   */

  const metrics = [

    {
      key: "temperature",

      name: "Temperature",

      getValue: (data) =>
        formatValue(
          data?.temperature,
          "°C"
        ),

    },


    {
      key: "humidity",

      name: "Humidity",

      getValue: (data) =>
        formatValue(
          data?.humidity,
          "%"
        ),

    },


    {
      key: "heat_index",

      name: "Heat Index",

      getValue: (data) =>
        formatValue(
          data?.heat_index,
          "°C"
        ),

    },


    {
      key: "wet_bulb",

      name: "Wet-Bulb",

      getValue: (data) =>
        formatValue(
          data?.wet_bulb,
          "°C"
        ),

    },


    {
      key: "solar",

      name: "Solar Irradiance",

      getValue: (data) =>
        formatValue(
          data?.solar_irradiance,
          " W/m²"
        ),

    },


    {
      key: "persistence",

      name: "Persistence",

      getValue: (data) =>
        formatValue(
          data?.persistence_hours,
          " h"
        ),

    },

  ];


  /*
   * ============================================================
   * COMPONENT
   * ============================================================
   */

  return (

    <section className="comparison-section">


      <div className="comparison-card">


        {/* ====================================================
            HEADER
            ==================================================== */}

        <div className="comparison-header">


          <div>

            <span className="section-eyebrow">
              CITY COMPARISON
            </span>


            <h2>
              Northern Virginia vs Phoenix
            </h2>


            <p>
              Compare current environmental conditions
              and validated cooling-risk signals across
              both demo locations.
            </p>

          </div>


          <span className="comparison-badge">
            LIVE DATA
          </span>


        </div>



        {/* ====================================================
            TABLE
            ==================================================== */}

        {loading ? (

          <div className="comparison-loading">

            Loading comparison data...

          </div>

        ) : (

          <div className="comparison-table">


            {/* TABLE HEADER */}

            <div className="comparison-row comparison-title-row">


              <div className="comparison-metric">
                Metric
              </div>


              {locations.map(
                (location) => (

                  <div
                    className="comparison-location"
                    key={location.key}
                  >

                    <span>
                      {location.shortName}
                    </span>

                    {location.name}

                  </div>

                )
              )}


            </div>



            {/* ENVIRONMENTAL METRICS */}

            {metrics.map(
              (metric) => (

                <div
                  className="comparison-row"
                  key={metric.key}
                >


                  <div className="comparison-metric">

                    {metric.name}

                  </div>


                  {locations.map(
                    (location) => (

                      <div
                        className="comparison-value"
                        key={location.key}
                      >

                        {metric.getValue(
                          location.data
                        )}

                      </div>

                    )
                  )}


                </div>

              )
            )}



            {/* ==================================================
                OFFICIAL DC-ECSS SCORE
                ================================================== */}

            <div className="comparison-row comparison-risk-row">


              <div className="comparison-metric">

                DC-ECSS Score

              </div>


              {locations.map(
                (location) => {

                  const score =
                    getRiskScore(
                      location.data
                    );


                  return (

                    <div
                      className="comparison-value comparison-risk-value"
                      key={location.key}
                    >

                      {score !== null
                        ? `${Math.round(
                            score
                          )}/100`
                        : "—"}

                    </div>

                  );

                }
              )}


            </div>



            {/* ==================================================
                RISK LEVEL
                ================================================== */}

            <div className="comparison-row comparison-risk-row">


              <div className="comparison-metric">

                Risk Level

              </div>


              {locations.map(
                (location) => (

                  <div
                    className="comparison-value comparison-risk-level"
                    key={location.key}
                  >

                    {getRiskLevel(
                      location.data
                    )}

                  </div>

                )
              )}


            </div>


          </div>

        )}



        {/* ====================================================
            SUMMARY
            ==================================================== */}

        <div className="comparison-summary">


          <div className="comparison-summary-item">


            <span>
              HIGHER DC-ECSS RISK
            </span>


            <strong>
              {loading
                ? "..."
                : higherRisk}
            </strong>


          </div>



          <div className="comparison-summary-item">


            <span>
              HIGHER TEMPERATURE
            </span>


            <strong>
              {loading
                ? "..."
                : warmerLocation}
            </strong>


          </div>


        </div>



        {/* ====================================================
            TECHNICAL NOTE
            ==================================================== */}

        <div className="comparison-note">


          <span>
            ⓘ
          </span>


          <p>

            Environmental values are supplied by the
            backend. DC-ECSS score and risk level are
            displayed only when provided by the validated
            Risk Engine. The frontend does not calculate
            or invent the official cooling-risk score.

          </p>


        </div>


      </div>


    </section>

  );

}


export default Comparison;