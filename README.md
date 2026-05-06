# Prospecting Calculator

A modern, interactive calculator for the Roblox game **Prospecting**. Calculate drop chances, plan optimal dig strategies, compare builds, and track materials.

## Features

- 🎯 **Drop Chance Calculator** - Real-time probability calculations with luck, capacity, and method settings
- 📊 **Build Planner** - Select from 15+ optimized builds (Luck Efficiency, Size Boost, Hybrid, etc.)
- 🗺️ **Optimal Dig Strategy** - Shows where to farm materials, sorted by priority
- 📍 **Multi-Material Locations** - Find spots that drop 2+ needed materials
- 🔧 **Equipment Explorer** - Browse 300+ items with stats, materials, and unlock info
- 📋 **Copy Strategy** - One-click copy of your dig plan to clipboard
- 🎨 **Animated UI** - Smooth counters, pulsing best locations, heat-map tables
- 🌐 **Works Offline** - Just open `index.html` (no server needed)

## How to Use

1. **Download** this repo or open `index.html` directly
2. **Select** a mineral and location
3. **Adjust** your luck, pan capacity, and method
4. **View** drop chances, farming goals, and time estimates
5. **Pick** a build to see equipment, materials, and dig strategy

## Builds Included

### Stage I - Snowy Isle
- L.uck Efficiency I.
- Size Boost I.

### Stage II - Overgrown Caves
- L.uck Efficiency II.
- Size Boost II.

### Stage III - Swamp
- L.uck Efficiency III.A (no RoC)
- L.uck Efficiency III.B (w/ RoC)
- Hybrid III.
- Size Boost III.
- Items Farming III.
- Treasure/Geode III.

### Stage IV - Meteor
- L.uck Efficiency IV.A (no Ascended)
- L.uck Efficiency IV.B (w/ Ascended)
- Hybrid IV.B (w/ Ascended)
- Size Boost IV.
- Items Farming IV.
- Money Printer

## Data Sources

- [Official Prospecting! Wiki](https://prospecting.miraheze.org/wiki/Main_Page)
- [Prospecting Builds Guide](https://docs.google.com/document/d/1qh68P12Pm1nz80jbKLZloVgapCXxVRoarM_pAs-5aVY)

## Tech Stack

- **Pure HTML/CSS/JS** - No frameworks, no build tools
- **Data files** - `minerals-data.js`, `crafting-data.js` (JSON wrapped in JS)
- **Modern UI** - Inter font, CSS variables, animations
- **GitHub Pages** - Hosted at `YOUR_USERNAME.github.io/prospecting-calculator`

## Local Development

```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/prospecting-calculator.git
cd prospecting-calculator

# Open in browser
start index.html  # Windows
open index.html   # Mac
xdg-open index.html  # Linux
```

## To-Do

- [ ] Add URL parameters (`?build=luck3swamp&luck=5`)
- [ ] Implement local storage (remember settings)
- [ ] Scrape wiki for automatic data updates
- [ ] Add PWA support (offline + installable)
- [ ] Create Command Palette (`Ctrl+K`)

## License

MIT - feel free to fork and modify!

---

**Made for Roblox Prospecting players** 🎮
