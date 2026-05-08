let minerals = [];
let filtered = [];
let allLocationNames = new Set();
window.mineralSelect   = document.getElementById("mineralSelect");
window.mineralSearch   = document.getElementById("mineralSearch");
window.rarityFilter    = document.getElementById("rarityFilter");
window.locationSelect  = document.getElementById("locationSelect");
window.locationFilter  = document.getElementById("locationFilter");
window.luckInput       = document.getElementById("luckInput");
window.capacityInput   = document.getElementById("capacityInput");
window.farmTargetInput = document.getElementById("farmTarget");
window.targetChanceInput = document.getElementById("targetChance");
window.buildSelect     = document.getElementById("buildSelect");


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

  if (!isFinite(p) || p <= 0) return "8";

  return Math.round(1 / p).toLocaleString();

}



function attemptsForTarget(pAttempt, target) {

  if (!isFinite(pAttempt) || pAttempt <= 0) return Infinity;

  if (pAttempt >= 1) return 1;

  return Math.log(1 - target) / Math.log(1 - pAttempt);

}



function fmtDuration(seconds) {

  if (!isFinite(seconds) || seconds < 0) return "-";

  if (seconds === Infinity) return "8";



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

   (5 x odds) � ((1.5 x luck x vcapacity) � cycle time)



   Since odds = 1 / baseProb:

   pans99 = 5 x odds = 5 / baseProb

   time99 = (5 x odds x cycleTime) / (1.5 x luck x vcapacity)

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

      `Rolls/pan: ${rollsPerAttempt.toFixed(2)} � Shake ${shakeSpeed}% ? ${r.toFixed(2)}/s � s=${s.toFixed(2)} � ${cycleFormulaText} � Time: ${isFinite(cycleSeconds) ? cycleSeconds.toFixed(2) + "s" : "8"} � ${isFinite(pansPerMinute) ? pansPerMinute.toFixed(1) + " pans/min" : "-"}`;

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

      `Expected finds/attempt � 99% pans: ${isFinite(pans99) ? pans99.toFixed(1) : "8"}`;

  }



  const atLeastOneCell = document.getElementById("atLeastOneCell");

  if (atLeastOneCell) atLeastOneCell.textContent = fmtPct(pAttempt, 2);



  const atLeastSub = document.getElementById("atLeastSub");

  if (atLeastSub) {

    atLeastSub.textContent =

      `Chance of =1 in one attempt � 99% time: ${fmtDuration(time99)}`;

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



  if (farmAttemptsEl) farmAttemptsEl.textContent = isFinite(attemptsNeeded) ? Math.ceil(attemptsNeeded).toLocaleString() : "8";

  if (farmAttemptsSub) farmAttemptsSub.textContent = `For ${targetCount} ${m.mineral}`;

  if (farmTimeEl) farmTimeEl.textContent = fmtDuration(farmTimeSec);

  if (farmTimeSub) farmTimeSub.textContent = `At ${isFinite(pansPerMinute) ? pansPerMinute.toFixed(1) : "0"} pans/min`;

  if (farmValueEl) farmValueEl.textContent = isFinite(totalValue) ? fmtMoney(totalValue) : "-";

  if (farmValueSub) farmValueSub.textContent = `~${avgSizePerFind.toFixed(1)}kg avg � ${fmtMoney(valuePerPerKg(valuePerKg))}/kg`;



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
      <td>${isFinite(rRow.a50) ? rRow.a50.toFixed(2) : "8"}</td>
      <td>${isFinite(rRow.a90) ? rRow.a90.toFixed(2) : "8"}</td>
      <td>${isFinite(rRow.a99) ? rRow.a99.toFixed(2) : "8"}</td>
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

      notes: ["? Replace 1 with Dredge Master's Ring", "? Replace 1 with Purifying Ring for Fungal Marsh"]

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

      notes: ["? Replace 1 with Dredge Master's Ring", "? Replace 1 with Purifying Ring for Fungal Marsh (6 rings)"]

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

      notes: ["? Replace 1 with Purifying Ring for Fungal Marsh", "? Replace 1 with Dredge Master's Ring (no-RoC)", "� Use Abyssal Shovel for 6 rings no-RoC"]

    },

    runes: ["Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber", "Speed I"],

    pan: { name: "Blightflow", enchant: "Cosmic" },

    shovel: { name: "Venomspade (or Abyssal)", enchant: "Rhythmic" }

  },

  "sizeBoostIII": {

    name: "Size Boost III.",

    locationKeyword: "swamp",

    equipment: {

      charm: "Pumpkin Lord� (fallback: Helm of the Round)",

      neck: "Frostthorn Pendant",

      rings: ["1x Ring of Champions", "1x Dredge Master's Ring", "6x/4x Ring of Thorns"],

      notes: ["mutation: Festive; fallback: Prismatic", "? Replace 1 with Purifying Ring for Fungal Marsh"]

    },

    runes: ["Summit Seeker", "Mountain Climber", "Speed I", "Sunblessed/Abyssal", "Volcanic/Solitude"],

    pan: { name: "Blightflow (or Galactic�)", enchant: "Cosmic" },

    shovel: { name: "Candy Cane� (or Venomspade)", enchant: "Non-Euclidean" }

  },

  "luckEfficiencyIVB": {

    name: "Luck Efficiency IV.B (w/ Ascended)",

    locationKeyword: "meteor",

    equipment: {

      charm: "Starlight Wings",

      neck: "Venomshank",

      rings: ["Ring of Champions", "Ring of the Stars", "Accretion Disk", "4x/3x Umbrite Ring", "1x/0x Vortex Ring"],

      notes: ["? Replace 1 with Purifying Ring for Fungal Marsh"]

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

      notes: ["? Replace 1 with Purifying Ring for Fungal Marsh"]

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

      notes: ["? Replace 1 with Purifying Ring for Fungal Marsh", "fallback: Otherworldly Ring"]

    },

    runes: ["Solitude", "Sunblessed/Abyssal", "Summit Seeker", "Mountain Climber", "Speed I"],

    pan: { name: "Nebula", enchant: "Cosmic" },

    shovel: { name: "Starcrusher", enchant: "Rhythmic" }

  },

  "sizeBoostIV": {

    name: "Size Boost IV.",

    locationKeyword: "meteor",

    equipment: {

      charm: "Clockwork (fallback: Pumpkin Lord�)",

      neck: "Meteor Core",

      rings: ["Ring of Champions", "Ring of the Stars", "Dredge Master's Ring", "5x/3x Ring of Thorns"],

      notes: ["mutation: Festive; fallback: Prismatic", "? Replace 1 with Purifying Ring for Fungal Marsh"]

    },

    runes: ["Mountain Climber", "Summit Seeker", "Speed I", "Sunblessed/Abyssal", "Volcanic/Solitude"],

    pan: { name: "Nebula (or Galactic�)", enchant: "Cosmic" },

    shovel: { name: "Candy Cane� (or Starcrusher)", enchant: "Non-Euclidean" }

  },

  "moneyPrinter": {

    name: "Money Printer",

    locationKeyword: "meteor",

    equipment: {

      charm: "Clockwork (fallback: Royal Federation Crown)",

      neck: "Santa's Bag� (fallback: Venomshank)",

      rings: ["Ring of Champions", "4x/2x Otherworldly Ring", "2x Apocalypse Bringer", "1x Umbrite Ring"],

      notes: ["fallback: Royal Federation Crown", "fallback: Venomshank", "fallback: Umbrite Ring | Otherworldly Ring", "fallback: Mythril Ring"]

    },

    runes: ["Summit Seeker", "Mountain Climber", "Speed I", "Solitude", "Abyssal/Sunblessed"],

    pan: { name: "Galactic� (or Blightflow)", enchant: "Midas" },

    shovel: { name: "Candy Cane� (or Abyssal)", enchant: "Non-Euclidean" }

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

      notes: ["? Replace 1 with Dredge Master's Ring", "?Misfortune Rune for Common/Uncommon ores", "Excavating enchant optional"]

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

      notes: ["? For Fungal Marsh, replace one with Purifying Ring", "? Replace 1 with Dredge Master's Ring", "?Misfortune Rune for Common/Uncommon ores", "Excavating enchant optional"]

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

      notes: ["? If Mythril Rings don't have mutation, use Prismatic Moon Rings", "Higher stars/quality better, but 2 5-star rings > 1 6-star"]

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

      neck: "Amethyst Pendant | Spider Bowtie�",

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

      charm: "Antlers of Life | Witch Hat�",

      neck: "Frostthorn Pendant",

      rings: ["6x/4x Umbrite/Vortex Ring", "2x Mythril Ring?", "2x Apocalypse Bringer"],

      notes: ["? If Mythril Rings don't have mutation, use Prismatic Moon Rings", "All Mythic equipment should be Diamond mutation or better"]

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

      rings: ["4x Ring of Thorns", "2x/1x Apocalypse Bringer", "2x/1x Mythril Ring?"],

      notes: ["? If Mythril Rings don't have mutation, use Prismatic Moon Rings", "After reaching Swamp, replace Apocalypse Bringers with Purifying Ring"]

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

  name = name.split('(')[0].split('mutation:')[0].split('�')[0].split('|')[0].trim();

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
          html += `<li><strong>${s.amount}� ${s.material}</strong>${usageText} ? ${s.location} (${s.chance}% base, impossible with current stats)</li>`;
        } else {
          html += `<li><strong>${s.amount}� ${s.material}</strong>${usageText} ? ${s.location} (${s.chance}% base, ${s.chancePerAttempt}% w/ your stats, ~${s.digs} digs, ~${s.timeMin} min)</li>`;
        }
      } else {
        html += `<li><strong>${s.amount}� ${s.material}</strong>${usageText} ? location unknown</li>`;
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
          text += `� ${s.amount}� ${s.material} ? ${s.location} (${s.chance}% base, impossible)\n`;
        } else {
          text += `� ${s.amount}� ${s.material} ? ${s.location} (${s.chance}% base, ${s.chancePerAttempt}% w/ stats, ~${s.digs} digs, ~${s.timeMin} min)\n`;
        }
      } else {
        text += `� ${s.amount}� ${s.material} ? location unknown\n`;
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
// Toast notification system
function showToast(message, type) {
  var container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  var toast = document.createElement('div');
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(function() {
    toast.classList.add('out');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2200);
}

// Previous stat values for animation
var _prevBuildStats = { luck: 0, capacity: 0, digStrength: 0, digSpeed: 0 };

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
  
  // Equipment Build Builder System
  window.BuildBuilder = {
    slots: {
      neck: { name: null, mutation: 'None', star: 1 },
      charm: { name: null, mutation: 'None', star: 1 },
      rings: [{ name: null, mutation: 'None', star: 1 }, { name: null, mutation: 'None', star: 1 }],
      shovel: null
    },
    maxRings: 2,
    
    // Mutation data from wiki
    mutations: {
      'None': { multiplier: 1, bonus: {} },
      'Silver': { multiplier: 1.1, bonus: {} },
      'Gold': { multiplier: 1.2, bonus: {} },
      'Granite': { multiplier: 1.35, bonus: { digStrength: 24, shakeStrength: 6 } },
      'Overclocked': { multiplier: 1.35, bonus: { digSpeed: 0.1, shakeSpeed: 0.1 } },
      'Festive': { multiplier: 1.4, bonus: { luck: 50, sizeBoost: 0.1 } },
      'Prismatic': { multiplier: 1.6, bonus: {} }
    },
    
    // Load equipment data from crafting-data.js
    getEquipmentData: function() {
      if (typeof CRAFTING_DATA !== 'undefined' && CRAFTING_DATA.equipment) {
        return CRAFTING_DATA.equipment;
      }
      return [];
    },
    
    // Get item by name from equipment data
    getItem: function(itemName) {
      if (!itemName) return null;
      const equipment = this.getEquipmentData();
      return equipment.find(item => item.name === itemName) || null;
    },
    
    // Get stat value from item (handles base/star6 structure)
    getStat: function(item, statName) {
      if (!item || !item.stats) return 0;
      const stats = item.stats.base || item.stats;
      if (stats[statName]) {
        const stat = stats[statName];
        return (stat.min + stat.max) / 2; // Average
      }
      return 0;
    },
    
    // Apply mutation modifier to stats
    applyMutation: function(stats, mutation) {
      const mutationData = this.mutations[mutation];
      if (!mutationData) return stats;
      
      // Apply multiplier
      const result = {
        luck: stats.luck * mutationData.multiplier,
        capacity: stats.capacity * mutationData.multiplier,
        digStrength: (stats.digStrength || 0) * mutationData.multiplier,
        digSpeed: (stats.digSpeed || 0) * mutationData.multiplier
      };
      
      // Apply additive bonuses
      if (mutationData.bonus.luck) result.luck += mutationData.bonus.luck;
      if (mutationData.bonus.digStrength) result.digStrength += mutationData.bonus.digStrength;
      if (mutationData.bonus.shakeStrength) result.shakeStrength = (result.shakeStrength || 0) + mutationData.bonus.shakeStrength;
      if (mutationData.bonus.digSpeed) result.digSpeed += mutationData.bonus.digSpeed;
      if (mutationData.bonus.shakeSpeed) result.shakeSpeed = (result.shakeSpeed || 0) + mutationData.bonus.shakeSpeed;
      if (mutationData.bonus.sizeBoost) result.sizeBoost = (result.sizeBoost || 0) + mutationData.bonus.sizeBoost;
      
      return result;
    },
    
    // Calculate total stats from current build (with mutations)
    calculateTotalStats: function() {
      const equipment = this.getEquipmentData();
      let total = { luck: 0, capacity: 0, digStrength: 0, digSpeed: 0 };
      
      // Helper to add item stats with mutation
      const addItemStats = (itemName, mutation) => {
        if (!itemName) return;
        const item = this.getItem(itemName);
        if (!item) return;
        
        const baseStats = {
          luck: this.getStat(item, 'luck'),
          capacity: this.getStat(item, 'capacity'),
          digStrength: this.getStat(item, 'dig_strength'),
          digSpeed: this.getStat(item, 'dig_speed')
        };
        
        const mutated = this.applyMutation(baseStats, mutation);
        total.luck += mutated.luck;
        total.capacity += mutated.capacity;
        total.digStrength += mutated.digStrength;
        total.digSpeed += mutated.digSpeed;
      };
      
      // Check neck with mutation
      addItemStats(this.slots.neck.name, this.slots.neck.mutation);
      
      // Check charm with mutation
      addItemStats(this.slots.charm.name, this.slots.charm.mutation);
      
      // Check rings with mutations
      this.slots.rings.forEach(ring => {
        if (ring.name) addItemStats(ring.name, ring.mutation);
      });
      
      return total;
    },
    
    // Get stat value from item (handles base/star6 structure)
    getStat: function(item, statName) {
      if (!item || !item.stats) return 0;
      const stats = item.stats.base || item.stats;
      if (stats[statName]) {
        const stat = stats[statName];
        return (stat.min + stat.max) / 2; // Average
      }
      return 0;
    },
    
    // Calculate total stats from current build (with mutations applied)
    calculateTotalStats: function() {
      let total = { luck: 0, capacity: 0, digStrength: 0, digSpeed: 0 };
      
      // Helper to add item stats with mutation
      const addItemStats = (itemName, mutation) => {
        if (!itemName) return;
        const item = this.getItem(itemName);
        if (!item) return;
        
        const baseStats = {
          luck: this.getStat(item, 'luck'),
          capacity: this.getStat(item, 'capacity'),
          digStrength: this.getStat(item, 'dig_strength'),
          digSpeed: this.getStat(item, 'dig_speed')
        };
        
        const mutated = this.applyMutation(baseStats, mutation || 'None');
        total.luck += mutated.luck;
        total.capacity += mutated.capacity;
        total.digStrength += mutated.digStrength;
        total.digSpeed += mutated.digSpeed;
      };
      
      // Neck with mutation
      if (this.slots.neck && this.slots.neck.name) {
        addItemStats(this.slots.neck.name, this.slots.neck.mutation);
      }
      
      // Charm with mutation
      if (this.slots.charm && this.slots.charm.name) {
        addItemStats(this.slots.charm.name, this.slots.charm.mutation);
      }
      
      // Rings with mutations
      this.slots.rings.forEach(ring => {
        if (ring && ring.name) addItemStats(ring.name, ring.mutation);
      });
      
      return total;
    },
    
    // Get detailed breakdown of each slot
    getBuildBreakdown: function() {
      const breakdown = [];
      
      if (this.slots.neck && this.slots.neck.name) {
        const item = this.getItem(this.slots.neck.name);
        if (item) breakdown.push({ slot: 'Necklace', item: item, mutation: this.slots.neck.mutation });
      }
      
      if (this.slots.charm && this.slots.charm.name) {
        const item = this.getItem(this.slots.charm.name);
        if (item) breakdown.push({ slot: 'Charm', item: item, mutation: this.slots.charm.mutation });
      }
      
      this.slots.rings.forEach((ring, i) => {
        if (ring && ring.name) {
          const item = this.getItem(ring.name);
          if (item) breakdown.push({ slot: 'Ring ' + (i+1), item: item, mutation: ring.mutation });
        }
      });
      
      return breakdown;
    },
    
    // Apply build to calculator (use mutated stats)
    applyToCalculator: function() {
      const stats = this.calculateTotalStats(); // Uses mutated stats now
      if (window.luckInput) window.luckInput.value = Math.round(stats.luck);
      if (window.capacityInput) window.capacityInput.value = Math.round(stats.capacity);
      
      // Trigger recalculation
      if (typeof computeAll === 'function') computeAll();
      
      return stats;
    },
    
    // Generate build code (base64 encoded JSON)
    generateCode: function() {
      const build = {
        n: this.slots.neck && this.slots.neck.name ? { name: this.slots.neck.name, m: this.slots.neck.mutation } : null,
        c: this.slots.charm && this.slots.charm.name ? { name: this.slots.charm.name, m: this.slots.charm.mutation } : null,
        r: this.slots.rings.filter(r => r && r.name).map(r => ({ name: r.name, m: r.mutation }))
      };
      return btoa(unescape(encodeURIComponent(JSON.stringify(build)))).replace(/=/g, '');
    },
    
    // Load build from code
    loadFromCode: function(code) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(code))));
        // Handle neck
        if (decoded.n && decoded.n.name) {
          this.slots.neck = { name: decoded.n.name, mutation: decoded.n.m || 'None' };
        } else {
          this.slots.neck = { name: null, mutation: 'None' };
        }
        // Handle charm
        if (decoded.c && decoded.c.name) {
          this.slots.charm = { name: decoded.c.name, mutation: decoded.c.m || 'None' };
        } else {
          this.slots.charm = { name: null, mutation: 'None' };
        }
        // Handle rings - set maxRings based on loaded data
        this.slots.rings = [];
        if (decoded.r && decoded.r.length) {
          decoded.r.forEach(r => {
            if (r && r.name) {
              this.slots.rings.push({ name: r.name, mutation: r.m || 'None' });
            }
          });
        }
        // Auto-set maxRings to at least the number of rings loaded (minimum 2)
        this.maxRings = Math.max(2, this.slots.rings.length);
        // Pad rings array to maxRings
        while (this.slots.rings.length < this.maxRings) {
          this.slots.rings.push({ name: null, mutation: 'None' });
        }
        return true;
      } catch(e) {
        console.error('Invalid build code:', e);
        return false;
      }
    },
    
    // Save build to localStorage
    saveBuild: function(name) {
      const builds = JSON.parse(localStorage.getItem('equipmentBuilds') || '{}');
      builds[name] = {
        slots: this.slots,
        date: new Date().toISOString()
      };
      localStorage.setItem('equipmentBuilds', JSON.stringify(builds));
      return true;
    },
    
    // Load build from localStorage
    loadBuild: function(name) {
      const builds = JSON.parse(localStorage.getItem('equipmentBuilds') || '{}');
      if (builds[name]) {
        this.slots = JSON.parse(JSON.stringify(builds[name].slots));
        return true;
      }
      return false;
    }
  };
  
    // Build Builder UI
    (function() {
      // Mutation options HTML
      const mutationOptions = ['None', 'Silver', 'Gold', 'Granite', 'Overclocked', 'Festive', 'Prismatic']
        .map(m => '<option value="' + m + '">' + m + '</option>')
        .join('');

      // Rarity colors
      const rarityColors = {
        'common': '#b0b0b0',
        'uncommon': '#1eff00',
        'rare': '#0070dd',
        'epic': '#a335ee',
        'legendary': '#ff8000',
        'mythic': '#ff0000',
        'exotic': '#e6cc80',
        'ascended': '#e6cc80'
      };

      // Create build builder section with compact UI
      const builderHTML = `
        <div id="buildBuilder" class="card">
          <h3 style="display:flex; align-items:center; gap:8px; font-size:1rem; margin-bottom:8px;">
            <span style="font-size:1.1em;">?</span> Build Builder
          </h3>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;" id="equipmentGrid">
            <!-- Necklace Slot -->
            <div class="equip-slot" id="neckSlot" style="background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:8px;">
              <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-mid); margin-bottom:4px;">Necklace</div>
              <select class="equip-select" data-slot="neck" style="width:100%; padding:4px 6px; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.8rem; margin-bottom:4px;">
                <option value="">+ Add Necklace</option>
              </select>
              <div class="mutation-container" style="display:none;">
                <select class="mutation-select" data-slot="neck" style="width:100%; padding:4px 6px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; font-size:0.75rem; color:var(--cyan);">
                  ${mutationOptions}
                </select>
              </div>
              <div class="equip-stats" style="font-size:0.7rem; color:var(--text); margin-top:4px;"></div>
            </div>

            <!-- Charm Slot -->
            <div class="equip-slot" id="charmSlot" style="background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:8px;">
              <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-mid); margin-bottom:4px;">Charm</div>
              <select class="equip-select" data-slot="charm" style="width:100%; padding:4px 6px; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.8rem; margin-bottom:4px;">
                <option value="">+ Add Charm</option>
              </select>
              <div class="mutation-container" style="display:none;">
                <select class="mutation-select" data-slot="charm" style="width:100%; padding:4px 6px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; font-size:0.75rem; color:var(--cyan);">
                  ${mutationOptions}
                </select>
              </div>
              <div class="equip-stats" style="font-size:0.7rem; color:var(--text); margin-top:4px;"></div>
            </div>
          </div>

          <!-- Rings Section -->
          <div style="margin-top:8px;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
              <div style="font-size:0.7rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-mid);">Rings <span id="ringCount">0</span>/<span id="maxRingsDisplay">2</span></div>
              <select id="ringCountSelector" style="margin-left:auto; padding:2px 6px; background:var(--bg-input); border:1px solid var(--border); border-radius:4px; color:var(--text); font-size:0.7rem;">
                <option value="2" selected>2 Rings</option>
                <option value="4">4 Rings</option>
                <option value="6">6 Rings</option>
                <option value="8">8 Rings</option>
              </select>
            </div>
            <div id="ringsContainer" style="display:grid; grid-template-columns:1fr 1fr; gap:8px;"></div>
          </div>

          <!-- Stats Summary -->
          <div id="buildStats" style="background:var(--bg-card); border-radius:8px; border:1px solid var(--border);">
            <div style="font-weight:600; margin-bottom:6px; font-size:0.85rem;">Total Stats (with Mutations):</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.8rem;">
              <div class="stat-bar-wrapper"><span>Luck: <span id="totalLuck" style="color:var(--cyan); font-weight:600;">0</span></span><div class="stat-bar-track"><div class="stat-bar-fill cyan" id="barLuck" style="width:0%"></div></div></div>
              <div class="stat-bar-wrapper"><span>Capacity: <span id="totalCapacity" style="color:var(--green); font-weight:600;">0</span></span><div class="stat-bar-track"><div class="stat-bar-fill green" id="barCapacity" style="width:0%"></div></div></div>
              <div class="stat-bar-wrapper"><span>Dig Strength: <span id="totalDigStrength" style="color:var(--pink); font-weight:600;">0</span></span><div class="stat-bar-track"><div class="stat-bar-fill pink" id="barDigStrength" style="width:0%"></div></div></div>
              <div class="stat-bar-wrapper"><span>Dig Speed: <span id="totalDigSpeed" style="color:var(--purple); font-weight:600;">0</span></span><div class="stat-bar-track"><div class="stat-bar-fill purple" id="barDigSpeed" style="width:0%"></div></div></div>
            </div>
            <div id="mutationSummary" style="margin-top:6px; padding-top:6px; border-top:1px solid var(--border); font-size:0.75rem; color:var(--text-mid);"></div>
          </div>
          </div>
        
        <!-- Action Buttons -->
        <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
          <button id="genBuildCodeBtn" style="padding:6px 12px; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer; font-size:0.8rem;">Generate Code</button>
          <button id="loadBuildBtn" style="padding:6px 12px; background:var(--bg-card); color:var(--text); border:1px solid var(--border); border-radius:6px; cursor:pointer; font-size:0.8rem;">Load Code</button>
        </div>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <input id="loadBuildInput" type="text" placeholder="Paste build code..." style="flex:1; padding:6px 8px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.75rem;">
        </div>
        <div id="buildCodeOutput" style="width:100%; padding:8px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; font-size:0.75rem; color:var(--cyan); word-break:break-all; display:none; margin-top:6px;"></div>
      `;

      // Insert after tools section
      const toolsSection = document.querySelector('.toolsSection');
      if (toolsSection) {
        toolsSection.insertAdjacentHTML('afterend', builderHTML);
      }

      // Populate equipment selects
      function populateEquipment() {
        const equipment = window.BuildBuilder.getEquipmentData();
        const neckSelect = document.querySelector('[data-slot="neck"]');
        const charmSelect = document.querySelector('[data-slot="charm"]');

        if (!neckSelect || !charmSelect) return;

        // Filter by slot
        const necklaces = equipment.filter(e => e.slot === 'Necklace');
        const charms = equipment.filter(e => e.slot === 'Charm');
        const rings = equipment.filter(e => e.slot === 'Ring');

        // Populate neck
        necklaces.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.name;
          opt.textContent = item.name;
          opt.style.color = rarityColors[item.rarity] || '#fff';
          neckSelect.appendChild(opt);
        });

        // Populate charm
        charms.forEach(item => {
          const opt = document.createElement('option');
          opt.value = item.name;
          opt.textContent = item.name;
          opt.style.color = rarityColors[item.rarity] || '#fff';
          charmSelect.appendChild(opt);
        });

        // Store rings for later use
        window._ringsData = rings;
        updateRingsUI();
      }

      // Update rings UI
      function updateRingsUI() {
        const container = document.getElementById('ringsContainer');
        if (!container) return;

        container.innerHTML = '';
        const rings = window._ringsData || [];

        for (let i = 0; i < BuildBuilder.maxRings; i++) {
          const ring = BuildBuilder.slots.rings[i] || { name: '', mutation: 'None' };
          const div = document.createElement('div');
          const isEmpty = !ring.name;
          div.className = 'equip-slot stagger-in' + (isEmpty ? ' empty' : '');
          div.style.cssText = 'background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:10px;';
          div.style.animationDelay = '0ms';
          div.innerHTML = `
            <div style="font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-mid); margin-bottom:6px;">Ring ${i+1}</div>
            <select class="equip-select" data-slot="ring" data-index="${i}" style="width:100%; padding:6px 8px; background:var(--bg-card); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.85rem; margin-bottom:6px;">
              <option value="">+ Add Ring</option>
              ${rings.map(r => '<option value="' + r.name + '"' + (r.name === ring.name ? ' selected' : '') + ' style="color:' + (rarityColors[r.rarity] || '#fff') + '">' + r.name + '</option>').join('')}
            </select>
            <div class="mutation-container" style="display:${ring.name ? 'block' : 'none'};">
              <select class="mutation-select" data-slot="ring" data-index="${i}" style="width:100%; padding:4px 6px; background:var(--bg-card); border:1px solid var(--border); border-radius:4px; font-size:0.8rem; color:var(--cyan);">
                ${mutationOptions.replace('value="' + ring.mutation + '"', 'value="' + ring.mutation + '" selected')}
              </select>
            </div>
            <div class="equip-stats" style="font-size:0.75rem; color:var(--text-mid); margin-top:4px;"></div>
          `;
          container.appendChild(div);
        }

        // Update ring count
        const ringCount = document.getElementById('ringCount');
        if (ringCount) ringCount.textContent = BuildBuilder.slots.rings.filter(r => r.name).length;
      }

      // Update stats display
      function updateBuildStats() {
        const stats = BuildBuilder.calculateTotalStats();
        const luckEl = document.getElementById('totalLuck');
        const capEl = document.getElementById('totalCapacity');
        const dsEl = document.getElementById('totalDigStrength');
        const spEl = document.getElementById('totalDigSpeed');
        const statsDiv = document.getElementById('buildStats');
        const mutSummary = document.getElementById('mutationSummary');
        const barLuck = document.getElementById('barLuck');
        const barCap = document.getElementById('barCapacity');
        const barDS = document.getElementById('barDigStrength');
        const barSP = document.getElementById('barDigSpeed');

        // Animated number transitions
        if (luckEl) animateValue(luckEl, _prevBuildStats.luck, stats.luck, 400, 2);
        if (capEl) animateValue(capEl, _prevBuildStats.capacity, stats.capacity, 400, 2);
        if (dsEl) animateValue(dsEl, _prevBuildStats.digStrength, stats.digStrength, 400, 2);
        if (spEl) animateValue(spEl, _prevBuildStats.digSpeed, stats.digSpeed, 400, 2);

        // Update mini bars (relative to estimated maxes: luck 500, cap 500, ds 200, sp 50)
        if (barLuck) barLuck.style.width = Math.min(100, (stats.luck / 500) * 100) + '%';
        if (barCap) barCap.style.width = Math.min(100, (stats.capacity / 500) * 100) + '%';
        if (barDS) barDS.style.width = Math.min(100, (stats.digStrength / 200) * 100) + '%';
        if (barSP) barSP.style.width = Math.min(100, (stats.digSpeed / 50) * 100) + '%';

        // Store for next animation
        _prevBuildStats = { luck: stats.luck, capacity: stats.capacity, digStrength: stats.digStrength, digSpeed: stats.digSpeed };

        // Show mutation summary
        if (mutSummary) {
          const mutations = [];
          const neck = BuildBuilder.slots.neck || {};
          const charm = BuildBuilder.slots.charm || {};
          if (neck.name && neck.mutation && neck.mutation !== 'None') {
            const mutData = BuildBuilder.mutations[neck.mutation];
            if (mutData) mutations.push('Neck: ' + neck.mutation + ' (×' + mutData.multiplier + ')');
          }
          if (charm.name && charm.mutation && charm.mutation !== 'None') {
            const mutData = BuildBuilder.mutations[charm.mutation];
            if (mutData) mutations.push('Charm: ' + charm.mutation + ' (×' + mutData.multiplier + ')');
          }
          BuildBuilder.slots.rings.forEach((ring, i) => {
            if (ring && ring.name && ring.mutation && ring.mutation !== 'None') {
              const mutData = BuildBuilder.mutations[ring.mutation];
              if (mutData) mutations.push('Ring ' + (i+1) + ': ' + ring.mutation + ' (×' + mutData.multiplier + ')');
            }
          });
          mutSummary.innerHTML = mutations.length > 0 ? '<div style="font-weight:600; margin-bottom:4px;">Active Mutations:</div>' + mutations.join('<br>') : '';
        }

        if (statsDiv) {
          const hasEquipment = BuildBuilder.slots.neck.name || 
                              BuildBuilder.slots.charm.name || 
                              BuildBuilder.slots.rings.some(r => r && r.name);
          if (hasEquipment) {
            statsDiv.classList.add('visible');
          } else {
            statsDiv.classList.remove('visible');
          }
        }

        // Update individual slot stats
        updateSlotStats('neck');
        updateSlotStats('charm');
        for (let i = 0; i < BuildBuilder.maxRings; i++) {
          updateRingStats(i);
        }
      }

      // Update stats for a specific slot
      function updateSlotStats(slotName) {
        const slot = BuildBuilder.slots[slotName];
        if (!slot || !slot.name) {
          const statsEl = document.querySelector(`#${slotName}Slot .equip-stats`);
          if (statsEl) statsEl.innerHTML = '';
          return;
        }
        
        const item = BuildBuilder.getItem(slot.name);
        if (!item) return;

        const statsEl = document.querySelector(`#${slotName}Slot .equip-stats`);
        if (!statsEl) return;

        const luck = BuildBuilder.getStat(item, 'luck');
        const cap = BuildBuilder.getStat(item, 'capacity');
        const ds = BuildBuilder.getStat(item, 'dig_strength');
        const sp = BuildBuilder.getStat(item, 'dig_speed');

        const mutationData = BuildBuilder.mutations[slot.mutation] || { multiplier: 1, bonus: {} };
        const luckFinal = luck * mutationData.multiplier + (mutationData.bonus.luck || 0);
        const capFinal = cap * mutationData.multiplier;
        const dsFinal = ds * mutationData.multiplier + (mutationData.bonus.digStrength || 0);
        const spFinal = sp * mutationData.multiplier + (mutationData.bonus.digSpeed || 0);

        let html = '';
        if (luckFinal > 0) html += `<span style="color:var(--cyan);">Luck: ${luckFinal.toFixed(1)}</span> `;
        if (capFinal > 0) html += `<span style="color:var(--green);">Cap: ${capFinal.toFixed(1)}</span> `;
        if (dsFinal > 0) html += `<span style="color:var(--pink);">DS: ${dsFinal.toFixed(1)}</span> `;
        if (spFinal > 0) html += `<span style="color:var(--purple);">SP: ${spFinal.toFixed(1)}</span> `;
        
        if (slot.mutation !== 'None') {
          html += `<span style="color:var(--yellow); font-size:0.7rem; margin-left:4px;">${slot.mutation} (�${mutationData.multiplier})</span>`;
        }

        statsEl.innerHTML = html;
      }

      function updateRingStats(index) {
        const ring = BuildBuilder.slots.rings[index];
        if (!ring || !ring.name) {
          const container = document.getElementById('ringsContainer');
          if (container && container.children[index]) {
            const statsEl = container.children[index].querySelector('.equip-stats');
            if (statsEl) statsEl.innerHTML = '';
          }
          return;
        }

        const container = document.getElementById('ringsContainer');
        if (!container) return;
        
        const slotDiv = container.children[index];
        if (!slotDiv) return;

        const statsEl = slotDiv.querySelector('.equip-stats');
        if (!statsEl) return;

        const item = BuildBuilder.getItem(ring.name);
        if (!item) return;

        const luck = BuildBuilder.getStat(item, 'luck');
        const cap = BuildBuilder.getStat(item, 'capacity');
        const ds = BuildBuilder.getStat(item, 'dig_strength');
        const sp = BuildBuilder.getStat(item, 'dig_speed');

        const mutationData = BuildBuilder.mutations[ring.mutation] || { multiplier: 1, bonus: {} };
        const luckFinal = luck * mutationData.multiplier + (mutationData.bonus.luck || 0);
        const capFinal = cap * mutationData.multiplier;
        const dsFinal = ds * mutationData.multiplier + (mutationData.bonus.digStrength || 0);
        const spFinal = sp * mutationData.multiplier + (mutationData.bonus.digSpeed || 0);

        let html = '';
        if (luckFinal > 0) html += `<span style="color:var(--cyan);">Luck: ${luckFinal.toFixed(1)}</span> `;
        if (capFinal > 0) html += `<span style="color:var(--green);">Cap: ${capFinal.toFixed(1)}</span> `;
        if (dsFinal > 0) html += `<span style="color:var(--pink);">DS: ${dsFinal.toFixed(1)}</span> `;
        if (spFinal > 0) html += `<span style="color:var(--purple);">SP: ${spFinal.toFixed(1)}</span> `;
        
        if (ring.mutation !== 'None') {
          html += `<span style="color:var(--yellow); font-size:0.7rem; margin-left:4px;">${ring.mutation} (�${mutationData.multiplier})</span>`;
        }

        statsEl.innerHTML = html;
      }

      // Toggle empty class on equip slot
      function toggleEmptySlot(slotEl) {
        if (!slotEl) return;
        const select = slotEl.querySelector('.equip-select');
        if (!select) return;
        if (!select.value) {
          slotEl.classList.add('empty');
        } else {
          slotEl.classList.remove('empty');
        }
      }

      // Event listeners
      document.addEventListener('change', function(e) {
        const slot = e.target.dataset.slot;
        const index = e.target.dataset.index;

        if (e.target.classList.contains('equip-select')) {
          if (slot === 'neck') {
            BuildBuilder.slots.neck.name = e.target.value || null;
            BuildBuilder.slots.neck.mutation = 'None';
            const container = document.querySelector('#neckSlot .mutation-container');
            if (container) container.style.display = e.target.value ? 'block' : 'none';
            toggleEmptySlot(document.getElementById('neckSlot'));
            updateBuildStats();
          }
          if (slot === 'charm') {
            BuildBuilder.slots.charm.name = e.target.value || null;
            BuildBuilder.slots.charm.mutation = 'None';
            const container = document.querySelector('#charmSlot .mutation-container');
            if (container) container.style.display = e.target.value ? 'block' : 'none';
            toggleEmptySlot(document.getElementById('charmSlot'));
            updateBuildStats();
          }
          if (slot === 'ring' && index !== undefined) {
            BuildBuilder.slots.rings[index] = { name: e.target.value || null, mutation: 'None' };
            updateRingsUI();
            updateBuildStats();
          }
        }

        if (e.target.classList.contains('mutation-select')) {
          if (slot === 'neck') {
            BuildBuilder.slots.neck.mutation = e.target.value;
            updateBuildStats();
          }
          if (slot === 'charm') {
            BuildBuilder.slots.charm.mutation = e.target.value;
            updateBuildStats();
          }
          if (slot === 'ring' && index !== undefined) {
            if (!BuildBuilder.slots.rings[index]) BuildBuilder.slots.rings[index] = { name: '', mutation: 'None' };
            BuildBuilder.slots.rings[index].mutation = e.target.value;
            updateBuildStats();
          }
        }
      });
      
      // Initial empty state for neck/charm
      setTimeout(function() {
        toggleEmptySlot(document.getElementById('neckSlot'));
        toggleEmptySlot(document.getElementById('charmSlot'));
      }, 600);

      // Generate code button
      document.addEventListener('click', function(e) {
        if (e.target.id === 'genBuildCodeBtn') {
          const code = BuildBuilder.generateCode();
          const output = document.getElementById('buildCodeOutput');
          if (output) {
            output.textContent = code;
            output.style.display = 'block';
            navigator.clipboard.writeText(code).then(function() {
              showToast('Build code copied!', 'success');
            });
          }
          // Flash effect on button
          e.target.style.background = 'var(--green)';
          e.target.style.color = 'var(--bg)';
          setTimeout(function() {
            e.target.style.background = '';
            e.target.style.color = '';
          }, 400);
          // Update URL hash for easy sharing
          window.location.hash = 'build=' + encodeURIComponent(code);
        }

        // Load build from code button
        if (e.target.id === 'loadBuildBtn') {
          const input = document.getElementById('loadBuildInput');
          if (!input || !input.value.trim()) {
            showToast('Paste a build code first!', 'error');
            return;
          }
          const success = BuildBuilder.loadFromCode(input.value.trim());
          if (success) {
            updateRingsUI();
            updateBuildStats();
            const ringCountSelector = document.getElementById('ringCountSelector');
            const maxRingsDisplay = document.getElementById('maxRingsDisplay');
            if (ringCountSelector) ringCountSelector.value = BuildBuilder.maxRings;
            if (maxRingsDisplay) maxRingsDisplay.textContent = BuildBuilder.maxRings;
            showToast('Build loaded!', 'success');
          } else {
            showToast('Invalid build code!', 'error');
          }
        }
      });

      // Ring count selector
      const ringCountSelector = document.getElementById('ringCountSelector');
      if (ringCountSelector) {
        ringCountSelector.addEventListener('change', function() {
          BuildBuilder.maxRings = parseInt(this.value) || 2;
          // Trim or extend rings array
          while (BuildBuilder.slots.rings.length < BuildBuilder.maxRings) {
            BuildBuilder.slots.rings.push({ name: null, mutation: 'None' });
          }
          BuildBuilder.slots.rings = BuildBuilder.slots.rings.slice(0, BuildBuilder.maxRings);
          // Update display
          const maxRingsDisplay = document.getElementById('maxRingsDisplay');
          if (maxRingsDisplay) maxRingsDisplay.textContent = BuildBuilder.maxRings;
          updateRingsUI();
          updateBuildStats();
        });
      }

      // Initial population
      setTimeout(populateEquipment, 500);
    })();

// Tab switching
(function() {
  var tabNav = document.getElementById('mainTabs');
  if (!tabNav) return;
  tabNav.addEventListener('click', function(e) {
    var btn = e.target.closest('.tabBtn');
    if (!btn) return;
    var tabId = btn.dataset.tab;
    tabNav.querySelectorAll('.tabBtn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('.tabContent').forEach(function(c) { c.classList.remove('active'); });
    var tab = document.getElementById('tab-' + tabId);
    if (tab) tab.classList.add('active');
  });
})();

// Dredge Quest Guide
(function() {
  var mineralNames = [];
  if (window.MINERALS_DATA && window.MINERALS_DATA.minerals) {
    mineralNames = window.MINERALS_DATA.minerals.map(function(m) { return m.mineral; }).sort();
  }

  var questInputs = document.getElementById('questInputs');
  var questResults = document.getElementById('questResults');
  var questEmpty = document.getElementById('questEmpty');
  var questResultCards = document.getElementById('questResultCards');
  var questTotals = document.getElementById('questTotals');

  var slots = [];
  var slotData = [];

  function getLuck() { return Math.max(0, Number(document.getElementById('luckInput') && document.getElementById('luckInput').value) || 0); }
  function getCap() { return Math.max(1, Number(document.getElementById('capacityInput') && document.getElementById('capacityInput').value) || 1); }

  var SEASONAL_KEYWORDS = ['Seasonal', 'Void', 'Hollow', 'Event', 'Limited', 'North Pole', 'Starfall'];
  var blacklistEnabled = false;

  function isBlacklisted(locationName) {
    if (!blacklistEnabled) return false;
    var lower = locationName.toLowerCase();
    for (var i = 0; i < SEASONAL_KEYWORDS.length; i++) {
      if (lower.indexOf(SEASONAL_KEYWORDS[i].toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function getBestLocationsForOre(oreName) {
    var minerals = window.MINERALS_DATA && window.MINERALS_DATA.minerals || [];
    var m = minerals.find(function(x) { return x.mineral === oreName; });
    if (!m || !m.locations || !m.locations.length) return [];
    var luck = getLuck();
    var C = getCap();
    var itemsPerPan = Math.sqrt(C);
var locs = m.locations.map(function(l) {
      var base = Number(l.chance_percent) / 100;
      var itemRerolls = Math.ceil(5 / base);
      var effectiveLuck = Math.min(luck, itemRerolls);
      var expectedPerPan = effectiveLuck * base;
      return {
        name: l.location,
        basePercent: Number(l.chance_percent),
        expectedPerPan: expectedPerPan,
        itemRerolls: itemRerolls,
        effectiveLuck: effectiveLuck,
        region: l.region || ''
      };
    });
    locs = locs.filter(function(l) { return !isBlacklisted(l.name); });
    locs.sort(function(a, b) { return b.expectedPerPan - a.expectedPerPan; });
    return locs;
  }

  function recalc() {
    var validSlots = slotData.filter(function(s) { return s.name && s.amount > 0; });
    if (validSlots.length === 0) {
      questResults.style.display = 'none';
      questEmpty.style.display = 'block';
      return;
    }
    questEmpty.style.display = 'none';
    questResults.style.display = 'block';

    var cardHTML = '';

    var luck = getLuck();
    var C = getCap();

    var allLocs = {};
    validSlots.forEach(function(s) {
      var locs = getBestLocationsForOre(s.name);
      locs.forEach(function(l) {
        if (!allLocs[l.name]) {
          allLocs[l.name] = { name: l.name, ores: [], bestPerPan: l.expectedPerPan };
        }
        var existingOreIdx = allLocs[l.name].ores.findIndex(function(o) { return o.name === s.name; });
        if (existingOreIdx === -1) {
          allLocs[l.name].ores.push({ name: s.name, amount: s.amount, basePercent: l.basePercent, expectedPerPan: l.expectedPerPan });
        }
      });
    });

    var locList = Object.values(allLocs).sort(function(a, b) { return b.bestPerPan - a.bestPerPan; });

    var multiSpot = locList.filter(function(l) { return l.ores.length > 1; })[0];
    if (multiSpot && validSlots.length > 1) {
      cardHTML += '<div style="background:rgba(0,229,255,0.06); border:1px solid var(--cyan); border-radius:8px; padding:10px; margin-bottom:12px;">';
      cardHTML += '<div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">';
      cardHTML += '<span style="font-size:1rem;">&#9733;</span>';
      cardHTML += '<span style="font-weight:700; font-size:0.85rem; color:var(--cyan);">Best Combo Spot: ' + multiSpot.name + '</span>';
      cardHTML += '<span style="font-size:0.72rem; color:var(--text-dim); margin-left:auto;">covers ' + multiSpot.ores.length + ' / ' + validSlots.length + ' ores</span>';
      cardHTML += '</div>';
      multiSpot.ores.forEach(function(o) {
        var luckNeeded = Math.abs(Math.log(0.5) / (Math.log(1 - o.basePercent / 100) * Math.sqrt(C)));
        var diff = luckNeeded - luck;
        var diffStr = diff > 0 ? ' <span style="color:var(--yellow);">(+' + Math.ceil(diff).toLocaleString() + '</span>' : '';
        cardHTML += '<div style="font-size:0.75rem; padding:2px 0; color:var(--text-mid);"> &bull; ' + o.name + ' x' + o.amount + ' — <span style="color:var(--text-dim);">Luck ' + Math.ceil(luckNeeded).toLocaleString() + diffStr + ' for 50%</span></div>';
      });
      cardHTML += '</div>';
    }

    validSlots.forEach(function(s) {
      var sNameLower = s.name.toLowerCase().trim();
      var oreLocs = Object.values(allLocs).filter(function(l) {
        return l.ores.some(function(o) { return o.name.toLowerCase().trim() === sNameLower; });
      }).sort(function(a, b) { return b.bestPerPan - a.bestPerPan; });

      cardHTML += '<div style="background:var(--bg-input); border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px;">';
      cardHTML += '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">';
      cardHTML += '<span style="font-weight:700; font-size:0.85rem;">' + s.name + ' <span style="color:var(--text-dim); font-weight:400;">x' + s.amount + '</span></span>';
      cardHTML += '</div>';
      if (!oreLocs.length) {
        cardHTML += '<div style="font-size:0.72rem; color:var(--text-dim); font-style:italic;">No location data for "' + s.name + '"</div>';
      } else {
        oreLocs.slice(0, 3).forEach(function(loc, idx) {
          var o = loc.ores[0];
          var label = idx === 0 ? 'Best' : '#' + (idx + 1);
          var color = idx === 0 ? 'var(--green)' : 'var(--text-mid)';
          var luckNeeded = Math.abs(Math.log(0.5) / (Math.log(1 - o.basePercent / 100) * Math.sqrt(C)));
          var diff = luckNeeded - luck;
          var diffStr = diff > 0 ? ' <span style="color:var(--yellow);">(+' + Math.ceil(diff).toLocaleString() + '</span>' : '';
          cardHTML += '<div style="font-size:0.72rem; padding:2px 0; color:' + color + ';">' + label + ': ' + loc.name + ' <span style="color:var(--text-dim);">(~' + o.expectedPerPan.toFixed(2) + ' ore/pan | ' + o.basePercent + '% | pity in ' + o.itemRerolls + ' luck) — Luck ' + Math.ceil(luckNeeded).toLocaleString() + diffStr + ' for 50%</span></div>';
        });
      }
      cardHTML += '</div>';
    });

    questResultCards.innerHTML = cardHTML;
    questTotals.innerHTML = '<div style="font-size:0.72rem; color:var(--text-dim);">Luck ' + luck + ' | Cap ' + C + ' &rarr; ' + Math.sqrt(C).toFixed(2) + ' items/pan (√cap) | <span style="color:var(--yellow);">* High variance on rare ores</span></div>';
  }

  function rarityColorFn(r) {
    switch(r) {
      case 'common': return '#a3a3a3';
      case 'uncommon': return '#22c55e';
      case 'rare': return '#3b82f6';
      case 'epic': return '#a855f7';
      case 'legendary': return '#f59e0b';
      case 'mythic': return '#cf0064';
      case 'mythical': return '#cf0064';
      case 'exotic': return '#ff0011';
      case 'ascended': return '#eceee0';
      default: return '#7c8cff';
    }
  }

  function buildUI() {
    questInputs.innerHTML = '';
    slots = [];
    slotData = [];

    for (var i = 0; i < 3; i++) {
      var div = document.createElement('div');
      div.style.cssText = 'display:flex; flex-direction:column; gap:4px;';

      var selectWrap = document.createElement('div');
      selectWrap.style.cssText = 'position:relative;';

      var sel = document.createElement('select');
      sel.style.cssText = 'width:100%; padding:6px 28px 6px 8px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.8rem; appearance:none; cursor:pointer;';
      sel.innerHTML = '<option value="">Ore ' + (i+1) + '</option>' + mineralNames.map(function(n) { return '<option value="' + n + '">' + n + '</option>'; }).join('');
      sel.addEventListener('change', function(idx) {
        return function() {
          slotData[idx].name = this.value;
          if (this.value) slotData[idx].amount = 0;
          recalc();
        };
      }(i));

      var inp = document.createElement('input');
      inp.type = 'number';
      inp.min = '1';
      inp.placeholder = 'Amount';
      inp.style.cssText = 'width:100%; padding:6px 8px; background:var(--bg-input); border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.8rem;';
      inp.addEventListener('input', function(idx) {
        return function() {
          slotData[idx].amount = Math.max(0, parseInt(this.value) || 0);
          recalc();
        };
      }(i));

      slots.push({ sel: sel, inp: inp, wrap: div });
      slotData.push({ name: '', amount: 0 });

      div.appendChild(sel);
      div.appendChild(inp);
      questInputs.appendChild(div);
    }
  }

  document.addEventListener('input', function(e) {
    var watchers = ['luckInput', 'capacityInput', 'timeMethod'];
    if (watchers.indexOf(e.target.id) !== -1) recalc();
  });

  document.addEventListener('change', function(e) {
    if (e.target.id === 'luckInput' || e.target.id === 'capacityInput' || e.target.id === 'blacklistSeasonal') recalc();
  });

  buildUI();

  var blacklistCheck = document.getElementById('blacklistSeasonal');
  if (blacklistCheck) {
    blacklistCheck.addEventListener('change', function() {
      blacklistEnabled = this.checked;
      recalc();
    });
  }

  recalc();
})();

// We'll patch the display updates directly in the metric elements
