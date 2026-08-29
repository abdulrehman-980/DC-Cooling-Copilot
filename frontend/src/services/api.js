/*
 * ============================================================
 * DC-ECSS FRONTEND API SERVICE
 * ============================================================
 *
 * File:
 *   src/services/api.js
 *
 * Responsibility:
 *   - Communicate with the DC-ECSS backend.
 *   - Normalize backend response shapes.
 *   - Return environmental/hourly data to React.
 *
 * IMPORTANT:
 *   - JavaScript ONLY.
 *   - No React JSX.
 *   - No DC-ECSS scoring is calculated here.
 *   - No risk level is invented here.
 *   - No recommendation is invented here.
 *
 * Scoring belongs to:
 *
 *   src/services/dcEcssScoring.js
 *
 * ============================================================
 */


/*
 * ============================================================
 * API BASE URL
 * ============================================================
 */

const API_BASE_URL =
  "https://backend-zeta-three-93.vercel.app/api";


/*
 * ============================================================
 * REQUEST TIMEOUT
 * ============================================================
 */

const REQUEST_TIMEOUT = 10000;


/*
 * ============================================================
 * SUPPORTED CITIES
 * ============================================================
 */

const SUPPORTED_CITIES = new Set([
  "northern_virginia",
  "phoenix",
]);


/*
 * ============================================================
 * DEMO FALLBACK DATA
 * ============================================================
 *
 * Used only when the live endpoint fails.
 *
 * IMPORTANT:
 *
 * These are environmental values only.
 *
 * We do NOT create:
 *
 *   - cooling_stress_score
 *   - risk_level
 *   - recommendation
 *
 * Scoring is handled separately by dcEcssScoring.js.
 *
 * ============================================================
 */

const fallbackData = {

  northern_virginia: {

    location:
      "Northern Virginia",

    temperature:
      35.3,

    humidity:
      61.8,

    heat_index:
      37.8,

    wet_bulb:
      25.9,

    solar_irradiance:
      667.0,

    persistence_hours:
      null,

  },


  phoenix: {

    location:
      "Phoenix",

    temperature:
      40.2,

    humidity:
      31.4,

    heat_index:
      39.7,

    wet_bulb:
      25.1,

    solar_irradiance:
      812.0,

    persistence_hours:
      null,

  },

};


/*
 * ============================================================
 * HOURLY DEMO FALLBACK DATA
 * ============================================================
 *
 * Temporary frontend-only fallback.
 *
 * These are environmental readings only.
 *
 * They are NOT official DC-ECSS scores.
 *
 * ============================================================
 */

const fallbackHourlyData = {

  northern_virginia:

    Array.from(
      { length: 24 },
      (_, hour) => {

        const daylight =
          Math.max(
            0,
            Math.sin(
              ((hour - 6) / 12) *
              Math.PI
            )
          );


        const temperature =
          27 +
          daylight * 10;


        const humidity =
          78 -
          daylight * 20;


        const heatIndex =
          temperature +
          Math.max(
            0,
            (humidity - 40) *
              0.08
          );


        const wetBulb =
          temperature -
          Math.max(
            0,
            (100 - humidity) *
              0.04
          );


        const solar =
          daylight * 800;


        return {

          time:
            `${String(hour).padStart(
              2,
              "0"
            )}:00`,

          temperature:
            Number(
              temperature.toFixed(1)
            ),

          humidity:
            Number(
              humidity.toFixed(1)
            ),

          heat_index:
            Number(
              heatIndex.toFixed(1)
            ),

          wet_bulb:
            Number(
              wetBulb.toFixed(1)
            ),

          solar_irradiance:
            Number(
              solar.toFixed(1)
            ),

        };

      }
    ),


  phoenix:

    Array.from(
      { length: 24 },
      (_, hour) => {

        const daylight =
          Math.max(
            0,
            Math.sin(
              ((hour - 6) / 12) *
              Math.PI
            )
          );


        const temperature =
          30 +
          daylight * 12;


        const humidity =
          42 -
          daylight * 10;


        const heatIndex =
          temperature +
          Math.max(
            0,
            (humidity - 30) *
              0.08
          );


        const wetBulb =
          temperature -
          Math.max(
            0,
            (100 - humidity) *
              0.035
          );


        const solar =
          daylight * 950;


        return {

          time:
            `${String(hour).padStart(
              2,
              "0"
            )}:00`,

          temperature:
            Number(
              temperature.toFixed(1)
            ),

          humidity:
            Number(
              humidity.toFixed(1)
            ),

          heat_index:
            Number(
              heatIndex.toFixed(1)
            ),

          wet_bulb:
            Number(
              wetBulb.toFixed(1)
            ),

          solar_irradiance:
            Number(
              solar.toFixed(1)
            ),

        };

      }
    ),

};


/*
 * ============================================================
 * CITY VALIDATION
 * ============================================================
 */

function isValidCity(city) {

  return SUPPORTED_CITIES.has(
    city
  );

}


/*
 * ============================================================
 * SHARED JSON REQUEST
 * ============================================================
 *
 * Every GET request uses this function.
 *
 * ============================================================
 */

async function requestJSON(
  url,
  label
) {

  const controller =
    new AbortController();


  const timeoutId =
    setTimeout(
      () => {
        controller.abort();
      },
      REQUEST_TIMEOUT
    );


  try {

    console.log(
      `[API] Requesting ${label}:`,
      url
    );


    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json",
          },

          signal:
            controller.signal,
        }
      );


    /*
     * --------------------------------------------------------
     * HTTP ERROR
     * --------------------------------------------------------
     */

    if (!response.ok) {

      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );

    }


    /*
     * --------------------------------------------------------
     * PARSE JSON
     * --------------------------------------------------------
     */

    const data =
      await response.json();


    /*
     * --------------------------------------------------------
     * VALIDATE JSON
     * --------------------------------------------------------
     *
     * Both objects and arrays are valid JSON responses.
     * --------------------------------------------------------
     */

    if (
      data === null ||
      (
        typeof data !== "object" &&
        !Array.isArray(data)
      )
    ) {

      throw new Error(
        "Backend returned an invalid JSON response."
      );

    }


    console.log(
      `[API] Response received: ${label}`,
      data
    );


    return data;


  } finally {

    clearTimeout(
      timeoutId
    );

  }

}


/*
 * ============================================================
 * EXTRACT HOURLY READINGS
 * ============================================================
 *
 * Supports:
 *
 * 1. [...]
 *
 * 2. { data: [...] }
 *
 * 3. { hourly: [...] }
 *
 * 4. { readings: [...] }
 *
 * 5. { timeline: [...] }
 *
 * 6. { risk_data: [...] }
 *
 * 7. { risk_timeline: [...] }
 *
 * 8. Nested result/response/payload/body wrappers.
 *
 * ============================================================
 */

function extractHourlyReadings(
  source
) {

  /*
   * ----------------------------------------------------------
   * DIRECT ARRAY
   * ----------------------------------------------------------
   */

  if (
    Array.isArray(source)
  ) {

    return source;

  }


  /*
   * ----------------------------------------------------------
   * INVALID SOURCE
   * ----------------------------------------------------------
   */

  if (
    !source ||
    typeof source !== "object"
  ) {

    return [];

  }


  /*
   * ----------------------------------------------------------
   * DIRECT ARRAY CANDIDATES
   * ----------------------------------------------------------
   */

  const directCandidates = [

    source.hourly,

    source.hourly_data,

    source.readings,

    source.timeline,

    source.risk_data,

    source.risk_timeline,

    source.items,

    source.results,

    source.data,

  ];


  for (
    const candidate
    of directCandidates
  ) {

    if (
      Array.isArray(candidate)
    ) {

      return candidate;

    }

  }


  /*
   * ----------------------------------------------------------
   * NESTED RESPONSE WRAPPERS
   * ----------------------------------------------------------
   */

  const nestedCandidates = [

    source.result,

    source.response,

    source.payload,

    source.body,

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
        extractHourlyReadings(
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

}


/*
 * ============================================================
 * EXTRACT HOURLY METADATA
 * ============================================================
 *
 * Preserves metadata supplied by the backend.
 *
 * ============================================================
 */

function extractHourlyMetadata(
  response,
  city
) {

  if (
    !response ||
    typeof response !== "object" ||
    Array.isArray(response)
  ) {

    return {

      city,

      location:
        null,

      date:
        null,

      peak_window:
        null,

      peakWindow:
        null,

      peak_period:
        null,

      peakPeriod:
        null,

      risk_level:
        null,

      cooling_stress_score:
        null,

    };

  }


  return {

    city,

    location:
      response.location ??
      response.city ??
      null,

    date:
      response.date ??
      null,

    peak_window:
      response.peak_window ??
      response.peakWindow ??
      null,

    peakWindow:
      response.peakWindow ??
      response.peak_window ??
      null,

    peak_period:
      response.peak_period ??
      response.peakPeriod ??
      null,

    peakPeriod:
      response.peakPeriod ??
      response.peak_period ??
      null,

    risk_level:
      response.risk_level ??
      response.riskLevel ??
      null,

    cooling_stress_score:
      response.cooling_stress_score ??
      response.coolingStressScore ??
      null,

  };

}


/*
 * ============================================================
 * GET CURRENT ENVIRONMENTAL DATA
 * ============================================================
 *
 * Endpoint:
 *
 * /api/environmental/{city}
 *
 * ============================================================
 */

export async function getEnvironmentalData(
  city
) {

  /*
   * ----------------------------------------------------------
   * VALIDATE CITY
   * ----------------------------------------------------------
   */

  if (
    !isValidCity(city)
  ) {

    console.error(
      `[API] Unsupported city: ${city}`
    );


    throw new Error(
      `Unsupported city: ${city}`
    );

  }


  /*
   * ----------------------------------------------------------
   * BUILD ENDPOINT
   * ----------------------------------------------------------
   */

  const url =
    `${API_BASE_URL}/environmental/${city}`;


  try {

    /*
     * --------------------------------------------------------
     * LIVE BACKEND REQUEST
     * --------------------------------------------------------
     */

    const data =
      await requestJSON(
        url,
        `environmental data for ${city}`
      );


    /*
     * --------------------------------------------------------
     * PRESERVE BACKEND RESPONSE
     * --------------------------------------------------------
     *
     * We intentionally do NOT calculate:
     *
     *   cooling_stress_score
     *   risk_level
     *   recommendation
     *
     * here.
     *
     * The Risk Engine is responsible for scoring.
     * --------------------------------------------------------
     */

    return {

      ...data,

      dataSource:
        "live",

    };


  } catch (error) {

    /*
     * --------------------------------------------------------
     * LOG ERROR
     * --------------------------------------------------------
     */

    if (
      error?.name ===
      "AbortError"
    ) {

      console.error(
        `[API] Environmental request timed out for ${city}`
      );

    } else {

      console.error(
        `[API] Environmental request failed for ${city}:`,
        error
      );

    }


    /*
     * --------------------------------------------------------
     * FALLBACK DATA
     * --------------------------------------------------------
     */

    const fallback =
      fallbackData[city];


    if (!fallback) {

      throw new Error(
        `No fallback data available for ${city}.`
      );

    }


    console.warn(
      `[API] Using environmental fallback for ${city}.`
    );


    return {

      ...fallback,

      dataSource:
        "fallback",

    };

  }

}


/*
 * ============================================================
 * GET HOURLY ENVIRONMENTAL DATA
 * ============================================================
 *
 * Endpoint:
 *
 * /api/environmental/{city}/hourly
 *
 * Expected backend example:
 *
 * {
 *   location: "Northern Virginia",
 *   date: "2026-08-22",
 *   hourly: [...]
 * }
 *
 * ============================================================
 */

export async function getHourlyEnvironmentalData(
  city
) {

  /*
   * ----------------------------------------------------------
   * VALIDATE CITY
   * ----------------------------------------------------------
   */

  if (
    !isValidCity(city)
  ) {

    console.error(
      `[API] Unsupported city: ${city}`
    );


    throw new Error(
      `Unsupported city: ${city}`
    );

  }


  /*
   * ----------------------------------------------------------
   * BUILD ENDPOINT
   * ----------------------------------------------------------
   */

  const url =
    `${API_BASE_URL}/environmental/${city}/hourly`;


  try {

    /*
     * --------------------------------------------------------
     * LIVE BACKEND REQUEST
     * --------------------------------------------------------
     */

    const response =
      await requestJSON(
        url,
        `hourly environmental data for ${city}`
      );


    /*
     * --------------------------------------------------------
     * EXTRACT HOURLY READINGS
     * --------------------------------------------------------
     */

    const readings =
      extractHourlyReadings(
        response
      );


    /*
     * --------------------------------------------------------
     * VALIDATE ARRAY
     * --------------------------------------------------------
     */

    if (
      !Array.isArray(readings)
    ) {

      throw new Error(
        "Hourly endpoint returned an invalid data format."
      );

    }


    /*
     * --------------------------------------------------------
     * VALIDATE NON-EMPTY RESPONSE
     * --------------------------------------------------------
     */

    if (
      readings.length === 0
    ) {

      throw new Error(
        "Hourly endpoint returned zero readings."
      );

    }


    /*
     * --------------------------------------------------------
     * EXTRACT METADATA
     * --------------------------------------------------------
     */

    const metadata =
      extractHourlyMetadata(
        response,
        city
      );


    /*
     * --------------------------------------------------------
     * DEBUG LOGGING
     * --------------------------------------------------------
     */

    console.log(
      `[API] Hourly data received for ${city}: ${readings.length} readings`
    );


    console.log(
      `[API] Hourly metadata for ${city}:`,
      metadata
    );


    console.log(
      `[API] Hourly readings for ${city}:`,
      readings
    );


    /*
     * --------------------------------------------------------
     * NORMALIZED RETURN OBJECT
     * --------------------------------------------------------
     *
     * App.jsx can safely use:
     *
     *   result.readings
     *
     * RiskTimeline receives the enriched readings later.
     *
     * Backend metadata is preserved for future use.
     * --------------------------------------------------------
     */

    return {

      ...metadata,

      city,

      readings,

      dataSource:
        "live",

      rawResponse:
        response,

    };


  } catch (error) {

    /*
     * --------------------------------------------------------
     * LOG HOURLY ERROR
     * --------------------------------------------------------
     */

    if (
      error?.name ===
      "AbortError"
    ) {

      console.error(
        `[API] Hourly request timed out for ${city}`
      );

    } else {

      console.error(
        `[API] Hourly request failed for ${city}:`,
        error
      );

    }


    /*
     * --------------------------------------------------------
     * HOURLY FALLBACK
     * --------------------------------------------------------
     *
     * This is ONLY a demo/network fallback.
     *
     * These readings contain environmental values.
     *
     * They do NOT contain official DC-ECSS scores.
     * --------------------------------------------------------
     */

    const fallback =
      fallbackHourlyData[city];


    if (!fallback) {

      throw new Error(
        `No hourly fallback data available for ${city}.`
      );

    }


    console.warn(
      `[API] Using hourly fallback for ${city}.`
    );


    return {

      city,

      location:
        fallbackData[city]?.location ??
        null,

      date:
        null,

      peak_window:
        null,

      peakWindow:
        null,

      peak_period:
        null,

      peakPeriod:
        null,

      risk_level:
        null,

      cooling_stress_score:
        null,

      readings:
        fallback,

      dataSource:
        "fallback",

      rawResponse:
        null,

    };

  }

}


/*
 * ============================================================
 * OPTIONAL LOW-LEVEL EXPORTS
 * ============================================================
 *
 * These exports are useful for debugging and future services.
 *
 * Scoring remains outside this file.
 *
 * ============================================================
 */

export {
  API_BASE_URL,
  REQUEST_TIMEOUT,
  isValidCity,
  extractHourlyReadings,
};


/*
 * ============================================================
 * END OF API SERVICE
 * ============================================================
 *
 * IMPORTANT:
 *
 * Nothing below this point.
 *
 * No React JSX.
 * No scoring logic.
 * No component code.
 *
 * ============================================================
 */