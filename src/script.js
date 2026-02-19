
(function () {
  "use strict";


  function log(msg) {
    try {
      console.log(msg);
      const out = document.getElementById("output");
      if (!out) return;
      const d = document.createElement("div");
      d.textContent = String(msg);
      out.prepend(d);
      while (out.childElementCount > 80) out.removeChild(out.lastChild);
    } catch {}
  }


  (function setVersion() {
    try {
      var el = document.getElementById("ah-version");
      var tag = document.querySelector('script[src*="script.js"]');
      if (el && tag) {
        var m = tag.getAttribute("src").match(/\?v?=?(.+)$/);
        if (m) el.textContent = "v" + m[1];
      }
    } catch (e) {}
  })();


  try {
    if (window.A1lib && typeof A1lib.identifyApp === "function") {
      A1lib.identifyApp("appconfig.json");
    }
  } catch {}

  if (window.alt1) {
    try { alt1.identifyAppUrl("./appconfig.json"); } catch {}
  } else {
    const url = new URL("./appconfig.json", document.location.href).href;
    document.body.innerHTML =
      '<div style="padding:20px;text-align:center;color:#e0e0e0;font-family:system-ui">' +
      '<h2>Alt1 Not Detected</h2>' +
      '<p>Click <a href="alt1://addapp/' + url + '" style="color:#58a6ff">here</a> to add this app to Alt1.</p>' +
      '</div>';
    return;
  }

  const A1 = window.a1lib || window.A1lib || null;
  if (!A1) log("Warning: a1lib not found. Some functions may fail.");

  function mixColor(r, g, b) {
    if (!A1?.mixColor) throw new Error("mixColor missing");
    return A1.mixColor(r, g, b);
  }

  function encodeImage(imgData) {
    const enc = A1?.encodeImageString;
    if (!enc) throw new Error("encodeImageString not found");
    return enc(imgData);
  }


  const statusEl = document.getElementById("ah-status");
  const statusTextEl = document.getElementById("ah-status-text");

  function setStatus(text, state) {
    if (statusTextEl) statusTextEl.textContent = text;
    if (statusEl) {
      statusEl.classList.remove("connected", "error");
      if (state) statusEl.classList.add(state);
    }
  }


  const seenLineTimes = new Map();

  function shouldIgnoreLine(lineId, windowMs) {
    if (windowMs === undefined) windowMs = 5000;
    const now = Date.now();
    const last = seenLineTimes.get(lineId) || 0;
    if (now - last < windowMs) return true;
    seenLineTimes.set(lineId, now);

    if (seenLineTimes.size > 400) {
      const cutoff = now - 600000;
      for (const [id, ts] of seenLineTimes) {
        if (ts < cutoff) seenLineTimes.delete(id);
      }
    }
    return false;
  }


  let resetTimerId = null;
  let lastDisplayAt = 0;
  let activeIntervals = [];
  let activeTimeouts = [];


  let overlayScale = Number(localStorage.getItem("amascut.overlayScale") || "1");
  if (!(overlayScale >= 0.25 && overlayScale <= 2.0)) overlayScale = 1;

  let overlayEnabled = (localStorage.getItem("amascut.overlayEnabled") || "true") === "true";

  let overlayPos = null;
  try {
    const stored = JSON.parse(localStorage.getItem("amascut.overlayPos") || "null");
    if (stored && Number.isFinite(stored.x) && Number.isFinite(stored.y)) {
      overlayPos = { x: stored.x, y: stored.y };
    }
  } catch {}


  const VOICE_LINE_LABELS = {
    soloGroup: "3-hit barrage",
    specGroup: "3 multi-hit (base only)",
    p7Call: "P7 godform call",
    snuffed: "Swap + click timer",
    tear: "Scarabs",
    bend: "Bend the Knee",
    tumeken: "P5 Barricade timer",
    d2h: "P6 D2H timer",
    d2hAoE: "P6 AoE reminder",
  };

  let voiceLineConfig = {};
  try {
    const raw = localStorage.getItem("amascut.voiceLineConfig");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") voiceLineConfig = parsed;
    }
  } catch {}

  function isVoiceLineEnabled(key) {
    if (key === "newdawn") return true;

    if (key === "grovel" || key === "weak" || key === "pathetic") {
      return voiceLineConfig["specGroup"] !== false;
    }
    if (key === "soloWeakMagic" || key === "soloMelee" || key === "soloRange") {
      return voiceLineConfig["soloGroup"] !== false;
    }
    if (key === "crondis" || key === "apmeken" || key === "het" || key === "scabaras") {
      return voiceLineConfig["p7Call"] !== false;
    }
    return voiceLineConfig[key] !== false;
  }

  function setVoiceLineEnabled(key, enabled) {
    voiceLineConfig[key] = !!enabled;
    try { localStorage.setItem("amascut.voiceLineConfig", JSON.stringify(voiceLineConfig)); } catch {}
  }


  let posMode = false;
  let posRaf = 0;
  window.amascutOptsWin = null;

  window.amascutGetState = function () {
    return { overlayScale: overlayScale, overlayEnabled: overlayEnabled, overlayPos: overlayPos, posMode: posMode };
  };
  window.amascutSetOverlayScale = function (v) {
    overlayScale = v;
    try { localStorage.setItem("amascut.overlayScale", String(v)); } catch {}
  };
  window.amascutSetOverlayEnabled = function (enabled) {
    overlayEnabled = !!enabled;
    try { localStorage.setItem("amascut.overlayEnabled", String(overlayEnabled)); } catch {}
    if (!overlayEnabled) clearOverlayGroup();
  };
  window.amascutIsPosMode = function () { return posMode; };
  window.amascutGetVoiceMeta = function () {
    return { config: voiceLineConfig, labels: VOICE_LINE_LABELS };
  };
  window.amascutSetVoiceEnabled = function (key, enabled) {
    setVoiceLineEnabled(key, enabled);
  };


  let tickMs = 600;
  (function () {
    var saved = Number(localStorage.getItem("amascut.tickMs"));
    tickMs = (saved === 100 || saved === 600) ? saved : 600;
  })();

  window.amascutGetTickMs = function () { return tickMs; };
  window.amascutSetTickMs = function (v) {
    tickMs = v;
    try { localStorage.setItem("amascut.tickMs", String(tickMs)); } catch {}
    if (startSnuffedTimers._iv) {
      try { clearInterval(startSnuffedTimers._iv); } catch {}
      startSnuffedTimers._iv = makeSnuffedInterval();
    }
  };

  let DEBUG_DUMP_COLOURS = (localStorage.getItem("amascut.debugDumpColours") || "false") === "true";

  window.amascutGetDebugState = function () {
    return {
      dumpColours: DEBUG_DUMP_COLOURS,
      logsVisible: !document.body.classList.contains("logs-hidden"),
      tickMs: tickMs,
    };
  };
  window.amascutSetDumpColours = function (v) {
    DEBUG_DUMP_COLOURS = !!v;
    try { localStorage.setItem("amascut.debugDumpColours", String(DEBUG_DUMP_COLOURS)); } catch {}
  };
  window.amascutSetLogsVisible = function (v) {
    document.body.classList.toggle("logs-hidden", !v);
    try { localStorage.setItem("amascut.logsVisible", String(v)); } catch {}
  };

  (function () {
    var saved = localStorage.getItem("amascut.logsVisible");
    var visible = saved === null ? false : saved === "true";
    document.body.classList.toggle("logs-hidden", !visible);
  })();


  function startOverlayPosMode() {
    if (posMode) return;
    posMode = true;
    try { alt1?.setTooltip?.("Press Alt+1 to save overlay position!"); } catch {}

    var step = function () {
      if (!posMode) return;
      var mp = (A1 && typeof A1.getMousePosition === "function" && A1.getMousePosition()) || null;
      if (mp && Number.isFinite(mp.x) && Number.isFinite(mp.y)) {
        overlayPos = { x: Math.max(0, Math.floor(mp.x)), y: Math.max(0, Math.floor(mp.y)) };
      }
      posRaf = requestAnimationFrame(step);
    };
    posRaf = requestAnimationFrame(step);
  }

  function stopOverlayPosMode(saveNow) {
    if (!posMode) return;
    posMode = false;
    try { alt1?.clearTooltip?.(); } catch {}
    if (posRaf) { cancelAnimationFrame(posRaf); posRaf = 0; }

    if (saveNow && overlayPos) {
      try { localStorage.setItem("amascut.overlayPos", JSON.stringify(overlayPos)); } catch {}
      log("Overlay position saved: " + overlayPos.x + ", " + overlayPos.y);
    }

    if (window.amascutOptsWin && !window.amascutOptsWin.closed) {
      try {
        window.amascutOptsWin.postMessage(
          { source: "amascutParent", type: "posSaved", pos: overlayPos }, "*"
        );
      } catch {}
    }
  }

  (function bindAlt1Global() {
    var ok = false;
    try {
      if (A1 && typeof A1.on === "function") {
        A1.on("alt1pressed", function () { if (posMode) stopOverlayPosMode(true); });
        ok = true;
      }
    } catch {}
    if (!ok) log("Alt+1 binding not available; use Set pos button.");

    window.addEventListener("keydown", function (e) {
      if (posMode && e.altKey && (e.code === "Digit1" || e.key === "1")) {
        e.preventDefault();
        stopOverlayPosMode(true);
      }
    });
  })();


  var optsPanelOpen = false;
  var optsPanelEl = null;
  var optsRefreshIv = null;

  (function initOptionsButton() {
    var mini = document.getElementById("ah-panel-mini");
    if (!mini) return;
    mini.addEventListener("click", function (e) {
      e.stopPropagation();
      toggleOptionsPanel();
    });
  })();

  function toggleOptionsPanel() {
    if (optsPanelOpen) {
      closeOptionsPanel();
    } else {
      openOptionsPanel();
    }
  }

  function closeOptionsPanel() {
    if (optsPanelEl) { optsPanelEl.remove(); optsPanelEl = null; }
    if (optsRefreshIv) { clearInterval(optsRefreshIv); optsRefreshIv = null; }
    optsPanelOpen = false;
    document.querySelector(".ah-header").style.display = "";
    document.querySelector(".ah-status").style.display = "";
    document.querySelector(".ah-table").style.display = "";
    document.querySelector(".ah-controls").style.display = "";
    var logsEl = document.querySelector(".ah-logs");
    if (logsEl) logsEl.style.display = "";
  }

  function openOptionsPanel() {
    optsPanelOpen = true;
    document.querySelector(".ah-header").style.display = "none";
    document.querySelector(".ah-status").style.display = "none";
    document.querySelector(".ah-table").style.display = "none";
    document.querySelector(".ah-controls").style.display = "none";
    var logsEl = document.querySelector(".ah-logs");
    if (logsEl) logsEl.style.display = "none";

    var panel = document.createElement("div");
    panel.className = "ah-opts-panel";
    panel.innerHTML =
      '<div class="ah-opts-layout">' +
        '<div class="ah-opts-sidebar">' +
          '<div class="ah-opts-nav-group">General</div>' +
          '<button class="ah-opts-nav active" data-page="overlay">Overlay</button>' +
          '<button class="ah-opts-nav" data-page="voice">Voice Lines</button>' +
          '<div class="ah-opts-nav-group">Advanced</div>' +
          '<button class="ah-opts-nav" data-page="debug">Debug</button>' +
          '<div style="flex:1"></div>' +
          '<button class="ah-opts-back" id="opts-back">&larr; Back</button>' +
        '</div>' +
        '<div class="ah-opts-content">' +
          '<div class="ah-opts-page active" id="page-overlay">' +
            '<h3>Overlay</h3>' +
            '<div class="ah-opts-field"><div class="ah-opts-label">Overlay Size</div>' +
            '<div class="ah-opts-row"><input id="opt-size" type="range" min="0.25" max="2" step="0.05"><span id="opt-size-val" class="ah-opts-val">1.00x</span></div></div>' +
            '<div class="ah-opts-field"><div class="ah-opts-row"><input id="opt-enable" type="checkbox"><label for="opt-enable" class="ah-opts-chklabel">Enable overlay</label></div></div>' +
            '<div class="ah-opts-field"><div class="ah-opts-label">Position</div>' +
            '<div class="ah-opts-row"><button id="opt-set-pos" class="ah-opts-btn">Set Position</button><span id="opt-pos-val" class="ah-opts-val" style="min-width:auto"></span></div>' +
            '<div class="ah-opts-hint">Click Set Position, move mouse, press Alt+1 to save.</div></div>' +
          '</div>' +
          '<div class="ah-opts-page" id="page-voice">' +
            '<h3>Voice Line Filters</h3>' +
            '<div class="ah-opts-hint" style="margin-bottom:8px">Uncheck to ignore specific mechanics.</div>' +
            '<div id="opt-voice-list" class="ah-opts-voicegrid"></div>' +
          '</div>' +
          '<div class="ah-opts-page" id="page-debug">' +
            '<h3>Debug</h3>' +
            '<div class="ah-opts-toggle"><div><div class="ah-opts-tlabel">Show Logs</div><div class="ah-opts-tdesc">Display chat reading log in main window</div></div><input id="opt-logs" type="checkbox"></div>' +
            '<div class="ah-opts-toggle"><div><div class="ah-opts-tlabel">Timer Precision</div><div class="ah-opts-tdesc">600ms = game ticks, 100ms = smooth</div></div><select id="opt-tick"><option value="600">600ms</option><option value="100">100ms</option></select></div>' +
            '<div class="ah-opts-toggle" style="border-bottom:none"><div><div class="ah-opts-tlabel">Dump Colours</div><div class="ah-opts-tdesc">Log RGB values of Amascut chat lines</div></div><input id="opt-dump" type="checkbox"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.querySelector(".ah-app").appendChild(panel);
    optsPanelEl = panel;

    var navBtns = panel.querySelectorAll(".ah-opts-nav");
    var pages = panel.querySelectorAll(".ah-opts-page");
    navBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        navBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        var pg = btn.getAttribute("data-page");
        pages.forEach(function (p) { p.classList.toggle("active", p.id === "page-" + pg); });
      });
    });

    panel.querySelector("#opts-back").addEventListener("click", closeOptionsPanel);

    var sizeR = panel.querySelector("#opt-size"), sizeVal = panel.querySelector("#opt-size-val");
    var enableCb = panel.querySelector("#opt-enable");
    var setPosBtn = panel.querySelector("#opt-set-pos"), posVal = panel.querySelector("#opt-pos-val");
    var logsCb = panel.querySelector("#opt-logs"), tickSel = panel.querySelector("#opt-tick");
    var dumpCb = panel.querySelector("#opt-dump");
    var voiceList = panel.querySelector("#opt-voice-list");

    if (typeof window.amascutGetVoiceMeta === "function") {
      var m = window.amascutGetVoiceMeta() || {}, labels = m.labels || {}, cfg = m.config || {};
      Object.keys(labels).forEach(function (key) {
        var w = document.createElement("label"); w.className = "ah-opts-voiceitem";
        var cb = document.createElement("input"); cb.type = "checkbox"; cb.setAttribute("data-key", key);
        cb.checked = Object.prototype.hasOwnProperty.call(cfg, key) ? cfg[key] !== false : true;
        var sp = document.createElement("span"); sp.textContent = labels[key];
        w.appendChild(cb); w.appendChild(sp); voiceList.appendChild(w);
        cb.addEventListener("change", function () { if (typeof window.amascutSetVoiceEnabled === "function") window.amascutSetVoiceEnabled(key, cb.checked); });
      });
    }

    function refresh() {
      var st = typeof window.amascutGetState === "function" ? window.amascutGetState() : { overlayScale: 1, overlayEnabled: true, overlayPos: null, posMode: false };
      sizeR.value = String(st.overlayScale || 1);
      sizeVal.textContent = Number(st.overlayScale || 1).toFixed(2) + "x";
      enableCb.checked = !!st.overlayEnabled;
      var pos = st.overlayPos;
      posVal.textContent = (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) ? "(" + pos.x + ", " + pos.y + ")" : "centered";
      setPosBtn.textContent = st.posMode ? "Saving... (Alt+1)" : "Set Position";
      if (typeof window.amascutGetDebugState === "function") {
        var ds = window.amascutGetDebugState();
        logsCb.checked = ds.logsVisible;
        tickSel.value = String(ds.tickMs);
        dumpCb.checked = ds.dumpColours;
      }
    }
    refresh();

    sizeR.addEventListener("input", function () { var v = Number(sizeR.value) || 1; if (typeof window.amascutSetOverlayScale === "function") window.amascutSetOverlayScale(v); sizeVal.textContent = v.toFixed(2) + "x"; });
    enableCb.addEventListener("change", function () { if (typeof window.amascutSetOverlayEnabled === "function") window.amascutSetOverlayEnabled(enableCb.checked); });
    setPosBtn.addEventListener("click", function () { var st = typeof window.amascutGetState === "function" ? window.amascutGetState() : {}; if (!st.posMode) { startOverlayPosMode(); setPosBtn.textContent = "Saving... (Alt+1)"; } else { stopOverlayPosMode(true); setPosBtn.textContent = "Set Position"; } });
    logsCb.addEventListener("change", function () { if (typeof window.amascutSetLogsVisible === "function") window.amascutSetLogsVisible(logsCb.checked); });
    tickSel.addEventListener("change", function () { if (typeof window.amascutSetTickMs === "function") window.amascutSetTickMs(Number(tickSel.value)); });
    dumpCb.addEventListener("change", function () { if (typeof window.amascutSetDumpColours === "function") window.amascutSetDumpColours(dumpCb.checked); });

    optsRefreshIv = setInterval(refresh, 1000);
  }


  function clearActiveTimers() {
    activeIntervals.forEach(clearInterval);
    activeTimeouts.forEach(clearTimeout);
    activeIntervals = [];
    activeTimeouts = [];
  }

  function autoResetIn10s() {
    if (resetTimerId) clearTimeout(resetTimerId);
    resetTimerId = setTimeout(function () {
      resetUI();
    }, 10000);
    lastDisplayAt = Date.now();
  }


  function hideAllRows() {
    var rows = document.querySelectorAll("#spec tr");
    for (var i = 0; i < rows.length; i++) {
      var c = rows[i].querySelector("td");
      if (c) c.textContent = "";
      rows[i].style.display = "none";
      rows[i].className = "";
    }
  }

  function showStatusMsg(text, extraClass) {
    hideAllRows();
    var rows = document.querySelectorAll("#spec tr");
    if (!rows[0]) return;
    var cell = rows[0].querySelector("td");
    if (cell) cell.textContent = text;
    rows[0].style.display = "table-row";
    rows[0].className = "ah-status-msg";
    if (extraClass) rows[0].classList.add(extraClass);
  }

  function resetUI() {
    clearActiveTimers();
    if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }
    hideAllRows();
  }

  function showMessage(text) {
    var rows = document.querySelectorAll("#spec tr");
    if (!rows.length) return;

    var withinWindow = Date.now() - lastDisplayAt <= 10000;

    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove("role-range", "role-magic", "role-melee", "callout", "flash");
    }

    if (!withinWindow) {
      if (rows[0]) {
        var c0 = rows[0].querySelector("td");
        if (c0) c0.textContent = text;
        rows[0].style.display = "table-row";
        rows[0].classList.add("selected", "callout", "flash");
      }
      for (var j = 1; j < rows.length; j++) {
        var cj = rows[j].querySelector("td");
        if (cj) cj.textContent = "";
        rows[j].style.display = "none";
        rows[j].classList.remove("selected");
      }
    } else {
      if (rows[1]) {
        var c1 = rows[1].querySelector("td");
        if (c1) c1.textContent = text;
        rows[1].style.display = "table-row";
        rows[1].classList.add("selected", "callout", "flash");
      } else {
        var c0b = rows[0].querySelector("td");
        if (c0b) c0b.textContent = text;
      }
    }

    log(">> " + text);
    autoResetIn10s();
  }

  var RESPONSES = {
    weak: "Range > Magic > Melee",
    grovel: "Magic > Melee > Range",
    pathetic: "Melee > Range > Magic",
  };

  function updateUI(key) {
    var order = RESPONSES[key].split(" > ");
    var rows = document.querySelectorAll("#spec tr");

    for (var i = 0; i < 3; i++) {
      if (rows[i]) rows[i].style.display = "table-row";
    }

    rows.forEach(function (row, idx) {
      var role = order[idx] || "";
      var cell = row.querySelector("td");
      if (cell) cell.textContent = role;

      row.classList.remove("callout", "flash", "role-range", "role-magic", "role-melee");
      if (role === "Range") row.classList.add("role-range");
      else if (role === "Magic") row.classList.add("role-magic");
      else if (role === "Melee") row.classList.add("role-melee");

      row.classList.toggle("selected", idx === 0);
    });

    log(">> " + RESPONSES[key]);
    autoResetIn10s();
  }


  var NAME_RGB = [69, 131, 145];
  var TEXT_RGB = [153, 255, 153];
  var WHITE_RGB = [255, 255, 255];
  var PUB_BLUE = [127, 169, 255];

  function colorDist(a, b) {
    var dr = (a?.[0] || 0) - (b?.[0] || 0);
    var dg = (a?.[1] || 0) - (b?.[1] || 0);
    var db = (a?.[2] || 0) - (b?.[2] || 0);
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function isColorNear(rgb, target, tol) {
    if (tol === undefined) tol = 40;
    return colorDist(rgb, target) <= tol;
  }

  function isNearWhite(rgb) {
    return (rgb?.[0] || 0) > 220 && (rgb?.[1] || 0) > 220 && (rgb?.[2] || 0) > 220;
  }

  var reader = new Chatbox.default();

  function applyReadArgs() {
    reader.readargs = {
      colors: [
        mixColor.apply(null, NAME_RGB),
        mixColor.apply(null, TEXT_RGB),
        mixColor.apply(null, WHITE_RGB),
        mixColor.apply(null, PUB_BLUE),
      ],
      backwards: true,
    };
  }

  applyReadArgs();

  function firstNonWhiteColor(seg) {
    if (!seg.fragments) return null;
    for (var fi = 0; fi < seg.fragments.length; fi++) {
      if (!isNearWhite(seg.fragments[fi].color)) return seg.fragments[fi].color;
    }
    return null;
  }


  function setRow(i, text) {
    var rows = document.querySelectorAll("#spec tr");
    if (!rows[i]) return;
    var cell = rows[i].querySelector("td");
    if (cell) cell.textContent = text;
    rows[i].style.display = "table-row";
    rows[i].classList.add("selected", "callout", "flash");
  }

  function clearRow(i) {
    var rows = document.querySelectorAll("#spec tr");
    if (!rows[i]) return;
    var row = rows[i];
    var cell = row.querySelector("td");
    if (cell) cell.textContent = "";
    row.style.display = "none";
    row.className = "";
  }

  function fmt(x) { return Math.max(0, x).toFixed(1); }


  var snuffStartAt = 0;
  var barricadeStartAt = 0;
  var barricadeIv = 0;
  var barricadeClearT = 0;

  function stopBarricadeTimer(clearRowToo) {
    if (barricadeIv) { try { clearInterval(barricadeIv); } catch {} barricadeIv = 0; }
    if (barricadeClearT) { try { clearTimeout(barricadeClearT); } catch {} barricadeClearT = 0; }
    barricadeStartAt = 0;
    if (clearRowToo) clearRow(2);
  }

  function startBarricadeTimer() {
    stopBarricadeTimer(false);
    barricadeStartAt = Date.now();
    setRow(2, "Barricade: 13.2s");

    barricadeIv = setInterval(function () {
      var elapsed = (Date.now() - barricadeStartAt) / 1000;
      var remaining = 13.2 - elapsed;

      if (remaining <= 0) {
        setRow(2, "Barricade: 0.0s");
        try { clearInterval(barricadeIv); } catch {}
        barricadeIv = 0;
        if (barricadeClearT) { try { clearTimeout(barricadeClearT); } catch {} }
        barricadeClearT = setTimeout(function () { clearRow(2); barricadeClearT = 0; }, 5000);
        return;
      }
      setRow(2, "Barricade: " + fmt(remaining) + "s");
    }, tickMs);
  }

  var d2hStartAt = 0;
  var d2hIv = 0;
  var d2hClearT = 0;

  function stopD2HTimer(clearRowToo) {
    if (d2hIv) { try { clearInterval(d2hIv); } catch {} d2hIv = 0; }
    if (d2hClearT) { try { clearTimeout(d2hClearT); } catch {} d2hClearT = 0; }
    d2hStartAt = 0;
    if (clearRowToo) clearRow(2);
  }

  function startD2HTimer() {
    stopD2HTimer(false);
    d2hStartAt = Date.now();
    setRow(2, "D2H in: 6.0s");

    d2hIv = setInterval(function () {
      var elapsed = (Date.now() - d2hStartAt) / 1000;
      var remaining = 6.0 - elapsed;

      if (remaining <= 0) {
        setRow(2, "D2H in: 0.0s");
        try { clearInterval(d2hIv); } catch {}
        d2hIv = 0;
        if (d2hClearT) { try { clearTimeout(d2hClearT); } catch {} }
        d2hClearT = setTimeout(function () { clearRow(2); d2hClearT = 0; }, 2000);
        return;
      }
      setRow(2, "D2H in: " + fmt(remaining) + "s");
    }, tickMs);
  }

  function clearClickInTimerOnly() {
    startSnuffedTimers._clickDisabled = true;
    clearRow(1);
    log("Click-in timer cleared (path selected)");
  }

  function makeSnuffedInterval() {
    var iv = setInterval(function () {
      try {
        var elapsed = (Date.now() - snuffStartAt) / 1000;

        var swapRemaining = 14.4 - elapsed;
        if (swapRemaining <= 0) {
          if (!startSnuffedTimers._swapFrozen) {
            setRow(0, "Swap side: 0.0s");
            startSnuffedTimers._swapFrozen = true;
            var t = setTimeout(function () { clearRow(0); }, 5000);
            activeTimeouts.push(t);
          }
        } else if (!startSnuffedTimers._swapFrozen) {
          setRow(0, "Swap side: " + fmt(swapRemaining) + "s");
        }

        var period = 9.0;
        if (!startSnuffedTimers._clickDisabled) {
          var clickRemaining = period - (elapsed % period);
          if (clickRemaining >= period - 1e-6) clickRemaining = 0;
          setRow(1, "Click in: " + fmt(clickRemaining) + "s");
        } else {
          clearRow(1);
        }
      } catch (e) { console.error(e); }
    }, tickMs);

    activeIntervals.push(iv);
    return iv;
  }

  function startSnuffedTimers() {
    clearActiveTimers();
    if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }

    startSnuffedTimers._swapHideScheduled = false;
    startSnuffedTimers._swapFrozen = false;
    startSnuffedTimers._clickDisabled = false;

    snuffStartAt = Date.now();
    setRow(0, "Swap side: 14.4s");
    setRow(1, "Click in: 9.0s");

    if (startSnuffedTimers._iv) { try { clearInterval(startSnuffedTimers._iv); } catch {} }
    startSnuffedTimers._iv = makeSnuffedInterval();
  }

  function stopSnuffedTimersAndReset() {
    clearActiveTimers();
    if (resetTimerId) { clearTimeout(resetTimerId); resetTimerId = null; }

    startSnuffedTimers._swapHideScheduled = false;
    startSnuffedTimers._swapFrozen = false;
    startSnuffedTimers._clickDisabled = false;
    snuffStartAt = 0;

    stopBarricadeTimer(true);
    stopD2HTimer(true);
    lastDisplayAt = 0;
    [0, 1, 2].forEach(clearRow);
    resetUI();
  }

  var lastSig = "";
  var lastAt = 0;
  var emptyReadCount = 0;

  function hardResetSession() {
    lastSig = "";
    lastAt = 0;
    stopSnuffedTimersAndReset();
    showStatusMsg("New instance found", "ah-instance-found");
    var t = setTimeout(function () { hideAllRows(); }, 3000);
    activeTimeouts.push(t);
  }

  function onExtinguish() {
    lastSig = "";
    lastAt = 0;
    stopSnuffedTimersAndReset();
    showStatusMsg("Waiting for instance...");
  }


  function showSolo(role, cls) {
    var rows = document.querySelectorAll("#spec tr");
    if (!rows.length) return;

    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.remove("role-range", "role-magic", "role-melee", "callout", "flash", "selected");
      var c = rows[i].querySelector("td");
      if (c) c.textContent = "";
      rows[i].style.display = "none";
    }

    var row = rows[0];
    if (row) {
      var cell = row.querySelector("td");
      if (cell) cell.textContent = role;
      row.style.display = "table-row";
      row.classList.add("selected", "callout", "flash", cls);
    }

    var t = setTimeout(function () { hideAllRows(); }, 4000);
    activeTimeouts.push(t);
  }


  function onAmascutLine(full, lineId) {

    var raw = full;
    var low = full.toLowerCase();
    var key = null;

    if (low.includes("your soul is weak")) key = "soloWeakMagic";
    else if (low.includes("all strength withers")) key = "soloMelee";
    else if (low.includes("i will not suffer this")) key = "soloRange";
    else if (low.includes("your light will be snuffed out")) key = "snuffed";
    else if (low.includes("a new dawn")) key = "newdawn";
    else if (raw.includes("Grovel")) key = "grovel";
    else if (/\bWeak\b/.test(raw)) key = "weak";
    else if (raw.includes("Pathetic")) key = "pathetic";
    else if (low.includes("tear them apart")) key = "tear";
    else if (low.includes("bend the knee")) key = "bend";
    else if (raw.includes("Tumeken's heart")) key = "tumeken";
    else if (raw.includes("Crondis... It should have never come to this")) key = "crondis";
    else if (raw.includes("I'm sorry, Apmeken")) key = "apmeken";
    else if (raw.includes("Forgive me, Het")) key = "het";
    else if (/Scabaras\.\.\.(?!\s*Het\.\.\.\s*Bear witness!?)/i.test(raw)) key = "scabaras";
    else if (low.includes("i will not be subjugated by a mortal")) key = "d2h";

    if (!key) return;

    if (key !== "d2h" && !isVoiceLineEnabled(key)) {
      log("(suppressed: " + key + ")");
      return;
    }

    if (key !== "snuffed" && lineId) {
      if (shouldIgnoreLine(lineId, 120000)) return;
    }

    var now = Date.now();
    if (key !== "snuffed") {
      var sig = key + "|" + raw.slice(-80);
      if (sig === lastSig && now - lastAt < 1200) return;
      lastSig = sig;
      lastAt = now;
    }

    if (key === "snuffed") {
      if (snuffStartAt) { log("Snuffed already active, ignoring"); return; }
      log("Snuffed out detected, starting timers");
      startSnuffedTimers();
      return;
    }

    if (key === "newdawn") {
      log("New dawn, resetting timers");
      stopSnuffedTimersAndReset();
      snuffStartAt = 0;
      return;
    }

    if (key === "tear") {
      showMessage("Scarabs + Bend the Knee shortly");
    } else if (key === "bend") {
      showMessage("Bend the Knee");
    } else if (key === "crondis") {
      showMessage("Crondis (SE)");
    } else if (key === "apmeken") {
      showMessage("Apmeken (NW)");
    } else if (key === "het") {
      showMessage("Het (SW)");
    } else if (key === "scabaras") {
      showMessage("Scabaras (NE)");
    } else if (key === "soloWeakMagic") {
      showSolo("Magic", "role-magic");
    } else if (key === "soloMelee") {
      showSolo("Melee", "role-melee");
    } else if (key === "soloRange") {
      showSolo("Range", "role-range");
    } else if (key === "tumeken") {
      log("Tumeken's heart, starting Barricade timer");
      startBarricadeTimer();
    } else if (key === "d2h") {
      var d2hTimerOn = isVoiceLineEnabled("d2h");
      var d2hAoeOn = isVoiceLineEnabled("d2hAoE");

      if (!d2hTimerOn && !d2hAoeOn) {
        log("(suppressed: D2H timer + AoE)");
      } else {
        if (d2hTimerOn) {
          log("D2H detected, starting timer");
          startD2HTimer();
        }
        if (d2hAoeOn) {
          showMessage("Threads / Gchain soon");
        }
      }

      startSnuffedTimers._clickDisabled = true;
      var rows = document.querySelectorAll("#spec tr");
      if (rows[1]) {
        var cell = rows[1].querySelector("td");
        if (cell) cell.textContent = "";
      }
    } else {
      updateUI(key);
    }
  }


  function showSelected(pos) {
    try {
      var b = pos.mainbox.rect;
      alt1.overLayRect(mixColor(0, 255, 0), b.x, b.y, b.width, b.height, 2000, 4);
    } catch {}
  }

  function ensureChatFound() {
    try {
      if (!reader.pos || !reader.pos.mainbox?.rect) {
        reader.pos = null;
        reader.find();
        if (reader.pos?.mainbox?.rect) {
          setStatus("Chatbox connected", "connected");
          try { showSelected(reader.pos); } catch {}
        }
      }
    } catch (e) {}
  }


  function readChatbox() {
    var segs = [];
    try {
      segs = reader.read() || [];
    } catch (e) {
      log("reader.read() failed. Enable Pixel permission in Alt1.");
      setStatus("Pixel permission needed", "error");
      return;
    }

    var EMPTY_REFIND_THRESHOLD = 4;

    if (!segs.length) {
      emptyReadCount++;

      if (emptyReadCount >= EMPTY_REFIND_THRESHOLD) {
        try {
          reader.pos = null;
          reader.find();
          if (reader.pos && reader.pos.mainbox && reader.pos.mainbox.rect) {
            setStatus("Chatbox connected", "connected");
            try { showSelected(reader.pos); } catch {}
          } else {
            setStatus("Searching for chatbox...", "");
          }
        } catch (e) {}
        emptyReadCount = 0;
      }
      return;
    }

    emptyReadCount = 0;

    if (DEBUG_DUMP_COLOURS) {
      var dumped = 0;
      for (var di = 0; di < segs.length; di++) {
        if (dumped > 4) break;
        var dseg = segs[di];
        if (!dseg?.fragments?.length || typeof dseg.text !== "string") continue;
        if (!/Amascut/i.test(dseg.text)) continue;

        var cols = dseg.fragments.slice(0, 10)
          .map(function (f) { return "[" + (f.color || []).join(",") + "]"; })
          .join(" ");
        log("COLOURS: " + dseg.text + " :: " + cols);
        dumped++;
      }
    }

    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];

      if (seg && typeof seg.text === "string") {
        var segId = seg.text.trim();

        if (/welcome to your session/i.test(seg.text)) {
          if (!shouldIgnoreLine("__welcome__" + segId, 120000)) {
            hardResetSession();
          }
          continue;
        }
        if (/you cannot extinguish that which you carry/i.test(seg.text)) {
          if (!shouldIgnoreLine("__extinguish__" + segId, 120000)) {
            onExtinguish();
          }
          continue;
        }
        if (/take the path toward/i.test(seg.text)) {
          if (!shouldIgnoreLine("__path__" + segId, 120000)) {
            clearClickInTimerOnly();
          }
          continue;
        }
      }

      if (!seg.fragments || seg.fragments.length === 0) continue;

      var looksLikeAmascut = /Amascut/i.test(seg.text);
      if (!looksLikeAmascut) continue;

      var full = seg.text;
      var colon = full.indexOf(":");
      if (colon !== -1) full = full.slice(colon + 1).trim();

      for (var j = i + 1; j < segs.length; j++) {
        var s2 = segs[j];
        if (!s2.fragments || !s2.fragments.length) break;

        var col = firstNonWhiteColor(s2);
        if (col && isColorNear(col, TEXT_RGB, 70)) {
          full += " " + s2.text.trim();
        } else if (!col) {
          var trimmed = s2.text.trim();
          if (trimmed && trimmed.length > 2 && !/^\[?\d{2}:\d{2}/.test(trimmed)) {
            full += " " + trimmed;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      if (full) {
        log(full);
        var lineId = seg.text.trim();
        onAmascutLine(full, lineId);
      }
    }
  }

  hideAllRows();
  setStatus("Searching for chatbox...", "");

  setTimeout(function () {
    var finder = setInterval(function () {
      try {
        if (!reader.pos) {
          log("Finding chatbox...");
          reader.find();
        } else {
          clearInterval(finder);
          log("Chatbox found, reading started");
          setStatus("Chatbox connected", "connected");
          showSelected(reader.pos);
          setInterval(readChatbox, 250);
          try { startOverlay(); } catch (e) { console.error(e); }
        }
      } catch (e) {
        log("Error: " + (e?.message || e));
      }
    }, 800);
  }, 50);

  setInterval(ensureChatFound, 2000);

  var overlayCtl = {
    group: "amascOverlayRegion",
    raf: 0,
    timer: 0,
    refreshRate: 50,
    running: false,
  };

  function getRsClientSize() {
    try {
      var w = (alt1 && alt1.rsWidth) ? alt1.rsWidth : 800;
      var h = (alt1 && alt1.rsHeight) ? alt1.rsHeight : 600;
      return { w: w, h: h };
    } catch (e) { return { w: 800, h: 600 }; }
  }

  function centerFor(canvas) {
    var rs = getRsClientSize();
    return {
      x: Math.max(0, Math.round((rs.w - canvas.width) / 2)),
      y: Math.max(0, Math.round((rs.h - canvas.height) / 2)),
    };
  }

  function positionFor(canvas) {
    if (overlayPos && Number.isFinite(overlayPos.x) && Number.isFinite(overlayPos.y)) {
      return { x: Math.max(0, Math.floor(overlayPos.x)), y: Math.max(0, Math.floor(overlayPos.y)) };
    }
    return centerFor(canvas);
  }

  function clearOverlayGroup() {
    try {
      alt1.overLaySetGroup(overlayCtl.group);
      alt1.overLayFreezeGroup(overlayCtl.group);
      alt1.overLayClearGroup(overlayCtl.group);
      alt1.overLayRefreshGroup(overlayCtl.group);
    } catch {}
  }

  function scheduleNext(cb) {
    overlayCtl.timer = window.setTimeout(function () {
      overlayCtl.raf = window.requestAnimationFrame(cb);
    }, overlayCtl.refreshRate);
  }

  function gatherSpecLines() {
    var rows = document.querySelectorAll("#spec tr");
    var lines = [];

    if (posMode) {
      lines.push({ text: "Positioning...", color: "#FFFFFF" });
      return lines;
    }

    rows.forEach(function (row) {
      if (row.style.display === "none") return;
      var td = row.querySelector("td");
      var text = (td?.textContent || "").trim();
      if (!text || row.classList.contains("ah-status-msg")) return;

      var color = "#FFFFFF";
      if (row.classList.contains("role-range")) color = "#3fb950";
      else if (row.classList.contains("role-magic")) color = "#58a6ff";
      else if (row.classList.contains("role-melee")) color = "#f85149";
      else if (row.classList.contains("callout")) color = "#f0883e";

      lines.push({ text: text, color: color });
    });
    return lines;
  }

  function renderLinesToCanvas(lines) {
    var rs = getRsClientSize();
    var baseSize = Math.round(Math.min(64, Math.max(28, rs.w * 0.045)));
    var fontSize = Math.max(14, Math.round(baseSize * overlayScale));
    var pad = 12;
    var gap = 6;

    var m = document.createElement("canvas");
    var mctx = m.getContext("2d");
    mctx.font = "bold " + fontSize + "px system-ui, -apple-system, Segoe UI, Arial, sans-serif";

    var maxW = 0;
    for (var li = 0; li < lines.length; li++) {
      var w = Math.ceil(mctx.measureText(lines[li].text).width);
      if (w > maxW) maxW = w;
    }
    var lineH = fontSize + gap;
    var cw = Math.max(1, maxW + pad * 2);
    var ch = Math.max(1, lines.length * lineH + pad * 2);

    var c = document.createElement("canvas");
    c.width = cw;
    c.height = ch;

    var ctx = c.getContext("2d");
    ctx.font = "bold " + fontSize + "px system-ui, -apple-system, Segoe UI, Arial, sans-serif";
    ctx.textBaseline = "top";

    var outline = Math.max(2, Math.round(fontSize / 10));
    var y = pad;
    for (var ri = 0; ri < lines.length; ri++) {
      var x = pad;
      ctx.lineWidth = outline;
      ctx.strokeStyle = "rgba(0,0,0,0.85)";
      ctx.strokeText(lines[ri].text, x, y);
      ctx.fillStyle = lines[ri].color;
      ctx.fillText(lines[ri].text, x, y);
      y += lineH;
    }
    return c;
  }

  function updateOverlayOnce() {
    try {
      if (!window.alt1) { scheduleNext(updateOverlayOnce); return; }

      if (!overlayEnabled) {
        clearOverlayGroup();
        scheduleNext(updateOverlayOnce);
        return;
      }

      var lines = gatherSpecLines();
      if (!lines.length) {
        clearOverlayGroup();
        scheduleNext(updateOverlayOnce);
        return;
      }

      var canvas = renderLinesToCanvas(lines);
      var ctx = canvas.getContext("2d");
      var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      var pos = positionFor(canvas);

      if (img && img.width > 0 && img.height > 0) {
        alt1.overLaySetGroup(overlayCtl.group);
        alt1.overLayFreezeGroup(overlayCtl.group);
        alt1.overLayClearGroup(overlayCtl.group);
        alt1.overLayImage(pos.x, pos.y, encodeImage(img), img.width, overlayCtl.refreshRate);
        alt1.overLayRefreshGroup(overlayCtl.group);
      } else {
        clearOverlayGroup();
      }
    } catch (e) {
      console.error(e);
      clearOverlayGroup();
    }

    if (overlayCtl.running) scheduleNext(updateOverlayOnce);
  }

  function startOverlay(opts) {
    if (!opts) opts = {};
    overlayCtl.refreshRate = Number(opts.refreshRate) || 50;
    if (overlayCtl.running) return;
    overlayCtl.running = true;
    clearOverlayGroup();
    scheduleNext(updateOverlayOnce);
  }

  function stopOverlay() {
    overlayCtl.running = false;
    try { if (overlayCtl.raf) cancelAnimationFrame(overlayCtl.raf); } catch {}
    try { if (overlayCtl.timer) clearTimeout(overlayCtl.timer); } catch {}
    overlayCtl.raf = 0;
    overlayCtl.timer = 0;
    clearOverlayGroup();
  }

  window.startOverlayPosMode = startOverlayPosMode;
  window.stopOverlayPosMode = stopOverlayPosMode;
  window.clearOverlayGroup = clearOverlayGroup;

})();
