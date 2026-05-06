let equipment = [];

let filteredEquipment = [];

let currentItem = null;

let activeStatsMode = "base";


/* -------------------------

   STAT METADATA

------------------------- */


const MUTATION_MULTIPLIERS = [

  { id: "m110", label: "Mutation x1.1", value: 1.1 },

  { id: "m120", label: "Mutation x1.2", value: 1.2 },

  { id: "m135", label: "Mutation x1.35", value: 1.35 },

  { id: "m140", label: "Mutation x1.4", value: 1.4 },

  { id: "m160", label: "Mutation x1.6", value: 1.6 }

];


const STAT_META = {
  luck: { label: "Luck", icon: "🍀" },
  dig_strength: { label: "Dig Strength", icon: "💪" },
  dig_speed: { label: "Dig Speed", icon: "⚡" },
  shake_strength: { label: "Shake Strength", icon: "🤝" },
  shake_speed: { label: "Shake Speed", icon: "💨" },
  health: { label: "Health", icon: "❤️" },
  walk_speed: { label: "Walk Speed", icon: "🏃" },
  jump_power: { label: "Jump Power", icon: "🦘" },
  size_boost: { label: "Size Boost", icon: "📏" },
  sell_boost: { label: "Sell Boost", icon: "💰" },
  modifier_boost: { label: "Modifier Boost", icon: "✨" },
  treasure_map_chance: { label: "Treasure Map", icon: "🗺️" },
  status_timer_speed: { label: "Status Timer", icon: "⏱️" }
};


const PERCENT_STATS = new Set([

  "dig_speed",

  "shake_speed",

  "sell_boost",

  "size_boost",

  "modifier_boost",

  "treasure_map_chance",

  "status_timer_speed"
]);



/* -------------------------

   DOM ELEMENTS

------------------------- */



const equipSearch = document.getElementById("equipSearch");

const equipRarityFilter = document.getElementById("equipRarityFilter");

const equipSelect = document.getElementById("equipSelect");



const equipLabel = document.getElementById("equipLabel");

const equipRarityTag = document.getElementById("equipRarityTag");

const equipRarityDot = document.getElementById("equipRarityDot");

const equipAvailability = document.getElementById("equipAvailability");



const equipMaterialsCount = document.getElementById("equipMaterialsCount");

const equipMaterialsHint = document.getElementById("equipMaterialsHint");

const equipUnlockType = document.getElementById("equipUnlockType");

const equipUnlockHint = document.getElementById("equipUnlockHint");

const equipCost = document.getElementById("equipCost");

const equipSlot = document.getElementById("equipSlot");



/* -------------------------

   LOAD DATA

------------------------- */



(function loadData() {

  if (!window.CRAFTING_DATA || !window.CRAFTING_DATA.equipment) {
    console.error("crafting-data.js not loaded or missing equipment array");
    setTimeout(loadData, 100); // retry after 100ms
    return;
  }

  const data = window.CRAFTING_DATA;

  if (!data || !data.equipment) {
    console.error("crafting-data.js not loaded or missing equipment array");
    return;
  }

  equipment = data.equipment || [];
  filteredEquipment = [...equipment];
  console.log("Loaded", equipment.length, "equipment items");

  applyEquipmentFilters(); // This populates filteredEquipment and calls populateEquipmentDropdown
  buildQuickAddButtons();
})();


/* -------------------------

   QUICK ADD BUTTONS

------------------------- */



function buildQuickAddButtons() {

  const container = document.getElementById("quickAddButtons");

  if (!container) return;



  // Define key stats to find top equipment for

  const targetStats = [

    { key: "luck", label: "Best Luck" },

    { key: "size_boost", label: "Best Size" },

    { key: "inventory_size", label: "Best Inventory" },

    { key: "dig_strength", label: "Best Dig" }

  ];



  const buttons = [];



  targetStats.forEach(({ key, label }) => {

    // Find equipment with the highest value for this stat (check both base and star6)

    let best = null;

    let bestVal = -Infinity;



    equipment.forEach(item => {

      // Check base stats

      const baseStat = item.stats?.base?.[key];

      if (baseStat != null) {

        let val = 0;

        if (typeof baseStat === "object" && baseStat !== null) {

          if ("max" in baseStat) val = baseStat.max;

          else if ("value" in baseStat) val = baseStat.value;

        } else if (typeof baseStat === "number") {

          val = baseStat;

        }

        if (val > bestVal) {

          bestVal = val;

          best = item;

        }

      }



      // Check 6★ stats for potentially higher values

      const starStat = item.stats?.star6?.[key];

      if (starStat != null) {

        let val = 0;

        if (typeof starStat === "object" && starStat !== null) {

          if ("max" in starStat) val = starStat.max;

          else if ("value" in starStat) val = starStat.value;

        } else if (typeof starStat === "number") {

          val = starStat;

        }

        if (val > bestVal) {

          bestVal = val;

          best = item;

        }

      }

    });



    if (best) {

      const btn = document.createElement("button");

      btn.className = "quickAddBtn";

      btn.textContent = label;

      btn.title = best.name;

      btn.addEventListener("click", () => {

        equipSelect.value = best.name;

        equipSelect.dispatchEvent(new Event("change"));

      });

      buttons.push(btn);

    }

  });



  // Add a few popular items manually (commonly used gear)

  const popularNames = ["Leprechaun's Charm", "King's Crown", "Miner's Ring", "Lucky Clover"];

  popularNames.forEach(name => {

    const item = equipment.find(e => e.name === name);

    if (item) {

      const btn = document.createElement("button");

      btn.className = "quickAddBtn";

      btn.textContent = item.name.length > 15 ? item.name.substring(0, 13) + "..." : item.name;

      btn.title = item.name;

      btn.addEventListener("click", () => {

        equipSelect.value = item.name;

        equipSelect.dispatchEvent(new Event("change"));

      });

      buttons.push(btn);

    }

  });



  container.innerHTML = "";

  buttons.forEach(btn => container.appendChild(btn));

}



/* -------------------------

   STATS RENDERING

------------------------- */



function renderStatsToGrid(gridId, stats, multiplier, extraBonuses = null){

  const grid = document.getElementById(gridId);

  if (!grid) return;



  const bonuses = extraBonuses || {};



  // Render union: existing stat keys + bonus keys (so missing stats can be added)

  const keys = Array.from(new Set([

    ...Object.keys(stats || {}),

    ...Object.keys(bonuses)

  ]));



  if (!keys.length){

    grid.innerHTML = `<div class="note">No stats available</div>`;

    return;

  }



  grid.innerHTML = keys.map((key) => {

    const val = stats ? stats[key] : undefined;



    let baseMin, baseMax, baseVal;



    if (typeof val === "object" && val !== null) {

      if ("min" in val && "max" in val) {

        baseMin = val.min;

        baseMax = val.max;

      } else if ("value" in val) {

        baseVal = val.value;

      }

    } else if (typeof val === "number") {

      baseVal = val;

    }



    // If stat doesn't exist but we have a bonus for it: base is 0

    const hasBonus = typeof bonuses[key] === "number";

    const bonus = hasBonus ? bonuses[key] : 0;



    let display;



    // Range stat

    if (baseMin != null && baseMax != null) {

      const minMult = baseMin < 0 ? (1 / multiplier) : multiplier;

      const maxMult = baseMax < 0 ? (1 / multiplier) : multiplier;



      let minVal = baseMin * minMult;

      let maxVal = baseMax * maxMult;



      // Add flat bonus AFTER multiplying

      if (hasBonus) {

        minVal += bonus;

        maxVal += bonus;

      }



      display = `${roundStat(key, minVal)} - ${roundStat(key, maxVal)}`;

    }



    // Single value stat (including missing stats that only have a bonus)

    else {

      // if baseVal is missing and we have a bonus, baseVal becomes 0

      if (baseVal == null && hasBonus) baseVal = 0;



      // if still missing (no base value and no bonus), skip it

      if (baseVal == null) return "";



      const effectiveMultiplier = baseVal < 0 ? (1 / multiplier) : multiplier;



      let finalValue = baseVal * effectiveMultiplier;



      // Add flat bonus AFTER multiplying

      if (hasBonus) finalValue += bonus;



      display = roundStat(key, finalValue);

    }



    if (display === "") return "";



    if (PERCENT_STATS.has(key)) {

      display += "%";

    }



    const cls = `stat-${key}`;



    return `

      <div class="statItem">

        <div class="statLabel">${prettyStat(key)}</div>

        <div class="statValue ${cls}">${display}</div>

      </div>

    `;

  }).join("");

}



/* -------------------------

   FLAT BONUS INJECTION (1.4x)

------------------------- */



function appendFlatBonusStat(gridId, key, value){

  const grid = document.getElementById(gridId);

  if (!grid) return;



  const display =

    roundStat(key, value) + (PERCENT_STATS.has(key) ? "%" : "");



  grid.insertAdjacentHTML("beforeend", `

    <div class="statItem bonusStat">

      <div class="statLabel">${prettyStat(key)}</div>

      <div class="statValue">+${display}</div>

    </div>

  `);

}



/* -------------------------

   ROUNDING RULES

------------------------- */



function roundStat(key, value){

  if (value == null || isNaN(value)) return value;



  const abs = Math.abs(value);



  if (key === "walkspeed" || key === "jump_power") {

    return Math.round(value * 10) / 10;

  }



  if (abs > 0 && abs < 1) {

    return Math.round(value * 10) / 10;

  }



  return Math.round(value);

}



function renderStats(){

  if (!currentItem) return;



  const stats = currentItem.stats?.[activeStatsMode];

  if (!stats) return;



  // Base

  renderStatsToGrid("statsGrid", stats, 1);



  // Mutations

  MUTATION_MULTIPLIERS.forEach(m => {

    const gridId = `statsGrid-${m.id}`;



    // Only Festive/1.4x gets the flat bonuses

    const bonuses = (m.id === "m140")

      ? { luck: 50, size_boost: 10 }

      : null;



    renderStatsToGrid(gridId, stats, m.value, bonuses);

  });

}



/* -------------------------

   DROPDOWN POPULATION

------------------------- */



function populateEquipmentDropdown(){

  equipSelect.innerHTML = "";



  filteredEquipment.forEach(item => {

    const opt = document.createElement("option");

    opt.value = item.name;

    opt.textContent = item.name;

    equipSelect.appendChild(opt);

  });



  if (filteredEquipment.length){

    equipSelect.value = filteredEquipment[0].name;

    updateEquipmentDetails(filteredEquipment[0]);

  }

}



/* -------------------------

   FILTERING

------------------------- */



function applyEquipmentFilters(){

  const search = equipSearch.value.toLowerCase();

  const rarity = equipRarityFilter.value;



  filteredEquipment = equipment.filter(e => {

    const matchesSearch = !search || e.name.toLowerCase().includes(search);

    const matchesRarity = rarity === "all" || e.rarity === rarity;

    return matchesSearch && matchesRarity;

  });



  populateEquipmentDropdown();

}



equipSearch.addEventListener("input", applyEquipmentFilters);

equipRarityFilter.addEventListener("change", applyEquipmentFilters);



/* -------------------------

   SELECTION

------------------------- */



equipSelect.addEventListener("change", () => {

  const selected = equipment.find(e => e.name === equipSelect.value);

  if (selected) updateEquipmentDetails(selected);

});



/* -------------------------

   DETAILS PANEL

------------------------- */



function updateEquipmentDetails(item){

  currentItem = item;



  equipLabel.textContent = `Equipment: ${item.name}`;

  equipRarityTag.textContent = item.rarity ?? "-";

  equipAvailability.textContent = item.availability ?? "normal";

  equipRarityDot.style.background = rarityColor(item.rarity);



  equipCost.textContent = formatCost(item);

  equipSlot.textContent = item.slot ? `Slot: ${item.slot}` : "-";



  const mats = item.crafting?.materials ?? [];

  equipMaterialsCount.textContent = mats.length || "0";

  equipMaterialsHint.textContent = mats.length

    ? mats.map(m =>

        `${m.amount} ${m.item}${m.min_size ? ` (≥ ${m.min_size}kg)` : ""}`

      ).join(", ")

    : "No crafting required";



  renderStats();

  renderUnlock(item);

}



/* -------------------------

   UNLOCK RENDERING

------------------------- */



function renderUnlock(item){

  const unlock = item.unlock;



  if (!unlock || unlock.type === "craft"){

    equipUnlockType.textContent = "Craft Only";

    equipUnlockHint.innerHTML = "No blueprint required";

    return;

  }



  if (unlock.type === "quest"){

    equipUnlockType.textContent = "Quest";

    const q = unlock.quest;

    let html = `<strong>${q.name}</strong>`;



    if (q.giver){

      html += `<br><span class="muted">

        From ${q.giver.name}${q.giver.location ? " - " + q.giver.location : ""}

      </span>`;

    }



    if (Array.isArray(q.stages)){

      q.stages.forEach(stage => {

        html += `

          <div class="questStage">

            <div class="questStageTitle">${stage.title}</div>

            <ul class="questList">

              ${stage.tasks.map(t => `<li>${t}</li>`).join("")}

            </ul>

          </div>

        `;

      });

    } else if (Array.isArray(q.tasks)){

      html += `

        <ul class="questList">

          ${q.tasks.map(t => `<li>${t}</li>`).join("")}

        </ul>

      `;

    }



    equipUnlockHint.innerHTML = html;

    return;

  }



  if (unlock.type === "npc"){

    equipUnlockType.textContent = "NPC Blueprint";

    equipUnlockHint.innerHTML = `

      <strong>${unlock.npc.name}</strong><br>

      <span class="muted">${unlock.npc.location ?? ""}</span>

    `;

    return;

  }



  if (unlock.type === "event"){

    equipUnlockType.textContent = "Event";

    equipUnlockHint.innerHTML = `

      <strong>${unlock.event.name}</strong><br>

      <span class="muted">${unlock.event.note ?? ""}</span>

    `;

  }

}



/* -------------------------

   HELPERS

------------------------- */



function prettyStat(key){

  return key

    .replace(/_/g, " ")

    .replace(/\b\w/g, c => c.toUpperCase());

}



function formatCost(item){

  const cost = item.cost;

  if (!cost || cost.amount == null) return "-";



  const amount = cost.amount.toLocaleString();



  switch (cost.currency){

    case "candies": return `${amount} Candies`;

    case "ornaments": return `${amount} Ornaments`;

    case "money":

    default: return `$${amount}`;

  }

}



/* -------------------------

   STATS TOGGLE

------------------------- */



document.getElementById("statsBaseBtn").onclick = () => {

  activeStatsMode = "base";

  setStatsToggle(true);

  renderStats();

};



document.getElementById("statsStarBtn").onclick = () => {

  activeStatsMode = "star6";

  setStatsToggle(false);

  renderStats();

};



function setStatsToggle(baseActive){

  document.getElementById("statsBaseBtn")

    .classList.toggle("active", baseActive);

  document.getElementById("statsStarBtn")

    .classList.toggle("active", !baseActive);

}



/* ===============================

   LOADOUT BUILDER

=============================== */



let loadoutItems = [];



const loadoutSearch = document.getElementById("loadoutSearch");

const loadoutRarity = document.getElementById("loadoutRarity");

const loadoutAddSelect = document.getElementById("loadoutAddSelect");

const loadoutAddBtn = document.getElementById("loadoutAddBtn");

const loadoutList = document.getElementById("loadoutList");

const loadoutStatsGrid = document.getElementById("loadoutStats");



function populateLoadoutDropdown(){

  if (!loadoutAddSelect) return;

  loadoutAddSelect.innerHTML = "";



  const search = (loadoutSearch?.value || "").toLowerCase();

  const rarity = loadoutRarity?.value || "all";



  const filtered = equipment.filter(e => {

    const matchName = !search || e.name.toLowerCase().includes(search);

    const matchRarity = rarity === "all" || e.rarity === rarity;

    const notInLoadout = !loadoutItems.some(l => l.name === e.name);

    return matchName && matchRarity && notInLoadout;

  });



  for (const e of filtered.sort((a,b) => a.name.localeCompare(b.name))) {

    const opt = document.createElement("option");

    opt.value = e.name;

    opt.textContent = e.name;

    loadoutAddSelect.appendChild(opt);

  }

}



function renderLoadoutList(){

  if (!loadoutList) return;



  if (!loadoutItems.length) {

    loadoutList.innerHTML = `<div class="note">No equipment selected</div>`;

    return;

  }



  loadoutList.innerHTML = loadoutItems.map((item, i) => `

    <div class="loadoutItem" data-idx="${i}">

      <span class="loadoutItemName">${item.name}</span>

      <span class="loadoutItemRarity" style="color:${rarityColor(item.rarity)}">${item.rarity}</span>

      <button class="loadoutRemoveBtn" data-idx="${i}" title="Remove">✕</button>

    </div>

  `).join("");



  loadoutList.querySelectorAll(".loadoutRemoveBtn").forEach(btn => {

    btn.addEventListener("click", () => {

      const idx = parseInt(btn.dataset.idx);

      loadoutItems.splice(idx, 1);

      renderLoadoutList();

      renderLoadoutStats();

      populateLoadoutDropdown();

    });

  });

}



function renderLoadoutStats(){

  if (!loadoutStatsGrid) return;



  if (!loadoutItems.length) {

    loadoutStatsGrid.innerHTML = `<div class="note">Add equipment to see combined stats</div>`;

    return;

  }



  const combined = {};

  for (const item of loadoutItems) {

    const stats = item.stats?.base;

    if (!stats) continue;

    for (const [key, val] of Object.entries(stats)) {

      if (!combined[key]) combined[key] = { minSum: 0, maxSum: 0 };

      if (typeof val === "object" && val !== null) {

        if ("min" in val && "max" in val) {

          combined[key].minSum += val.min;

          combined[key].maxSum += val.max;

        } else if ("value" in val) {

          combined[key].minSum += val.value;

          combined[key].maxSum += val.value;

        }

      } else if (typeof val === "number") {

        combined[key].minSum += val;

        combined[key].maxSum += val;

      }

    }

  }



  loadoutStatsGrid.innerHTML = Object.entries(combined).map(([key, sums]) => {

    const display = `${roundStat(key, sums.minSum)} - ${roundStat(key, sums.maxSum)}${PERCENT_STATS.has(key) ? "%" : ""}`;

    return `

      <div class="statItem">

        <div class="statLabel">${prettyStat(key)}</div>

        <div class="statValue stat-${key}">${display}</div>

      </div>

    `;

  }).join("");

}



if (loadoutAddBtn) {

  loadoutAddBtn.addEventListener("click", () => {

    const name = loadoutAddSelect?.value;

    if (!name) return;

    const item = equipment.find(e => e.name === name);

    if (!item) return;

    loadoutItems.push(item);

    renderLoadoutList();

    renderLoadoutStats();

    populateLoadoutDropdown();

  });

}



if (loadoutSearch) loadoutSearch.addEventListener("input", populateLoadoutDropdown);

if (loadoutRarity) loadoutRarity.addEventListener("change", populateLoadoutDropdown);

// Init loadout
populateLoadoutDropdown();

// Init equipment - apply filters to populate dropdown
applyEquipmentFilters();

