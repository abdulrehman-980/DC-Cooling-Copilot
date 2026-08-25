function AIRecommendation({ data }) {
  /*
   * ============================================================
   * ENVIRONMENTAL DATA
   * ============================================================
   *
   * These values come from the live environmental endpoint.
   *
   * IMPORTANT:
   * This component does NOT calculate the official DC-ECSS
   * cooling-stress score or risk level.
   *
   * The authoritative score, risk classification, and final
   * recommendation will come from Adeel's Risk Engine.
   *
   * ============================================================
   */

  const toNumberOrNull = (value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  };


  const temperature =
    toNumberOrNull(data?.temperature);

  const humidity =
    toNumberOrNull(data?.humidity);

  const heatIndex =
    toNumberOrNull(data?.heat_index);

  const wetBulb =
    toNumberOrNull(data?.wet_bulb);

  const solar =
    toNumberOrNull(data?.solar_irradiance);

  const persistence =
    toNumberOrNull(data?.persistence_hours);


  /*
   * ============================================================
   * HELPERS
   * ============================================================
   */

  const formatValue = (
    value,
    decimals = 1
  ) => {
    if (value === null) {
      return "N/A";
    }

    return value.toFixed(decimals);
  };


  /*
   * ============================================================
   * ENVIRONMENTAL SIGNAL ANALYSIS
   * ============================================================
   *
   * IMPORTANT:
   * These are NOT official DC-ECSS calculations.
   *
   * They only identify environmental conditions that may
   * require operational attention while the Risk Engine
   * integration is pending.
   *
   * ============================================================
   */

  const conditions = [];


  if (
    temperature !== null &&
    temperature >= 38
  ) {
    conditions.push(
      "elevated ambient temperature"
    );
  }


  if (
    heatIndex !== null &&
    heatIndex >= 40
  ) {
    conditions.push(
      "high heat-index conditions"
    );
  }


  if (
    wetBulb !== null &&
    wetBulb >= 27
  ) {
    conditions.push(
      "elevated wet-bulb temperature"
    );
  }


  if (
    solar !== null &&
    solar >= 700
  ) {
    conditions.push(
      "strong solar loading"
    );
  }


  if (
    humidity !== null &&
    humidity >= 70
  ) {
    conditions.push(
      "high humidity"
    );
  }


  if (
    persistence !== null &&
    persistence >= 6
  ) {
    conditions.push(
      "persistent thermal stress"
    );
  }


  /*
   * ============================================================
   * TEMPORARY OPERATIONAL GUIDANCE
   * ============================================================
   *
   * This is intentionally separate from the official
   * DC-ECSS risk classification.
   *
   * When the Risk Engine is connected, this logic can be
   * replaced by the authoritative backend recommendation.
   *
   * ============================================================
   */

  let recommendationTitle =
    "Environmental conditions are currently manageable";

  let recommendationText =
    "Continue monitoring environmental conditions and maintain normal cooling operations.";

  let recommendationLevel =
    "MONITOR";


  /*
   * Higher environmental stress
   */

  if (
    conditions.length >= 3 ||
    (
      temperature !== null &&
      temperature >= 40
    ) ||
    (
      heatIndex !== null &&
      heatIndex >= 42
    )
  ) {
    recommendationTitle =
      "Multiple thermal stress signals detected";

    recommendationText =
      "Several environmental conditions are increasing thermal load. Review cooling capacity, monitor system performance, and prepare for increased cooling demand.";

    recommendationLevel =
      "ATTENTION";
  }


  /*
   * Moderate environmental stress
   */

  else if (
    conditions.length >= 1 ||
    (
      temperature !== null &&
      temperature >= 35
    ) ||
    (
      heatIndex !== null &&
      heatIndex >= 38
    )
  ) {
    recommendationTitle =
      "Monitor cooling conditions closely";

    recommendationText =
      "Current environmental conditions indicate increased thermal load. Continue active monitoring and verify that sufficient cooling capacity is available.";

    recommendationLevel =
      "MONITOR";
  }


  /*
   * ============================================================
   * LOCATION
   * ============================================================
   */

  const location =
    data?.location ||
    "Selected data center location";


  /*
   * ============================================================
   * TECHNICAL NOTE TEXT
   * ============================================================
   *
   * Full explanation preserved verbatim, surfaced compactly via
   * the "ai-recommendation-note-compact" title attribute below
   * rather than as an always-visible paragraph.
   * ============================================================
   */

  const technicalNote =
    "This is temporary environmental guidance. The authoritative DC-ECSS cooling-stress score, risk classification, and final operational recommendation will be supplied by the connected Risk Engine.";


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <section className="ai-recommendation-card">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="ai-recommendation-header">

        <div>

          <span className="section-eyebrow">
            AI OPERATIONS GUIDANCE
          </span>

          <h2>
            Cooling Recommendation
          </h2>

          <p>
            Operational guidance based on the current
            environmental profile.
          </p>

        </div>


        <div
          className={`ai-recommendation-badge ${recommendationLevel.toLowerCase()}`}
        >

          <span className="ai-status-dot"></span>

          {recommendationLevel}

        </div>

      </div>


      {/* ======================================================
          BODY
          ====================================================== */}

      <div className="ai-recommendation-body">

        <div className="ai-icon">
          AI
        </div>


        <div className="ai-recommendation-content">

          <h3>
            {recommendationTitle}
          </h3>


          <p>
            {recommendationText}
          </p>


          <div className="ai-location">

            <span>
              MONITORED LOCATION
            </span>

            <strong>
              {location}
            </strong>

          </div>

        </div>

      </div>


      {/* ======================================================
          CURRENT ENVIRONMENTAL SIGNALS
          ====================================================== */}

      <div className="ai-factors">

        <span className="ai-factors-label">
          CURRENT ENVIRONMENTAL SIGNALS
        </span>


        <div className="ai-factor-list">

          <span>
            Temperature{" "}
            {formatValue(temperature)}°C
          </span>


          <span>
            Heat Index{" "}
            {formatValue(heatIndex)}°C
          </span>


          <span>
            Wet-Bulb{" "}
            {formatValue(wetBulb)}°C
          </span>


          <span>
            Solar{" "}
            {formatValue(solar, 0)} W/m²
          </span>


          <span>
            Humidity{" "}
            {formatValue(humidity)}%
          </span>

        </div>

      </div>


      {/* ======================================================
          FOOTER
          ====================================================== */}

      <div className="ai-recommendation-footer">

        <span>
          AI COPILOT
        </span>

        <span className="ai-recommendation-footer-meta">

          Guidance updates with live environmental data

          <span
            className="ai-recommendation-note-compact"
            title={technicalNote}
            tabIndex={0}
          >
            <span aria-hidden="true">ⓘ</span>
            Preview guidance
          </span>

        </span>

      </div>

    </section>
  );
}


export default AIRecommendation;