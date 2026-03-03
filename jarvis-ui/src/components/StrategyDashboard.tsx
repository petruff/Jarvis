import React, { useState } from "react";

// ─── PALETTE ───────────────────────────────────────────────────────────────
const C = {
    bg: "#040810",
    surface: "#07101E",
    card: "#0A1526",
    border: "#0E1F38",
    hot: "#152840",
    gold: "#E09A10",
    goldSoft: "#B8780A",
    goldDim: "#2A1E04",
    blue: "#1A6FE8",
    blueL: "#3D8EFF",
    blueDim: "#0A1F40",
    cyan: "#00BFD8",
    cyanDim: "#003D46",
    green: "#00B87A",
    greenDim: "#003325",
    red: "#E84040",
    redDim: "#320A0A",
    orange: "#F07020",
    purple: "#9050F0",
    purpleDim: "#200A40",
    amber: "#F0A020",
    text: "#8EAABF",
    textDim: "#2E4A60",
    white: "#EBF4FF",
};

// ─── SQUADS ────────────────────────────────────────────────────────────────
const SQUADS = [
    {
        id: "oracle",
        name: "ORACLE",
        tagline: "Inteligência & Pesquisa Profunda",
        color: C.cyan,
        icon: "🔭",
        file: "oracle.ts",
        agents: [
            { name: "Tesla", role: "First Principles", dna: "Nikola Tesla", trait: "Decompõe qualquer problema até os axiomas irredutíveis. Recusa analogias preguiçosas." },
            { name: "Feynman", role: "Mental Model Builder", dna: "Richard Feynman", trait: "Explica o complexo com simplicidade brutal. Se não consegue ensinar, não entendeu." },
            { name: "Munger", role: "Multi-Disciplinary", dna: "Charlie Munger", trait: "Aplica latticework de modelos mentais. Pensa inversamente — o que pode dar errado?" },
            { name: "Shannon", role: "Information Theory", dna: "Claude Shannon", trait: "Quantifica incerteza. Encontra o sinal no ruído. Máxima compressão de insights." },
        ],
        triggers: ["pesquise", "analise", "entenda", "mapeie", "descubra"],
        deliverables: ["research-brief.md", "competitive-map.md", "insight-report.md"],
    },
    {
        id: "forge",
        name: "FORGE",
        tagline: "Engenharia & DevOps de Excelência",
        color: C.green,
        icon: "⚡",
        file: "forge.ts",
        agents: [
            { name: "Torvalds", role: "Systems Architect", dna: "Linus Torvalds", trait: "Exige código que funciona, não bonito. Zero tolerância para abstração prematura." },
            { name: "Carmack", role: "Performance Engineer", dna: "John Carmack", trait: "Obsessão com performance e elegância técnica. Escreve código que dura décadas." },
            { name: "Martin", role: "Clean Code", dna: "Robert C. Martin", trait: "SOLID, refactoring, naming. O código é lido por humanos, não máquinas." },
            { name: "Kim", role: "DevOps Lead", dna: "Gene Kim", trait: "CI/CD, flow, loops de feedback. A velocidade de deploy é a velocidade de aprendizado." },
        ],
        triggers: ["construa", "implemente", "code", "arquitete", "refatore"],
        deliverables: ["architecture.md", "implementation/", "qa-report.md"],
    },
    {
        id: "mercury",
        name: "MERCURY",
        tagline: "Marketing, Growth & Distribuição",
        color: C.orange,
        icon: "🚀",
        file: "mercury.ts",
        agents: [
            { name: "Ogilvy", role: "CMO", dna: "David Ogilvy", trait: "O cliente não é idiota, é sua esposa. Copy que vende, não que ganha prêmio." },
            { name: "Schwartz", role: "Conversion Copy", dna: "Eugene Schwartz", trait: "Consciência do prospect define a mensagem. Awareness → Interest → Desire → Action." },
            { name: "Holiday", role: "Content Strategy", dna: "Ryan Holiday", trait: "Conteúdo perene supera viral. Earned media supera paid. PR como leverage." },
            { name: "Ellis", role: "Growth Hacker", dna: "Sean Ellis", trait: "PMF primeiro, growth depois. AARRR funnel. Experimenta 20 canais, escala 2." },
        ],
        triggers: ["copy", "landing", "growth", "venda", "campanha", "funil"],
        deliverables: ["campaign-brief.md", "copy/", "funnel-map.md"],
    },
    {
        id: "atlas",
        name: "ATLAS",
        tagline: "Estratégia, Operações & Execução",
        color: C.purple,
        icon: "🗺️",
        file: "atlas.ts",
        agents: [
            { name: "Sun-Tzu", role: "Strategic Warfare", dna: "Sun Tzu", trait: "Toda batalha é ganha antes de ser travada. Conheça o inimigo. Escolha o campo." },
            { name: "Drucker", role: "Management Science", dna: "Peter Drucker", trait: "Cultura come estratégia no café da manhã. O que não é medido não é gerenciado." },
            { name: "Grove", role: "OKR Executor", dna: "Andy Grove", trait: "Output é a medida. High leverage activities only. Paranoia produtiva como vantagem." },
            { name: "Deming", role: "Quality Systems", dna: "W. Edwards Deming", trait: "85% dos problemas são do sistema, não das pessoas. Elimine variação. Melhoria contínua." },
        ],
        triggers: ["estratégia", "operações", "prioridade", "okr", "processo"],
        deliverables: ["strategy-brief.md", "okr-map.md", "sop/"],
    },
    {
        id: "vault",
        name: "VAULT",
        tagline: "Finanças, Legal & Risco",
        color: C.amber,
        icon: "💰",
        file: "vault.ts",
        agents: [
            { name: "Buffett", role: "CFO", dna: "Warren Buffett", trait: "LTV:CAC, Margem, Moat. Pensa em décadas, não em trimestres." },
            { name: "Taleb", role: "Risk Officer", dna: "Nassim Taleb", trait: "Tail Risk, Antifragilidade, Barbell. Elimina ruína antes de buscar lucro." },
            { name: "Graham", role: "Capital Allocator", dna: "Benjamin Graham", trait: "Intrinsic Value, Margin of Safety. Mr. Market é maníaco-depressivo — você decide quando negociar." },
            { name: "Schneier", role: "CSO", dna: "Bruce Schneier", trait: "Threat models, InfoSec, Zero Trust. Segurança não é produto, é processo." },
        ],
        triggers: ["financeiro", "burn", "runway", "legal", "risco", "valuation"],
        deliverables: ["financial-model.md", "risk-report.md", "legal-review.md"],
    },
    {
        id: "board",
        name: "BOARD",
        tagline: "Advisors Estratégicos de Alto Nível",
        color: C.red,
        icon: "🎯",
        file: "board.ts",
        agents: [
            { name: "Thiel", role: "Contrarian", dna: "Peter Thiel", trait: "Zero to One. Monopólios criados, não encontrados. O que todo mundo sabe está errado." },
            { name: "Musk", role: "10x Thinker", dna: "Elon Musk", trait: "First Principles. Physics constraints. Velocidade de execução é vantagem competitiva." },
            { name: "Bezos", role: "Customer Obsessor", dna: "Jeff Bezos", trait: "Day 1. Working Backwards. Flywheel. Obsessão com o cliente supera obsessão com competidores." },
            { name: "Dalio", role: "Principles", dna: "Ray Dalio", trait: "Radical Transparency. 5-Step Process. Believability-weighted decisions." },
        ],
        triggers: ["decisão", "visão", "estratégia alto nível", "board", "advisors"],
        deliverables: ["board-brief.md", "decision-memo.md"],
    },
    {
        id: "produto",
        name: "PRODUTO",
        tagline: "Product Management & UX",
        color: C.blue,
        icon: "🎨",
        file: "produto.ts",
        agents: [
            { name: "Jobs-PM", role: "Product Visionary", dna: "Steve Jobs", trait: "Simplicidade é a máxima sofisticação. O cliente não sabe o que quer até você mostrar." },
            { name: "Ries", role: "Lean Startup", dna: "Eric Ries", trait: "Build-Measure-Learn. MVP mínimo para validar hipótese. Pivot ou persevere." },
            { name: "Blank", role: "Customer Dev", dna: "Steve Blank", trait: "Get out of the building. Hipóteses viram fatos só com dados reais de clientes." },
            { name: "Norman", role: "UX Designer", dna: "Don Norman", trait: "Design centrado no humano. Affordances, feedback, mental models. Blame the design, not the user." },
        ],
        triggers: ["produto", "feature", "ux", "roadmap", "user story", "priorize"],
        deliverables: ["product-brief.md", "user-stories.md", "wireframe-notes.md"],
    },
    {
        id: "revenue",
        name: "REVENUE",
        tagline: "Sales, Pricing & Monetização",
        color: C.green,
        icon: "💸",
        file: "revenue.ts",
        agents: [
            { name: "Gordon", role: "Sales Director", dna: "Jordan Belfort", trait: "Tonalidade, urgência, fechamento. Straight Line Persuasion. Every no is closer to yes." },
            { name: "Cialdini", role: "Influence Engineer", dna: "Robert Cialdini", trait: "Reciprocidade, Scarcity, Authority, Social Proof. Influence by design." },
            { name: "Hormozi", role: "Offer Architect", dna: "Alex Hormozi", trait: "Grand Slam Offer. Stack value, não preço. $100M offers começam com quem, não com o quê." },
            { name: "Mehta", role: "Customer Success", dna: "Nick Mehta", trait: "Churn prevention é a melhor growth strategy. Customer health score como KPI primário." },
        ],
        triggers: ["vendas", "preço", "pricing", "receita", "churn", "LTV", "oferta"],
        deliverables: ["sales-playbook.md", "pricing-model.md", "offer-brief.md"],
    },
    {
        id: "nexus",
        name: "NEXUS",
        tagline: "IA, Futuro & Inovação de Fronteira",
        color: C.blue,
        icon: "🤖",
        file: "nexus.ts",
        agents: [
            { name: "Turing", role: "Computation Theorist", dna: "Alan Turing", trait: "Tudo é computável ou não. Define limites formais do que pode ser resolvido." },
            { name: "Karpathy", role: "Practical AI Engineer", dna: "Andrej Karpathy", trait: "IA do zero. Entende os gradientes. Prefere implementar a teorizar." },
            { name: "LeCun", role: "Deep Learning Architect", dna: "Yann LeCun", trait: "World models. Auto-supervisão. IA que entende o mundo em vez de memorizar padrões." },
            { name: "Wolfram", role: "Computational Thinker", dna: "Stephen Wolfram", trait: "Computação como fundamento do universo. Regras simples → complexidade emergente." },
        ],
        triggers: ["IA", "modelo", "ML", "automação", "futuro", "inovação"],
        deliverables: ["ai-strategy.md", "tech-brief.md", "innovation-report.md"],
    },
];

// --- GAPS - REAL v5.0 REMAINING WORK -------------------------------------------
const GAPS = [
    {
        id: "stability",
        title: "Phase 3 - Stability & Reliability",
        status: "EM PROGRESSO",
        color: C.red,
        priority: 1,
        why: "Sistema derruba SECURE.NET nos restarts. WhatsApp mostra NOT LINKED mesmo autenticado.",
        what: [
            "\u2705 App.tsx: ouvir whatsapp/ready socket - atualizar LINKED status",
            "\u2705 Confirmar telegram.ts do backend nao importado (sem conflito 409)",
            "Validar campo source chegando correto na UI (context.source)",
            "pm2 ecosystem.config.js - 1 comando para iniciar tudo",
        ],
        effort: "2h",
        impact: "Sistema estavel, sem OFFLINE falsos, sem conflitos Telegram",
    },
    {
        id: "memory",
        title: "Phase 4 - Memory & Intelligence",
        status: "PROXIMO",
        color: C.orange,
        priority: 2,
        why: "jarvis-backend perde contexto em cada restart. Cross-session intelligence e zero.",
        what: [
            "Persistencia de arquivo no jarvis-backend/src/memory.ts (igual ao gateway)",
            "Feed de historico de squads na UI (timeline de missoes anteriores)",
            "Cross-session memory: JARVIS lembra decisoes entre restarts",
            "Contexto automatico injetado em cada prompt baseado em missoes passadas",
        ],
        effort: "3h",
        impact: "JARVIS que aprende e lembra - nao comeca do zero cada sessao",
    },
    {
        id: "voice",
        title: "Phase 5 - Voice Squad Integration",
        status: "PLANEJADO",
        color: C.amber,
        priority: 3,
        why: "Comandos de voz vao para commandHandler, nao para o orchestrator do gateway. Desconexao total.",
        what: [
            "Voz desktop - squad orchestrator via bridge (mesma rota do Telegram)",
            "ElevenLabs le o resultado consolidado do Kimi apos missao de squad",
            "Feedback de voz: Oracle e Forge estao trabalhando na sua missao",
            "Estado LISTENING no UI acende os squads detectados no organograma",
        ],
        effort: "3h",
        impact: "Controle total por voz: 9 squads a 1 frase de distancia",
    },
    {
        id: "autonomy",
        title: "Phase 6 - Autonomy & Automation",
        status: "FUTURO",
        color: C.blue,
        priority: 4,
        why: "JARVIS ainda e reativo. Falta iniciativa autonoma: missoes agendadas, alertas proativos.",
        what: [
            "Missoes agendadas via cron (ex: briefing de mercado todo dia 8h)",
            "JARVIS surfaca riscos/oportunidades sem ser perguntado",
            "Kanban: botao Ver Arquivo abre deliverables criados pelo Forge/Oracle",
            "Fluxos de aprovacao: [AGUARDANDO APROVACAO] - botao Aprovar/Rejeitar",
        ],
        effort: "Fase 2",
        impact: "JARVIS passa de assistente para Chief of Staff autonomo",
    },
    {
        id: "production",
        title: "Phase 7 - Production Hardening",
        status: "FUTURO",
        color: C.purple,
        priority: 5,
        why: "Sistema roda em terminais manuais, sem monitoramento, sem custo tracking. Nao e producao.",
        what: [
            "pm2 + ecosystem.config.js para os 3 servicos (backend, gateway, ui)",
            "Error telemetry - dashboard: falhas de squad com stack trace completo",
            "Token cost tracker por missao exibido no card do Kanban",
            "Health check endpoint: /api/health com status de todos os sistemas",
        ],
        effort: "Fase 2",
        impact: "Sistema de producao real: monitored, costed, auto-recovering",
    },
];


// ─── COMPONENTS ────────────────────────────────────────────────────────────
interface TagProps { label: string; color: string; small?: boolean; }
const Tag: React.FC<TagProps> = ({ label, color, small }) => (
    <span style={{
        display: "inline-block", padding: small ? "1px 7px" : "2px 9px",
        borderRadius: 3, background: color + "18", border: `1px solid ${color}35`,
        color, fontSize: small ? 9 : 10, letterSpacing: 1, fontWeight: 700,
        fontFamily: "monospace",
    }}>{label}</span>
);


const STitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 3, marginBottom: 16, fontFamily: "monospace", fontWeight: 700, borderBottom: `1px solid ${C.border}`, paddingBottom: 8 }}>
        {children}
    </div>
);

// ─── MAIN ──────────────────────────────────────────────────────────────────
export default function StrategyDashboard({ onClose }: { onClose: () => void }) {
    const [tab, setTab] = useState("gaps");
    const [selectedSquad, setSelectedSquad] = useState("oracle");
    const [selectedGap, setSelectedGap] = useState<string | null>(null);

    const squad = SQUADS.find(s => s.id === selectedSquad);

    const tabs = [
        { id: "gaps", label: "🚀 O QUE FALTA" },
        { id: "squads", label: "🧬 9 SQUADS" },
        { id: "flow", label: "⚡ FLUXO AGENTIC" },
        { id: "files", label: "📂 ESTRUTURA" },
    ];

    return (
        <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Courier New', monospace", color: C.white, position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 100 }}>
            <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes glow { 0%,100%{box-shadow:0 0 8px ${C.gold}20} 50%{box-shadow:0 0 28px ${C.gold}50} }
        @keyframes in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #040810; }
        ::-webkit-scrollbar-thumb { background: #1A2E44; borderRadius: 3px; }
      `}</style>

            {/* TOP */}
            <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontSize: 26, animation: "glow 3s infinite" }}>⚡</div>
                    <div>
                        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 5, color: C.gold }}>JARVIS v5.0</div>
                        <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 3 }}>FULLY AGENTIC — 9 SQUADS — 42 MINDS — TELEGRAM + WHATSAPP + DESKTOP</div>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button onClick={onClose} style={{
                        background: C.red + '20', border: `1px solid ${C.red}`, color: C.red,
                        padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontWeight: 900,
                        fontSize: 10, letterSpacing: 1
                    }}>CLOSE</button>
                </div>
            </div>

            {/* NAV */}
            <div style={{ display: "flex", gap: 2, padding: "10px 28px", background: C.surface, borderBottom: `1px solid ${C.border}` }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        padding: "7px 16px", border: "none", borderRadius: 5, cursor: "pointer",
                        fontFamily: "monospace", fontSize: 11, letterSpacing: 1, fontWeight: 700,
                        background: tab === t.id ? C.gold : "transparent",
                        color: tab === t.id ? C.bg : C.textDim,
                        transition: "all 0.15s",
                    }}>{t.label}</button>
                ))}
            </div>

            <div style={{ padding: "28px", maxWidth: 1280, margin: "0 auto", paddingBottom: 100 }}>

                {/* ══════════════════════════════════════════════════════
            O QUE FALTA
        ══════════════════════════════════════════════════════ */}
                {tab === "gaps" && (
                    <div style={{ animation: "in 0.3s ease" }}>
                        <STitle>JARVIS v5.0 — STATUS ATUAL & PRÓXIMAS FASES</STitle>

                        {/* Summary bar */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                            {[
                                { label: "CONCLUÍDAS (Fases 1-2)", val: "2", sub: "Squad system + Bridge + Dashboard", color: C.green },
                                { label: "EM PROGRESSO (Fase 3)", val: "1", sub: "Stability & Reliability", color: C.orange },
                                { label: "FUTURAS (Fases 4-7)", val: "4", sub: "Memory, Voice, Autonomy, Prod", color: C.blue },
                                { label: "Squads Operacionais", val: "9", sub: "42 agentes com DNA personas", color: C.gold },
                            ].map(s => (
                                <div key={s.label} style={{ background: C.card, border: `1px solid ${s.color}30`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                                    <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.val}</div>
                                    <div style={{ fontSize: 11, color: C.white, fontWeight: 700, margin: "4px 0 2px" }}>{s.label}</div>
                                    <div style={{ fontSize: 10, color: C.text }}>{s.sub}</div>
                                </div>
                            ))}
                        </div>

                        {/* Gap cards */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {GAPS.map((gap, i) => (
                                <div key={gap.id} onClick={() => setSelectedGap(selectedGap === gap.id ? null : gap.id)}
                                    style={{ background: C.card, border: `1px solid ${selectedGap === gap.id ? gap.color : C.border}`, borderLeft: `4px solid ${gap.color}`, borderRadius: 10, padding: "16px 20px", cursor: "pointer", transition: "all 0.15s" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: "50%", background: gap.color + "20", border: `2px solid ${gap.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: gap.color, flexShrink: 0 }}>{i + 1}</div>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: C.white }}>{gap.title}</div>
                                                    <Tag label={gap.status} color={gap.color} />
                                                </div>
                                                <div style={{ fontSize: 11, color: C.text }}>{gap.why.split(".")[0]}.</div>
                                            </div>
                                        </div>
                                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 1 }}>ESFORÇO</div>
                                                <div style={{ fontSize: 13, color: gap.color, fontWeight: 700 }}>{gap.effort}</div>
                                            </div>
                                            <div style={{ fontSize: 16, color: C.textDim }}>{selectedGap === gap.id ? "▲" : "▼"}</div>
                                        </div>
                                    </div>

                                    {selectedGap === gap.id && (
                                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}`, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                            <div>
                                                <div style={{ fontSize: 10, color: gap.color, letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>POR QUE É NECESSÁRIO</div>
                                                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.7 }}>{gap.why}</div>
                                                <div style={{ marginTop: 12 }}>
                                                    <div style={{ fontSize: 10, color: C.green, letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>✦ IMPACTO</div>
                                                    <div style={{ fontSize: 12, color: C.green }}>{gap.impact}</div>
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, color: gap.color, letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>O QUE FAZER</div>
                                                {gap.what.map((w, j) => (
                                                    <div key={j} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
                                                        <div style={{ width: 18, height: 18, borderRadius: 3, background: gap.color + "20", border: `1px solid ${gap.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: gap.color, flexShrink: 0, marginTop: 1 }}>{j + 1}</div>
                                                        <div style={{ fontSize: 11, color: C.text, lineHeight: 1.5 }}>{w}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
            6 SQUADS
        ══════════════════════════════════════════════════════ */}
                {tab === "squads" && (
                    <div style={{ animation: "in 0.3s ease" }}>
                        <STitle>6 SQUADS — 24 MENTES BRILHANTES — TRABALHAM PARA VOCÊ VIA TASK DELEGATION</STitle>

                        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
                            {/* Squad selector */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {SQUADS.map(s => (
                                    <div key={s.id} onClick={() => setSelectedSquad(s.id)} style={{
                                        background: selectedSquad === s.id ? s.color + "18" : C.card,
                                        border: `1px solid ${selectedSquad === s.id ? s.color : C.border}`,
                                        borderLeft: `4px solid ${s.color}`,
                                        borderRadius: 8, padding: "12px 14px", cursor: "pointer", transition: "all 0.15s",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                            <span style={{ fontSize: 20 }}>{s.icon}</span>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 900, color: s.color, letterSpacing: 2 }}>{s.name}</div>
                                                <div style={{ fontSize: 10, color: C.text, marginTop: 2 }}>{s.tagline}</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Squad detail */}
                            {squad && (
                                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                    {/* Header */}
                                    <div style={{ background: C.card, border: `2px solid ${squad.color}50`, borderRadius: 12, padding: "20px 24px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
                                            <div style={{ fontSize: 40 }}>{squad.icon}</div>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                                                    <div style={{ fontSize: 22, fontWeight: 900, color: squad.color, letterSpacing: 3 }}>SQUAD {squad.name}</div>
                                                    <Tag label={squad.file} color={squad.color} />
                                                </div>
                                                <div style={{ fontSize: 13, color: C.text }}>{squad.tagline}</div>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 6 }}>ATIVADO QUANDO A MISSÃO CONTÉM</div>
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                                {squad.triggers.map(t => <Tag key={t} label={t} color={squad.color} />)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* 4 Agents */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                        {squad.agents.map((agent, i) => (
                                            <div key={agent.name} style={{ background: C.surface, border: `1px solid ${squad.color}30`, borderRadius: 10, padding: "16px 18px", position: "relative" }}>
                                                <div style={{ position: "absolute", top: 8, right: 10 }}>
                                                    <Tag label={`AGENTE ${i + 1}`} color={squad.color} small />
                                                </div>
                                                <div style={{ fontSize: 22, fontWeight: 900, color: squad.color, marginBottom: 2 }}>{agent.name}</div>
                                                <div style={{ fontSize: 10, color: C.text, letterSpacing: 1, marginBottom: 8 }}>{agent.role.toUpperCase()}</div>
                                                <div style={{ fontFamily: "monospace", fontSize: 10, color: C.textDim, background: C.bg, padding: "4px 10px", borderRadius: 4, marginBottom: 10 }}>DNA → {agent.dna}</div>
                                                <div style={{ fontSize: 11, color: C.text, lineHeight: 1.6 }}>{agent.trait}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Deliverables */}
                                    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px" }}>
                                        <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 2, marginBottom: 10 }}>DELIVERABLES — O QUE ESTE SQUAD PRODUZ</div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            {squad.deliverables.map(d => (
                                                <div key={d} style={{ fontFamily: "monospace", fontSize: 11, color: squad.color, background: squad.color + "10", border: `1px solid ${squad.color}25`, padding: "4px 12px", borderRadius: 4 }}>📄 {d}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
            FLUXO AGENTIC
        ══════════════════════════════════════════════════════ */}
                {tab === "flow" && (
                    <div style={{ animation: "in 0.3s ease" }}>
                        <STitle>FLUXO COMPLETO — COMO O SISTEMA AGENTIC FUNCIONA</STitle>

                        {/* Main flow */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 28 }}>
                            {[
                                { step: "1", title: "VOCÊ dá a missão", detail: "Via Claude Code (desktop) ou Telegram/WhatsApp (celular). Pode ser qualquer nível: \"construa feature X\", \"pesquise mercado Y\", \"analise financeiro Z\".", color: C.gold, icon: "👤" },
                                { step: "2", title: "JARVIS analisa e cria Task", detail: "Lê context.md. Identifica qual squad é responsável. Cria arquivo JSON em .jarvis/tasks/ com contexto completo, prioridade e deadline.", color: C.gold, icon: "⚡" },
                                { step: "3", title: "JARVIS delega via Task tool", detail: "Usa o Task tool do Claude Code para invocar o squad correto como subagent. Cada squad roda em seu próprio contexto isolado. Múltiplos squads podem rodar em paralelo.", color: C.cyan, icon: "🎯" },
                                { step: "4", title: "SQUAD executa autonomamente", detail: "Os 4 agentes do squad trabalham em suas perspectivas. Cada um aplica seu framework mental. O squad usa MCP tools: filesystem, browser, terminal, search. Zero intervenção humana.", color: C.green, icon: "⚒" },
                                { step: "5", title: "Squad reporta e salva deliverable", detail: "Resultado salvo em arquivo (PRD, código, análise, copy, modelo financeiro). Status da task atualizado para DONE. Hook notifica via Telegram automaticamente.", color: C.green, icon: "📄" },
                                { step: "6", title: "JARVIS consolida e atualiza memória", detail: "Sintetiza os resultados dos squads. Atualiza context.md com o que aconteceu. Loga decisões em decisions.md. patterns.md aprende com cada ciclo.", color: C.gold, icon: "🧠" },
                                { step: "7", title: "VOCÊ recebe no celular", detail: "✅ Task concluída. Link para o deliverable. Próximas ações sugeridas. Se precisar de aprovação (push, delete, envio), JARVIS aguarda o comando explícito.", color: C.gold, icon: "📱" },
                            ].map((step, i, arr) => (
                                <div key={step.step} style={{ display: "flex", gap: 0 }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 60 }}>
                                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: step.color + "20", border: `2px solid ${step.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{step.icon}</div>
                                        {i < arr.length - 1 && <div style={{ width: 2, flex: 1, minHeight: 16, background: step.color + "30", marginTop: 2, marginBottom: 2 }} />}
                                    </div>
                                    <div style={{ background: C.card, border: `1px solid ${step.color}25`, borderRadius: 10, padding: "12px 18px", flex: 1, marginLeft: 14, marginBottom: 4 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                                            <div style={{ width: 22, height: 22, borderRadius: "50%", background: step.color, color: C.bg, fontSize: 10, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{step.step}</div>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: step.color }}>{step.title}</div>
                                        </div>
                                        <div style={{ fontSize: 12, color: C.text, paddingLeft: 32, lineHeight: 1.6 }}>{step.detail}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* vs OpenClaw */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div style={{ background: C.card, border: `1px solid ${C.textDim}30`, borderRadius: 12, padding: "18px 20px" }}>
                                <div style={{ fontSize: 12, color: C.textDim, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>OPENCLAW — 117K STARS</div>
                                {["Claude como AI gateway para WhatsApp/Telegram", "Autonomia real — executa comandos no PC", "Self-hosted, data local", "1 agente genérico com Skills", "Focado em mensaging e computer use pessoal", "Sem squads, sem delegação formal", "Sem estrutura organizacional"].map(f => (
                                    <div key={f} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                                        <span style={{ color: C.green, flexShrink: 0 }}>✓</span>
                                        <span style={{ fontSize: 11, color: C.text }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: C.card, border: `2px solid ${C.gold}40`, borderRadius: 12, padding: "18px 20px", position: "relative" }}>
                                <div style={{ position: "absolute", top: -11, left: 20, background: C.gold, color: C.bg, fontSize: 9, fontWeight: 900, letterSpacing: 2, padding: "2px 14px", borderRadius: 20 }}>JARVIS v5.0</div>
                                <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: 2, marginBottom: 14 }}>TUDO QUE OPENCLAW FAZ +</div>
                                {["6 squads especializados com 24 mentes brilhantes", "Task delegation via Claude Code Task tool", "Subagents paralelos — squads simultâneos", "Memória institucional persistente (6 camadas)", "8 departamentos com hierarquia e autoridade", "Templates operacionais — qualidade consistente", "DNA Advisors para decisões estratégicas", "Agent Teams — squads comunicam entre si (Fase 2)", "Escalável: Desktop → App → SaaS"].map(f => (
                                    <div key={f} style={{ display: "flex", gap: 8, marginBottom: 7 }}>
                                        <span style={{ color: C.gold, flexShrink: 0 }}>⚡</span>
                                        <span style={{ fontSize: 11, color: C.white }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════════════════════════════════════════════════════
            ESTRUTURA DE ARQUIVOS
        ══════════════════════════════════════════════════════ */}
                {tab === "files" && (
                    <div style={{ animation: "in 0.3s ease" }}>
                        <STitle>ESTRUTURA COMPLETA — CADA ARQUIVO QUE PRECISA EXISTIR</STitle>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                                <div style={{ background: C.surface, borderRadius: 12, padding: 20, border: `1px solid ${C.border}`, fontFamily: "monospace", fontSize: 12, lineHeight: 2 }}>
                                    {[
                                        { text: "C:\\jarvis\\", color: C.gold, indent: 0, bold: true },
                                        { text: "├── CLAUDE.md              ← Constituição mestre", color: C.gold, indent: 1, comment: true },
                                        { text: "├── .claude/", color: C.cyan, indent: 1 },
                                        { text: "│   ├── agents/            ← 6 Squad Files", color: C.cyan, indent: 2, comment: true },
                                        { text: "│   │   ├── oracle-squad.md", color: C.cyan, indent: 3 },
                                        { text: "│   │   ├── forge-squad.md", color: C.green, indent: 3 },
                                        { text: "│   │   ├── mercury-squad.md", color: C.orange, indent: 3 },
                                        { text: "│   │   ├── atlas-squad.md", color: C.purple, indent: 3 },
                                        { text: "│   │   ├── vault-squad.md", color: C.amber, indent: 3 },
                                        { text: "│   │   └── nexus-squad.md", color: C.blue, indent: 3 },
                                        { text: "│   ├── hooks/             ← Lifecycle hooks", color: C.text, indent: 2, comment: true },
                                        { text: "│   │   ├── subagent-stop.sh", color: C.text, indent: 3 },
                                        { text: "│   │   └── post-tool-use.sh", color: C.text, indent: 3 },
                                        { text: "│   └── settings.json      ← Config global", color: C.text, indent: 2, comment: true },
                                        { text: "├── .jarvis/", color: C.gold, indent: 1 },
                                        { text: "│   ├── tasks/             ← Task Queue", color: C.gold, indent: 2, comment: true },
                                        { text: "│   │   ├── _queue.json    ← Status de todas tasks", color: C.gold, indent: 3 },
                                        { text: "│   │   └── task-001.json  ← Cada task individual", color: C.gold, indent: 3 },
                                        { text: "│   ├── memory/            ← 6 Camadas", color: C.purple, indent: 2, comment: true },
                                        { text: "│   │   ├── context.md", color: C.purple, indent: 3 },
                                        { text: "│   │   ├── decisions.md", color: C.purple, indent: 3 },
                                        { text: "│   │   ├── patterns.md", color: C.purple, indent: 3 },
                                        { text: "│   │   ├── knowledge.md", color: C.purple, indent: 3 },
                                        { text: "│   │   └── squad-history.md", color: C.purple, indent: 3 },
                                        { text: "│   └── templates/         ← 10 Templates ops", color: C.text, indent: 2, comment: true },
                                        { text: "├── workspace/             ← Área de trabalho", color: C.text, indent: 1, comment: true },
                                        { text: "└── jarvis-gateway/        ← Mobile bridge (Antigravity)", color: C.cyan, indent: 1, comment: true },
                                    ].map((line, i) => (
                                        <div key={i} style={{ paddingLeft: (line.indent || 0) * 8, color: line.comment ? C.textDim : line.color, fontWeight: line.bold ? 900 : 400, fontSize: line.comment ? 10 : 12 }}>
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                {/* Squad file schema */}
                                <div style={{ background: C.surface, borderRadius: 12, padding: 18, border: `1px solid ${C.cyan}30` }}>
                                    <div style={{ fontSize: 9, color: C.cyan, letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>SQUAD FILE — FORMATO EXATO (.md)</div>
                                    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.cyan, background: C.bg, padding: 14, borderRadius: 8, lineHeight: 1.9 }}>
                                        <div style={{ color: C.textDim }}>{"---"}</div>
                                        <div><span style={{ color: C.text }}>name: </span>oracle-squad</div>
                                        <div><span style={{ color: C.text }}>description: </span>Research...</div>
                                        <div><span style={{ color: C.text }}>tools: </span>Read, Write, WebSearch...</div>
                                        <div><span style={{ color: C.text }}>model: </span>claude-sonnet-4-6</div>
                                        <div style={{ color: C.textDim }}>{"---"}</div>
                                        <div style={{ marginTop: 8 }}>{"# Você é o ORACLE Squad"}</div>
                                        <div>{"4 mentes: Tesla, Feynman, Munger, Shannon"}</div>
                                        <div>{"## Protocolo de Task"}</div>
                                        <div>{"## Ferramentas"}</div>
                                        <div>{"## Deliverable obrigatório"}</div>
                                        <div>{"## Guardrails"}</div>
                                    </div>
                                </div>

                                {/* Task schema */}
                                <div style={{ background: C.surface, borderRadius: 12, padding: 18, border: `1px solid ${C.gold}30` }}>
                                    <div style={{ fontSize: 9, color: C.gold, letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>TASK FILE — SCHEMA JSON</div>
                                    <div style={{ fontFamily: "monospace", fontSize: 11, color: C.gold, background: C.bg, padding: 14, borderRadius: 8, lineHeight: 1.9 }}>
                                        <div>{"{"}</div>
                                        <div>{"  \"id\": \"task-001\","}</div>
                                        <div>{"  \"title\": \"Pesquise concorrentes\","}</div>
                                        <div>{"  \"squad\": \"oracle\","}</div>
                                        <div>{"  \"priority\": \"HIGH\","}</div>
                                        <div>{"  \"status\": \"IN_PROGRESS\","}</div>
                                        <div>{"  \"context\": \"ICP é dev tool...\","}</div>
                                        <div>{"  \"deliverable\": \"research-brief.md\","}</div>
                                        <div>{"  \"created_at\": \"2026-02-19\","}</div>
                                        <div>{"  \"deadline\": \"2026-02-20\""}</div>
                                        <div>{"}"}</div>
                                    </div>
                                </div>

                                {/* Timeline */}
                                <div style={{ background: C.surface, borderRadius: 12, padding: 18, border: `1px solid ${C.green}30` }}>
                                    <div style={{ fontSize: 9, color: C.green, letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>TIMELINE — QUANTO TEMPO PARA ESTAR OPERACIONAL</div>
                                    {[
                                        { day: "DIA 1 (2-3h)", tasks: "Instalar Claude Code + reescrever CLAUDE.md + criar 6 squad files básicos", color: C.red },
                                        { day: "DIA 2 (2-3h)", tasks: "Criar task queue + testar delegação JARVIS→Oracle+Forge + hooks de notificação", color: C.orange },
                                        { day: "SEMANA 1 (3h)", tasks: "Mobile gateway via Antigravity + integrar com task queue + testar ciclo completo celular→squad→resultado", color: C.amber },
                                        { day: "SEMANA 2", tasks: "Habilitar Agent Teams (squads paralelos) + refinar prompts dos squads com feedback real", color: C.green },
                                    ].map(t => (
                                        <div key={t.day} style={{ marginBottom: 12 }}>
                                            <div style={{ fontSize: 10, color: t.color, fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>{t.day}</div>
                                            <div style={{ fontSize: 11, color: C.text }}>{t.tasks}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
