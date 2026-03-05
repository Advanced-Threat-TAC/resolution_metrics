// ==UserScript==
// @name         CSONE FDFR/5DFR Checker - All Cases
// @namespace    https://scripts.cisco.com/
// @version      1.1
// @description  FDFR/5DFR Checker for Quicker CSONE - Works on all cases (Open/Closed/Any Owner)
// @author       CircuIT (Modified from JTAC Extensions)
// @match        https://scripts.cisco.com/app/quicker_csone/*
// @match        https://scripts.cisco.com/app/quicker_csone2/*
// @match        https://bdb.cisco.com/app/quicker_csone/*
// @match        https://bdb.cisco.com/app/quicker_csone2/*
// @match        https://scripts.cisco.com/app/quicker_csone_magnetic/*
// @require      https://code.jquery.com/jquery-3.1.1.min.js
// @require      https://unpkg.com/axios/dist/axios.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // AXIOS Configuration for Cisco BDB API
    const bdbApi = axios.create({
        withCredentials: true,
        baseURL: "https://scripts.cisco.com",
        headers: {
            "Content-Type": "application/json",
        },
    });

    // --- Helper Functions ---

    const getSr = () => {
        return $("#sr-header > div > div > a").first().text();
    };

    const addLoading = (elem, id) => {
        const $loading = $(
            `<svg id=${id} fill="none" height="24" viewBox="0 0 48 48" width="24" xmlns="http://www.w3.org/2000/svg" class="mds-spinner mds-spinner-size-xs" style="margin-left:10px">
             <path clip-rule="evenodd" d="M25.761 5.837a3 3 0 0 1 3.674-2.121c11.203 3.001 17.851 14.516 14.85 25.72a3 3 0 1 1-5.796-1.554c2.144-8.002-2.604-16.227-10.606-18.37a3 3 0 0 1-2.122-3.675Z" fill="var(--mds-spinner-fill)" fill-rule="evenodd"></path></svg>`
        );
        $(elem).after($loading);
    };

    const removeLoading = (id) => {
        $(`#${id}`).remove();
    };

    // --- Core Checker Logic ---

    const addFrCheckerIcon = () => {
        // Prevent duplicate icons
        if ($("#fr_check").length > 0) return;

        const srId = getSr();
        if (!srId) return;

        (async () => {
            try {
                // Anchor to the SR number link container
                const anchor = $("#sr-header > div > div").first();
                addLoading(anchor, "fr_check_loading");

                const payload = {
                    input: {
                        sr_num: srId,
                    },
                };

                // Call the internal Cisco BDB Job
                const res = await bdbApi["post"]("/api/v2/jobs/jtac_fr_checker", payload);
                const result = res.data.data.variables.result;

                removeLoading("fr_check_loading");

                if (!result) return;

                // Determine color based on metrics
                // Green = FDFR Met, Blue = 5DFR Met, Red = Inactive/Not Met, Black = Neutral/Unknown
                let color = result.last_inactive_date ? "var(--color-red-8)" : "var(--color-black-8)";
                if (result.five_day_final_resolution) {
                    color = "var(--color-blue-8)";
                }
                if (result.one_day_final_resolution) {
                    color = "var(--color-green-8)";
                }

                const iconHtml = `
                    <div id="fr_check" style="margin-left: 10px; display: inline-block; vertical-align: middle;"
                         title="FDFR/5DFR Checker\nGreen: FDFR Met\nBlue: 5DFR Met\nRed: Not Met\nBlack: Unknown\n(Click for details)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="${color}" viewBox="0 0 256 256" cursor="pointer" class="mds-icon-phosphor">
                            <path d="M232,128A104,104,0,1,1,128,24,104.13,104.13,0,0,1,232,128Z"></path>
                        </svg>
                    </div>`;

                if ($("#fr_check").length === 0) {
                    anchor.append(iconHtml);
                }

                // Interaction for details
                $("#fr_check").on("click", function (e) {
                    e.preventDefault();
                    console.log("FDFR/5DFR Detailed Data for " + srId + ":", result);
                    alert(`FDFR/5DFR Status for ${srId}:\n\nFDFR Met: ${result.one_day_final_resolution ? "YES" : "NO"}\n5DFR Met: ${result.five_day_final_resolution ? "YES" : "NO"}\nLast Resolution: ${result.last_inactive_date || "N/A"}\n\nCheck browser console (F12) for full object.`);
                });

            } catch (error) {
                console.error('[FR Checker Error]:', error);
                removeLoading("fr_check_loading");
            }
        })();
    };

    // --- Initialization ---

    // Wait for the Quicker CSONE header container to load
    waitForKeyElements("#sr-header > div", addFrCheckerIcon);

})();
