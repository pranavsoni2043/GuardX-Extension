// === GuardX Popup Script (Full History + Correct Risk Sync, No Alerts) ===

const toggle = document.getElementById("toggleProtection");
const statusBadge = document.getElementById("statusBadge");
const siteRiskEl = document.getElementById("siteRisk");
const pagesScannedEl = document.getElementById("pagesScanned");
const detectionsEl = document.getElementById("detectionsToday");
const warningsEl = document.getElementById("warningsShown");

// Load saved state + stats + risk
chrome.storage.local.get([
  "protectionEnabled",
  "pagesScanned",
  "detectionsToday",
  "warningsShown",
  "lastSiteRisk",
  "lastScore"
], (res) => {

  const enabled = res.protectionEnabled !== false;
  toggle.checked = enabled;
  updateBadge(enabled);

  pagesScannedEl.textContent = Number(res.pagesScanned || 0);
  detectionsEl.textContent = Number(res.detectionsToday || 0);
  warningsEl.textContent = Number(res.warningsShown || 0);

  if (res.lastSiteRisk) {
    applyRisk(res.lastScore ?? res.lastSiteRisk);
  }
});

// Toggle protection switch
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ protectionEnabled: enabled });
  updateBadge(enabled);
  chrome.runtime.sendMessage({ protectionEnabled: enabled });
});

// Update UI badge
function updateBadge(enabled) {
  statusBadge.textContent = enabled ? "Active" : "Disabled";
  statusBadge.className = "badge " + (enabled ? "on" : "off");
}

// Listen for updates from content script
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.siteRisk !== undefined) {
    chrome.storage.local.set({ lastSiteRisk: msg.siteRisk });
    applyRisk(msg.siteRisk);
  }

  if (msg.stats) {
    pagesScannedEl.textContent = Number(msg.stats.pagesScanned || 0);
    detectionsEl.textContent = Number(msg.stats.detectionsToday || 0);
    warningsEl.textContent = Number(msg.stats.warningsShown || 0);
  }
});

// Convert numeric or text risk into label + class
function applyRisk(riskValue) {
  let level = "low";

  if (typeof riskValue === "number") {
    if (riskValue >= 7) level = "high";
    else if (riskValue >= 4) level = "medium";
    else level = "low";

    siteRiskEl.textContent = `${level} (${riskValue}/10)`;
  } else {
    if (riskValue === "danger" || riskValue === "high") level = "high";
    else if (riskValue === "warning" || riskValue === "medium") level = "medium";
    else level = "low";

    siteRiskEl.textContent = level;
  }

  siteRiskEl.className = "risk " + level;
}

// Request current risk when popup opens
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].id) {
    chrome.tabs.sendMessage(tabs[0].id, { requestSiteRisk: true });
  }
});

// Simulated Scan Button (NO alert)
document.getElementById("simulateScan").addEventListener("click", () => {

    chrome.storage.local.get([
        "lastSiteRisk",
        "lastScore",
        "lastReason",
        "lastUrl"
    ], (res) => {

        if (!res.lastSiteRisk) {
            return; // nothing to simulate yet
        }

        // Add the existing scan result to history
        chrome.storage.local.get(["siteScanHistory"], (hRes) => {
            const history = hRes.siteScanHistory || [];

            history.push({
                url: res.lastUrl || "Current Page",
                level: res.lastSiteRisk,
                score: res.lastScore,
                reason: res.lastReason,
                timestamp: new Date().toLocaleString()
            });

            chrome.storage.local.set({ siteScanHistory: history }, renderHistory);
        });

        // Update popup UI
        siteRiskEl.textContent = `${res.lastSiteRisk} (${res.lastScore}/10)`;
        siteRiskEl.className = "risk " + res.lastSiteRisk;
    });
});

// Render history list
function renderHistory() {
  chrome.storage.local.get(["siteScanHistory"], (res) => {
      const container = document.getElementById("historyList");
      const history = res.siteScanHistory || [];

      if (!history.length) {
          container.innerHTML = `<div class="history-entry">No scans yet.</div>`;
          return;
      }

      container.innerHTML = history.map(h => `
          <div class="history-entry">
              <div class="history-url">${h.url}</div>
              <div class="history-risk">${h.level.toUpperCase()} — ${h.score}/10</div>
              <div class="history-reason">${h.reason}</div>
              <div class="history-time">${h.timestamp}</div>
          </div>
      `).join("");
  });
}

// ✅ Unified Reset Button (NO alert)
document.getElementById("resetData").addEventListener("click", () => {

  chrome.storage.local.set({
      siteScanHistory: [],
      pagesScanned: 0,
      detectionsToday: 0,
      warningsShown: 0,
      lastSiteRisk: "low",
      lastScore: 0
  }, () => {

      renderHistory();
      pagesScannedEl.textContent = 0;
      detectionsEl.textContent = 0;
      warningsEl.textContent = 0;
      siteRiskEl.textContent = "Low (0/10)";
      siteRiskEl.className = "risk low";
  });
});

// Call on popup open
renderHistory();

// Download Report Button
// Download full scan report
document.getElementById("downloadReport").addEventListener("click", () => {
    chrome.storage.local.get(["siteScanHistory"], (res) => {
        const history = res.siteScanHistory || [];

        if (!history.length) {
            return; // No popup message, just silently ignore
        }

        let reportText = "=== GuardX Scan Report ===\n\n";

        history.forEach((h, i) => {
            reportText +=
`#${i + 1}
URL: ${h.url}
Risk Level: ${h.level}
Score: ${h.score}/10
Reason: ${h.reason}
Timestamp: ${h.timestamp}

-------------------------------------\n`;
        });

        const blob = new Blob([reportText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "GuardX_Report.txt";
        a.click();

        URL.revokeObjectURL(url);
    });
});


// === End of GuardX Popup Script (No Alerts) ===
