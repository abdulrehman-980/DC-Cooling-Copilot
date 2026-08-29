/**
 * aiCopilot.js
 *
 * DC-ECSS AI Operations Copilot
 *
 * Provides structured Copilot responses using the
 * environmental and risk-engine data already available
 * in the frontend.
 *
 * IMPORTANT:
 * The Copilot does NOT calculate or replace the official
 * DC-ECSS Risk Engine score.
 */


/*
 * ============================================================
 * CORE QUESTIONS
 * ============================================================
 */

export const CORE_QUESTIONS = [

  "Why is cooling risk high?",

  "When does risk peak?",

  "Compare Phoenix vs Northern Virginia",

  "What is the current temperature?",

  "What is the current humidity?",

  "What is the wet-bulb temperature?",

  "What is the heat index?",

  "What is the solar irradiance?",

];


/*
 * ============================================================
 * SAFE NUMBER
 * ============================================================
 */

function toNumber(value) {

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

}


/*
 * ============================================================
 * FORMAT NUMBER
 * ============================================================
 */

function formatNumber(
  value,
  decimals = 1
) {

  const number =
    toNumber(value);


  if (number === null) {

    return "N/A";

  }


  return number.toFixed(
    decimals
  );

}


/*
 * ============================================================
 * LOCATION
 * ============================================================
 */

function getLocation(
  data
) {

  return (
    data?.location ||
    "Selected location"
  );

}


/*
 * ============================================================
 * WHY RISK
 * ============================================================
 */

function answerRiskQuestion(
  data
) {

  const location =
    getLocation(
      data
    );


  const score =
    toNumber(
      data?.cooling_stress_score
    );


  const riskLevel =
    data?.risk_level ||
    "UNAVAILABLE";


  const temperature =
    formatNumber(
      data?.temperature
    );


  const heatIndex =
    formatNumber(
      data?.heat_index
    );


  const wetBulb =
    formatNumber(
      data?.wet_bulb
    );


  const humidity =
    formatNumber(
      data?.humidity
    );


  const solar =
    formatNumber(
      data?.solar_irradiance,
      0
    );


  const persistence =
    formatNumber(
      data?.persistence_hours
    );


  const scoreText =
    score === null
      ? "not available"
      : formatNumber(
          score,
          1
        );


  return (
    `DC-ECSS currently reports ${riskLevel} risk for ${location}, ` +
    `with a cooling-stress score of ${scoreText}/100. ` +
    `The monitored conditions are ${temperature}°C temperature, ` +
    `${heatIndex}°C heat index, ${wetBulb}°C wet-bulb temperature, ` +
    `${humidity}% humidity, ${solar} W/m² solar irradiance, ` +
    `and ${persistence} hours of persistence. ` +
    `These environmental signals are being used by the dashboard ` +
    `to describe the current cooling-stress conditions.`
  );

}


/*
 * ============================================================
 * PEAK RISK
 * ============================================================
 */

function answerPeakQuestion(
  data
) {

  const location =
    getLocation(
      data
    );


  const peak =
    data?.peak_period ??
    data?.peak_window ??
    data?.peakPeriod ??
    data?.peakWindow;


  if (peak) {

    return (
      `The current DC-ECSS analysis identifies ` +
      `${peak} as the peak-risk period for ${location}.`
    );

  }


  return (
    `A peak-risk window is not currently available for ` +
    `${location}. The dashboard will display it when the ` +
    `Risk Engine supplies the corresponding hourly analysis.`
  );

}


/*
 * ============================================================
 * TEMPERATURE
 * ============================================================
 */

function answerTemperature(
  data
) {

  return (
    `The current temperature at ` +
    `${getLocation(data)} is ` +
    `${formatNumber(data?.temperature)}°C.`
  );

}


/*
 * ============================================================
 * HUMIDITY
 * ============================================================
 */

function answerHumidity(
  data
) {

  return (
    `Current humidity at ` +
    `${getLocation(data)} is ` +
    `${formatNumber(data?.humidity)}%.`
  );

}


/*
 * ============================================================
 * WET BULB
 * ============================================================
 */

function answerWetBulb(
  data
) {

  return (
    `The current wet-bulb temperature at ` +
    `${getLocation(data)} is ` +
    `${formatNumber(data?.wet_bulb)}°C.`
  );

}


/*
 * ============================================================
 * HEAT INDEX
 * ============================================================
 */

function answerHeatIndex(
  data
) {

  return (
    `The current heat index at ` +
    `${getLocation(data)} is ` +
    `${formatNumber(data?.heat_index)}°C.`
  );

}


/*
 * ============================================================
 * SOLAR
 * ============================================================
 */

function answerSolar(
  data
) {

  return (
    `Current solar irradiance at ` +
    `${getLocation(data)} is approximately ` +
    `${formatNumber(data?.solar_irradiance, 0)} W/m².`
  );

}


/*
 * ============================================================
 * CITY COMPARISON
 * ============================================================
 */

function answerComparison(
  northernVirginia,
  phoenix
) {

  if (
    !northernVirginia ||
    !phoenix
  ) {

    return (
      "Comparison data is currently unavailable because " +
      "one or both city datasets have not reached the Copilot yet."
    );

  }


  const nvScore =
    toNumber(
      northernVirginia?.cooling_stress_score
    );


  const phoenixScore =
    toNumber(
      phoenix?.cooling_stress_score
    );


  const nvTemperature =
    toNumber(
      northernVirginia?.temperature
    );


  const phoenixTemperature =
    toNumber(
      phoenix?.temperature
    );


  /*
   * Prefer authoritative DC-ECSS scores when available.
   */

  if (
    nvScore !== null &&
    phoenixScore !== null
  ) {

    const higherRisk =
      phoenixScore > nvScore
        ? "Phoenix"
        : nvScore > phoenixScore
          ? "Northern Virginia"
          : "both locations";


    const gap =
      Math.abs(
        nvScore -
        phoenixScore
      );


    return (
      `Based on the current DC-ECSS scores, ` +
      `${higherRisk} has the higher cooling risk. ` +
      `Northern Virginia is ${formatNumber(nvScore, 1)}/100 ` +
      `and Phoenix is ${formatNumber(phoenixScore, 1)}/100. ` +
      `The score difference is ${formatNumber(gap, 1)} points.`
    );

  }


  /*
   * Fall back to temperature comparison only when
   * authoritative scores are unavailable.
   */

  if (
    nvTemperature !== null &&
    phoenixTemperature !== null
  ) {

    const warmerCity =
      phoenixTemperature > nvTemperature
        ? "Phoenix"
        : nvTemperature > phoenixTemperature
          ? "Northern Virginia"
          : "both locations";


    return (
      `The available environmental data shows that ` +
      `${warmerCity} has the higher ambient temperature. ` +
      `Phoenix is currently ${formatNumber(phoenixTemperature)}°C ` +
      `while Northern Virginia is ${formatNumber(nvTemperature)}°C. ` +
      `A final cooling-risk comparison should use the ` +
      `authoritative DC-ECSS scores when available.`
    );

  }


  return (
    "Comparison data was received, but the required values " +
    "are currently unavailable."
  );

}


/*
 * ============================================================
 * MAIN COPILOT FUNCTION
 * ============================================================
 */

export function askCopilot({

  question = "",

  data = null,

  northernVirginia = null,

  phoenix = null,

} = {}) {

  const text =
    String(
      question
    )
      .toLowerCase()
      .trim();


  if (!text) {

    return (
      "Please ask a question about cooling risk or " +
      "environmental conditions."
    );

  }


  /*
   * ----------------------------------------------------------
   * RISK
   * ----------------------------------------------------------
   */

  if (
    text.includes("why") &&
    (
      text.includes("risk") ||
      text.includes("high") ||
      text.includes("cooling")
    )
  ) {

    return answerRiskQuestion(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * PEAK
   * ----------------------------------------------------------
   */

  if (
    text.includes("peak") ||
    text.includes("when does risk") ||
    text.includes("highest risk")
  ) {

    return answerPeakQuestion(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * COMPARISON
   * ----------------------------------------------------------
   */

  if (
    text.includes("compare") ||
    text.includes("comparison") ||
    text.includes("phoenix") ||
    text.includes("virginia")
  ) {

    return answerComparison(
      northernVirginia,
      phoenix
    );

  }


  /*
   * ----------------------------------------------------------
   * TEMPERATURE
   * ----------------------------------------------------------
   */

  if (
    text.includes("temperature") &&
    !text.includes("wet")
  ) {

    return answerTemperature(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * HUMIDITY
   * ----------------------------------------------------------
   */

  if (
    text.includes("humidity")
  ) {

    return answerHumidity(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * WET BULB
   * ----------------------------------------------------------
   */

  if (
    text.includes("wet-bulb") ||
    text.includes("wet bulb") ||
    text.includes("wetbulb")
  ) {

    return answerWetBulb(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * HEAT INDEX
   * ----------------------------------------------------------
   */

  if (
    text.includes("heat index")
  ) {

    return answerHeatIndex(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * SOLAR
   * ----------------------------------------------------------
   */

  if (
    text.includes("solar") ||
    text.includes("irradiance")
  ) {

    return answerSolar(
      data
    );

  }


  /*
   * ----------------------------------------------------------
   * DEFAULT
   * ----------------------------------------------------------
   */

  return (
    `I'm monitoring ${getLocation(data)}. ` +
    `You can ask me about cooling risk, peak risk, ` +
    `temperature, humidity, wet-bulb temperature, ` +
    `heat index, solar irradiance, or compare ` +
    `Phoenix with Northern Virginia.`
  );

}


export default askCopilot;