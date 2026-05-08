// Equipment Comparison
const compareItems = [];
const MAX_COMPARE = 3;

function addToCompare() {
  if (!currentItem) return;
  if (compareItems.find(function(i) { return i.name === currentItem.name; })) return;
  if (compareItems.length >= MAX_COMPARE) { if (typeof showToast === 'function') showToast('Max 3 items to compare', 'error'); return; }
  compareItems.push(currentItem);
  renderComparison();
}

function clearComparison() {
  compareItems.length = 0;
  renderComparison();
}

function renderComparison() {
  var table = document.getElementById('comparisonTable');
  if (!table) return;
  if (!compareItems.length) {
    table.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-dim);">Select equipment + click Add</div>';
    return;
  }

  var html = '<table style="width:100%;table-layout:fixed;border-collapse:collapse;font-size:0.7rem;line-height:1.3;">';
  html += '<colgroup><col style="width:25%;"><col style="width:25%;"><col style="width:25%;"><col style="width:25%;"></colgroup>';
  
  // Header
  html += '<tr style="background:var(--bg-card);">';
  html += '<th style="padding:4px 6px;width:25%;">Stat</th>';
  compareItems.forEach(function(item) {
    html += '<th style="padding:4px 6px;text-align:center;color:var(--cyan);width:25%;">' + item.name + '</th>';
  });
  html += '</tr>';

  // Rarity
  html += '<tr>';
  html += '<td style="padding:4px;font-weight:600;">Rarity</td>';
  var rarityOrder = ['common','uncommon','rare','epic','legendary','mythical','exotic','ascended'];
  var bestRarityIdx = -1, bestRarityVal = -1;
  compareItems.forEach(function(item, idx) {
    var rIdx = rarityOrder.indexOf(item.rarity);
    if (rIdx > bestRarityVal) { bestRarityVal = rIdx; bestRarityIdx = idx; }
  });
  compareItems.forEach(function(item, idx) {
    var color = typeof rarityColor === 'function' ? rarityColor(item.rarity) : '#fff';
    var fw = idx === bestRarityIdx ? 'font-weight:bold;' : '';
    html += '<td style="padding:4px;text-align:center;' + fw + '"><span style="color:' + color + ';">' + (item.rarity || '—') + '</span></td>';
  });
  html += '</tr>';

  // Stats
  var allKeys = {};
  compareItems.forEach(function(item) {
    if (item.stats && item.stats.base) Object.keys(item.stats.base).forEach(function(k) { allKeys[k] = true; });
  });
  Object.keys(allKeys).sort().forEach(function(key) {
    html += '<tr>';
    html += '<td style="padding:4px;font-weight:600;">' + key.replace(/_/g, ' ') + '</td>';
    var values = [];
    compareItems.forEach(function(item) {
      var val = item.stats && item.stats.base ? item.stats.base[key] : undefined;
      if (val && typeof val === 'object') val = val.max || val.min || 0;
      values.push(val);
    });
    var bestIdx = -1, bestVal = -Infinity;
    values.forEach(function(v, idx) { if (v !== undefined && v > bestVal) { bestVal = v; bestIdx = idx; } });
    values.forEach(function(v, idx) {
      if (v === undefined) { html += '<td style="padding:4px;text-align:center;color:var(--text-dim);">—</td>'; return; }
      var color = idx === bestIdx ? 'var(--green)' : 'var(--cyan)';
      var fw = idx === bestIdx ? 'font-weight:bold;' : '';
      var diff = '';
      if (idx === bestIdx) {
        var diffs = [];
        values.forEach(function(v2, i2) { if (i2 !== idx && v2 !== undefined) diffs.push('+' + (v - v2).toFixed(1)); });
        if (diffs.length) diff = ' <span style="color:var(--yellow);font-size:0.7rem;">(' + diffs.join(', ') + ')</span>';
      }
      html += '<td style="padding:4px;text-align:center;color:' + color + ';' + fw + '">' + v + diff + '</td>';
    });
    html += '</tr>';
  });

  // Materials
  html += '<tr>';
  html += '<td style="padding:4px;font-weight:600;">Materials</td>';
  compareItems.forEach(function(item) {
    var mats = item.crafting && item.crafting.materials ? item.crafting.materials : [];
    var count = mats.reduce(function(s, m) { return s + (m.amount || 1); }, 0);
    html += '<td style="padding:4px;text-align:center;">' + count + ' items</td>';
  });
  html += '</tr>';

  // Cost
  html += '<tr>';
  html += '<td style="padding:4px;font-weight:600;">Cost</td>';
  compareItems.forEach(function(item) {
    var cost = item.cost || null;
    var display = '—';
    if (cost && cost.amount) {
      var amt = cost.amount;
      if (cost.currency === 'money') display = '$' + amt.toLocaleString();
      else if (cost.currency === 'shards') display = amt + ' shards';
    }
    html += '<td style="padding:4px;text-align:center;">' + display + '</td>';
  });
  html += '</tr>';

  html += '</table>';
  table.innerHTML = html;
}

var addBtn = document.getElementById('addToCompareBtn');
var clearBtn = document.getElementById('clearCompareBtn');
if (addBtn) addBtn.addEventListener('click', addToCompare);
if (clearBtn) clearBtn.addEventListener('click', clearComparison);
