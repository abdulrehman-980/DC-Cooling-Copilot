import { useState } from "react";


function CopilotChat({
  data,
  northernVirginia,
  phoenix,
}) {

  /*
   * ============================================================
   * DC-ECSS OPERATIONS COPILOT
   * ============================================================
   *
   * Uses live data already supplied by App.jsx.
   *
   * IMPORTANT:
   * - Does not invent environmental values.
   * - Does not calculate a new official DC-ECSS score.
   * - Uses backend-provided score/risk when available.
   * - Provides deterministic explanations from live dashboard data.
   *
   * ============================================================
   */


  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState("");


  /*
   * ============================================================
   * CURRENT LOCATION
   * ============================================================
   */

  const location =
    data?.location ||
    "Selected location";


  /*
   * ============================================================
   * CURRENT ENVIRONMENTAL VALUES
   * ============================================================
   */

  const temperature =
    data?.temperature;

  const heatIndex =
    data?.heat_index;

  const wetBulb =
    data?.wet_bulb;

  const humidity =
    data?.humidity;

  const solar =
    data?.solar_irradiance;

  const persistence =
    data?.persistence_hours;

  const coolingStressScore =
    data?.cooling_stress_score;

  const riskLevel =
    data?.risk_level;

  const peakPeriod =
    data?.peak_period ||
    data?.peak_window ||
    data?.peakWindow;


  /*
   * ============================================================
   * SAFE NUMBER FORMATTER
   * ============================================================
   */

  function formatNumber(
    value,
    decimals = 1
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {

      return "N/A";

    }


    const number =
      Number(value);


    if (
      !Number.isFinite(number)
    ) {

      return "N/A";

    }


    return number.toFixed(
      decimals
    );

  }


  /*
   * ============================================================
   * NORMALIZE QUESTION
   * ============================================================
   */

  function normalizeQuestion(
    question
  ) {

    return String(
      question || ""
    )
      .toLowerCase()
      .replace(/[?!.,]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  }


  /*
   * ============================================================
   * CITY DATA
   * ============================================================
   */

  const nvScore =
    northernVirginia?.cooling_stress_score;

  const phoenixScore =
    phoenix?.cooling_stress_score;


  const nvRisk =
    northernVirginia?.risk_level;

  const phoenixRisk =
    phoenix?.risk_level;


  const nvTemperature =
    northernVirginia?.temperature;

  const phoenixTemperature =
    phoenix?.temperature;


  /*
   * ============================================================
   * GENERATE COPILOT RESPONSE
   * ============================================================
   */

  function generateResponse(
    question
  ) {

    const text =
      normalizeQuestion(
        question
      );


    if (!text) {

      return "Please ask a question about cooling risk or environmental conditions.";

    }


    /*
     * ==========================================================
     * TEMPERATURE
     * ==========================================================
     *
     * Examples:
     *
     * What is the current temperature?
     * temperature
     * how hot is it?
     * current temp
     * ==========================================================
     */

    if (
      text.includes("temperature") ||
      text.includes("temp") ||
      text.includes("how hot")
    ) {

      return `The current temperature at ${location} is ${formatNumber(
        temperature
      )}°C.`;

    }


    /*
     * ==========================================================
     * HUMIDITY
     * ==========================================================
     */

    if (
      text.includes("humidity") ||
      text.includes("humid")
    ) {

      return `The current relative humidity at ${location} is ${formatNumber(
        humidity
      )}%.`;

    }


    /*
     * ==========================================================
     * HEAT INDEX
     * ==========================================================
     */

    if (
      text.includes("heat index") ||
      text.includes("heat-index")
    ) {

      return `The current heat index at ${location} is ${formatNumber(
        heatIndex
      )}°C.`;

    }


    /*
     * ==========================================================
     * WET BULB
     * ==========================================================
     */

    if (
      text.includes("wet bulb") ||
      text.includes("wet-bulb") ||
      text.includes("wetbulb")
    ) {

      return `The current wet-bulb temperature at ${location} is ${formatNumber(
        wetBulb
      )}°C.`;

    }


    /*
     * ==========================================================
     * SOLAR
     * ==========================================================
     */

    if (
      text.includes("solar") ||
      text.includes("irradiance")
    ) {

      return `The current solar irradiance at ${location} is ${formatNumber(
        solar,
        0
      )} W/m².`;

    }


    /*
     * ==========================================================
     * PERSISTENCE
     * ==========================================================
     */

    if (
      text.includes("persistence") ||
      text.includes("how long")
    ) {

      return `The current persistence value at ${location} is ${formatNumber(
        persistence
      )} hours.`;

    }


    /*
     * ==========================================================
     * COOLING STRESS SCORE
     * ==========================================================
     */

    if (
      text.includes("score") ||
      text.includes("cooling stress") ||
      text.includes("cooling-stress") ||
      text.includes("dc-ecss")
    ) {

      if (
        coolingStressScore === null ||
        coolingStressScore === undefined
      ) {

        return `The DC-ECSS cooling-stress score for ${location} is currently unavailable.`;

      }


      return `The current DC-ECSS cooling-stress score for ${location} is ${formatNumber(
        coolingStressScore,
        1
      )}/100, with a ${riskLevel || "UNAVAILABLE"} risk level.`;

    }


    /*
     * ==========================================================
     * RISK LEVEL
     * ==========================================================
     */

    if (
      text.includes("risk") ||
      text.includes("danger") ||
      text.includes("critical") ||
      text.includes("high risk")
    ) {

      if (
        coolingStressScore === null ||
        coolingStressScore === undefined
      ) {

        return `The current DC-ECSS risk level for ${location} is ${
          riskLevel || "UNAVAILABLE"
        }, but a cooling-stress score is not currently available.`;

      }


      return `DC-ECSS currently reports ${riskLevel || "UNAVAILABLE"} risk for ${location}, with a cooling-stress score of ${formatNumber(
        coolingStressScore,
        1
      )}/100.`;

    }


    /*
     * ==========================================================
     * WHY IS RISK HIGH?
     * ==========================================================
     */

    if (
      text.includes("why") &&
      (
        text.includes("risk") ||
        text.includes("high") ||
        text.includes("danger")
      )
    ) {

      return `The current ${riskLevel || "UNAVAILABLE"} cooling-risk state at ${location} is associated with a temperature of ${formatNumber(
        temperature
      )}°C, heat index of ${formatNumber(
        heatIndex
      )}°C, wet-bulb temperature of ${formatNumber(
        wetBulb
      )}°C, humidity of ${formatNumber(
        humidity
      )}%, solar irradiance of ${formatNumber(
        solar,
        0
      )} W/m², and persistence of ${formatNumber(
        persistence
      )} hours. The official DC-ECSS score remains the authoritative risk indicator.`;

    }


    /*
     * ==========================================================
     * PEAK RISK
     * ==========================================================
     */

    if (
      text.includes("peak") ||
      text.includes("highest risk") ||
      text.includes("worst hour") ||
      text.includes("worst time") ||
      text.includes("when risk")
    ) {

      if (peakPeriod) {

        return `The current peak-risk period for ${location} is ${peakPeriod}.`;

      }


      return `A peak-risk period is not currently available for ${location}. The hourly Risk Engine data is still being evaluated.`;

    }


    /*
     * ==========================================================
     * CITY COMPARISON
     * ==========================================================
     */

    if (
      text.includes("compare") ||
      (
        text.includes("phoenix") &&
        text.includes("virginia")
      ) ||
      text.includes("which city") ||
      text.includes("which is hotter")
    ) {

      if (
        !northernVirginia ||
        !phoenix
      ) {

        return "Comparison data is currently unavailable because one or both city datasets have not loaded yet.";

      }


      const nvTempNumber =
        Number(
          nvTemperature
        );


      const phoenixTempNumber =
        Number(
          phoenixTemperature
        );


      let warmerCity =
        "both locations";


      if (
        Number.isFinite(
          phoenixTempNumber
        ) &&
        Number.isFinite(
          nvTempNumber
        )
      ) {

        if (
          phoenixTempNumber >
          nvTempNumber
        ) {

          warmerCity =
            "Phoenix";

        } else if (
          nvTempNumber >
          phoenixTempNumber
        ) {

          warmerCity =
            "Northern Virginia";

        }

      }


      let scoreComparison =
        "Risk scores are not currently available for both cities.";


      const nvScoreNumber =
        Number(
          nvScore
        );


      const phoenixScoreNumber =
        Number(
          phoenixScore
        );


      if (
        Number.isFinite(
          nvScoreNumber
        ) &&
        Number.isFinite(
          phoenixScoreNumber
        )
      ) {

        if (
          phoenixScoreNumber >
          nvScoreNumber
        ) {

          scoreComparison =
            `Phoenix has the higher DC-ECSS score at ${formatNumber(
              phoenixScoreNumber
            )}/100 versus ${formatNumber(
              nvScoreNumber
            )}/100 for Northern Virginia.`;

        } else if (
          nvScoreNumber >
          phoenixScoreNumber
        ) {

          scoreComparison =
            `Northern Virginia has the higher DC-ECSS score at ${formatNumber(
              nvScoreNumber
            )}/100 versus ${formatNumber(
              phoenixScoreNumber
            )}/100 for Phoenix.`;

        } else {

          scoreComparison =
            `Both cities currently have the same DC-ECSS score of ${formatNumber(
              nvScoreNumber
            )}/100.`;

        }

      }


      return `Current comparison: Phoenix is ${formatNumber(
        phoenixTemperature
      )}°C while Northern Virginia is ${formatNumber(
        nvTemperature
      )}°C. ${warmerCity} has the higher ambient temperature. ${scoreComparison} Phoenix is currently ${phoenixRisk || "UNAVAILABLE"} risk and Northern Virginia is currently ${nvRisk || "UNAVAILABLE"} risk.`;

    }


    /*
     * ==========================================================
     * STATUS / SUMMARY
     * ==========================================================
     */

    if (
      text.includes("status") ||
      text.includes("summary") ||
      text.includes("condition") ||
      text.includes("conditions")
    ) {

      return `Current ${location} conditions: temperature ${formatNumber(
        temperature
      )}°C, humidity ${formatNumber(
        humidity
      )}%, heat index ${formatNumber(
        heatIndex
      )}°C, wet-bulb ${formatNumber(
        wetBulb
      )}°C, solar irradiance ${formatNumber(
        solar,
        0
      )} W/m², and persistence ${formatNumber(
        persistence
      )} hours. DC-ECSS reports ${riskLevel || "UNAVAILABLE"} risk with a score of ${
        coolingStressScore !== null &&
        coolingStressScore !== undefined
          ? `${formatNumber(
              coolingStressScore,
              1
            )}/100`
          : "N/A"
      }.`;

    }


    /*
     * ==========================================================
     * HELP
     * ==========================================================
     */

    if (
      text === "help" ||
      text.includes("what can you do") ||
      text.includes("what can i ask")
    ) {

      return "You can ask me about current temperature, humidity, heat index, wet-bulb temperature, solar irradiance, persistence, DC-ECSS score, cooling risk, peak-risk period, or compare Phoenix with Northern Virginia.";

    }


    /*
     * ==========================================================
     * DEFAULT
     * ==========================================================
     */

    return `I'm monitoring ${location}. Try asking about the current temperature, humidity, cooling-stress score, cooling risk, peak risk, or compare Phoenix with Northern Virginia.`;

  }


  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */

  function sendMessage(
    messageOverride = null
  ) {

    const question =
      messageOverride !== null
        ? String(
            messageOverride
          ).trim()
        : input.trim();


    if (!question) {

      return;

    }


    const answer =
      generateResponse(
        question
      );


    setMessages(
      (previous) => [

        ...previous,

        {
          role: "user",
          text: question,
        },

        {
          role: "assistant",
          text: answer,
        },

      ]
    );


    setInput("");

  }


  /*
   * ============================================================
   * SUGGESTED QUESTIONS
   * ============================================================
   */

  const suggestedQuestions = [

    "What is the current temperature?",

    "What is the current cooling risk?",

    "Compare Phoenix vs Northern Virginia",

  ];


  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (

    <section className="copilot-card">


      <div className="copilot-header">

        <div>

          <span className="section-eyebrow">
            AI OPERATIONS COPILOT
          </span>


          <h2>
            Ask DC-ECSS
          </h2>


          <p>
            Ask questions about cooling risk and
            environmental conditions.
          </p>

        </div>


        <div className="copilot-status">

          <span className="copilot-status-dot"></span>

          COPILOT READY

        </div>

      </div>


      <div className="copilot-suggestions">

        {suggestedQuestions.map(
          (question) => (

            <button
              key={question}
              type="button"
              onClick={() =>
                sendMessage(
                  question
                )
              }
            >

              {question}

            </button>

          )
        )}

      </div>


      <div className="copilot-messages">

        {messages.length === 0 ? (

          <div className="copilot-empty">

            <div className="copilot-empty-icon">
              AI
            </div>


            <strong>
              Cooling intelligence ready
            </strong>


            <span>
              Ask a question or choose one of
              the suggested prompts above.
            </span>

          </div>

        ) : (

          messages.map(
            (
              message,
              index
            ) => (

              <div
                className={`copilot-message ${message.role}`}
                key={`${message.role}-${index}`}
              >

                <div className="copilot-message-label">

                  {message.role === "user"
                    ? "YOU"
                    : "DC-ECSS"}

                </div>


                <div className="copilot-message-text">

                  {message.text}

                </div>

              </div>

            )
          )

        )}

      </div>


      <form
        className="copilot-input"
        onSubmit={(event) => {

          event.preventDefault();

          sendMessage();

        }}
      >

        <input
          type="text"
          value={input}
          onChange={(event) =>
            setInput(
              event.target.value
            )
          }
          placeholder="Ask about environmental conditions..."
        />


        <button type="submit">
          Ask
        </button>

      </form>


      <div className="copilot-footer">

        <span>
          ENVIRONMENT: {location}
        </span>


        <span>
          Live DC-ECSS environmental intelligence
        </span>

      </div>


    </section>

  );

}


export default CopilotChat;