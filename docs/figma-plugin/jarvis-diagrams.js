// ============================================================
// J.A.R.V.I.S. PLATFORM — Architecture Diagrams Generator
// Figma Plugin Script  |  v1.0  |  2026-02-24
// ============================================================
// HOW TO RUN:
//   1. Open Figma Desktop App
//   2. Menu > Plugins > Development > New Plugin
//   3. Choose "Blank plugin" → give it a name "JARVIS Diagrams"
//   4. Replace the content of code.js with THIS entire file
//   5. Add to manifest.json: "editorType": ["figma","figjam"]
//   6. Run the plugin (Plugins > Development > JARVIS Diagrams)
// ============================================================

main().catch(err => { figma.notify('❌ ' + err.message); figma.closePlugin(); });

// ── Colour Palette ───────────────────────────────────────────
const C = {
  bg:       [0.051, 0.051, 0.094],
  surf:     [0.082, 0.082, 0.122],
  surf2:    [0.110, 0.110, 0.180],
  cyan:     [0.000, 0.961, 1.000],
  purple:   [0.545, 0.361, 0.961],
  green:    [0.063, 0.725, 0.506],
  amber:    [0.961, 0.620, 0.043],
  red:      [0.937, 0.267, 0.267],
  blue:     [0.231, 0.510, 0.961],
  pink:     [0.925, 0.267, 0.600],
  indigo:   [0.380, 0.380, 0.980],
  teal:     [0.063, 0.710, 0.694],
  text:     [0.886, 0.910, 0.949],
  muted:    [0.392, 0.451, 0.553],
  white:    [1.000, 1.000, 1.000],
};

// Squad colours map
const SQ = {
  oracle:   C.purple,
  forge:    C.blue,
  mercury:  C.amber,
  atlas:    C.green,
  vault:    C.red,
  board:    C.cyan,
  produto:  C.pink,
  revenue:  C.teal,
  nexus:    C.indigo,
  sentinel: [0.9, 0.3, 0.3],
};

// ── Font helpers ─────────────────────────────────────────────
async function loadFonts() {
  for (const style of ['Regular', 'Medium', 'Bold']) {
    await figma.loadFontAsync({ family: 'Inter', style });
  }
}

function rgb([r, g, b]) { return { r, g, b }; }
function fills(col, a = 1) { return [{ type: 'SOLID', color: rgb(col), opacity: a }]; }

// ── Primitive factories ──────────────────────────────────────
function makeRect(w, h, col, opts = {}) {
  const r = figma.createRectangle();
  r.resize(w, h);
  r.fills = fills(col, opts.fillOpacity ?? 1);
  r.cornerRadius = opts.radius ?? 8;
  if (opts.stroke) {
    r.strokes = fills(opts.stroke);
    r.strokeWeight = opts.strokeW ?? 1.5;
    r.strokeAlign = 'INSIDE';
  }
  return r;
}

function makeText(str, size, col, weight = 'Regular', align = 'LEFT') {
  const t = figma.createText();
  t.fontName = { family: 'Inter', style: weight };
  t.fontSize = size;
  t.fills = fills(col);
  t.textAlignHorizontal = align;
  t.characters = str;
  return t;
}

function makeFrame(name, w, h, col) {
  const f = figma.createFrame();
  f.name = name;
  f.resize(w, h);
  f.fills = col ? fills(col) : [];
  f.clipsContent = false;
  return f;
}

function addAutoLayout(frame, dir = 'HORIZONTAL', gap = 12, padH = 16, padV = 12) {
  frame.layoutMode = dir;
  frame.itemSpacing = gap;
  frame.paddingLeft = padH;
  frame.paddingRight = padH;
  frame.paddingTop = padV;
  frame.paddingBottom = padV;
  frame.primaryAxisSizingMode = 'AUTO';
  frame.counterAxisSizingMode = 'AUTO';
  frame.counterAxisAlignItems = 'CENTER';
}

// ── Node box (card) ──────────────────────────────────────────
function makeCard(label, sub, col, w = 200, opts = {}) {
  const card = figma.createFrame();
  card.name = label;
  card.layoutMode = 'VERTICAL';
  card.itemSpacing = 4;
  card.paddingLeft = 14;
  card.paddingRight = 14;
  card.paddingTop = 12;
  card.paddingBottom = 12;
  card.primaryAxisSizingMode = 'AUTO';
  card.counterAxisSizingMode = 'FIXED';
  card.resize(w, 60);
  card.fills = fills(opts.bg ?? C.surf, opts.bgOpacity ?? 1);
  card.cornerRadius = opts.radius ?? 10;
  card.strokes = fills(col, 0.7);
  card.strokeWeight = 1.5;
  card.strokeAlign = 'INSIDE';
  card.effects = [{
    type: 'DROP_SHADOW',
    color: { ...rgb(col), a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 12,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];

  const title = makeText(label, opts.titleSize ?? 13, C.white, 'Bold');
  card.appendChild(title);

  if (sub) {
    const subtitle = makeText(sub, opts.subSize ?? 10, C.muted, 'Regular');
    subtitle.layoutSizingHorizontal = 'FILL';
    card.appendChild(subtitle);
  }

  return card;
}

// ── Arrow (connector) between two nodes ──────────────────────
function makeArrow(page, x1, y1, x2, y2, col, dashed = false) {
  const v = figma.createVector();
  v.vectorNetwork = {
    vertices: [
      { x: 0, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
      { x: 1, y: 0, strokeCap: 'NONE', strokeJoin: 'MITER', cornerRadius: 0, handleMirroring: 'NONE' },
    ],
    segments: [{ startVertex: 0, endVertex: 1, tangentStart: { x: 0, y: 0 }, tangentEnd: { x: 0, y: 0 } }],
    regions: [],
  };
  // Use line for now, positioned and rotated
  const ln = figma.createLine();
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  ln.resize(len, 0);
  ln.x = x1;
  ln.y = y1;
  ln.rotation = -Math.atan2(dy, dx) * (180 / Math.PI);
  ln.strokes = fills(col, 0.75);
  ln.strokeWeight = 1.5;
  if (dashed) ln.dashPattern = [8, 5];
  ln.strokeCap = 'ARROW_EQUILATERAL';
  page.appendChild(ln);
  return ln;
}

// ── Page helper ──────────────────────────────────────────────
function getOrCreatePage(name) {
  const existing = figma.root.children.find(p => p.name === name);
  if (existing) { existing.children.forEach(c => c.remove()); return existing; }
  const page = figma.createPage();
  page.name = name;
  return page;
}

// =============================================================
// DIAGRAM 1 — ORGANOGRAM (Agent Hierarchy)
// =============================================================
async function buildOrganogram() {
  const page = getOrCreatePage('🧠 Organogram');

  // Background canvas frame
  const canvas = makeFrame('JARVIS Organogram', 5200, 3400, C.bg);
  canvas.x = 0; canvas.y = 0;
  page.appendChild(canvas);

  // ── Title ────────────────────────────────────────────────
  const title = makeText('J.A.R.V.I.S.  PLATFORM — AGENT ORGANOGRAM', 36, C.cyan, 'Bold', 'CENTER');
  title.x = 5200 / 2 - 700;
  title.y = 40;
  canvas.appendChild(title);

  const sub = makeText('59 Agents  •  11 Squads  •  5-Layer DNA Architecture', 18, C.muted, 'Regular', 'CENTER');
  sub.x = 5200 / 2 - 400;
  sub.y = 90;
  canvas.appendChild(sub);

  // ── Root node ─────────────────────────────────────────────
  const rootX = 5200 / 2 - 120, rootY = 160;
  const root = makeCard('⚙️  J.A.R.V.I.S.', 'Just A Rather Very Intelligent System', C.cyan, 280, {
    bg: C.surf2, titleSize: 18, radius: 14,
  });
  root.x = rootX; root.y = rootY;
  canvas.appendChild(root);

  // ── Core Systems (Level 2) ────────────────────────────────
  const systems = [
    { label: '🧠 ConsciousnessLoop',  sub: 'OODA · 6h cycle',        col: C.purple, x: 560  },
    { label: '⚡ AutonomyEngine',      sub: 'Signal-driven · 30min',  col: C.amber,  x: 880  },
    { label: '🎯 MetaBrain',           sub: 'DAG recursive planner',  col: C.blue,   x: 1200 },
    { label: '🌙 NightlyLearning',     sub: '5 modules · 2–3:40 AM',  col: C.green,  x: 1520 },
    { label: '📡 AgentBus',            sub: 'Redis Streams · async',  col: C.teal,   x: 1840 },
    { label: '🛡️ QualityGate',        sub: 'Score ≥ 75 · 2 retries', col: C.red,    x: 2160 },
    { label: '💾 EpisodicMemory',      sub: 'LanceDB · 1536-dim',     col: C.indigo, x: 2480 },
    { label: '🧩 SemanticMemory',      sub: 'SQLite · Goals/OKRs',    col: C.pink,   x: 2800 },
  ];

  const sysY = 320;
  const sysNodes = [];
  systems.forEach((s, i) => {
    const card = makeCard(s.label, s.sub, s.col, 240);
    card.x = 300 + i * 290; card.y = sysY;
    canvas.appendChild(card);
    sysNodes.push(card);
    // Arrow from root
    makeArrow(canvas,
      rootX + 140, rootY + 60,
      card.x + 120, card.y,
      C.cyan, true
    );
  });

  // ── Squads (Level 3) ──────────────────────────────────────
  const squads = [
    { id: 'oracle',   icon: '🔭', name: 'ORACLE',   desc: 'Research & Intelligence', agents: ['Tesla','Feynman','Munger','Shannon'] },
    { id: 'forge',    icon: '⚡', name: 'FORGE',    desc: 'Engineering & Product',   agents: ['Torvalds','Carmack','Martin','Fowler','Kim-DevOps','Allspaw'] },
    { id: 'mercury',  icon: '🚀', name: 'MERCURY',  desc: 'Growth & Distribution',   agents: ['Ogilvy','Schwartz','Holiday','Ellis','Dean','Chen','Vaynerchuk','Neumeier','McKee'] },
    { id: 'atlas',    icon: '🗺️', name: 'ATLAS',    desc: 'Strategy & Operations',  agents: ['Sun-Tzu','Drucker','Grove','Deming'] },
    { id: 'vault',    icon: '💰', name: 'VAULT',    desc: 'Finance, Legal & Risk',   agents: ['Buffett','Graham','Dalio','Taleb'] },
    { id: 'board',    icon: '🎯', name: 'BOARD',    desc: 'Strategic Advisory',      agents: ['Thiel','Musk','Bezos','PG','Dalio','Hormozi','Jobs','Grove'] },
    { id: 'produto',  icon: '🎨', name: 'PRODUTO',  desc: 'Product Vision & UX',     agents: ['Jobs-PM','Ries','Blank','Norman','Gothelf','Fisher'] },
    { id: 'revenue',  icon: '💸', name: 'REVENUE',  desc: 'Sales & Customer Success',agents: ['Gordon','Cialdini','Blount','Mehta','Hsieh','Ekman','Murphy'] },
    { id: 'nexus',    icon: '🤖', name: 'NEXUS',    desc: 'AI & Frontier Innovation',agents: ['Turing','LeCun','Karpathy','Wolfram','Russell'] },
    { id: 'sentinel', icon: '🛡️', name: 'SENTINEL', desc: 'Security & Compliance',  agents: ['Schneier','Mitnick','Zuboff','Lessig'] },
  ];

  const squadY = 560;
  const squadWidth = 5200 / squads.length - 20;
  const squadStartX = 60;

  squads.forEach((sq, i) => {
    const col = SQ[sq.id] ?? C.cyan;
    const sqX = squadStartX + i * (squadWidth + 20);

    // Squad header card
    const sqCard = makeCard(`${sq.icon} ${sq.name}`, sq.desc, col, Math.max(squadWidth, 160), {
      bg: C.surf2, radius: 12, titleSize: 14,
    });
    sqCard.x = sqX; sqCard.y = squadY;
    canvas.appendChild(sqCard);

    // Arrow from AgentBus (central) to squad
    const busCard = sysNodes[4];
    makeArrow(canvas,
      busCard.x + 120, sysY + 56,
      sqX + sqCard.width / 2, squadY,
      col, false
    );

    // Agent cards (Level 4)
    const agentY = squadY + 100;
    sq.agents.forEach((agName, j) => {
      const agCard = makeCard(`· ${agName}`, '', col, Math.max(squadWidth - 10, 140), {
        bg: C.surf, bgOpacity: 0.6, radius: 8, titleSize: 11, stroke: col,
      });
      agCard.x = sqX + 5;
      agCard.y = agentY + j * 52;
      canvas.appendChild(agCard);

      // Thin line from squad card to agent
      makeArrow(canvas,
        sqX + sqCard.width / 2, squadY + 58,
        sqX + 5 + agCard.width / 2, agentY + j * 52,
        col, true
      );
    });
  });

  // ── Memory Layer (Level 5) ────────────────────────────────
  const memY = 2800;
  const memories = [
    { label: '📦 LanceDB',  sub: 'Episodic Memory · Vector Search', col: C.indigo },
    { label: '🗄️  SQLite',  sub: 'Semantic Memory · Goals/OKRs/Facts', col: C.blue },
    { label: '📡 Redis',    sub: 'Agent Bus · Streams · Fallback', col: C.amber },
    { label: '💬 Telegram', sub: 'Channel · Briefings · Approvals', col: C.blue },
    { label: '📱 WhatsApp', sub: 'Channel · Baileys · Allowlist', col: C.green },
    { label: '🎙️ ElevenLabs',sub: 'TTS/STT · EN+PT Voice IDs', col: C.pink },
    { label: '🌐 OpenRouter',sub: 'Primary LLM · DeepSeek/Gemini', col: C.cyan },
  ];

  const memLabel = makeText('── INFRASTRUCTURE & INTEGRATIONS ──', 16, C.muted, 'Bold', 'CENTER');
  memLabel.x = 5200 / 2 - 300; memLabel.y = memY - 40;
  canvas.appendChild(memLabel);

  memories.forEach((m, i) => {
    const mCard = makeCard(m.label, m.sub, m.col, 280);
    mCard.x = 400 + i * 320; mCard.y = memY;
    canvas.appendChild(mCard);
  });

  figma.notify('✅ Organogram built!');
  return page;
}

// =============================================================
// DIAGRAM 2 — MISSION FLOW
// =============================================================
async function buildMissionFlow() {
  const page = getOrCreatePage('🔄 Mission Flow');

  const canvas = makeFrame('Mission Lifecycle', 4200, 1800, C.bg);
  canvas.x = 0; canvas.y = 0;
  page.appendChild(canvas);

  const title = makeText('JARVIS — MISSION LIFECYCLE FLOW', 32, C.cyan, 'Bold', 'CENTER');
  title.x = 4200 / 2 - 450; title.y = 40;
  canvas.appendChild(title);

  // Flow steps - main pipeline
  const steps = [
    { label: '👤 User Input',      sub: 'Telegram · WhatsApp · UI · Desktop', col: C.green,  y: 200 },
    { label: '🌐 Gateway',         sub: 'Express · Port 3001 · Zod validation', col: C.blue,   y: 200 },
    { label: '🗺️  Squad Router',   sub: 'Keyword matching · Confidence 0-100', col: C.amber,  y: 200 },
    { label: '📋 Task Queue',       sub: 'Filesystem · .jarvis/tasks/*.json',  col: C.purple, y: 200 },
    { label: '🎯 MetaBrain',        sub: 'DAG decomposition · 3-12 atomic tasks',col: C.indigo, y: 200 },
    { label: '⚡ Squad Execution',  sub: 'Promise.all · 3–9 agents parallel',  col: C.blue,   y: 200 },
    { label: '🛡️  Quality Gate',   sub: 'Score ≥75 · Max 2 retries · Reject→retry', col: C.red, y: 200 },
    { label: '💾 Episodic Store',   sub: 'LanceDB · 1536-dim · Mission saved', col: C.indigo, y: 200 },
    { label: '📤 Response',         sub: 'Socket.IO · Telegram/WhatsApp push', col: C.green,  y: 200 },
  ];

  const boxW = 200, boxH = 80, startX = 80, flowY = 240, gap = 260;

  steps.forEach((step, i) => {
    const card = makeCard(step.label, step.sub, step.col, boxW, { bg: C.surf2, titleSize: 12 });
    card.x = startX + i * gap; card.y = flowY;
    canvas.appendChild(card);

    if (i > 0) {
      makeArrow(canvas,
        startX + (i - 1) * gap + boxW, flowY + 38,
        startX + i * gap, flowY + 38,
        step.col
      );
    }
  });

  // ── Sub-flow: Agent Loop ──────────────────────────────────
  const agentLoopY = 480;
  const agLabel = makeText('AGENT LOOP (per squad member)', 16, C.muted, 'Bold');
  agLabel.x = startX + 5 * gap; agLabel.y = agentLoopY - 30;
  canvas.appendChild(agLabel);

  const agentSteps = [
    { label: '🧠 System Prompt',  sub: 'DNA + Goals + Episodes', col: C.purple },
    { label: '🔄 ReAct Loop',     sub: 'Max 5 steps · Tool use', col: C.blue   },
    { label: '🔧 Tool Execution', sub: 'recall_memory · query_goals · query_fact', col: C.amber },
    { label: '✅ Agent Output',   sub: 'Structured report · Token-limited', col: C.green  },
  ];

  const agGap = 220;
  agentSteps.forEach((s, i) => {
    const card = makeCard(s.label, s.sub, s.col, 180, { bg: C.surf, titleSize: 11 });
    card.x = startX + 5 * gap + i * agGap; card.y = agentLoopY;
    canvas.appendChild(card);
    if (i > 0) makeArrow(canvas,
      startX + 5 * gap + (i - 1) * agGap + 180, agentLoopY + 35,
      startX + 5 * gap + i * agGap, agentLoopY + 35,
      s.col
    );
  });

  // ── Sub-flow: Redis Streams (inter-squad) ─────────────────
  const busY = 700;
  const busLabel = makeText('INTER-SQUAD EVENT BUS (Redis Streams)', 16, C.muted, 'Bold');
  busLabel.x = startX; busLabel.y = busY - 30;
  canvas.appendChild(busLabel);

  const events = [
    { label: 'RESEARCH_COMPLETE', sub: 'Oracle → Mercury', col: C.purple },
    { label: 'COPY_READY',        sub: 'Mercury → Forge',  col: C.amber  },
    { label: 'CODE_COMPLETE',     sub: 'Forge → Sentinel',  col: C.blue   },
    { label: 'PRD_APPROVED',      sub: 'Produto → Forge',  col: C.pink   },
    { label: 'RISK_ESCALATED',    sub: 'Vault → Board',    col: C.red    },
    { label: 'SENTINEL_VETO',     sub: '→ ALL (halt)',     col: C.red    },
    { label: 'QUALITY_FAILED',    sub: 'Gate → Consciousness', col: C.amber },
    { label: 'AUTONOMOUS_ACTION', sub: 'Consciousness → All',  col: C.cyan  },
  ];

  const evtGap = 240;
  events.forEach((ev, i) => {
    const card = makeCard(ev.label, ev.sub, ev.col, 200, { bg: C.surf, titleSize: 11, radius: 6 });
    card.x = startX + i * evtGap; card.y = busY;
    canvas.appendChild(card);
    if (i > 0) makeArrow(canvas,
      startX + (i - 1) * evtGap + 200, busY + 32,
      startX + i * evtGap, busY + 32,
      ev.col, true
    );
  });

  // ── Quality Gate decision ─────────────────────────────────
  const qgX = startX + 6 * gap, qgY = 960;
  const qgLabel = makeText('QUALITY GATE DECISION', 16, C.muted, 'Bold');
  qgLabel.x = qgX; qgLabel.y = qgY - 30;
  canvas.appendChild(qgLabel);

  const qPaths = [
    { label: '✅ PASS (≥75)',    sub: 'Store to LanceDB → Respond', col: C.green },
    { label: '🔄 RETRY (<75)',   sub: 'Re-run squad (max 2x)', col: C.amber },
    { label: '❌ FAIL',         sub: 'QUALITY_FAILED → Bus → Consciousness', col: C.red },
  ];
  qPaths.forEach((p, i) => {
    const card = makeCard(p.label, p.sub, p.col, 220, { bg: C.surf });
    card.x = qgX + i * 260; card.y = qgY;
    canvas.appendChild(card);
  });

  figma.notify('✅ Mission Flow built!');
  return page;
}

// =============================================================
// DIAGRAM 3 — OODA LOOPS (Consciousness + Autonomy)
// =============================================================
async function buildOODALoop() {
  const page = getOrCreatePage('🔁 OODA Loops');

  const canvas = makeFrame('OODA Loops', 3800, 2200, C.bg);
  canvas.x = 0; canvas.y = 0;
  page.appendChild(canvas);

  const title = makeText('JARVIS — AUTONOMOUS OODA LOOPS', 32, C.cyan, 'Bold', 'CENTER');
  title.x = 3800 / 2 - 400; title.y = 40;
  canvas.appendChild(title);

  // ── Consciousness Loop (left) ─────────────────────────────
  const clTitle = makeText('🧠 CONSCIOUSNESS LOOP  (every 6h)', 22, C.purple, 'Bold');
  clTitle.x = 100; clTitle.y = 120;
  canvas.appendChild(clTitle);

  const clSteps = [
    { n: '1', label: 'ORIENT',           sub: 'Load goals + episodic history (last 4)',   col: C.purple },
    { n: '2', label: 'ASSESS',           sub: 'Find RED/AMBER goals + friction points',   col: C.amber  },
    { n: '3', label: 'DECIDE',           sub: 'LLM proposes mission prompt',              col: C.blue   },
    { n: '4', label: 'CONFIDENCE GATE',  sub: 'ConfidenceEngine: risk · cost · history', col: C.pink   },
    { n: '5', label: 'AUTO_EXECUTE',     sub: 'LOW risk → orchestrator.start()',          col: C.green  },
    { n: '5', label: 'PENDING_APPROVAL', sub: 'HIGH risk → createTask + emit alert',     col: C.red    },
    { n: '6', label: 'REFLECT',          sub: 'Log cycle state · Reset isRunning',        col: C.muted  },
  ];

  const clX = 100, clGap = 80;
  clSteps.slice(0, 4).forEach((s, i) => {
    const card = makeCard(`${s.n}. ${s.label}`, s.sub, s.col, 300, { bg: C.surf2, titleSize: 13 });
    card.x = clX; card.y = 180 + i * (80 + 20);
    canvas.appendChild(card);
    if (i > 0) makeArrow(canvas,
      clX + 150, 180 + (i - 1) * 100 + 68,
      clX + 150, 180 + i * 100,
      s.col
    );
  });

  // Branch: AUTO_EXECUTE vs PENDING_APPROVAL
  const branchY = 180 + 4 * 100;
  const autoCard = makeCard('5a. AUTO_EXECUTE', 'LOW risk → direct execution', C.green, 220, { bg: C.surf });
  autoCard.x = clX - 10; autoCard.y = branchY + 20;
  canvas.appendChild(autoCard);
  makeArrow(canvas, clX + 150, branchY, clX + 100, branchY + 20, C.green);

  const pendCard = makeCard('5b. PENDING_APPROVAL', 'HIGH risk → Founder review', C.red, 220, { bg: C.surf });
  pendCard.x = clX + 330; pendCard.y = branchY + 20;
  canvas.appendChild(pendCard);
  makeArrow(canvas, clX + 150, branchY, clX + 440, branchY + 20, C.red);

  const reflCard = makeCard('6. REFLECT', 'Log state · isRunning = false', C.muted, 300, { bg: C.surf });
  reflCard.x = clX; reflCard.y = branchY + 140;
  canvas.appendChild(reflCard);
  makeArrow(canvas, autoCard.x + 110, branchY + 80, clX + 150, branchY + 140, C.green, true);
  makeArrow(canvas, pendCard.x + 110, branchY + 80, clX + 150, branchY + 140, C.red, true);

  // ── Autonomy Engine (right) ───────────────────────────────
  const aeX = 1800;
  const aeTitle = makeText('⚡ AUTONOMY ENGINE  (every 30min, 6AM–10PM)', 22, C.amber, 'Bold');
  aeTitle.x = aeX; aeTitle.y = 120;
  canvas.appendChild(aeTitle);

  const aePhases = [
    { label: 'ORIENT',            sub: 'Goals status + last 10 episodes',     col: C.purple },
    { label: 'ASSESS: Signals',   sub: 'goal_drift · friction · market · health', col: C.amber },
    { label: 'CANDIDATE SELECT',  sub: 'Match MISSION_BANK · check cooldowns', col: C.blue  },
    { label: 'CONFIDENCE GATE',   sub: 'ConfidenceEngine.assess(prompt, squad)', col: C.pink  },
  ];

  aePhases.forEach((p, i) => {
    const card = makeCard(p.label, p.sub, p.col, 340, { bg: C.surf2, titleSize: 13 });
    card.x = aeX; card.y = 180 + i * 100;
    canvas.appendChild(card);
    if (i > 0) makeArrow(canvas, aeX + 170, 180 + (i - 1) * 100 + 68, aeX + 170, 180 + i * 100, p.col);
  });

  // Signal types sub-section
  const sigY = 200;
  const signals = [
    { label: 'goal_drift',          sub: 'RED/AMBER goals · 12h cooldown', col: C.red    },
    { label: 'execution_friction',  sub: '≥2 failures · 8h cooldown',      col: C.amber  },
    { label: 'market_opportunity',  sub: 'Mon–Fri 8–18h · 24h cooldown',   col: C.green  },
    { label: 'competitor_shift',    sub: 'Mon 9AM · 168h cooldown',        col: C.blue   },
    { label: 'system_health',       sub: '22h+ · 24h cooldown',            col: C.purple },
  ];
  const sigX = aeX + 380;
  const sigTitle = makeText('Signal Types', 15, C.muted, 'Bold');
  sigTitle.x = sigX; sigTitle.y = 180;
  canvas.appendChild(sigTitle);
  signals.forEach((s, i) => {
    const c = makeCard(s.label, s.sub, s.col, 260, { bg: C.surf, radius: 6, titleSize: 11 });
    c.x = sigX; c.y = sigY + 30 + i * 65;
    canvas.appendChild(c);
  });

  // ACT branch
  const actY = 180 + 4 * 100 + 20;
  const actAutoCard = makeCard('AUTO_EXECUTE', 'orchestrator.start() · fire & forget', C.green, 240, { bg: C.surf });
  actAutoCard.x = aeX - 10; actAutoCard.y = actY;
  canvas.appendChild(actAutoCard);
  makeArrow(canvas, aeX + 170, actY - 20, aeX + 110, actY, C.green);

  const actPendCard = makeCard('PENDING_APPROVAL', 'createTask → emit jarvis/alert', C.red, 240, { bg: C.surf });
  actPendCard.x = aeX + 360; actPendCard.y = actY;
  canvas.appendChild(actPendCard);
  makeArrow(canvas, aeX + 170, actY - 20, aeX + 480, actY, C.red);

  // ── Confidence Engine detail ──────────────────────────────
  const ceY = 1200;
  const ceTitle = makeText('🧮 CONFIDENCE ENGINE — Decision Logic', 22, C.pink, 'Bold');
  ceTitle.x = 100; ceTitle.y = ceY;
  canvas.appendChild(ceTitle);

  const ceFactors = [
    { label: 'Task Type Detection',   sub: 'research/writing → LOW  |  deploy/delete → CRITICAL', col: C.purple },
    { label: 'Risk Level',            sub: 'LOW · MEDIUM · HIGH · CRITICAL (per task type)',       col: C.red    },
    { label: 'Reversibility',         sub: 'research=true · deploy=false · delete=false',          col: C.amber  },
    { label: 'Cost Estimate',         sub: '$0.01–$5.00 · agents × base cost per type',            col: C.green  },
    { label: 'Historical Success',    sub: 'Episodic memory query · rolling success rate %',       col: C.blue   },
    { label: 'Confidence Score',      sub: 'Weighted 0–100 · threshold ≥65 for AUTO_EXECUTE',     col: C.pink   },
  ];

  const ceGap = 280;
  ceFactors.forEach((f, i) => {
    const card = makeCard(f.label, f.sub, f.col, 260, { bg: C.surf2 });
    card.x = 100 + i * ceGap; card.y = ceY + 50;
    canvas.appendChild(card);
    if (i > 0) makeArrow(canvas,
      100 + (i - 1) * ceGap + 260, ceY + 85,
      100 + i * ceGap, ceY + 85,
      f.col
    );
  });

  const threshold = makeCard('AUTO_EXECUTE IF:  risk=LOW  ·  reversible=true  ·  cost<$0.10  ·  success≥70%  ·  score≥65',
    '', C.cyan, 1400, { bg: C.surf2, radius: 8, titleSize: 13 });
  threshold.x = 100; threshold.y = ceY + 170;
  canvas.appendChild(threshold);

  figma.notify('✅ OODA Loops built!');
  return page;
}

// =============================================================
// DIAGRAM 4 — SYSTEM ARCHITECTURE (Tech Stack)
// =============================================================
async function buildStackDiagram() {
  const page = getOrCreatePage('🏗️ System Architecture');

  const canvas = makeFrame('System Architecture', 3600, 2000, C.bg);
  canvas.x = 0; canvas.y = 0;
  page.appendChild(canvas);

  const title = makeText('JARVIS PLATFORM — SYSTEM ARCHITECTURE', 32, C.cyan, 'Bold', 'CENTER');
  title.x = 3600 / 2 - 430; title.y = 40;
  canvas.appendChild(title);

  // Layers
  const layers = [
    {
      name: '📱 INPUT CHANNELS',
      col: C.green,
      y: 120,
      items: [
        { label: '💬 Telegram', sub: 'Briefings · Approvals · Alerts', col: C.blue },
        { label: '📱 WhatsApp', sub: 'Baileys · Text + Audio · Allowlist', col: C.green },
        { label: '🖥️  Desktop UI', sub: 'React · Vite · Socket.IO · Port 5173', col: C.purple },
        { label: '🌐 REST API',   sub: 'Fastify · Port 3000 · OpenAPI', col: C.amber },
      ],
    },
    {
      name: '🌐 GATEWAY LAYER',
      col: C.blue,
      y: 380,
      items: [
        { label: 'jarvis-gateway', sub: 'Express · TypeScript · Port 3001', col: C.blue },
        { label: 'Channel Router', sub: 'Telegram ↔ WhatsApp ↔ Socket.IO', col: C.teal },
        { label: 'Provider Router', sub: 'DeepSeek · Gemini · Kimi fallback', col: C.purple },
        { label: 'Rate Limiter',   sub: 'Circuit breaker · Backoff · Trip/Reset', col: C.amber },
      ],
    },
    {
      name: '⚙️  CORE BACKEND',
      col: C.purple,
      y: 640,
      items: [
        { label: 'jarvis-backend',   sub: 'Fastify · TypeScript · Socket.IO · Port 3000', col: C.purple },
        { label: 'MissionOrchestrator', sub: 'Lifecycle · Route · Execute · Store', col: C.blue },
        { label: 'ConsciousnessLoop',   sub: '6h OODA · ConfidenceEngine gated', col: C.pink },
        { label: 'AutonomyEngine',       sub: '30min · Signal-driven · 5 mission types', col: C.amber },
        { label: 'MetaBrain',           sub: 'DAG · Topological · 3 parallel nodes', col: C.indigo },
        { label: 'QualityGate',         sub: '75/100 threshold · 2 retries · Reject', col: C.red },
        { label: 'NightlyLearning',     sub: '5 modules · 2–3:40 AM · Mutations', col: C.green },
        { label: 'AgentBus',            sub: 'Redis Streams · 9 message types', col: C.teal },
      ],
    },
    {
      name: '🤖 AI PROVIDERS',
      col: C.cyan,
      y: 960,
      items: [
        { label: '🧠 DeepSeek',    sub: 'Primary LLM · OpenRouter', col: C.cyan },
        { label: '✨ Gemini',      sub: 'Fallback · Google AI',     col: C.blue },
        { label: '🌙 Kimi',        sub: 'Fallback · MoonshotAI',    col: C.purple },
        { label: '🎙️ ElevenLabs', sub: 'TTS + STT · EN + PT',      col: C.pink },
        { label: '📊 OpenAI',      sub: 'Embeddings · 1536-dim',    col: C.green },
      ],
    },
    {
      name: '💾 STORAGE & MEMORY',
      col: C.indigo,
      y: 1200,
      items: [
        { label: '📦 LanceDB',    sub: 'Episodic Memory · Local vector store', col: C.indigo },
        { label: '🗄️  SQLite',   sub: 'Semantic Memory · Goals/OKRs/Facts',   col: C.blue   },
        { label: '📡 Redis',      sub: 'Agent Bus · Streams (fallback: Promise.all)', col: C.amber },
        { label: '📂 Filesystem', sub: 'Task queue · DAGs · Pending mutations',    col: C.green  },
      ],
    },
    {
      name: '🔄 PROCESS MANAGER',
      col: C.amber,
      y: 1460,
      items: [
        { label: 'PM2', sub: 'jarvis-backend · jarvis-gateway · jarvis-ui · always alive', col: C.amber },
        { label: 'tsx watch', sub: 'Hot-reload in dev mode', col: C.muted },
        { label: 'node-cron', sub: 'Consciousness · Learning · Briefing · Autonomy', col: C.purple },
      ],
    },
  ];

  layers.forEach((layer) => {
    const layerLabel = makeText(`── ${layer.name} ──`, 16, layer.col, 'Bold');
    layerLabel.x = 80; layerLabel.y = layer.y;
    canvas.appendChild(layerLabel);

    const itemGap = 380;
    layer.items.forEach((item, j) => {
      const card = makeCard(item.label, item.sub, item.col, 340, {
        bg: C.surf2, radius: 8, titleSize: 12,
      });
      card.x = 80 + j * itemGap; card.y = layer.y + 34;
      canvas.appendChild(card);
    });

    // Separator line
    const sep = figma.createLine();
    sep.resize(3440, 0);
    sep.x = 80; sep.y = layer.y + 130;
    sep.strokes = fills(layer.col, 0.15);
    sep.strokeWeight = 1;
    canvas.appendChild(sep);
  });

  figma.notify('✅ System Architecture built!');
  return page;
}

// =============================================================
// DIAGRAM 5 — BRAINSTORM / MIND MAP
// =============================================================
async function buildBrainstorm() {
  const page = getOrCreatePage('💡 Brainstorm');

  const canvas = makeFrame('JARVIS Brainstorm', 4800, 4800, C.bg);
  canvas.x = 0; canvas.y = 0;
  page.appendChild(canvas);

  const title = makeText('J.A.R.V.I.S. — MIND MAP & BRAINSTORM', 32, C.cyan, 'Bold', 'CENTER');
  title.x = 4800 / 2 - 440; title.y = 40;
  canvas.appendChild(title);

  // Central node
  const cx = 4800 / 2, cy = 2400;
  const center = makeCard('⚙️ J.A.R.V.I.S.', 'Autonomous Intelligence OS', C.cyan, 280, {
    bg: C.surf2, titleSize: 20, radius: 999,
  });
  center.x = cx - 140; center.y = cy - 40;
  canvas.appendChild(center);

  // Branches radiating from center
  const branches = [
    {
      label: '🧠 Autonomous Intelligence',
      col: C.purple,
      angle: -90,
      dist: 500,
      children: [
        'ConsciousnessLoop (6h OODA)',
        'AutonomyEngine (30min)',
        'MetaBrain DAG Planner',
        'ConfidenceEngine Gating',
        'AUTO_EXECUTE vs APPROVAL',
      ],
    },
    {
      label: '🤝 Multi-Squad Architecture',
      col: C.blue,
      angle: -30,
      dist: 500,
      children: [
        '11 Specialized Squads',
        '59 DNA-coded Agents',
        'Squad Router (keyword)',
        'Parallel Promise.all',
        'Redis Streams Handover',
      ],
    },
    {
      label: '💾 Memory Systems',
      col: C.indigo,
      angle: 30,
      dist: 500,
      children: [
        'Episodic (LanceDB vectors)',
        'Semantic (SQLite goals)',
        'RAG Mid-Thought injection',
        'Nightly Learning Cycle',
        'DNA Auto-Mutation',
      ],
    },
    {
      label: '📡 Communication Channels',
      col: C.green,
      angle: 90,
      dist: 500,
      children: [
        'Telegram Bot (briefings)',
        'WhatsApp (Baileys)',
        'ElevenLabs TTS/STT',
        'React Dashboard',
        'Socket.IO real-time',
      ],
    },
    {
      label: '🛡️ Quality & Security',
      col: C.red,
      angle: 150,
      dist: 500,
      children: [
        'QualityGate (score ≥75)',
        'SENTINEL Squad (4 agents)',
        'Sandbox VM isolation',
        'Rate limiter circuit breaker',
        'SENTINEL_VETO broadcast',
      ],
    },
    {
      label: '🌙 Learning & Growth',
      col: C.amber,
      angle: -150,
      dist: 500,
      children: [
        'Nightly Learning (5 modules)',
        'Error Archaeology',
        'Web Intelligence Harvest',
        'Self-Calibration',
        'Genesis Engine (new agents)',
      ],
    },
  ];

  branches.forEach(branch => {
    const rad = (branch.angle * Math.PI) / 180;
    const bx = cx + Math.cos(rad) * branch.dist;
    const by = cy + Math.sin(rad) * branch.dist;

    // Branch node
    const bCard = makeCard(branch.label, '', branch.col, 300, { bg: C.surf2, radius: 12, titleSize: 15 });
    bCard.x = bx - 150; bCard.y = by - 30;
    canvas.appendChild(bCard);

    // Line from center to branch
    makeArrow(canvas, cx, cy, bx - 20, by, branch.col);

    // Child leaves
    branch.children.forEach((child, j) => {
      const angle2 = branch.angle + (j - 2) * 18;
      const rad2 = (angle2 * Math.PI) / 180;
      const lx = bx + Math.cos(rad2) * 340;
      const ly = by + Math.sin(rad2) * 340;

      const leaf = makeCard(`· ${child}`, '', branch.col, 240, { bg: C.surf, radius: 8, titleSize: 11 });
      leaf.x = lx - 120; leaf.y = ly - 20;
      canvas.appendChild(leaf);

      makeArrow(canvas, bx, by, lx - 20, ly, branch.col, true);
    });
  });

  figma.notify('✅ Brainstorm built!');
  return page;
}

// =============================================================
// MAIN
// =============================================================
async function main() {
  await loadFonts();
  figma.notify('🚀 Building JARVIS Architecture Diagrams...');

  await buildOrganogram();
  await buildMissionFlow();
  await buildOODALoop();
  await buildStackDiagram();
  await buildBrainstorm();

  // Navigate to organogram
  const orgPage = figma.root.children.find(p => p.name === '🧠 Organogram');
  if (orgPage) figma.currentPage = orgPage;

  figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);
  figma.closePlugin('✅ All 5 JARVIS diagrams created! Check each page.');
}
