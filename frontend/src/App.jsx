import { useEffect, useMemo, useState } from "react";

import "./App.css";

import Header from "./components/Header";
import StatusCards from "./components/StatusCards";
import RiskGauge from "./components/RiskGauge";
import RiskTimeline from "./components/RiskTimeline";
import RiskDrivers from "./components/RiskDrivers";
import AIRecommendation from "./components/AIRecommendation";
import CopilotChat from "./components/CopilotChat";
import Heatmap from "./components/Heatmap";
import Comparison from "./components/Comparison";

import {
  getEnvironmentalData,
  getHourlyEnvironmentalData,
} from "./services/api";

import {
  enrichHourlyTimeline,
  computeDcEcss,
} from "./services/dcEcssScoring";


function App() {

  /*
   * ============================================================
   * STATE
   * ============================================================
   */

  const [selectedCity, setSelectedCity] =
    useState("northern_virginia");

  const [environmentalData, setEnvironmentalData] =
    useState(null);

  const [hourlyData, setHourlyData] =
    useState(null);

  const [northernVirginiaData, setNorthernVirginiaData] =
    useState(null);

  const [phoenixData, setPhoenixData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [hourlyLoading, setHourlyLoading] =
    useState(true);

  const [comparisonLoading, setComparisonLoading] =
    useState(true);

  const [error, setError] =
    useState(null);

  const [hourlyError, setHourlyError] =
    useState(null);


  /*
   * ============================================================
   * LOAD CURRENT CITY ENVIRONMENTAL DATA
   * ============================================================
   *
   * Backend environmental data
   *          ↓
   * computeDcEcss()
   *          ↓
   * authoritative frontend score
   *          ↓
   * dashboard
   *
   * IMPORTANT:
   *
   * api.js does NOT calculate the score.
   * The scoring engine does it here.
   * ============================================================
   */

  useEffect(() => {

    let isMounted = true;

    async function loadSelectedCity() {

      setLoading(true);
      setError(null);

      try {

        const rawData =
          await getEnvironmentalData(
            selectedCity
          );


        if (!isMounted) {
          return;
        }


        console.log(
          "[APP] Raw environmental data:",
          rawData
        );


        /*
         * --------------------------------------------------------
         * FALLBACK DATA
         * --------------------------------------------------------
         *
         * Fallback environmental data is still scored by the
         * same Risk Engine.
         * --------------------------------------------------------
         */

        const scoredData =
          computeDcEcss(
            rawData
          );


        const finalData = {

          ...scoredData,

          dataSource:
            rawData?.dataSource ||
            "live",

        };


        console.log(
          "[RISK ENGINE] Current city scored data:",
          finalData
        );


        setEnvironmentalData(
          finalData
        );

      } catch (err) {

        console.error(
          "[APP] Current environmental data failed:",
          err
        );


        if (!isMounted) {
          return;
        }


        setError(
          err?.message ||
          "Unable to load environmental data."
        );


        setEnvironmentalData(
          null
        );

      } finally {

        if (isMounted) {
          setLoading(false);
        }

      }

    }


    loadSelectedCity();


    return () => {
      isMounted = false;
    };

  }, [selectedCity]);


  /*
   * ============================================================
   * LOAD HOURLY DATA
   * ============================================================
   *
   * Raw hourly readings
   *          ↓
   * enrichHourlyTimeline()
   *          ↓
   * hourly DC-ECSS score
   *          ↓
   * persistence
   *          ↓
   * RiskTimeline
   *
   * ============================================================
   */

  useEffect(() => {

    let isMounted = true;

    async function loadHourlyData() {

      setHourlyLoading(true);
      setHourlyError(null);

      try {

        const result =
          await getHourlyEnvironmentalData(
            selectedCity
          );


        if (!isMounted) {
          return;
        }


        console.log(
          "[APP] Hourly API response:",
          result
        );


        const readings =
          Array.isArray(
            result?.readings
          )
            ? result.readings
            : [];


        console.log(
          "[APP] Extracted hourly readings:",
          readings
        );


        console.log(
          "[APP] Hourly reading count:",
          readings.length
        );


        /*
         * --------------------------------------------------------
         * IMPORTANT
         * --------------------------------------------------------
         *
         * Store the RAW hourly API response.
         *
         * Scoring is performed below through useMemo().
         *
         * This prevents the raw API data from being mutated.
         * --------------------------------------------------------
         */

        setHourlyData(
          result
        );

      } catch (err) {

        console.error(
          "[APP] Hourly environmental data failed:",
          err
        );


        if (!isMounted) {
          return;
        }


        setHourlyError(
          err?.message ||
          "Unable to load hourly environmental data."
        );


        setHourlyData(
          null
        );

      } finally {

        if (isMounted) {
          setHourlyLoading(false);
        }

      }

    }


    loadHourlyData();


    return () => {
      isMounted = false;
    };

  }, [selectedCity]);


  /*
   * ============================================================
   * LOAD BOTH CITIES FOR COMPARISON
   * ============================================================
   *
   * Both cities go through the SAME DC-ECSS scoring engine.
   *
   * ============================================================
   */

  useEffect(() => {

    let isMounted = true;

    async function loadComparisonData() {

      setComparisonLoading(true);

      try {

        const [
          northernVirginiaRaw,
          phoenixRaw,
        ] = await Promise.all([

          getEnvironmentalData(
            "northern_virginia"
          ),

          getEnvironmentalData(
            "phoenix"
          ),

        ]);


        if (!isMounted) {
          return;
        }


        console.log(
          "[APP] Northern Virginia raw comparison data:",
          northernVirginiaRaw
        );


        console.log(
          "[APP] Phoenix raw comparison data:",
          phoenixRaw
        );


        /*
         * --------------------------------------------------------
         * SCORE BOTH CITIES USING THE SAME ENGINE
         * --------------------------------------------------------
         */

        const northernVirginia =
          computeDcEcss(
            northernVirginiaRaw
          );


        const phoenix =
          computeDcEcss(
            phoenixRaw
          );


        setNorthernVirginiaData({

          ...northernVirginia,

          dataSource:
            northernVirginiaRaw?.dataSource ||
            "live",

        });


        setPhoenixData({

          ...phoenix,

          dataSource:
            phoenixRaw?.dataSource ||
            "live",

        });


        console.log(
          "[RISK ENGINE] Northern Virginia scored:",
          northernVirginia
        );


        console.log(
          "[RISK ENGINE] Phoenix scored:",
          phoenix
        );

      } catch (err) {

        console.error(
          "[APP] Comparison data failed:",
          err
        );


        if (!isMounted) {
          return;
        }


        setNorthernVirginiaData(
          null
        );


        setPhoenixData(
          null
        );

      } finally {

        if (isMounted) {
          setComparisonLoading(false);
        }

      }

    }


    loadComparisonData();


    return () => {
      isMounted = false;
    };

  }, []);


  /*
   * ============================================================
   * DATA SOURCE
   * ============================================================
   */

  const dataSource =
    environmentalData?.dataSource ||
    "live";


  /*
   * ============================================================
   * ACTIVE LOCATION
   * ============================================================
   */

  const activeLocationLabel =
    environmentalData?.location ||
    (
      selectedCity === "phoenix"
        ? "Phoenix"
        : "Northern Virginia"
    );


  /*
   * ============================================================
   * CONNECTION STATUS
   * ============================================================
   */

  const connectionStatusLabel =
    error
      ? "DATA UNAVAILABLE"
      : loading
        ? "SYNCING"
        : dataSource === "live"
          ? "LIVE"
          : "PREVIEW";


  const connectionStatusTone =
    error
      ? "status-critical"
      : loading
        ? "status-pending"
        : dataSource === "live"
          ? "status-live"
          : "status-preview";


  /*
   * ============================================================
   * RAW HOURLY READINGS
   * ============================================================
   */

  const rawTimelineReadings =
    Array.isArray(
      hourlyData?.readings
    )
      ? hourlyData.readings
      : [];


  /*
   * ============================================================
   * DC-ECSS HOURLY RISK ENGINE
   * ============================================================
   *
   * useMemo prevents unnecessary recalculation on unrelated
   * React renders.
   *
   * Raw API readings remain untouched.
   *
   * enrichHourlyTimeline() creates the authoritative timeline.
   * ============================================================
   */

  const timelineReadings =
    useMemo(() => {

      if (
        rawTimelineReadings.length === 0
      ) {

        return [];

      }


      try {

        const enriched =
          enrichHourlyTimeline(
            rawTimelineReadings
          );


        console.log(
          "[RISK ENGINE] ENRICHED HOURLY TIMELINE:",
          JSON.stringify(
            enriched,
            null,
            2
          )
        );


        return enriched;

      } catch (err) {

        console.error(
          "[RISK ENGINE] Hourly scoring failed:",
          err
        );


        return [];

      }

    }, [rawTimelineReadings]);


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (

    <div className="app app-shell">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <Header

        selectedCity={
          selectedCity
        }

        onCityChange={
          setSelectedCity
        }

        dataSource={
          dataSource
        }

      />


      <main className="dashboard">


        {/* ====================================================
            DASHBOARD INTRO
            ==================================================== */}

        <section className="dashboard-intro dc-reveal">

          <div className="dashboard-intro-copy">

            <span className="section-eyebrow">
              DATA CENTER THERMAL INTELLIGENCE
            </span>


            <h1 className="dashboard-title">
              Cooling Risk Command Center
            </h1>


            <p className="dashboard-subtitle">
              Live environmental conditions,
              cooling stress, and operational risk.
            </p>

          </div>


          <div className="intro-status-block">

            <div className="intro-location">

              <span className="intro-location-label">
                MONITORING
              </span>


              <strong className="intro-location-value">
                {activeLocationLabel}
              </strong>

            </div>


            <div
              className={
                `connection-pill ${connectionStatusTone}`
              }
            >

              <span className="connection-dot" />


              <span className="connection-label">
                {connectionStatusLabel}
              </span>

            </div>

          </div>

        </section>


        {/* ====================================================
            ENVIRONMENTAL STATUS
            ==================================================== */}

        <section className="dc-panel-section dc-reveal">

          <StatusCards

            data={
              environmentalData
            }

            loading={
              loading
            }

            error={
              error
            }

          />

        </section>


        {/* ====================================================
            RISK ENGINE + DRIVERS
            ==================================================== */}

        <section className="dc-grid-split dc-reveal">

          <div className="dc-grid-split-primary">

            <RiskGauge

              score={
                environmentalData
                  ?.cooling_stress_score
              }

              riskLevel={
                environmentalData
                  ?.risk_level
              }

              loading={
                loading
              }

            />

          </div>


          <div className="dc-grid-split-secondary">

            <RiskDrivers

              data={
                environmentalData
              }

            />

          </div>

        </section>


        {/* ====================================================
            24-HOUR THERMAL / RISK TIMELINE
            ==================================================== */}

        <section className="dc-panel-section dc-reveal">

          <RiskTimeline

            riskData={
              timelineReadings
            }

            loading={
              hourlyLoading
            }

            error={
              hourlyError
            }

          />

        </section>


        {/* ====================================================
            AI RECOMMENDATION
            ==================================================== */}

        <section className="dc-panel-section dc-reveal">

          <AIRecommendation

            data={
              environmentalData
            }

          />

        </section>


        {/* ====================================================
            AI OPERATIONS COPILOT
            ==================================================== */}

        <section className="dc-panel-section dc-reveal">

          <CopilotChat

            data={
              environmentalData
            }

            northernVirginia={
              northernVirginiaData
            }

            phoenix={
              phoenixData
            }

          />

        </section>


        {/* ====================================================
            COMPARISON + HEATMAP
            ==================================================== */}

        <section className="dc-grid-split dc-reveal">

          <div className="dc-grid-split-primary">

            <Comparison

              northernVirginia={
                northernVirginiaData
              }

              phoenix={
                phoenixData
              }

              loading={
                comparisonLoading
              }

            />

          </div>


          <div className="dc-grid-split-secondary">

            <Heatmap

              selectedCity={
                selectedCity
              }

            />

          </div>

        </section>


      </main>

    </div>

  );

}


export default App;