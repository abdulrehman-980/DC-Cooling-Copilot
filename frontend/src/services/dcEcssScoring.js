/**
 * dcEcssScoring.js
 * Owner: Adeel Shahid — Risk Engine
 *
 * Authoritative frontend scoring logic for DC-ECSS.
 *
 * IMPORTANT:
 * - This file contains pure JavaScript only.
 * - No React / JSX.
 * - persistence_hours is DERIVED after risk classification.
 * - persistence_hours must NOT feed back into the same-hour score.
 * - Backend-provided authoritative scores are preserved when present.
 */

/* ============================================================
 * DC-ECSS WEIGHTS
 * ============================================================ */

export const WEIGHTS = {
  temperature: 0.30,
  wet_bulb: 0.20,
  heat_index: 0.15,
  humidity: 0.10,
  solar_irradiance: 0.10,
};

/*
 * IMPORTANT:
 *
 * persistence_hours is intentionally NOT part of the scoring
 * weights.
 *
 * Persistence is calculated after the hourly environmental
 * score and risk level have been determined.
 *
 * This prevents circular scoring:
 *
 * persistence
 *      ↓
 * score
 *      ↓
 * persistence
 *
 * That would incorrectly allow the current hour's persistence
 * to influence the score that creates that persistence.
 */

/* ============================================================
 * NORMALIZATION RANGES
 * ============================================================ */

export const RANGES = {
  temperature: [0, 50],
  wet_bulb: [0, 35],
  heat_index: [0, 60],
  humidity: [0, 100],
  solar_irradiance: [0, 1000],
};

/* ============================================================
 * RISK THRESHOLDS
 * ============================================================ */

export const RISK_THRESHOLDS = [
  {
    max: 25,
    label: "LOW",
  },
  {
    max: 50,
    label: "MODERATE",
  },
  {
    max: 75,
    label: "HIGH",
  },
  {
    max: 100,
    label: "CRITICAL",
  },
];

/* ============================================================
 * NORMALIZE
 * ============================================================ */

export function normalize(
  value,
  lo,
  hi
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    return null;
  }

  if (
    !Number.isFinite(lo) ||
    !Number.isFinite(hi) ||
    hi <= lo
  ) {
    return null;
  }

  const clamped =
    Math.max(
      lo,
      Math.min(
        numericValue,
        hi
      )
    );

  return (
    ((clamped - lo) /
      (hi - lo)) *
    100
  );
}

/* ============================================================
 * GET RISK LEVEL
 * ============================================================ */

export function getRiskLevel(
  score
) {
  const numericScore =
    Number(score);

  if (
    !Number.isFinite(
      numericScore
    )
  ) {
    return "LOW";
  }

  const safeScore =
    Math.max(
      0,
      Math.min(
        numericScore,
        100
      )
    );

  const threshold =
    RISK_THRESHOLDS.find(
      (item) =>
        safeScore <=
        item.max
    );

  return threshold
    ? threshold.label
    : "CRITICAL";
}

/* ============================================================
 * ROUND SCORE
 * ============================================================ */

function roundScore(
  value
) {
  return (
    Math.round(
      value * 10
    ) / 10
  );
}

/* ============================================================
 * CHECK AUTHORITATIVE SCORE
 * ============================================================ */

function hasValidScore(
  data
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    return false;
  }

  const score =
    Number(
      data.cooling_stress_score
    );

  return Number.isFinite(
    score
  );
}

/* ============================================================
 * COMPUTE DC-ECSS
 *
 * Takes one environmental snapshot.
 *
 * Returns:
 *
 * {
 *   ...input,
 *   cooling_stress_score,
 *   risk_level
 * }
 *
 * Missing environmental fields are ignored and the remaining
 * weights are redistributed proportionally.
 *
 * persistence_hours is NEVER used as a scoring input.
 * ============================================================ */

export function computeDcEcss(
  data
) {
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error(
      "Invalid data supplied to computeDcEcss()"
    );
  }

  let weightedSum = 0;
  let weightUsed = 0;

  for (
    const [
      field,
      weight,
    ] of Object.entries(
      WEIGHTS
    )
  ) {
    const rawValue =
      data[field];

    const range =
      RANGES[field];

    if (!range) {
      continue;
    }

    const [
      lo,
      hi,
    ] = range;

    const normalized =
      normalize(
        rawValue,
        lo,
        hi
      );

    if (
      normalized === null
    ) {
      continue;
    }

    weightedSum +=
      normalized *
      weight;

    weightUsed +=
      weight;
  }

  if (
    weightUsed === 0
  ) {
    throw new Error(
      `No usable environmental fields to score in: ${JSON.stringify(
        data
      )}`
    );
  }

  const score =
    roundScore(
      weightedSum /
        weightUsed
    );

  const riskLevel =
    getRiskLevel(
      score
    );

  return {
    ...data,

    cooling_stress_score:
      score,

    risk_level:
      riskLevel,
  };
}

/* ============================================================
 * PRESERVE OR COMPUTE SCORE
 *
 * If backend already supplied a valid score, preserve it.
 *
 * Otherwise calculate it using the frontend Risk Engine.
 * ============================================================ */

export function scoreSnapshot(
  data
) {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "Invalid snapshot supplied to scoreSnapshot()"
    );
  }

  if (
    hasValidScore(data)
  ) {
    const score =
      Math.max(
        0,
        Math.min(
          Number(
            data.cooling_stress_score
          ),
          100
        )
      );

    return {
      ...data,

      cooling_stress_score:
        roundScore(score),

      risk_level:
        data.risk_level ||
        getRiskLevel(score),
    };
  }

  return computeDcEcss(
    data
  );
}

/* ============================================================
 * COMPARE CITIES
 * ============================================================ */

export function compareCities(
  cityA,
  cityB
) {
  if (
    !cityA ||
    !cityB
  ) {
    throw new Error(
      "Both city objects are required."
    );
  }

  const scoredA =
    scoreSnapshot(
      cityA
    );

  const scoredB =
    scoreSnapshot(
      cityB
    );

  const scoreA =
    Number(
      scoredA.cooling_stress_score
    );

  const scoreB =
    Number(
      scoredB.cooling_stress_score
    );

  return {
    city_a:
      scoredA.location,

    city_b:
      scoredB.location,

    score_a:
      scoreA,

    score_b:
      scoreB,

    higher_risk:
      scoreA >= scoreB
        ? scoredA.location
        : scoredB.location,

    score_gap:
      roundScore(
        Math.abs(
          scoreA -
            scoreB
        )
      ),
  };
}

/* ============================================================
 * TIME LABEL HELPER
 * ============================================================ */

function getTimeLabel(
  reading,
  index
) {
  if (
    !reading ||
    typeof reading !==
      "object"
  ) {
    return `${String(
      index
    ).padStart(
      2,
      "0"
    )}:00`;
  }

  if (
    reading.time !==
      undefined &&
    reading.time !==
      null
  ) {
    return String(
      reading.time
    );
  }

  if (
    reading.hour !==
      undefined &&
    reading.hour !==
      null
  ) {
    const hourNumber =
      Number(
        reading.hour
      );

    if (
      Number.isFinite(
        hourNumber
      )
    ) {
      return `${String(
        hourNumber
      ).padStart(
        2,
        "0"
      )}:00`;
    }

    return String(
      reading.hour
    );
  }

  if (
    reading.timestamp !==
      undefined &&
    reading.timestamp !==
      null
  ) {
    return String(
      reading.timestamp
    );
  }

  return `${String(
    index
  ).padStart(
    2,
    "0"
  )}:00`;
}

/* ============================================================
 * GET HOURLY READINGS
 *
 * Supports:
 *
 * [
 *   {...}
 * ]
 *
 * {
 *   hourly: [...]
 * }
 *
 * {
 *   readings: [...]
 * }
 *
 * {
 *   data: [...]
 * }
 * ============================================================ */

function extractHourlyReadings(
  hourlyData
) {
  if (
    Array.isArray(
      hourlyData
    )
  ) {
    return hourlyData;
  }

  if (
    Array.isArray(
      hourlyData?.hourly
    )
  ) {
    return hourlyData.hourly;
  }

  if (
    Array.isArray(
      hourlyData?.readings
    )
  ) {
    return hourlyData.readings;
  }

  if (
    Array.isArray(
      hourlyData?.data
    )
  ) {
    return hourlyData.data;
  }

  return [];
}

/* ============================================================
 * DETECT PEAK WINDOW
 *
 * Scores every hourly reading.
 *
 * Finds the highest-risk hour.
 *
 * Returns the peak hour +/- one surrounding hour.
 *
 * Example:
 *
 * 14:00-16:00
 *
 * The peak itself is included in the returned window.
 * ============================================================ */

export function detectPeakWindow(
  hourlyReadings
) {
  if (
    !Array.isArray(
      hourlyReadings
    ) ||
    hourlyReadings.length ===
      0
  ) {
    throw new Error(
      "No hourly readings provided"
    );
  }

  const scoredHours =
    hourlyReadings.map(
      (reading) =>
        scoreSnapshot(
          reading
        )
    );

  let peakIndex = 0;

  for (
    let i = 1;
    i <
    scoredHours.length;
    i++
  ) {
    if (
      scoredHours[i]
        .cooling_stress_score >
      scoredHours[
        peakIndex
      ]
        .cooling_stress_score
    ) {
      peakIndex = i;
    }
  }

  const startIndex =
    Math.max(
      0,
      peakIndex - 1
    );

  const endIndex =
    Math.min(
      hourlyReadings.length -
        1,
      peakIndex + 1
    );

  const startTime =
    getTimeLabel(
      hourlyReadings[
        startIndex
      ],
      startIndex
    );

  const endTime =
    getTimeLabel(
      hourlyReadings[
        endIndex
      ],
      endIndex
    );

  return `${startTime}-${endTime}`;
}

/* ============================================================
 * FINALIZE CONTRACT
 * ============================================================ */

export function finalizeContract(
  scoredData,
  peakPeriod
) {
  return {
    ...scoredData,

    peak_period:
      peakPeriod,
  };
}

/* ============================================================
 * FETCH ENVIRONMENTAL DATA
 *
 * Kept for compatibility with existing imports.
 * ============================================================ */

const BASE_URL =
  "https://backend-zeta-three-93.vercel.app";

export async function fetchEnvironmental(
  cityKey
) {
  if (!cityKey) {
    throw new Error(
      "cityKey is required."
    );
  }

  const response =
    await fetch(
      `${BASE_URL}/api/environmental/${cityKey}`
    );

  if (!response.ok) {
    throw new Error(
      `Environmental fetch failed: ${response.status}`
    );
  }

  return response.json();
}

/* ============================================================
 * FETCH HOURLY DATA
 *
 * Kept for compatibility with existing imports.
 * ============================================================ */

export async function fetchHourly(
  cityKey
) {
  if (!cityKey) {
    throw new Error(
      "cityKey is required."
    );
  }

  const response =
    await fetch(
      `${BASE_URL}/api/environmental/${cityKey}/hourly`
    );

  if (!response.ok) {
    throw new Error(
      `Hourly fetch failed: ${response.status}`
    );
  }

  return response.json();
}

/* ============================================================
 * CITY DASHBOARD DATA
 * ============================================================ */

export async function getCityDashboardData(
  cityKey
) {
  const [
    snapshot,
    hourlyResponse,
  ] = await Promise.all([
    fetchEnvironmental(
      cityKey
    ),

    fetchHourly(
      cityKey
    ),
  ]);

  const scoredSnapshot =
    scoreSnapshot(
      snapshot
    );

  const hourlyReadings =
    extractHourlyReadings(
      hourlyResponse
    );

  if (
    hourlyReadings.length ===
    0
  ) {
    throw new Error(
      `No hourly readings returned for ${cityKey}`
    );
  }

  const peakPeriod =
    detectPeakWindow(
      hourlyReadings
    );

  return finalizeContract(
    scoredSnapshot,
    peakPeriod
  );
}

/* ============================================================
 * ENRICH HOURLY TIMELINE
 *
 * Produces:
 *
 * {
 *   time: "14:00",
 *   cooling_stress_score: 72,
 *   risk_level: "HIGH",
 *   persistence_hours: 3
 * }
 *
 * persistence_hours means:
 *
 * Number of consecutive HIGH or CRITICAL hours
 * ending at the current hour.
 *
 * IMPORTANT:
 *
 * persistence_hours is calculated AFTER the current
 * hour's score/risk classification.
 *
 * It is never used to calculate that same hour's score.
 * ============================================================ */

export function enrichHourlyTimeline(
  hourlyReadings
) {
  if (
    !Array.isArray(
      hourlyReadings
    )
  ) {
    return [];
  }

  let runningPersistence =
    0;

  const scoredHourly =
    hourlyReadings.map(
      (
        reading,
        index
      ) => {
        if (
          !reading ||
          typeof reading !==
            "object"
        ) {
          runningPersistence =
            0;

          return {
            time:
              getTimeLabel(
                reading,
                index
              ),

            cooling_stress_score:
              0,

            risk_level:
              "LOW",

            persistence_hours:
              0,
          };
        }

        /*
         * ------------------------------------------------------
         * NEVER USE persistence_hours AS AN INPUT
         * ------------------------------------------------------
         */

        const {
          persistence_hours:
            ignoredPersistence,

          ...environmentalData
        } = reading;

        /*
         * ------------------------------------------------------
         * SCORE CURRENT HOUR
         *
         * Backend-provided score is preserved when available.
         * Otherwise frontend DC-ECSS scoring is used.
         * ------------------------------------------------------
         */

        const scored =
          scoreSnapshot(
            environmentalData
          );

        /*
         * ------------------------------------------------------
         * DERIVE PERSISTENCE
         * ------------------------------------------------------
         */

        if (
          scored.risk_level ===
            "HIGH" ||
          scored.risk_level ===
            "CRITICAL"
        ) {
          runningPersistence +=
            1;
        } else {
          runningPersistence =
            0;
        }

        return {
          time:
            getTimeLabel(
              reading,
              index
            ),

          cooling_stress_score:
            scored.cooling_stress_score,

          risk_level:
            scored.risk_level,

          persistence_hours:
            runningPersistence,
        };
      }
    );

  console.log(
    "[RISK ENGINE] ENRICHED HOURLY TIMELINE:",
    JSON.stringify(
      scoredHourly,
      null,
      2
    )
  );

  return scoredHourly;
}

/* ============================================================
 * SCORE HOURLY DATA
 *
 * Accepts either:
 *
 * [
 *   {...},
 *   {...}
 * ]
 *
 * OR:
 *
 * {
 *   hourly: [...]
 * }
 *
 * OR:
 *
 * {
 *   readings: [...]
 * }
 *
 * OR:
 *
 * {
 *   data: [...]
 * }
 * ============================================================ */

export function scoreHourly(
  hourlyData
) {
  const readings =
    extractHourlyReadings(
      hourlyData
    );

  return enrichHourlyTimeline(
    readings
  );
}

/* ============================================================
 * BUILD COMPLETE HOURLY CITY RISK DATA
 * ============================================================ */

export async function getHourlyRiskTimeline(
  cityKey
) {
  const hourlyResponse =
    await fetchHourly(
      cityKey
    );

  const hourlyReadings =
    extractHourlyReadings(
      hourlyResponse
    );

  if (
    hourlyReadings.length ===
    0
  ) {
    throw new Error(
      `No hourly readings available for ${cityKey}`
    );
  }

  return enrichHourlyTimeline(
    hourlyReadings
  );
}