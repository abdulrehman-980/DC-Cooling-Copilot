function RiskGauge({
  score,
  riskLevel,
  loading,
}) {

  const numericScore =
    Number(score);


  const hasScore =
    Number.isFinite(numericScore);


  const displayScore =
    hasScore
      ? Math.max(
          0,
          Math.min(
            100,
            numericScore
          )
        )
      : 0;


  const displayRisk =
    riskLevel
      ? String(riskLevel).toUpperCase()
      : "UNAVAILABLE";


  const getRiskClass = () => {

    if (
      displayRisk === "CRITICAL"
    ) {
      return "critical";
    }


    if (
      displayRisk === "HIGH"
    ) {
      return "high";
    }


    if (
      displayRisk === "MODERATE"
    ) {
      return "moderate";
    }


    if (
      displayRisk === "LOW"
    ) {
      return "low";
    }


    return "unknown";

  };


  const riskClass =
    getRiskClass();


  return (

    <section className="risk-gauge-card">


      <div className="risk-gauge-header">

        <div>

          <span className="section-eyebrow">
            DC-ECSS RISK ENGINE
          </span>


          <h2>
            Cooling Stress
          </h2>


          <p>
            Current environmental cooling-risk assessment.
          </p>

        </div>


        <div className="risk-gauge-engine">
          AUTHORITATIVE SCORE
        </div>

      </div>



      <div className="risk-gauge-content">


        {/* GAUGE */}

        <div
          className={`risk-gauge ${riskClass}`}
          style={{
            "--risk-score": `${displayScore}%`,
          }}
        >

          <div className="risk-gauge-inner">

            {loading ? (

              <div className="risk-gauge-loading">
                ...
              </div>

            ) : hasScore ? (

              <>

                <strong>
                  {Math.round(displayScore)}
                </strong>

                <span>
                  / 100
                </span>

              </>

            ) : (

              <strong>
                —
              </strong>

            )}

          </div>

        </div>



        {/* RISK INFORMATION */}

        <div className="risk-gauge-info">


          <span className="risk-gauge-label">
            CURRENT RISK
          </span>


          <div
            className={`risk-level ${riskClass}`}
          >
            {displayRisk}
          </div>


          <p>
            {loading
              ? "Loading the latest DC-ECSS assessment..."
              : hasScore
              ? "Score supplied by the authoritative risk engine."
              : "DC-ECSS score is not currently available."
            }
          </p>


        </div>


      </div>



      {/* SCALE */}

      <div className="risk-gauge-scale">


        <span>
          LOW
        </span>


        <span>
          MODERATE
        </span>


        <span>
          HIGH
        </span>


        <span>
          CRITICAL
        </span>


      </div>


      <div className="risk-gauge-footer">

        <span>
          DC-ECSS
        </span>


        <span>
          0–100 cooling-stress scale
        </span>

      </div>


    </section>

  );

}


export default RiskGauge;