# JARVIS Architecture Diagrams — Figma Plugin

## What it generates (5 pages)

| Page | Diagram | Contents |
|------|---------|----------|
| 🧠 Organogram | Agent Hierarchy | JARVIS root → Core Systems → 11 Squads → 59 Agents → Infrastructure |
| 🔄 Mission Flow | Mission Lifecycle | User Input → Gateway → Router → MetaBrain → Agents → QualityGate → Store → Response |
| 🔁 OODA Loops | Autonomy Cycles | ConsciousnessLoop (6h) + AutonomyEngine (30min) + ConfidenceEngine decision logic |
| 🏗️ System Architecture | Tech Stack | All 6 layers: Channels → Gateway → Backend → AI Providers → Storage → PM2 |
| 💡 Brainstorm | Mind Map | 6-branch radial map: Intelligence · Squads · Memory · Channels · Security · Learning |

---

## How to Run (3 steps)

### Step 1 — Create the plugin in Figma Desktop
1. Open **Figma Desktop App** (required — web won't work for plugins)
2. Menu (top-left Figma logo) → **Plugins** → **Development** → **New Plugin...**
3. Click **"Link existing plugin"** and select the `manifest.json` file in this folder:
   ```
   docs/figma-plugin/manifest.json
   ```
   OR create a blank plugin and replace `code.js` with the contents of `jarvis-diagrams.js`

### Step 2 — Open a Figma file
- Create a new empty Figma file (or open an existing one)
- The plugin will add new pages — it won't overwrite existing content

### Step 3 — Run it
1. Menu → **Plugins** → **Development** → **JARVIS Architecture Diagrams**
2. The plugin runs and creates all 5 diagram pages (~10–15 seconds)
3. When done: `✅ All 5 JARVIS diagrams created! Check each page.`

---

## Colour System

| Colour | Meaning |
|--------|---------|
| 🔵 Cyan `#00F5FF` | JARVIS core / primary |
| 🟣 Purple `#8B5CF6` | AI / consciousness / oracle |
| 🔵 Blue `#3B82F6` | Engineering / forge / gateway |
| 🟡 Amber `#F59E0B` | Autonomy / mercury / warnings |
| 🟢 Green `#10B981` | Healthy / atlas / success |
| 🔴 Red `#EF4444` | Critical / sentinel / failure |
| 🩷 Pink `#EC4899` | Product / confidence engine |
| 🔵 Indigo `#6366F1` | Memory / nexus / embeddings |
| 🩵 Teal `#06B6D4` | Revenue / agent bus |

---

## Troubleshooting

**"Inter font not found"** → The plugin uses Inter (system font). If missing, install Inter from Google Fonts.

**Plugin won't load** → Make sure Figma Desktop is up to date (v116+).

**Pages already exist** → Running the plugin again clears and rebuilds existing diagram pages.
