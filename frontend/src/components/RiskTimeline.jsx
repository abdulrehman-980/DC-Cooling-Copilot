import {
  computeDcEcss,
} from "../services/dcEcssScoring";


function RiskTimeline({ riskData = [] }) {

  /*
   * ============================================================
   * DC-ECSS RISK TIMELINE
   * ============================================================
   *
   * Frontend presentation component.
   *
   * Supports:
   *
   * 1. Already-scored hourly data:
   *    {
   *      time,
   *      cooling_stress_score,
   *      risk_level
   *    }
   *
   * 2. Raw hourly environmental data:
   *    {
   *      time,
   *      temperature,
   *      humidity,
   *      heat_index,
   *      wet_bulb,
   *      solar_irradiance,
   *      persistence_hours
   *    }
   *
   * If a score is already supplied, it is used directly.
   * If no score exists, the existing DC-ECSS scoring function
   * is used to make the frontend render the timeline.
   *
   * No backend changes are made here.
   */


  /*
   * ============================================================
   * DEBUG
   * ============================================================
   */

  console.log(
    "[RISK TIMELINE] Received riskData:",
    riskData
  );


  /*
   * ============================================================
   * SAFE NUMBER
   * ============================================================
   */

  const toFiniteNumber = (value) => {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  };


  /*
   * ============================================================
   * SCORE NORMALIZATION
   * ============================================================
   */

  const normalizeScore = (value) => {

    const score =
      toFiniteNumber(value);

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
  };


  /*
   * ============================================================
   * RISK CLASS
   * ============================================================
   */

  const getRiskClass = (
    riskLevel,
    score
  ) => {

    const level =
      riskLevel
        ? String(
            riskLevel
          )
            .trim()
            .toUpperCase()
        : "";


    if (level === "CRITICAL") {
      return "critical";
    }

    if (level === "HIGH") {
      return "high";
    }

    if (level === "MODERATE") {
      return "moderate";
    }

    if (level === "LOW") {
      return "low";
    }


    /*
     * Visual fallback only.
     */

    if (score !== null) {

      if (score >= 76) {
        return "critical";
      }

      if (score >= 51) {
        return "high";
      }

      if (score >= 26) {
        return "moderate";
      }

      return "low";
    }


    return "unknown";
  };


  /*
   * ============================================================
   * RISK LABEL
   * ============================================================
   */

  const getRiskLabel = (
    riskLevel,
    score
  ) => {

    if (riskLevel) {

      return String(
        riskLevel
      ).trim().toUpperCase();

    }


    if (score === null) {
      return "UNKNOWN";
    }


    if (score >= 76) {
      return "CRITICAL";
    }

    if (score >= 51) {
      return "HIGH";
    }

    if (score >= 26) {
      return "MODERATE";
    }

    return "LOW";
  };


  /*
   * ============================================================
   * EXTRACT HOURLY ARRAY
   * ============================================================
   */

  const extractTimelineArray = (
    source
  ) => {

    if (
      Array.isArray(source)
    ) {
      return source;
    }


    if (
      !source ||
      typeof source !== "object"
    ) {
      return [];
    }


    const possibleArrays = [
      source.hourly,
      source.hourly_data,
      source.timeline,
      source.risk_data,
      source.risk_timeline,
      source.data,
      source.results,
      source.items,
    ];


    for (
      const candidate
      of possibleArrays
    ) {

      if (
        Array.isArray(candidate)
      ) {
        return candidate;
      }
    }


    /*
     * Nested wrappers.
     */

    const nestedCandidates = [
      source.result,
      source.response,
      source.data,
    ];


    for (
      const candidate
      of nestedCandidates
    ) {

      if (
        candidate &&
        candidate !== source
      ) {

        const nested =
          extractTimelineArray(
            candidate
          );

        if (
          nested.length > 0
        ) {
          return nested;
        }
      }
    }


    return [];
  };


  /*
   * ============================================================
   * EXTRACT RAW HOURLY DATA
   * ============================================================
   */

  const rawTimeline =
    extractTimelineArray(
      riskData
    );


  console.log(
    "[RISK TIMELINE] Extracted hourly array:",
    rawTimeline
  );


  /*
   * ============================================================
   * NORMALIZE HOURLY DATA
   * ============================================================
   */

  const timeline =
    rawTimeline
      .map(
        (
          item,
          index
        ) => {

          if (
            !item ||
            typeof item !== "object"
          ) {
            return null;
          }


          /*
           * ----------------------------------------------------
           * TIME
           * ----------------------------------------------------
           */

          const rawTime =
            item.time ??
            item.timestamp ??
            item.datetime ??
            item.date_time ??
            item.hour ??
            item.label;


          const time =
            rawTime !== null &&
            rawTime !== undefined &&
            rawTime !== ""
              ? String(rawTime)
              : `${String(
                  index
                ).padStart(
                  2,
                  "0"
                )}:00`;


          /*
           * ----------------------------------------------------
           * EXISTING SCORE
           * ----------------------------------------------------
           */

          const suppliedScore =
            item.cooling_stress_score ??
            item.coolingStressScore ??
            item.score ??
            item.risk_score;


          let score =
            normalizeScore(
              suppliedScore
            );


          /*
           * ----------------------------------------------------
           * EXISTING RISK LEVEL
           * ----------------------------------------------------
           */

          let riskLevel =
            item.risk_level ??
            item.riskLevel ??
            item.level;


          /*
           * ----------------------------------------------------
           * FRONTEND FALLBACK
           * ----------------------------------------------------
           *
           * Only used when the hourly object does not already
           * contain a cooling-stress score.
           *
           * We are NOT changing the Risk Engine here.
           */

          if (
            score === null
          ) {

            try {

              const scored =
                computeDcEcss(
                  item
                );


              score =
                normalizeScore(
                  scored?.cooling_stress_score
                );


              if (
                !riskLevel &&
                scored?.risk_level
              ) {

                riskLevel =
                  scored.risk_level;

              }

            } catch (error) {

              console.warn(
                "[RISK TIMELINE] Unable to score hourly reading:",
                item,
                error
              );

            }
          }


          /*
           * ----------------------------------------------------
           * FINAL RISK LABEL
           * ----------------------------------------------------
           */

          const finalRiskLevel =
            getRiskLabel(
              riskLevel,
              score
            );


          /*
           * ----------------------------------------------------
           * FINAL CSS CLASS
           * ----------------------------------------------------
           */

          const riskClass =
            getRiskClass(
              finalRiskLevel,
              score
            );


          return {
            time,
            score,
            riskLevel: finalRiskLevel,
            riskClass,
            persistenceHours:
              item.persistence_hours ??
              item.persistenceHours ??
              null,
            index,
          };
        }
      )
      .filter(
        (item) =>
          item !== null &&
          item.score !== null
      );


  console.log(
    "[RISK TIMELINE] Usable timeline:",
    timeline
  );

  console.log(
    "[RISK TIMELINE] Usable timeline count:",
    timeline.length
  );


  /*
   * ============================================================
   * DATA STATE
   * ============================================================
   */

  const hasRiskData =
    timeline.length > 0;


  /*
   * ============================================================
   * PEAK RISK
   * ============================================================
   */

  const peakRisk =
    hasRiskData
      ? timeline.reduce(
          (
            highest,
            current
          ) => {

            if (!highest) {
              return current;
            }

            return current.score >
              highest.score
              ? current
              : highest;
          },
          null
        )
      : null;


  /*
   * ============================================================
   * PEAK WINDOW
   * ============================================================
   */

  const backendPeakWindow =
    riskData?.peak_window ??
    riskData?.peakWindow ??
    riskData?.peak_period ??
    riskData?.peakPeriod;


  /*
   * Frontend visual fallback.
   *
   * This is only for displaying something useful when no
   * authoritative peak window has been supplied.
   */

  const highRiskReadings =
    timeline.filter(
      (item) =>
        item.score >= 51
    );


  const calculatedPeakWindow =
    highRiskReadings.length > 0
      ? `${highRiskReadings[0].time} – ${
          highRiskReadings[
            highRiskReadings.length - 1
          ].time
        }`
      : null;


  const peakWindow =
    backendPeakWindow ||
    calculatedPeakWindow;


  /*
   * ============================================================
   * CHART SCALE
   * ============================================================
   */

  const chartHeight = 100;


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (

    <section className="risk-timeline-card">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <div className="risk-timeline-header">

        <div className="risk-timeline-heading">

          <span className="section-eyebrow">
            24-HOUR RISK PROFILE
          </span>

          <h2>
            Cooling Risk Timeline
          </h2>

          <p>
            Hourly DC-ECSS cooling-stress profile.
          </p>

        </div>


        <div
          className={`timeline-status ${
            hasRiskData
              ? "live"
              : "preview"
          }`}
        >

          <span
            className={`timeline-status-dot ${
              hasRiskData
                ? "live"
                : "preview"
            }`}
          />

          {hasRiskData
            ? "LIVE PROFILE"
            : "AWAITING RISK ENGINE"}

        </div>

      </div>


      {/* ======================================================
          PEAK SUMMARY
          ====================================================== */}

      {hasRiskData &&
        peakRisk && (

          <div className="timeline-summary">

            <div className="timeline-summary-item">

              <span>
                PEAK RISK
              </span>

              <strong>
                {Math.round(
                  peakRisk.score
                )}
              </strong>

            </div>


            <div className="timeline-summary-item">

              <span>
                LEVEL
              </span>

              <strong
                className={`risk-summary-level ${
                  peakRisk.riskClass
                }`}
              >
                {peakRisk.riskLevel}
              </strong>

            </div>


            {peakWindow && (

              <div className="timeline-summary-item">

                <span>
                  PEAK WINDOW
                </span>

                <strong>
                  {peakWindow}
                </strong>

              </div>

            )}

          </div>

        )}


      {/* ======================================================
          EMPTY STATE / CHART
          ====================================================== */}

      {!hasRiskData ? (

        <div className="timeline-empty-state">

          <div className="timeline-empty-icon">

            <span className="timeline-empty-pulse" />

          </div>


          <div>

            <strong>
              Risk timeline awaiting engine data
            </strong>

            <p>
              Hourly environmental data is available.
              The cooling-stress profile will appear here
              once usable hourly data reaches the dashboard.
            </p>

          </div>

        </div>

      ) : (

        <div className="timeline-chart">

          {/* ==================================================
              Y AXIS
              ================================================== */}

          <div className="risk-scale">

            <span>100</span>

            <span>75</span>

            <span>50</span>

            <span>25</span>

            <span>0</span>

          </div>


          {/* ==================================================
              CHART AREA
              ================================================== */}

          <div className="timeline-area">

            {/* GRID */}

            <div
              className="grid-line line-100"
              aria-hidden="true"
            />

            <div
              className="grid-line line-75"
              aria-hidden="true"
            />

            <div
              className="grid-line line-50"
              aria-hidden="true"
            />

            <div
              className="grid-line line-25"
              aria-hidden="true"
            />

            <div
              className="grid-line line-0"
              aria-hidden="true"
            />


            {/* BARS */}

            <div className="timeline-bars">

              {timeline.map(
                (
                  item,
                  index
                ) => {

                  const score =
                    item.score;


                  const barHeight =
                    Math.max(
                      2,
                      Math.min(
                        chartHeight,
                        score
                      )
                    );


                  return (

                    <div
                      className={`timeline-column ${
                        item.riskClass
                      }`}
                      key={`${item.time}-${index}`}
                      style={{
                        "--timeline-index":
                          index,
                        "--bar-height":
                          `${barHeight}%`,
                      }}
                    >

                      {/* SCORE */}

                      <span className="timeline-score">

                        {Math.round(
                          score
                        )}

                      </span>


                      {/* BAR */}

                      <div
                        className={`timeline-bar ${
                          item.riskClass
                        }`}
                        style={{
                          height:
                            `${barHeight}%`,
                          animationDelay:
                            `${index * 45}ms`,
                        }}
                        title={`${item.time} — ${score.toFixed(
                          1
                        )}/100 — ${
                          item.riskLevel
                        }`}
                      >

                        <span className="timeline-bar-glow" />

                        <span className="timeline-bar-highlight" />

                      </div>


                      {/* TIME */}

                      <span className="timeline-time">

                        {item.time}

                      </span>

                    </div>

                  );

                }
              )}

            </div>

          </div>

        </div>

      )}


      {/* ======================================================
          LEGEND
          ====================================================== */}

      <div className="timeline-legend">

        <div className="timeline-legend-item">

          <span className="legend-dot low" />

          <span>
            Low
          </span>

        </div>


        <div className="timeline-legend-item">

          <span className="legend-dot moderate" />

          <span>
            Moderate
          </span>

        </div>


        <div className="timeline-legend-item">

          <span className="legend-dot high" />

          <span>
            High
          </span>

        </div>


        <div className="timeline-legend-item">

          <span className="legend-dot critical" />

          <span>
            Critical
          </span>

        </div>

      </div>


      {/* ======================================================
          FOOTER
          ====================================================== */}

      <div className="timeline-footer">

        <span>
          DC-ECSS
        </span>

        <span>
          0–100 cooling-stress scale
        </span>

        <span className="timeline-footer-status">

          <span className="timeline-footer-dot" />

          {hasRiskData
            ? "Engine scoring active"
            : "Awaiting hourly data"}

        </span>

      </div>

    </section>

  );
}


export default RiskTimeline;