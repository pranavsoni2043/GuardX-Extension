// === GuardX Content Script (Enhanced Risk + Popup Sync) ===

// ----------------------------------------------------
// 1. Protection State Handling
// ----------------------------------------------------
let guardXEnabled = true;
let lastRiskLevel = "safe";   // ✅ stored so popup can request anytime

chrome.storage.local.get(["protectionEnabled"], (res) => {
    guardXEnabled = res.protectionEnabled !== false;

    if (guardXEnabled) {
        incrementStat("pagesScanned");
        runWebsiteScan();
    }
});

chrome.runtime.onMessage.addListener((message) => {

    // Toggle state changed
    if (message.protectionEnabled !== undefined) {
        guardXEnabled = message.protectionEnabled;
        if (guardXEnabled) {
            incrementStat("pagesScanned");
            runWebsiteScan();
        }
    }

    // Popup requesting latest risk details
    if (message.requestSiteRisk) {
        chrome.runtime.sendMessage({
            siteRisk: lastRiskLevel
        });
    }
});

// ----------------------------------------------------
// 2. Sensitive Input Detection
// ----------------------------------------------------
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}/;
const phonePattern = /(\+91)?[6-9]\d{9}/;
const cardPattern = /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/;

document.addEventListener("input", (event) => {
    if (!guardXEnabled) return;

    const field = event.target;
    const tag = field.tagName?.toLowerCase();

    if (tag !== "input" && tag !== "textarea") return;

    const text = field.value || "";

    clearWarning(field);

    if (emailPattern.test(text) || phonePattern.test(text) || cardPattern.test(text)) {
        showSensitiveWarning(field);
        incrementStat("detectionsToday");
        incrementStat("warningsShown");
    }
});

// Warning UI
function showSensitiveWarning(field) {
    field.style.border = "2px solid #d64545";
    field.style.boxShadow = "0 0 6px rgba(214,69,69,0.35)";

    const note = document.createElement("div");
    note.classList.add("guardx-warning");
    note.innerText = "⚠ GuardX Alert: Sensitive data detected.";
    note.style.color = "#b02c2c";
    note.style.fontSize = "12px";
    note.style.fontWeight = "600";
    note.style.marginTop = "4px";

    field.insertAdjacentElement("afterend", note);
}

function clearWarning(field) {
    field.style.border = "";
    field.style.boxShadow = "";
    const warning = field.parentNode?.querySelector(".guardx-warning");
    if (warning) warning.remove();
}

// ----------------------------------------------------
// 3. Website Risk Scan & Sync to Popup
// ----------------------------------------------------
function runWebsiteScan() {

    const url = window.location.href;
    const domain = window.location.hostname;

    let level = "safe";
    let reason = "Secure HTTPS connection";

    if (!url.startsWith("https://")) {
        level = "danger";
        reason = "Website does not use HTTPS";
    } else if (/\d/.test(domain)) {
        level = "warning";
        reason = "Domain contains numbers — common phishing tactic";
    } else if (/\.xyz$|\.top$|\.live$|\.click$/.test(domain)) {
        level = "warning";
        reason = "Suspicious domain extension";
    } else if (/login|verify|update|secure/i.test(url)) {
        level = "warning";
        reason = "Sensitive keywords detected";
    }

    const scoreMap = { safe: 2, warning: 5, danger: 9 };
    const score = scoreMap[level] ?? 0;

    // ✅ Save EVERYTHING needed for report
    chrome.storage.local.set({
        lastSiteRisk: level,
        lastScore: score,
        lastReason: reason,
        lastUrl: url,
        lastDomain: domain,
        lastChecked: new Date().toISOString()
    });

    showSiteBanner(level, reason);
    showRiskMeter(level);
    updateRiskStats(level);

    // notify popup if open
    chrome.runtime.sendMessage({
        siteRisk: level,
        reason: reason
    });
}


// ----------------------------------------------------
// 4. Banner Display
// ----------------------------------------------------
function showSiteBanner(level, reason) {
 const oldBanner = document.querySelector(".guardx-banner");
 if (oldBanner) oldBanner.remove();

 const banner = document.createElement("div");
 banner.classList.add("guardx-banner");

 banner.style.position = "fixed";
 banner.style.top = "10px";
 banner.style.right = "10px";
 banner.style.padding = "12px 16px";
 banner.style.borderRadius = "6px";
 banner.style.fontSize = "14px";
 banner.style.fontWeight = "600";
 banner.style.color = "#ffffff";
 banner.style.zIndex = "999999";
 banner.style.cursor = "move";
 banner.style.display = "flex";
 banner.style.alignItems = "center";
 banner.style.gap = "12px";

 let label = "";
 if (level === "danger") {
 banner.style.background = "#b30000";
 label = `🔴 High Risk – ${reason}`;
 } else if (level === "warning") {
 banner.style.background = "#d49b00";
 label = `🟡 Warning – ${reason}`;
 } else {
 banner.style.background = "#0a8f3c";
 label = `🟢 Safe – ${reason}`;
 }

 const text = document.createElement("span");
 text.textContent = label;

 // ✅ Close (X) Button
 const closeBtn = document.createElement("span");
    closeBtn.textContent = "✖";
 closeBtn.style.cursor = "pointer";
 closeBtn.style.fontSize = "16px";
 closeBtn.style.marginLeft = "auto";
 closeBtn.style.opacity = "0.85";

 closeBtn.addEventListener("click", () => {
banner.remove();
});

 banner.appendChild(text);
 banner.appendChild(closeBtn);
 document.body.appendChild(banner);

 makeDraggable(banner);
}


// ----------------------------------------------------
// 5. Risk Meter (Score + Level)
// ----------------------------------------------------
function runWebsiteScan() {

 const url = window.location.href;
    const domain = window.location.hostname;

    let level = "safe";
    let reason = "Secure HTTPS connection";

    if (!url.startsWith("https://")) {
        level = "danger";
        reason = "Website does not use HTTPS";
    } else if (/\d/.test(domain)) {
        level = "warning";
        reason = "Domain contains numbers — common phishing tactic";
    } else if (/\.xyz$|\.top$|\.live$|\.click$/.test(domain)) {
        level = "warning";
        reason = "Suspicious domain extension";
    } else if (/login|verify|update|secure/i.test(url)) {
        level = "warning";
        reason = "Sensitive keywords detected";
    }

    const scoreMap = { safe: 2, warning: 5, danger: 9 };
    const score = scoreMap[level] ?? 0;

    lastRiskLevel = level;

    // ✅ Store last scan details
    chrome.storage.local.set({
        lastSiteRisk: level,
        lastScore: score,
 lastReason: reason,
 lastUrl: url,
 lastChecked: new Date().toISOString()
 });

 // ✅ Append scan to history
 chrome.storage.local.get(["siteScanHistory"], (res) => {
 const history = res.siteScanHistory || [];

// ✅ prevent duplicate entry when same page reloads
 if (!history.length || history[history.length - 1].url !== url) {

 history.push({
 url,
 level,
 score,
 reason,
 timestamp: new Date().toLocaleString()
 });

 chrome.storage.local.set({ siteScanHistory: history });
 }
 });

// UI updates
showSiteBanner(level, reason);
 showRiskMeter(level);
 updateRiskStats(level);

// notify popup if open
 chrome.runtime.sendMessage({
 siteRisk: level,
reason: reason
 });
}


// ----------------------------------------------------
// 6. Draggable Utility
// ----------------------------------------------------
function makeDraggable(element) {
    let offsetX = 0, offsetY = 0, dragging = false;

    element.addEventListener("mousedown", (e) => {
        dragging = true;
        offsetX = e.clientX - element.offsetLeft;
        offsetY = e.clientY - element.offsetTop;
    });

    document.addEventListener("mousemove", (e) => {
        if (!dragging) return;
        element.style.left = (e.clientX - offsetX) + "px";
        element.style.top = (e.clientY - offsetY) + "px";
        element.style.right = "auto";
        element.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => dragging = false);
}

// ----------------------------------------------------
// 7. Stats Logging
// ----------------------------------------------------
function incrementStat(key) {
    chrome.storage.local.get([key], (res) => {
        chrome.storage.local.set({ [key]: Number(res[key] || 0) + 1 });
    });
}

function updateRiskStats(level) {
    chrome.storage.local.get(["siteSafetyStats"], (res) => {
        const stats = res.siteSafetyStats || { safe: 0, warning: 0, danger: 0 };
        stats[level]++;
        chrome.storage.local.set({ siteSafetyStats: stats });
    });
}
// === End of GuardX Content Script ===

// ----------------------------------------------------