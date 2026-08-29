function Header({
  selectedCity,
  onCityChange,
  dataSource = "live",
}) {


  /*
   * ============================================================
   * DATA SOURCE
   * ============================================================
   */

  const isFallback =
    dataSource === "fallback";


  const statusLabel =
    isFallback
      ? "DEMO FALLBACK"
      : "LIVE SYSTEM";


  /*
   * ============================================================
   * LOCATION LABEL
   * ============================================================
   */

  const locationLabel =
    selectedCity === "phoenix"
      ? "Phoenix"
      : "Northern Virginia";


  return (

    <header className="header">


      <div className="header-inner">


        {/* ====================================================
            BRAND
            ==================================================== */}

        <div className="header-brand">


          <div className="brand-mark">
            DC
          </div>


          <div className="brand-copy">


            <div className="brand-title">
              DC-ECSS
            </div>


            <div className="brand-subtitle">
              AI Data Center Cooling Copilot
            </div>


          </div>


        </div>



        {/* ====================================================
            SYSTEM CONTEXT
            ==================================================== */}

        <div className="header-context">


          <span className="header-context-label">
            THERMAL INTELLIGENCE
          </span>


          <span className="header-context-divider">
            /
          </span>


          <span className="header-context-location">
            {locationLabel}
          </span>


        </div>



        {/* ====================================================
            CONTROLS
            ==================================================== */}

        <div className="header-controls">


          {/* SYSTEM STATUS */}

          <div
            className={`system-status ${
              isFallback
                ? "fallback"
                : "online"
            }`}
            title={
              isFallback
                ? "Live backend unavailable. Using cached demonstration data."
                : "Connected to the live backend."
            }
          >

            <span className="status-dot"></span>


            <span className="status-text">

              {statusLabel}

            </span>


          </div>



          {/* LOCATION SELECTOR */}

          <div className="location-control">


            <span className="location-control-label">
              LOCATION   
            </span>


            <select
              value={selectedCity}
              onChange={(event) =>
                onCityChange(
                  event.target.value
                )
              }
              aria-label="Select monitoring location"
            >

              <option value="northern_virginia">
                Northern Virginia
              </option>


              <option value="phoenix">
                Phoenix
              </option>


            </select>


          </div>


        </div>


      </div>


    </header>

  );

}


export default Header;