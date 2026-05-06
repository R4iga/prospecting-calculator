let minerals = [];
let filtered = [];
let allLocationNames = new Set();

const mineralSelect   = document.getElementById("mineralSelect");
const mineralSearch   = document.getElementById("mineralSearch");
const rarityFilter    = document.getElementById("rarityFilter");
const locationSelect  = document.getElementById("locationSelect");
const locationFilter  = document.getElementById("locationFilter");
const luckInput       = document.getElementById("luckInput");
const capacityInput   = document.getElementById("capacityInput");
const farmTargetInput = document.getElementById("farmTarget");
const targetChanceInput = document.getElementById("targetChance");
const buildSelect     = document.getElementById("buildSelect");

const timeMethod      = document.getElementById("timeMethod");
const shakeSpeedInput = document.getElementById("shakeSpeedInput");
const sInput          = document.getElementById("sInput");
const nInput          = document.getElementById("nInput");
const dInput          = document.getElementById("dInput");
const autopanExtras   = document.getElementById("autopanExtras");

const MAX_SHAKE = 3000;

/* -------------------------
   STAT / FORMAT HELPERS
------------------------- */

function fmtPct(x, digits = 5) {
  if (!isFinite(x)) return "-";
  return (x * 100).toFixed(digits) + "%";
}

function fmtOneInFromProb(p) {
  if (!isFinite(p) || p <= 0) return "∞";
  return Math.round(1 / p).toLocaleString();
}

function attemptsForTarget(pAttempt, target) {
  if (!isFinite(pAttempt) || pAttempt <= 0) return Infinity;
  if (pAttempt >= 1) return 1;
  return Math.log(1 - target) / Math.log(1 - pAttempt);
}

function fmtDuration(seconds) {
  if (!isFinite(seconds) || seconds < 0) return "-";
  if (seconds === Infinity) return "∞";

  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  if (h >= 24) {
    const d = Math.floor(h / 24);
    const rh = h % 24;
    if (rh > 0) return `${d}d ${rh}h`;
    return `${d}d`;
  }
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtMoney(amount) {
  if (amount >= 1e12) return "$" + (amount / 1e12).toFixed(1) + "T";
  if (amount >= 1e9) return "$" + (amount / 1e9).toFixed(1) + "B";
  if (amount >= 1e6) return "$" + (amount / 1e6).toFixed(1) + "M";
  if (amount >= 1e3) return "$" + (amount / 1e3).toFixed(1) + "K";
  return "$" + amount.toFixed(0);
}

/* -------------------------
   SHAKE SPEED % -> r (shakes/sec)
   r = 4.03266e-9 x^3 - 1.68935e-5 x^2 + 0.0255557 x + 0.206594
------------------------- */
function shakeSpeedToR(x) {
  x = Math.max(0, Number(x) || 0);
  x = Math.min(x, MAX_SHAKE);

  const r =
    (4.03266e-9 * Math.pow(x, 3)) -
    (1.68935e-5 * Math.pow(x, 2)) +
    (0.0255557 * x) +
    0.206594;

  return Math.max(0, r);
}

/* -------------------------
   CYCLE TIME MODEL
   Cycle time = denominator
   Pans/min = 60 / cycle time

   Autopan / Macro:
     C/(r*s) + 1.5 + 190n/d

   Sandshaking:
     C/(r*s) + 0.75 + 190(n - 1)/d
------------------------- */
function getCycleSeconds(C) {
  const shakeSpeed = Math.max(0, Number(shakeSpeedInput?.value) || 0);
  const s = Math.max(0, Number(sInput?.value) || 0);
  const n = Math.max(0, Number(nInput?.value) || 0);
  const d = Math.max(0.0001, Number(dInput?.value) || 0.0001);

  const r = shakeSpeedToR(shakeSpeed);
  const rs = r * s;

  if (rs <= 0) return Infinity;

  const base = C / rs;

  if (timeMethod.value === "autopan") {
    return base + 1.5 + (190 * n / d);
  }

  return base + 0.75 + (190 * Math.max(0, n - 1) / d);
}

/* -------------------------
   "99%" / PITY HELPERS
   Displayed as 99%, but uses the pity formula:
   (5 x odds) ÷ ((1.5 x luck x √capacity) ÷ cycle time)

   Since odds = 1 / baseProb:
   pans99 = 5 x odds = 5 / baseProb
   time99 = (5 x odds x cycleTime) / (1.5 x luck x √capacity)
------------------------- */
function pityPansFromOdds(baseProb) {
  if (!isFinite(baseProb) || baseProb <= 0) return Infinity;
  return 5 / baseProb;
}

function pityTimeFromFormula(baseProb, luck, C, cycleSeconds) {
  if (!isFinite(baseProb) || baseProb <= 0) return Infinity;
  if (!isFinite(cycleSeconds) || cycleSeconds <= 0) return Infinity;

  const denom = (1.5 * Math.max(0, luck) * Math.sqrt(Math.max(1, C))) / cycleSeconds;
  if (!isFinite(denom) || denom <= 0) return Infinity;

  const odds = 1 / baseProb;
  return (5 * odds) / denom;
}

// Toggle extra inputs visibility
function syncAutopanUI() {
  if (!autopanExtras || !timeMethod) return;
  autopanExtras.style.display = (timeMethod.value === "autopan") ? "" : "none";
}

/* -------------------------
   DATA LOAD
------------------------- */

(function loadData() {
  const d = window.MINERALS_DATA;
  if (!d || !d.minerals) {
    console.error("minerals-data.js not loaded or missing minerals array");
    return;
  }

  minerals = (d.minerals || []).slice().sort((a, b) =>
    a.mineral.localeCompare(b.mineral, "en", { sensitivity: "base" })
  );

  for (const m of minerals) {
    for (const loc of (m.locations || [])) {
      allLocationNames.add(loc.location);
    }
  }

  const locs = [...allLocationNames].sort((a, b) => a.localeCompare(b));
  for (const name of locs) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    locationFilter.appendChild(opt);
  }

  filtered = minerals.slice();
  populateMinerals(true);
})();

/* -------------------------
   EVENTS
------------------------- */

[
  mineralSelect, locationSelect, luckInput, capacityInput, locationFilter,
  timeMethod, shakeSpeedInput, sInput, nInput, dInput, farmTargetInput, targetChanceInput
].forEach(el => {
  if (!el) return;
  el.addEventListener("input", () => {
    if (el === mineralSelect) populateLocations();
    if (el === timeMethod) syncAutopanUI();
    calculate();
  });
});

if (rarityFilter) rarityFilter.addEventListener("change", () => populateMinerals(false));
if (mineralSearch) mineralSearch.addEventListener("input", () => populateMinerals(false));

// Default mode = autopan/macro
if (timeMethod) {
  timeMethod.value = "autopan";
}
syncAutopanUI();

/* -------------------------
   DROPDOWNS
------------------------- */

function populateMinerals(keepSelection) {
  const q = (mineralSearch?.value || "").toLowerCase();
  const r = rarityFilter?.value || "all";
  const prev = keepSelection ? mineralSelect?.value : null;

  filtered = minerals.filter(m => {
    const okName = (m.mineral || "").toLowerCase().includes(q);
    const okRarity = (r === "all") ? true : ((m.rarity || "") === r);
    return okName && okRarity;
  });

  if (!mineralSelect) return;

  mineralSelect.innerHTML = "";
  for (const m of filtered) {
    const opt = document.createElement("option");
    opt.value = m.mineral;
    opt.textContent = m.mineral;
    mineralSelect.appendChild(opt);
  }

  if (prev && filtered.some(m => m.mineral === prev)) {
    mineralSelect.value = prev;
  }

  populateLocations();
}

function populateLocations() {
  const m = filtered.find(x => x.mineral === mineralSelect?.value) ||
            minerals.find(x => x.mineral === mineralSelect?.value);

  if (!m || !locationSelect) {
    if (locationSelect) locationSelect.innerHTML = "";
    calculate();
    return;
  }

  const prevLoc = locationSelect.options.length
    ? locationSelect.options[locationSelect.selectedIndex]?.textContent
    : null;

  locationSelect.innerHTML = "";
  for (const l of (m.locations || [])) {
    const opt = document.createElement("option");
    opt.value = String(l.chance_percent);
    opt.textContent = l.location;
    locationSelect.appendChild(opt);
  }

  if (prevLoc) {
    const idx = [...locationSelect.options].findIndex(o => o.textContent === prevLoc);
    locationSelect.selectedIndex = idx >= 0 ? idx : 0;
  } else {
    locationSelect.selectedIndex = 0;
  }

  calculate();
}

/* -------------------------
   MAIN CALC
------------------------- */

function calculate() {
  const selectedMineral = mineralSelect?.value;
  const m = minerals.find(x => x.mineral === selectedMineral) ||
            filtered.find(x => x.mineral === selectedMineral);

  const luck = Math.max(0, Number(luckInput?.value) || 0);
  const C = Math.max(1, Number(capacityInput?.value) || 1);
  const cycleSeconds = getCycleSeconds(C);

  // Header labels
  const mineralLabel = document.getElementById("mineralLabel");
  if (m) {
    if (mineralLabel) mineralLabel.textContent = `Mineral: ${m.mineral}`;

    const rarity = m.rarity || "unknown";
    const rarityTag = document.getElementById("rarityTag");
    if (rarityTag) rarityTag.textContent = rarity;

    const c = rarityColor(rarity);
    const rarityDot = document.getElementById("rarityDot");
    if (rarityDot) {
      rarityDot.style.background = c;
      rarityDot.style.boxShadow = `0 0 0 3px ${c}22`;
    }
  } else {
    if (mineralLabel) mineralLabel.textContent = "Pick a mineral";
    const rarityTag = document.getElementById("rarityTag");
    if (rarityTag) rarityTag.textContent = "-";
  }

  if (!m || !locationSelect?.value) {
    clearResults();
    return;
  }

  const rollsPerAttempt = luck * Math.sqrt(C);

  const pansPerMinute = (isFinite(cycleSeconds) && cycleSeconds > 0)
    ? (60 / cycleSeconds)
    : 0;

  const shakeSpeed = Math.max(0, Number(shakeSpeedInput?.value) || 0);
  const r = shakeSpeedToR(shakeSpeed);
  const s = Math.max(0, Number(sInput?.value) || 0);
  const n = Math.max(0, Number(nInput?.value) || 0);
  const d = Math.max(0.0001, Number(dInput?.value) || 0.0001);

  let cycleFormulaText = "";
  if (timeMethod?.value === "autopan") {
    cycleFormulaText =
      `Cycle = C/(rxs) + 1.5 + 190n/d = ` +
      `${C}/(${r.toFixed(2)}x${s.toFixed(2)}) + 1.5 + 190x${n.toFixed(2)}/${d.toFixed(2)}`;
  } else {
    cycleFormulaText =
      `Cycle = C/(rxs) + 0.75 + 190(n-1)/d = ` +
      `${C}/(${r.toFixed(2)}x${s.toFixed(2)}) + 0.75 + 190x(${n.toFixed(2)}-1)/${d.toFixed(2)}`;
  }

  const rollsNote = document.getElementById("rollsNote");
  if (rollsNote) {
    rollsNote.textContent =
      `Rolls/pan: ${rollsPerAttempt.toFixed(2)} · Shake ${shakeSpeed}% → ${r.toFixed(2)}/s · s=${s.toFixed(2)} · ${cycleFormulaText} · Time: ${isFinite(cycleSeconds) ? cycleSeconds.toFixed(2) + "s" : "∞"} · ${isFinite(pansPerMinute) ? pansPerMinute.toFixed(1) + " pans/min" : "-"}`;
  }

  // Selected location base chance per roll
  const basePercent = Number(locationSelect.value);
  const p = basePercent / 100;

  // Chance per attempt
  const pAttempt = 1 - Math.pow(1 - p, rollsPerAttempt);
  const expected = rollsPerAttempt * p;

  // Real 50% / 90%
  const a50 = attemptsForTarget(pAttempt, 0.50);
  const a90 = attemptsForTarget(pAttempt, 0.90);

  const t50 = (isFinite(a50) && isFinite(cycleSeconds)) ? (a50 * cycleSeconds) : Infinity;
  const t90 = (isFinite(a90) && isFinite(cycleSeconds)) ? (a90 * cycleSeconds) : Infinity;

  // Displayed as 99%, but uses pity formula
  const pans99 = pityPansFromOdds(p);
  const time99 = pityTimeFromFormula(p, luck, C, cycleSeconds);

  const chanceCell = document.getElementById("chanceCell");
  if (chanceCell) { chanceCell.textContent = fmtPct(pAttempt, 5); animateValue(chanceCell, 0, parseFloat(fmtPct(pAttempt, 5)), 300, 5); }

  const oneInAttempt = document.getElementById("oneInAttempt");
  if (oneInAttempt) oneInAttempt.textContent = `~1 in ${fmtOneInFromProb(pAttempt)}`;

  const expectedCell = document.getElementById("expectedCell");
  if (expectedCell) { expectedCell.textContent = expected.toFixed(4); animateValue(expectedCell, 0, expected, 300, 4); }

  const expectedSub = document.getElementById("expectedSub");
  if (expectedSub) {
    expectedSub.textContent =
      `Expected finds/attempt · 99% pans: ${isFinite(pans99) ? pans99.toFixed(1) : "∞"}`;
  }

  const atLeastOneCell = document.getElementById("atLeastOneCell");
  if (atLeastOneCell) atLeastOneCell.textContent = fmtPct(pAttempt, 2);

  const atLeastSub = document.getElementById("atLeastSub");
  if (atLeastSub) {
    atLeastSub.textContent =
      `Chance of ≥1 in one attempt · 99% time: ${fmtDuration(time99)}`;
  }

  // === FARMING GOAL ===
  const targetCount = Math.max(1, Number(farmTargetInput?.value) || 1);
  const attemptsNeeded = targetCount / expected;
  const farmTimeSec = isFinite(attemptsNeeded) && isFinite(cycleSeconds) ? attemptsNeeded * cycleSeconds : Infinity;
  const avgSizePerFind = getAverageSize(m, locationSelect);
  const valuePerKg = m.value_per_kg || 0;
  const totalValue = targetCount * avgSizePerFind * valuePerKg;

  const farmAttemptsEl = document.getElementById("farmAttempts");
  const farmAttemptsSub = document.getElementById("farmAttemptsSub");
  const farmTimeEl = document.getElementById("farmTime");
  const farmTimeSub = document.getElementById("farmTimeSub");
  const farmValueEl = document.getElementById("farmValue");
  const farmValueSub = document.getElementById("farmValueSub");

  if (farmAttemptsEl) farmAttemptsEl.textContent = isFinite(attemptsNeeded) ? Math.ceil(attemptsNeeded).toLocaleString() : "∞";
  if (farmAttemptsSub) farmAttemptsSub.textContent = `For ${targetCount} ${m.mineral}`;
  if (farmTimeEl) farmTimeEl.textContent = fmtDuration(farmTimeSec);
  if (farmTimeSub) farmTimeSub.textContent = `At ${isFinite(pansPerMinute) ? pansPerMinute.toFixed(1) : "0"} pans/min`;
  if (farmValueEl) farmValueEl.textContent = isFinite(totalValue) ? fmtMoney(totalValue) : "-";
  if (farmValueSub) farmValueSub.textContent = `~${avgSizePerFind.toFixed(1)}kg avg · ${fmtMoney(valuePerPerKg(valuePerKg))}/kg`;

  // === REVERSE LUCK ===
  const targetPct = Math.max(0.1, Math.min(99.9, Number(targetChanceInput?.value) || 50));
  const targetProb = targetPct / 100;
  const luckNeeded = calcLuckForChance(targetProb, p, C);
  const reverseLuckEl = document.getElementById("reverseLuckResult");
  const reverseLuckSubEl = document.getElementById("reverseLuckSub");
  if (reverseLuckEl) reverseLuckEl.textContent = luckNeeded >= 0 ? Math.ceil(luckNeeded).toLocaleString() : "Impossible";
  if (reverseLuckSubEl) {
    if (luckNeeded >= 0) {
      reverseLuckSubEl.textContent = `for ${targetPct}% per attempt at this location`;
    } else {
      reverseLuckSubEl.textContent = `location chance too low for ${targetPct}%`;
    }
  }

  // Fill table
  fillTable(m, luck, C, cycleSeconds, rollsPerAttempt, locationFilter?.value || "all");
}

function clearResults() {
  ["chanceCell","expectedCell","atLeastOneCell","oneInAttempt","expectedSub","atLeastSub"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "-";
  });
  ["farmAttempts","farmTime","farmValue","farmAttemptsSub","farmTimeSub","farmValueSub"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "-";
  });
  const rl = document.getElementById("reverseLuckResult");
  const rls = document.getElementById("reverseLuckSub");
  if (rl) rl.textContent = "-";
  if (rls) rls.textContent = "-";
  const tbody = document.getElementById("allLocationsTable");
  if (tbody) tbody.innerHTML = "";
  const best = document.getElementById("bestLocation");
  if (best) best.textContent = "-";
}

function calcLuckForChance(targetProb, baseProbPerRoll, C) {
  // pAttempt = 1 - (1 - baseProb)^(luck * sqrt(C))
  // Solve for luck:
  // 1 - targetProb = (1 - baseProb)^(luck * sqrt(C))
  // log(1 - targetProb) = luck * sqrt(C) * log(1 - baseProb)
  // luck = log(1 - targetProb) / (sqrt(C) * log(1 - baseProb))
  if (baseProbPerRoll <= 0 || baseProbPerRoll >= 1) return -1;
  const denom = Math.sqrt(C) * Math.log(1 - baseProbPerRoll);
  if (denom === 0) return -1;
  const luck = Math.log(1 - targetProb) / denom;
  return luck > 0 ? luck : -1;
}

function getAverageSize(mineral, locSelect) {
  // Use a reasonable average size estimate (10kg for common, scales with rarity)
  const rarityWeights = { common: 5, uncommon: 8, rare: 12, epic: 18, legendary: 25, mythic: 30, exotic: 40, mythcal: 30 };
  const w = rarityWeights[mineral.rarity] || 10;
  return w;
}

function valuePerPerKg(v) {
  return v;
}

function fillTable(m, luck, C, cycleSeconds, rollsPerAttempt, locFilterVal) {
  const tbody = document.getElementById("allLocationsTable");
  if (!tbody) return;
  tbody.innerHTML = "";

  let best = { name: "-", pAttempt: -1, oneIn: "-" };
  const rows = [];

  for (const l of (m.locations || [])) {
    if (locFilterVal !== "all" && l.location !== locFilterVal) continue;

    const bp = Number(l.chance_percent) / 100;
    const pAtt = 1 - Math.pow(1 - bp, rollsPerAttempt);

    if (pAtt > best.pAttempt) {
      best = { name: l.location, pAttempt: pAtt, oneIn: fmtOneInFromProb(pAtt) };
    }

    const row50 = attemptsForTarget(pAtt, 0.50);
    const row90 = attemptsForTarget(pAtt, 0.90);
    const row99 = pityPansFromOdds(bp);

    const rowT50 = (isFinite(row50) && isFinite(cycleSeconds)) ? (row50 * cycleSeconds) : Infinity;
    const rowT90 = (isFinite(row90) && isFinite(cycleSeconds)) ? (row90 * cycleSeconds) : Infinity;
    const rowT99 = pityTimeFromFormula(bp, luck, C, cycleSeconds);

    rows.push({
      location: l.location,
      basePercent: Number(l.chance_percent),
      baseOneIn: fmtOneInFromProb(bp),
      pAtt,
      attemptOneIn: fmtOneInFromProb(pAtt),
      a50: row50,
      a90: row90,
      a99: row99,
      t50: rowT50,
      t90: rowT90,
      t99: rowT99
    });
  }

  const bestLocation = document.getElementById("bestLocation");
  if (bestLocation) {
    bestLocation.textContent =
      best.pAttempt > 0 ? `${best.name} (~1 in ${best.oneIn})` : "-";
  }

  for (const rRow of rows) {
    const tr = document.createElement("tr");
    if (rRow.location === best.name) tr.classList.add("bestRow");

    tr.innerHTML = `

      <td>${rRow.location}</td>
      <td style="background:rgba(255,0,0,${(rRow.basePercent/100)*0.3});">${rRow.basePercent.toFixed(8)}%</td>
      <td>~1 in ${rRow.baseOneIn}</td>
      <td style="background:rgba(0,255,0,${Math.min(1,rRow.pAtt*20)});">${fmtPct(rRow.pAtt, 5)}</td>
      <td>~1 in ${rRow.attemptOneIn}</td>
      <td>${isFinite(rRow.a50) ? rRow.a50.toFixed(2) : "∞"}</td>
      <td>${isFinite(rRow.a90) ? rRow.a90.toFixed(2) : "∞"}</td>
      <td>${isFinite(rRow.a99) ? rRow.a99.toFixed(2) : "∞"}</td>
      <td>${fmtDuration(rRow.t50)}</td>
      <td>${fmtDuration(rRow.t90)}</td>
      <td>${fmtDuration(rRow.t99)}</td>
    `;
    tbody.appendChild(tr);
  }
}

/* -------------------------
   RARITY COLOR HELPER
------------------------- */

function rarityColor(r){
  switch(r){
    case "common": return "#a3a3a3";
    case "uncommon": return "#22c55e";
    case "rare": return "#3b82f6";
    case "epic": return "#a855f7";
    case "legendary": return "#f59e0b";
    case "mythic": return "#cf0064";
    case "mythical": return "#cf0064";
    case "exotic": return "#ff0011";
    case "ascended": return "#eceee0";
    default: return "#7c8cff";
  }
}

/* -------------------------
   BUILDS DATA & LOGIC
------------------------- */

const BUILDS = {
  "luck3swamp": {
    name: "Luck 3 Swamp (III.B)",
    luck: 3,
    locationKeyword: "swamp",
    equipment: {
      charm: "Timelocked Soul",
      neck: "Venomshank",
      rings: [
        "Ring of Champions",
        "Umbrite Ring",
        "Umbrite Ring",
        "Umbrite Ring",
        "Umbrite Ring",
        "Umbrite Ring",
        "Umbrite Ring",
        "Umbrite Ring"
      ],
      notes: [
        "Replace 1 Umbrite Ring with Dredge Master's Ring for better results",
        "Replace 1 Umbrite Ring with Purifying Ring for Fungal Marsh"
      ]
    },
    runes: ["Purity", "Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber"],
    pan: { name: "Blightflow", enchant: "Infernal" },
    shovel: { name: "Venomspade", enchant: "Mythical" }
  },
  "luckEfficiencyIIIB": {
    name: "Luck Efficiency III.B (w/ RoC)",
    locationKeyword: "swamp",
    equipment: {
      charm: "Timelocked Soul",
      neck: "Venomshank",
      rings: ["Ring of Champions", "7x/5x Umbrite Ring"],
      notes: ["☒ Replace 1 with Dredge Master's Ring", "⚠ Replace 1 with Purifying Ring for Fungal Marsh"]
    },
    runes: ["Purity", "Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber"],
    pan: { name: "Blightflow", enchant: "Infernal" },
    shovel: { name: "Venomspade", enchant: "Mythical" }
  },
  "luckEfficiencyIIIA": {
    name: "Luck Efficiency III.A (no RoC)",
    locationKeyword: "swamp",
    equipment: {
      charm: "Timelocked Soul",
      neck: "Venomshank",
      rings: ["4x/3x Umbrite Ring", "3x Otherworldly Ring", "1x/0x Purifying Ring"],
      notes: ["☒ Replace 1 with Dredge Master's Ring", "⚠ Replace 1 with Purifying Ring for Fungal Marsh (6 rings)"]
    },
    runes: ["Purity", "Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber"],
    pan: { name: "Blightflow", enchant: "Infernal" },
    shovel: { name: "Venomspade", enchant: "Mythical" }
  },
  "hybridIII": {
    name: "Hybrid III.",
    locationKeyword: "swamp",
    equipment: {
      charm: "Timelocked Soul",
      neck: "Venomshank / Frostthorn Pendant",
      rings: ["1x Ring of Champions", "4x/3x Umbrite Ring", "5x/3x Umbrite Ring", "4x/3x Otherworldly Ring", "2x/1x Purifying Ring"],
      notes: ["⚠ Replace 1 with Purifying Ring for Fungal Marsh", "☒ Replace 1 with Dredge Master's Ring (no-RoC)", "‡ Use Abyssal Shovel for 6 rings no-RoC"]
    },
    runes: ["Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber", "Speed I"],
    pan: { name: "Blightflow", enchant: "Cosmic" },
    shovel: { name: "Venomspade (or Abyssal)", enchant: "Rhythmic" }
  },
  "sizeBoostIII": {
    name: "Size Boost III.",
    locationKeyword: "swamp",
    equipment: {
      charm: "Pumpkin Lord† (fallback: Helm of the Round)",
      neck: "Frostthorn Pendant",
      rings: ["1x Ring of Champions", "1x Dredge Master's Ring", "6x/4x Ring of Thorns"],
      notes: ["mutation: Festive; fallback: Prismatic", "⚠ Replace 1 with Purifying Ring for Fungal Marsh"]
    },
    runes: ["Summit Seeker", "Mountain Climber", "Speed I", "Sunblessed/Abyssal", "Volcanic/Solitude"],
    pan: { name: "Blightflow (or Galactic†)", enchant: "Cosmic" },
    shovel: { name: "Candy Cane† (or Venomspade)", enchant: "Non-Euclidean" }
  },
  "luckEfficiencyIVB": {
    name: "Luck Efficiency IV.B (w/ Ascended)",
    locationKeyword: "meteor",
    equipment: {
      charm: "Starlight Wings",
      neck: "Venomshank",
      rings: ["Ring of Champions", "Ring of the Stars", "Accretion Disk", "4x/3x Umbrite Ring", "1x/0x Vortex Ring"],
      notes: ["⚠ Replace 1 with Purifying Ring for Fungal Marsh"]
    },
    runes: ["Mountain Climber", "Summit Seeker", "Speed I/Solitude", "Purity", "Sunblessed/Abyssal"],
    pan: { name: "Nebula", enchant: "Infernal" },
    shovel: { name: "Starcrusher", enchant: "Mythical" }
  },
  "luckEfficiencyIVA": {
    name: "Luck Efficiency IV.A (no Ascended)",
    locationKeyword: "meteor",
    equipment: {
      charm: "Starlight Wings",
      neck: "Venomshank",
      rings: ["3x/2x Umbrite Ring", "3x/2x Vortex Ring", "2x Accretion Disk"],
      notes: ["⚠ Replace 1 with Purifying Ring for Fungal Marsh"]
    },
    runes: ["Purity", "Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber"],
    pan: { name: "Nebula", enchant: "Infernal" },
    shovel: { name: "Starcrusher", enchant: "Mythical" }
  },
  "hybridIVB": {
    name: "Hybrid IV.B (w/ Ascended)",
    locationKeyword: "meteor",
    equipment: {
      charm: "Starlight Wings",
      neck: "Venomshank",
      rings: ["Ring of Champions", "Ring of the Stars", "4x/3x Umbrite Ring", "2x/1x Accretion Disk"],
      notes: ["⚠ Replace 1 with Purifying Ring for Fungal Marsh", "fallback: Otherworldly Ring"]
    },
    runes: ["Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber", "Speed I"],
    pan: { name: "Nebula", enchant: "Cosmic" },
    shovel: { name: "Starcrusher", enchant: "Rhythmic" }
  },
  "sizeBoostIV": {
    name: "Size Boost IV.",
    locationKeyword: "meteor",
    equipment: {
      charm: "Clockwork (fallback: Pumpkin Lord†)",
      neck: "Meteor Core",
      rings: ["Ring of Champions", "Ring of the Stars", "Dredge Master's Ring", "5x/3x Ring of Thorns"],
      notes: ["mutation: Festive; fallback: Prismatic", "⚠ Replace 1 with Purifying Ring for Fungal Marsh"]
    },
    runes: ["Mountain Climber", "Summit Seeker", "Speed I", "Sunblessed/Abyssal", "Volcanic/Solitude"],
    pan: { name: "Nebula (or Galactic†)", enchant: "Cosmic" },
    shovel: { name: "Candy Cane† (or Starcrusher)", enchant: "Non-Euclidean" }
  },
  "moneyPrinter": {
    name: "Money Printer",
    locationKeyword: "meteor",
    equipment: {
      charm: "Clockwork (fallback: Royal Federation Crown)",
      neck: "Santa's Bag† (fallback: Venomshank)",
      rings: ["Ring of Champions", "4x/2x Otherworldly Ring", "2x Apocalypse Bringer", "1x Umbrite Ring"],
      notes: ["fallback: Royal Federation Crown", "fallback: Venomshank", "fallback: Umbrite Ring | Otherworldly Ring", "fallback: Mythril Ring"]
    },
    runes: ["Summit Seeker", "Mountain Climber", "Speed I", "Solitude", "Abyssal/Sunblessed"],
    pan: { name: "Galactic† (or Blightflow)", enchant: "Midas" },
    shovel: { name: "Candy Cane† (or Abyssal)", enchant: "Non-Euclidean" }
  },
  "treasureMapIII": {
    name: "Treasure/Geode III.",
    locationKeyword: "swamp",
    equipment: {
      charm: "Excalibur",
      neck: "Venomshank (1-star Prismatic)",
      rings: ["Solar Ring (1-star Prismatic)", "Dredge Master's Ring", "3x/2x Vortex Ring", "3x/2x Purifying Ring"],
      notes: ["Swap Solar Ring for Vortex Ring if dig speed = 10%", "fallback: Vortex Ring", "If dig speed > 10%, replace 1 with Solar Ring"]
    },
    runes: ["Mountain Climber", "Speed I"],
    pan: { name: "Blightflow", enchant: "Cosmic" },
    shovel: { name: "The Excavator", enchant: "Treasure Hunter" }
  },
  "itemsFarmingIII": {
    name: "Items Farming III.",
    locationKeyword: "swamp",
    equipment: {
      charm: "Timelocked Soul",
      neck: "Frostthorn Pendant",
      rings: ["1x Ring of Champions", "2x/1x Umbrite Ring", "4x/3x Purifying Ring", "2x Mythril Ring", "3x/0x Umbrite Ring", "0x/2x Vortex Ring"],
      notes: ["☒ Replace 1 with Dredge Master's Ring", "꙳Misfortune Rune for Common/Uncommon ores", "Excavating enchant optional"]
    },
    runes: ["Summit Seeker", "Mountain Climber", "Critical I", "Misfortune/Entropy", "Critical II"],
    pan: { name: "Blightflow", enchant: "Cosmic" },
    shovel: { name: "Venomspade", enchant: "Excavating" }
  },
  "itemsFarmingIV": {
    name: "Items Farming IV.",
    locationKeyword: "meteor",
    equipment: {
      charm: "Starlight Wings",
      neck: "Meteor Core",
      rings: ["1x Ring of Champions", "3x Accretion Disk", "2x/0x Umbrite Ring", "2x/1x Vortex Ring", "3x/2x Umbrite Ring", "2x Vortex Ring"],
      notes: ["⚠ For Fungal Marsh, replace one with Purifying Ring", "☒ Replace 1 with Dredge Master's Ring", "꙳Misfortune Rune for Common/Uncommon ores", "Excavating enchant optional"]
    },
    runes: ["Summit Seeker", "Mountain Climber", "Critical I", "Misfortune/Entropy", "Critical II"],
    pan: { name: "Nebula", enchant: "Cosmic" },
    shovel: { name: "Starcrusher", enchant: "Excavating" }
  },
  "luckEfficiencyI": {
    name: "Luck Efficiency I.",
    locationKeyword: "snowy",
    equipment: {
      charm: "Cryogenic Preserver",
      neck: "Frostthorn Pendant",
      rings: ["2x Apocalypse Bringer", "6x/4x Mythril Ring"],
      notes: ["☽ If Mythril Rings don't have mutation, use Prismatic Moon Rings", "Higher stars/quality better, but 2 5-star rings > 1 6-star"]
    },
    runes: ["Mountain Climber", "Speed I", "Summit Seeker", "Solitude/Discovery/Sunblessed/Abyssal"],
    pan: { name: "Frostbite", enchant: "Infernal" },
    shovel: { name: "Icebreaker", enchant: "Non-Euclidean" }
  },
  "sizeBoostI": {
    name: "Size Boost I.",
    locationKeyword: "snowy",
    equipment: {
      charm: "Royal Federation Crown (fallback: Crown)",
      neck: "Frostthorn Pendant (fallback: Mass Accumulator)",
      rings: ["3x/2x Mythril Ring", "3x/2x Apocalypse Bringer", "2x Eye of Fire"],
      notes: ["Use Solar Magnifier to increase Museum-quality ores", "Use alternately with Sell Boost Build"]
    },
    runes: ["Mountain Climber", "Speed I", "Summit Seeker", "Sunblessed/Abyssal/Solitude/Discovery"],
    pan: { name: "Frostbite", enchant: "Cosmic" },
    shovel: { name: "Icebreaker", enchant: "Non-Euclidean" }
  },
  "sellBoost": {
    name: "Sell Boost",
    locationKeyword: "snowy",
    equipment: {
      charm: "Royal Federation Crown",
      neck: "Amethyst Pendant | Spider Bowtie†",
      rings: ["8x/6x Apocalypse Bringer"],
      notes: ["Equip before selling full backpack", "Higher stars/quality better", "Midas pan enchant recommended"]
    },
    runes: ["Any"],
    pan: { name: "Any", enchant: "Midas" },
    shovel: { name: "Any", enchant: "Any" }
  },
  "luckEfficiencyII": {
    name: "Luck Efficiency II.",
    locationKeyword: "overgrown",
    equipment: {
      charm: "Antlers of Life | Witch Hat†",
      neck: "Frostthorn Pendant",
      rings: ["6x/4x Umbrite/Vortex Ring", "2x Mythril Ring☽", "2x Apocalypse Bringer"],
      notes: ["☽ If Mythril Rings don't have mutation, use Prismatic Moon Rings", "All Mythic equipment should be Diamond mutation or better"]
    },
    runes: ["Summit Seeker", "Mountain Climber", "Speed I", "Purity/Solitude/Abyssal"],
    pan: { name: "Abyssal", enchant: "Infernal" },
    shovel: { name: "Abyssal", enchant: "Non-Euclidean" }
  },
  "sizeBoostII": {
    name: "Size Boost II.",
    locationKeyword: "overgrown",
    equipment: {
      charm: "Helm of the Round (fallback: Royal Federation Crown)",
      neck: "Frostthorn Pendant",
      rings: ["4x Ring of Thorns", "2x/1x Apocalypse Bringer", "2x/1x Mythril Ring☽"],
      notes: ["☽ If Mythril Rings don't have mutation, use Prismatic Moon Rings", "After reaching Swamp, replace Apocalypse Bringers with Purifying Ring"]
    },
    runes: ["Summit Seeker", "Mountain Climber", "Speed I", "Purity/Solitude/Abyssal"],
    pan: { name: "Abyssal", enchant: "Cosmic" },
    shovel: { name: "Abyssal", enchant: "Non-Euclidean" }
  }
};

function applyBuild(){
  const key = buildSelect.value;
  const panel = document.getElementById("buildDetails");
  if (!key || key === "none") {
    if (panel) panel.style.display = "none";
    return;
  }
  const build = BUILDS[key];
  if (!build) return;
  if (build.luck != null) luckInput.value = build.luck;
  if (build.locationKeyword) {
    const options = Array.from(locationSelect.options);
    const match = options.find(opt => opt.textContent.toLowerCase().includes(build.locationKeyword.toLowerCase()));
    if (match) locationSelect.value = match.value;
  }
  showBuildDetails(build);
  if (panel) panel.style.display = "block";
  if (typeof computeAll === "function") computeAll();
}

function extractEquipName(str){
  let name = str.replace(/[\dx/]+\s*/, "").trim();
  name = name.split('(')[0].split('mutation:')[0].split('†')[0].split('|')[0].trim();
  return name;
}

function computeBuildBoosts(build){
  const boosts = {};
  const equipData = window.CRAFTING_DATA;
  if (!equipData || !equipData.equipment) return boosts;
  function addStats(itemName, qty){
    const item = equipData.equipment.find(e => e.name === itemName);
    if (!item || !item.stats || !item.stats.base) return;
    const stats = item.stats.base;
    for (const [key, val] of Object.entries(stats)) {
      let num = 0;
      if (typeof val === "object" && val !== null){
        if ("min" in val && "max" in val) num = val.max;
        else if ("value" in val) num = val.value;
      } else if (typeof val === "number") num = val;
      boosts[key] = (boosts[key] || 0) + num * qty;
    }
  }
  if (build.equipment.charm) addStats(extractEquipName(build.equipment.charm), 1);
  if (build.equipment.neck) addStats(extractEquipName(build.equipment.neck), 1);
  if (build.equipment.rings) build.equipment.rings.forEach(r => {
    const name = extractEquipName(r);
    const qtyMatch = r.match(/(\d+)\s*x/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    addStats(name, qty);
  });
  return boosts;
}

function showBuildDetails(build){
  const panel = document.getElementById("buildDetails");
  if (!panel) return;
  let html = `<h3>${build.name} Build</h3>`;
  const boosts = computeBuildBoosts(build);
  if (Object.keys(boosts).length) {
    html += '<div class="buildBlock"><h4>Boost Summary</h4><div class="statsGrid">';
    for (const [key, val] of Object.entries(boosts)) {
      const display = (Math.round(val * 10) / 10);
      html += `<div class="statItem"><div class="statLabel">${key.replace(/_/g, " ")}</div><div class="statValue stat-${key}">${display}</div></div>`;
    }
    html += '</div></div>';
  }
  if (build.equipment) {
    html += '<div class="buildBlock"><h4>Equipment</h4><ul>';
    if (build.equipment.charm) {
      const raw = build.equipment.charm;
      const charmName = extractEquipName(raw);
      html += `<li><strong>Charm:</strong> <a href="#" class="buildEquipLink" data-equip="${charmName}">${raw}</a></li>`;
    }
    if (build.equipment.neck) {
      const raw = build.equipment.neck;
      const neckName = extractEquipName(raw);
      html += `<li><strong>Neck:</strong> <a href="#" class="buildEquipLink" data-equip="${neckName}">${raw}</a></li>`;
    }
    if (build.equipment.rings) {
      const ringItems = build.equipment.rings.map(r => {
        const name = extractEquipName(r);
        return `<a href="#" class="buildEquipLink" data-equip="${name}">${r}</a>`;
      }).join(", ");
      html += `<li><strong>Rings:</strong> ${ringItems}</li>`;
    }
    if (build.equipment.notes) build.equipment.notes.forEach(note => { html += `<li><em>${note}</em></li>`; });
    html += '</ul></div>';
  }
  const luckVal = Number(document.getElementById("luckInput")?.value) || build.luck || 0;
  const digC = Number(document.getElementById("capacityInput")?.value) || 1;
  const strategy = generateDigStrategy(build, luckVal, digC);
  if (strategy && strategy.length) {
    html += '<div class="buildBlock"><h4 style="display:flex; justify-content:space-between; align-items:center;">Optimal Dig Strategy <button id="copyStrategyBtn" style="font-size:0.6rem; padding:3px 8px; background:var(--cyan); color:var(--bg); border:none; border-radius:4px; cursor:pointer;">Copy</button></h4><p style="font-size:0.72rem;color:var(--text-dim);margin:4px 0 8px;">With your luck ' + luckVal + ' + dig strength ' + digC + ' (sorted by priority):</p><ul>';
    strategy.forEach(s => {
      const usageText = s.usageCount > 1 ? ` (used in ${s.usageCount} items)` : '';
      if (s.location) {
        if (s.digs === Infinity) {
          html += `<li><strong>${s.amount}× ${s.material}</strong>${usageText} → ${s.location} (${s.chance}% base, impossible with current stats)</li>`;
        } else {
          html += `<li><strong>${s.amount}× ${s.material}</strong>${usageText} → ${s.location} (${s.chance}% base, ${s.chancePerAttempt}% w/ your stats, ~${s.digs} digs, ~${s.timeMin} min)</li>`;
        }
      } else {
        html += `<li><strong>${s.amount}× ${s.material}</strong>${usageText} → location unknown</li>`;
      }
    });
    html += '</ul></div>';
  }
  const multiLocs = findMultiMaterialLocations(build);
  if (multiLocs && multiLocs.length) {
    html += '<div class="buildBlock"><h4>Multi-Material Locations</h4><p style="font-size:0.72rem;color:var(--text-dim);margin:4px 0 8px;">Farm multiple materials at once:</p><ul>';
    multiLocs.slice(0, 5).forEach(loc => {
      const matList = loc.materials.map(m => m.name + ' (' + m.chance + '%)').join(', ');
      html += `<li><strong>${loc.location}</strong> (${loc.count} materials: ${matList})</li>`;
    });
    html += '</ul></div>';
  }
  if (build.runes && build.runes.length) html += '<div class="buildBlock"><h4>Runes</h4><p>' + build.runes.join(", ") + '</p></div>';
  if (build.pan) html += `<div class="buildBlock"><h4>Pan</h4><p>${build.pan.name} (${build.pan.enchant} Enchant)</p></div>`;
  if (build.shovel) html += `<div class="buildBlock"><h4>Shovel</h4><p>${build.shovel.name} (${build.shovel.enchant} Enchant)</p></div>`;
  panel.innerHTML = html;
  panel.style.display = "block";
  panel.querySelectorAll(".buildEquipLink").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const equipName = link.dataset.equip;
      const equipSelect = document.getElementById("equipSelect");
      if (equipSelect) {
        const equipSearch = document.getElementById("equipSearch");
        const equipRarityFilter = document.getElementById("equipRarityFilter");
        if (equipSearch) equipSearch.value = "";
        if (equipRarityFilter) equipRarityFilter.value = "all";
        if (typeof applyEquipmentFilters === "function") applyEquipmentFilters();
        setTimeout(() => {
          equipSelect.value = equipName;
          equipSelect.dispatchEvent(new Event("change"));
          const equipSection = document.querySelector(".toolsSection");
          if (equipSection) equipSection.scrollIntoView({ behavior: "smooth" });
        }, 50);
      }
    });
  });
  }

// Copy Strategy to Clipboard
document.addEventListener("click", (e) => {
  if (e.target.id === "copyStrategyBtn") {
    const panel = document.getElementById("buildDetails");
    if (!panel) return;
    const buildSelect = document.getElementById("buildSelect");
    const buildKey = buildSelect?.value;
    const build = BUILDS[buildKey];
    if (!build) return;
    const luckVal = Number(document.getElementById("luckInput")?.value) || 0;
    const digC = Number(document.getElementById("capacityInput")?.value) || 1;
    const strategy = generateDigStrategy(build, luckVal, digC);
    let text = `${build.name} - Dig Strategy (Luck: ${luckVal}, Strength: ${digC})\n`;
    strategy.forEach(s => {
      if (s.location) {
        if (s.digs === Infinity) {
          text += `• ${s.amount}× ${s.material} → ${s.location} (${s.chance}% base, impossible)\n`;
        } else {
          text += `• ${s.amount}× ${s.material} → ${s.location} (${s.chance}% base, ${s.chancePerAttempt}% w/ stats, ~${s.digs} digs, ~${s.timeMin} min)\n`;
        }
      } else {
        text += `• ${s.amount}× ${s.material} → location unknown\n`;
      }
    });
    navigator.clipboard.writeText(text).then(() => {
      const btn = e.target;
      btn.textContent = "Copied!";
      btn.style.background = "var(--green)";
      setTimeout(() => { btn.textContent = "Copy"; btn.style.background = "var(--cyan)"; }, 2000);
    });
  }
});


function calculateBuildMaterials(build) {
  if (!build || !build.equipment || !window.CRAFTING_DATA) return { materials: {}, usage: {} };
  const materials = {};
  const usage = {};
  const equip = build.equipment;
  const allEquip = [
    equip.charm,
    equip.neck,
    ...(equip.rings || [])
  ].filter(Boolean);
  allEquip.forEach(raw => {
    const name = extractEquipName(raw);
    const item = window.CRAFTING_DATA.equipment.find(e => e.name === name);
    if (item && item.crafting && item.crafting.materials) {
      item.crafting.materials.forEach(m => {
        const amt = m.amount || 1;
        materials[m.item] = (materials[m.item] || 0) + amt;
        if (!usage[m.item]) usage[m.item] = [];
        if (!usage[m.item].includes(name)) usage[m.item].push(name);
      });
    }
  });
  return { materials, usage };
}

function findBestLocationForMaterial(mineralName) {
  if (!window.MINERALS_DATA) return null;
  const mineral = window.MINERALS_DATA.minerals.find(m => m.mineral === mineralName);
  if (!mineral || !mineral.locations || !mineral.locations.length) return null;
  let best = null;
  let bestChance = 0;
  mineral.locations.forEach(loc => {
    if (loc.chance_percent > bestChance) {
      bestChance = loc.chance_percent;
      best = loc;
    }
  });
  return best;
}

function generateDigStrategy(build, currentLuck, digStrength) {
  const { materials, usage } = calculateBuildMaterials(build);
  const strategy = [];
  const C = digStrength || 1;
  const rollsPerAttempt = currentLuck * Math.sqrt(C);
  Object.entries(materials).forEach(([mat, amount]) => {
    const locInfo = findBestLocationForMaterial(mat);
    if (!locInfo) {
      strategy.push({ material: mat, amount, location: null, digs: null, timeMin: null, priority: 0 });
      return;
    }
    const baseChance = locInfo.chance_percent / 100;
    const chancePerAttempt = 1 - Math.pow(1 - baseChance, rollsPerAttempt);
    if (chancePerAttempt <= 0) {
      strategy.push({ material: mat, amount, location: locInfo.location, chance: locInfo.chance_percent, digs: Infinity, timeMin: Infinity, usageCount: (usage[mat] || []).length, priority: 0 });
      return;
    }
    const expectedDigs = Math.ceil(amount / chancePerAttempt);
    const digsPerSec = 2;
    const timeSec = expectedDigs / digsPerSec;
    const timeMin = Math.ceil(timeSec / 60);
    const usageCount = (usage[mat] || []).length;
    const priority = timeMin / Math.max(1, usageCount);
    strategy.push({
      material: mat,
      amount,
      location: locInfo.location,
      chance: locInfo.chance_percent,
      chancePerAttempt: (chancePerAttempt * 100).toFixed(4),
      digs: expectedDigs,
      timeMin,
      usageCount,
      priority
    });
  });
  strategy.sort((a, b) => b.priority - a.priority);
  return strategy;
}

function findMultiMaterialLocations(build) {
  if (!window.MINERALS_DATA) return [];
  const { materials } = calculateBuildMaterials(build);
  const materialNames = Object.keys(materials);
  const locationMap = {};
  materialNames.forEach(mat => {
    const mineral = window.MINERALS_DATA.minerals.find(m => m.mineral === mat);
    if (!mineral || !mineral.locations) return;
    mineral.locations.forEach(loc => {
      if (!locationMap[loc.location]) locationMap[loc.location] = { materials: [], totalChance: 0 };
      locationMap[loc.location].materials.push({ name: mat, chance: loc.chance_percent });
      locationMap[loc.location].totalChance += loc.chance_percent;
    });
  });
  const results = Object.entries(locationMap)
    .filter(([loc, data]) => data.materials.length > 1)
    .map(([loc, data]) => ({
      location: loc,
      materials: data.materials.sort((a, b) => b.chance - a.chance),
      count: data.materials.length,
      score: data.totalChance * data.materials.length
    }))
    .sort((a, b) => b.score - a.score);
  return results;
}

if (buildSelect) buildSelect.addEventListener("change", applyBuild);

// Animated counters
function animateValue(el, start, end, duration, decimalPlaces) {
  if (!el) return;
  const startTime = performance.now();
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (end - start) * ease;
    el.textContent = decimalPlaces !== undefined ? current.toFixed(decimalPlaces) : Math.round(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// Override computeAll to add animations
const _origComputeAll = typeof computeAll !== 'undefined' ? computeAll : null;
// We'll patch the display updates directly in the metric elements
