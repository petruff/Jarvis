import { useEffect, useState, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type TaskStatus = 'QUEUED' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'REVISION_REQUESTED' | 'DONE' | 'FAILED' | 'ARCHIVED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Source = 'ui' | 'telegram' | 'whatsapp' | 'gateway' | 'autonomy_cron' | 'desktop';
type ActiveTab = 'organogram' | 'tasks' | 'pipelines' | 'launcher' | 'history' | 'planning';

interface QueuedTask {
    id: string;
    title: string;
    mission?: string;
    squad: string;
    squadIcon: string;
    status: TaskStatus;
    priority: Priority;
    createdAt: string;
    updatedAt?: string;
    completedAt?: string;
    durationMs?: number;
    result?: string;
    context?: { source?: Source };
}

interface SquadInfo {
    squadId: string;
    squadName: string;
    squadIcon: string;
    confidence: number;
    agents: string[];
}

interface SquadDashboardProps {
    socket: any;
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// SQUAD & AGENT DEFINITIONS — mirrors jarvis-gateway/src/jarvis/squads/index.ts
// ─────────────────────────────────────────────────────────────────────────────

interface AgentDef {
    name: string;
    dna: string;
    role: string;
    skills: string[];
}

interface SquadDef {
    id: string;
    name: string;
    icon: string;
    tagline: string;
    color: string;
    agents: AgentDef[];
}

const SQUADS: SquadDef[] = [
    {
        id: 'oracle', name: 'Oracle', icon: '🔭', tagline: 'Research & Intelligence', color: '#00d4ff',
        agents: [
            { name: 'Tesla', dna: 'Nikola Tesla', role: 'First Principles', skills: ['Physics', 'Decomposition', 'Axioms'] },
            { name: 'Feynman', dna: 'Richard Feynman', role: 'Mental Models', skills: ['Simplification', 'Teaching', 'Clarity'] },
            { name: 'Munger', dna: 'Charlie Munger', role: 'Multi-Disciplinary', skills: ['Inversion', 'Bias Detection', 'Frameworks'] },
            { name: 'Shannon', dna: 'Claude Shannon', role: 'Information Theory', skills: ['Signal vs Noise', 'Entropy', 'Compression'] },
        ]
    },
    {
        id: 'forge', name: 'Forge', icon: '⚡', tagline: 'Engineering & DevOps', color: '#a855f7',
        agents: [
            { name: 'Torvalds', dna: 'Linus Torvalds', role: 'Systems Architect / CTO', skills: ['OS Design', 'Code Review', 'Simplicity'] },
            { name: 'Carmack', dna: 'John Carmack', role: 'Performance Engineer', skills: ['Profiling', 'Optimization', 'Low-Level'] },
            { name: 'Martin', dna: 'Robert C. Martin', role: 'Clean Code', skills: ['SOLID', 'Refactoring', 'Naming'] },
            { name: 'Fowler', dna: 'Martin Fowler', role: 'Refactoring Expert', skills: ['Patterns', 'DDD', 'Technical Debt'] },
            { name: 'Kim', dna: 'Gene Kim', role: 'DevOps Lead ⚠️', skills: ['CI/CD', 'Flow', 'Feedback Loops'] },
            { name: 'Cohn', dna: 'Mike Cohn', role: 'QA / Scrum', skills: ['User Stories', 'Testing', 'DoD'] },
        ]
    },
    {
        id: 'mercury', name: 'Mercury', icon: '🚀', tagline: 'Marketing & Growth', color: '#f97316',
        agents: [
            { name: 'Ogilvy', dna: 'David Ogilvy', role: 'CMO', skills: ['Headlines', 'Brand Voice', 'Copy'] },
            { name: 'Schwartz', dna: 'Eugene Schwartz', role: 'Conversion Copy', skills: ['Awareness Levels', 'Desire', 'Copy Mechanics'] },
            { name: 'Holiday', dna: 'Ryan Holiday', role: 'Content Strategy', skills: ['Earned Media', 'Perennial Content', 'PR'] },
            { name: 'Ellis', dna: 'Sean Ellis', role: 'Growth Hacker', skills: ['PMF', 'AARRR Funnel', 'Experimentation'] },
            { name: 'Dean', dna: 'Brian Dean', role: 'SEO Specialist', skills: ['Backlinks', 'Search Intent', 'Rankings'] },
        ]
    },
    {
        id: 'atlas', name: 'Atlas', icon: '🗺️', tagline: 'Strategy & Operations', color: '#22c55e',
        agents: [
            { name: 'Sun-Tzu', dna: 'Sun Tzu', role: 'Strategic Warfare', skills: ['Positioning', 'Terrain', 'Deception'] },
            { name: 'Drucker', dna: 'Peter Drucker', role: 'Management Science', skills: ['KPIs', 'Culture', 'Focus'] },
            { name: 'Grove', dna: 'Andy Grove', role: 'OKR Executor', skills: ['OKRs', 'High Leverage', 'Output'] },
            { name: 'Deming', dna: 'W. Edwards Deming', role: 'Quality Systems', skills: ['PDCA', 'Variation', 'Systems'] },
        ]
    },
    {
        id: 'vault', name: 'Vault', icon: '💰', tagline: 'Finance, Legal & Risk', color: '#eab308',
        agents: [
            { name: 'Buffett', dna: 'Warren Buffett', role: 'CFO', skills: ['LTV:CAC', 'Margin', 'Moat'] },
            { name: 'Taleb', dna: 'Nassim Taleb', role: 'Risk Officer', skills: ['Tail Risk', 'Antifragility', 'Barbell'] },
            { name: 'Graham', dna: 'Benjamin Graham', role: 'Capital Allocator', skills: ['Intrinsic Value', 'Margin of Safety', 'Mr. Market'] },
            { name: 'Lessig', dna: 'Lawrence Lessig', role: 'CLO ⚠️', skills: ['Contracts', 'IP', 'Regulatory'] },
            { name: 'Schneier', dna: 'Bruce Schneier', role: 'CSO', skills: ['Threat Models', 'InfoSec', 'Zero Trust'] },
            { name: 'Solove', dna: 'Daniel Solove', role: 'Privacy / LGPD', skills: ['LGPD', 'Privacy by Design', 'Consent'] },
        ]
    },
    {
        id: 'board', name: 'Board', icon: '🎯', tagline: 'Strategic Advisors', color: '#f43f5e',
        agents: [
            { name: 'Thiel', dna: 'Peter Thiel', role: 'Contrarian / Monopoly', skills: ['Zero to One', 'Secrets', 'Monopoly'] },
            { name: 'Musk', dna: 'Elon Musk', role: '10x Thinker', skills: ['First Principles', 'Physics Constraints', 'Speed'] },
            { name: 'Bezos', dna: 'Jeff Bezos', role: 'Customer Regressor', skills: ['Day 1', 'Working Backwards', 'Flywheel'] },
            { name: 'Graham-PG', dna: 'Paul Graham', role: 'PMF Gatekeeper', skills: ['Make Something People Want', 'Simplicity', 'Founders'] },
            { name: 'Dalio', dna: 'Ray Dalio', role: 'Principles', skills: ['Radical Transparency', '5-Step Process', 'Believability'] },
            { name: 'Hormozi', dna: 'Alex Hormozi', role: 'Revenue Architect', skills: ['Grand Slam Offer', 'Unit Economics', 'LTV'] },
            { name: 'Jobs', dna: 'Steve Jobs', role: 'Product Visionary', skills: ['Focus', 'Simplicity', 'Design'] },
            { name: 'Ovens', dna: 'Sam Ovens', role: 'Niche Specialist', skills: ['Specificity', 'Elimination', 'Clarity'] },
        ]
    },
    {
        id: 'produto', name: 'Produto', icon: '🎨', tagline: 'Product Vision & UX', color: '#6366f1',
        agents: [
            { name: 'Jobs-PM', dna: 'Steve Jobs', role: 'CPO', skills: ['Saying No', 'Vision', 'Simplicity'] },
            { name: 'Ries', dna: 'Eric Ries', role: 'Lean PM', skills: ['Build-Measure-Learn', 'MVP', 'Pivot'] },
            { name: 'Blank', dna: 'Steve Blank', role: 'Customer Discovery', skills: ['Get Out of Building', 'Interviews', 'Problem Validation'] },
            { name: 'Norman', dna: 'Don Norman', role: 'UX Researcher', skills: ['Affordances', 'Mental Models', 'Feedback'] },
            { name: 'Gothelf', dna: 'Jeff Gothelf', role: 'Lean UX', skills: ['Hypotheses', 'Outcomes', 'Design Sprints'] },
        ]
    },
    {
        id: 'revenue', name: 'Revenue', icon: '💸', tagline: 'Sales & Customer Success', color: '#10b981',
        agents: [
            { name: 'Gordon', dna: 'Cole Gordon', role: 'CRO', skills: ['SPIN Selling', 'Qualification', 'Close'] },
            { name: 'Cialdini', dna: 'Robert Cialdini', role: 'Persuasion', skills: ['7 Principles', 'Influence', 'Ethics'] },
            { name: 'Blount', dna: 'Jeb Blount', role: 'Sales Trainer', skills: ['Pipeline', 'Prospecting', 'Fanatical'] },
            { name: 'Mehta', dna: 'Nick Mehta', role: 'Customer Success', skills: ['Health Score', 'QBR', 'Churn Prevention'] },
        ]
    },
    {
        id: 'nexus', name: 'Nexus', icon: '🤖', tagline: 'AI & Technology Frontier', color: '#ec4899',
        agents: [
            { name: 'Turing', dna: 'Alan Turing', role: 'Computability', skills: ['Theory', 'Limits', 'Formal Systems'] },
            { name: 'Karpathy', dna: 'Andrej Karpathy', role: 'Practical AI Eng.', skills: ['Neural Nets', 'Code-first', 'LLMs'] },
            { name: 'LeCun', dna: 'Yann LeCun', role: 'Deep Learning', skills: ['Architecture', 'Self-Supervised', 'World Models'] },
            { name: 'Wolfram', dna: 'Stephen Wolfram', role: 'Computational Thinker', skills: ['Computation', 'Emergence', 'Cellular Automata'] },
        ]
    },
];

// Reporting hierarchy for organogram
const HIERARCHY = [
    { level: 0, ids: ['board'] },
    { level: 1, ids: ['oracle', 'vault', 'atlas'] },
    { level: 2, ids: ['forge', 'produto', 'mercury', 'revenue', 'nexus'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_META: Record<TaskStatus, { color: string; label: string; bg: string }> = {
    PENDING_APPROVAL: { color: '#8b5cf6', label: 'Pending Approval', bg: 'rgba(139,92,246,0.1)' },
    REVISION_REQUESTED: { color: '#f43f5e', label: 'Revision Requested', bg: 'rgba(244,63,94,0.1)' },
    QUEUED: { color: '#6b7280', label: 'Queued', bg: 'rgba(107,114,128,0.1)' },
    IN_PROGRESS: { color: '#f59e0b', label: 'In Progress', bg: 'rgba(245,158,11,0.1)' },
    DONE: { color: '#22c55e', label: 'Done', bg: 'rgba(34,197,94,0.1)' },
    FAILED: { color: '#ef4444', label: 'Failed', bg: 'rgba(239,68,68,0.1)' },
    ARCHIVED: { color: '#374151', label: 'Archived', bg: 'rgba(55,65,81,0.1)' },
};

const SOURCE_META: Record<string, { icon: string; label: string }> = {
    ui: { icon: '🖥️', label: 'Desktop UI' },
    desktop: { icon: '💻', label: 'Desktop Agent' },
    telegram: { icon: '✈️', label: 'Telegram' },
    whatsapp: { icon: '💬', label: 'WhatsApp' },
    gateway: { icon: '📡', label: 'Gateway' },
    autonomy_cron: { icon: '⏱️', label: 'Scheduler' },
};

const BACKEND_URL = `http://${window.location.hostname}:3000`;

const PRIORITY_COLOR: Record<Priority, string> = {
    LOW: '#6b7280',
    MEDIUM: '#3b82f6',
    HIGH: '#f59e0b',
    CRITICAL: '#ef4444',
};

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const AgentCard: React.FC<{ agent: AgentDef; squadColor: string; active?: boolean }> = ({ agent, squadColor, active }) => (
    <div
        style={{ borderColor: active ? squadColor : squadColor + '30', boxShadow: active ? `0 0 10px ${squadColor}40` : 'none' }}
        className="border rounded-lg p-2.5 bg-black/40 transition-all hover:bg-black/60 cursor-default"
    >
        <div className="text-[10px] font-bold" style={{ color: squadColor }}>{agent.name}</div>
        <div className="text-[8px] text-white/40 mb-1.5">{agent.dna}</div>
        <div className="text-[8px] text-white/60 italic mb-1.5">{agent.role}</div>
        <div className="flex flex-wrap gap-1">
            {agent.skills.map(s => (
                <span key={s} className="text-[7px] px-1 py-0.5 rounded" style={{ background: squadColor + '20', color: squadColor }}>{s}</span>
            ))}
        </div>
        {active && <div className="mt-1.5 text-[7px] animate-pulse" style={{ color: squadColor }}>● ACTIVE</div>}
    </div>
);

const SquadNode: React.FC<{ squad: SquadDef; expanded: boolean; onClick: () => void; activeSquadIds: Set<string> }> = ({ squad, expanded, onClick, activeSquadIds }) => {
    const isActive = activeSquadIds.has(squad.id);
    return (
        <div className="flex flex-col items-center">
            <button
                onClick={onClick}
                className="rounded-xl px-4 py-2.5 border transition-all text-center min-w-[110px]"
                style={{
                    borderColor: isActive ? squad.color : squad.color + '40',
                    background: isActive ? squad.color + '18' : 'rgba(0,0,0,0.4)',
                    boxShadow: isActive ? `0 0 16px ${squad.color}40` : 'none',
                }}
            >
                <div className="text-xl mb-0.5">{squad.icon}</div>
                <div className="text-[10px] font-bold tracking-wide" style={{ color: squad.color }}>{squad.name}</div>
                <div className="text-[8px] text-white/40">{squad.tagline}</div>
                <div className="text-[7px] text-white/30 mt-1">{squad.agents.length} agents</div>
            </button>

            {expanded && (
                <div className="mt-3 w-full grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                    {squad.agents.map(a => (
                        <AgentCard key={a.name} agent={a} squadColor={squad.color} active={isActive} />
                    ))}
                </div>
            )}
        </div>
    );
};

const TaskCard: React.FC<{ task: QueuedTask; onExpand: () => void; expanded: boolean }> = ({ task, onExpand, expanded }) => {
    const squad = SQUADS.find(s => s.name.toLowerCase() === task.squad.toLowerCase() || task.squad.toLowerCase().includes(s.id));
    const color = squad?.color || '#00d4ff';
    const meta = STATUS_META[task.status] || STATUS_META['QUEUED'];
    const src = SOURCE_META[task.context?.source || 'ui'] || SOURCE_META['ui'];

    return (
        <div
            className="border rounded-lg p-3 cursor-pointer transition-all hover:scale-[1.01]"
            style={{ borderColor: color + '30', background: meta.bg }}
            onClick={onExpand}
        >
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-base">{task.squadIcon}</span>
                <span className="text-[10px] font-bold tracking-wide" style={{ color }}>{task.squad}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded border" style={{ color: meta.color, borderColor: meta.color + '50' }}>{meta.label}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded border" style={{ color: PRIORITY_COLOR[task.priority], borderColor: PRIORITY_COLOR[task.priority] + '50' }}>{task.priority}</span>
                <span className="text-[8px] text-white/40 ml-auto">{src.icon} {src.label}</span>
            </div>
            <p className="text-[11px] text-white/80 font-medium leading-tight">{task.title}</p>
            <p className="text-[9px] text-white/30 mt-1">
                {new Date(task.createdAt).toLocaleString()}
                {task.durationMs ? ` · ${Math.round(task.durationMs / 1000)}s` : ''}
            </p>

            {expanded && task.result && (
                <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-[9px] text-white/60 whitespace-pre-wrap max-h-40 overflow-y-auto">{task.result.slice(0, 600)}{task.result.length > 600 ? '…' : ''}</p>
                </div>
            )}

            {task.status === 'IN_PROGRESS' && (
                <div className="mt-2 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f59e0b' }} />
                    <span className="text-[8px] text-amber-400">Running...</span>
                </div>
            )}

            {task.status === 'PENDING_APPROVAL' ? (
                <button
                    onClick={async (e) => { e.stopPropagation(); await fetch(`${BACKEND_URL}/api/tasks/${task.id}/approve`, { method: 'POST' }); onExpand(); }}
                    className="text-[9px] px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/40 transition-all uppercase font-bold"
                >
                    Approve
                </button>
            ) : null}
            {task.status === 'PENDING_APPROVAL' ? (
                <button
                    onClick={async (e) => { e.stopPropagation(); await fetch(`${BACKEND_URL}/api/tasks/${task.id}/reject`, { method: 'POST' }); onExpand(); }}
                    className="text-[9px] px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/40 transition-all uppercase font-bold"
                >
                    Reject
                </button>
            ) : null}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const SquadDashboard: React.FC<SquadDashboardProps> = ({ socket, onClose }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('organogram');
    const [tasks, setTasks] = useState<QueuedTask[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [telemetry, setTelemetry] = useState<any[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    const [decisionLogs, setDecisionLogs] = useState<{ timestamp: number, agentId: string, message: string }[]>([]);
    const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    const [activeSquadIds, setActiveSquadIds] = useState<Set<string>>(new Set());
    const [detectedSquad, setDetectedSquad] = useState<SquadInfo | null>(null);
    const [missionText, setMissionText] = useState('');
    const [missionPriority, setMissionPriority] = useState<Priority>('HIGH');
    const [isLaunching, setIsLaunching] = useState(false);
    const [taskResult, setTaskResult] = useState<string | null>(null);
    const missionInputRef = useRef<HTMLTextAreaElement>(null);

    // ── Derived: pipelines (all active workflow execution paths) ──
    const visibleTasks = tasks.filter(t => t.status !== 'ARCHIVED');
    const pipelines = visibleTasks;

    // ── Kanban columns ──
    const kanban: Record<Exclude<TaskStatus, 'ARCHIVED'>, QueuedTask[]> = {
        PENDING_APPROVAL: visibleTasks.filter(t => t.status === 'PENDING_APPROVAL'),
        REVISION_REQUESTED: visibleTasks.filter(t => t.status === 'REVISION_REQUESTED'),
        QUEUED: visibleTasks.filter(t => t.status === 'QUEUED'),
        IN_PROGRESS: visibleTasks.filter(t => t.status === 'IN_PROGRESS'),
        DONE: visibleTasks.filter(t => t.status === 'DONE'),
        FAILED: visibleTasks.filter(t => t.status === 'FAILED'),
    };

    // ── Fetch tasks function (shared between useEffects) ──
    const fetchTasks = async () => {
        try {
            const res = await fetch(`${BACKEND_URL}/api/tasks`);
            const data = await res.json();
            if (data.tasks) {
                setTasks(data.tasks);
            }
            const resHist = await fetch(`${BACKEND_URL}/api/memory/history`);
            const dataHist = await resHist.json();
            if (dataHist.history) setHistory(dataHist.history);

            const resTel = await fetch(`${BACKEND_URL}/api/telemetry`);
            const dataTel = await resTel.json();
            if (dataTel.telemetry) setTelemetry(dataTel.telemetry);
        } catch (err) {
            console.error('[SquadDashboard] Fetch error:', err);
        }
    };

    // ── Initialize and poll tasks ──
    useEffect(() => {
        fetchTasks();
        const iv = setInterval(fetchTasks, 3000);
        return () => clearInterval(iv);
    }, []);

    // ── Socket events ──
    useEffect(() => {
        if (!socket) return;

        socket.on('squad/routed', (info: SquadInfo) => {
            setDetectedSquad(info);
            setActiveSquadIds(prev => new Set([...prev, info.squadId]));
            addLog(`ROUTER: Mission → ${info.squadIcon} ${info.squadName} (${info.confidence}% match)`);
        });

        socket.on('squad/task_created', (data: { taskId: string; squad: string; icon: string }) => {
            addLog(`QUEUE: Task created — ${data.icon} ${data.squad}`);
            fetchTasks();
        });

        socket.on('squad/task_complete', (data: { taskId: string; squad: string; result: string; durationMs: number }) => {
            setIsLaunching(false);
            setTaskResult(data.result);
            setActiveSquadIds(new Set());
            addLog(`✅ DONE: ${data.squad} finished in ${Math.round(data.durationMs / 1000)}s`);
            fetchTasks();
            setActiveTab('tasks');
        });

        socket.on('squad/error', (data: { message: string }) => {
            setIsLaunching(false);
            addLog(`❌ ERROR: ${data.message}`);
        });

        socket.on('squad/update', (data: { agentId: string; status: string; task: string }) => {
            addLog(`${data.agentId}: ${data.status} — ${data.task}`);
        });

        socket.on('squad/log', (data: { agentId: string, message: string }) => {
            setDecisionLogs(prev => [{ timestamp: Date.now(), agentId: data.agentId, message: data.message }, ...prev].slice(0, 200));
        });

        return () => {
            ['squad/routed', 'squad/task_created', 'squad/task_complete', 'squad/error', 'squad/update', 'squad/log'].forEach(e => socket.off(e));
        };
    }, [socket, fetchTasks]);

    const addLog = (msg: string) => {
        const ts = new Date().toLocaleTimeString();
        setLogs(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 120));
    };

    const launchMission = () => {
        if (!missionText.trim() || isLaunching || !socket) return;
        setIsLaunching(true);
        setDetectedSquad(null);
        setTaskResult(null);
        socket.emit('jarvis/squad_mission', { mission: missionText.trim(), priority: missionPriority });
        setActiveTab('tasks');
    };

    const toggleSquad = (id: string) => {
        setExpandedSquads(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleTask = (id: string) => {
        setExpandedTasks(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const TABS: { id: ActiveTab; label: string; badge?: number }[] = [
        { id: 'organogram', label: '🗺 Organogram' },
        { id: 'tasks', label: '📋 Tasks', badge: visibleTasks.length },
        { id: 'pipelines', label: '🔀 Pipelines', badge: pipelines.length },
        { id: 'planning', label: '🧠 Decision Planning', badge: decisionLogs.length },
        { id: 'history', label: '🕰️ History', badge: history.length },
        { id: 'launcher', label: '🚀 Launcher' },
    ];

    // ── RENDER ──────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex flex-col font-mono" style={{ background: 'rgba(5,8,18,0.98)', backdropFilter: 'blur(16px)' }}>

            {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-cyan-400/15 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <span className="text-2xl animate-pulse">⚡</span>
                    <div>
                        <h1 className="text-lg font-bold tracking-[0.3em] uppercase text-cyan-300">JARVIS Command Center</h1>
                        <p className="text-[9px] text-cyan-400/30 tracking-[0.4em] uppercase">v5.0 · 9 Squads · 42 Agents · {visibleTasks.filter(t => t.status === 'IN_PROGRESS').length} Active</p>
                    </div>

                    <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-black/40 border rounded-full border-white/10 relative group cursor-default">
                        <span className="text-[12px]">{telemetry.length > 0 ? '⚠️' : '✅'}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${telemetry.length > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                            {telemetry.length > 0 ? `${telemetry.length} System Errors` : 'System Nominal'}
                        </span>
                        {telemetry.length > 0 && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-black border border-amber-500/30 rounded shadow-xl hidden group-hover:block z-50 p-2 max-h-64 overflow-y-auto">
                                <div className="text-[8px] text-amber-500/60 mb-2 uppercase tracking-widest sticky top-0 bg-black pb-1">System Error Telemetry</div>
                                {telemetry.slice(0, 10).map(err => (
                                    <div key={err.id} className="text-[9px] font-sans mb-2 pb-2 border-b border-white/5 last:border-0">
                                        <div className="text-amber-400 flex justify-between mb-0.5"><span className="font-bold">[{err.source}]</span> <span>{new Date(err.timestamp).toLocaleTimeString()}</span></div>
                                        <div className="text-white/80 whitespace-pre-wrap">{err.message}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
                <div className="flex items-center gap-4">
                    {/* Live status dots */}
                    <div className="flex items-center gap-3 text-[9px] text-white/40">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />Desktop</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />Telegram</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />WhatsApp</span>
                    </div>
                    <button onClick={onClose} className="border border-cyan-400/20 px-3 py-1.5 text-[10px] uppercase hover:bg-cyan-400/10 transition-colors text-cyan-400/60 hover:text-cyan-400">✕ Close</button>
                </div>
            </div>

            {/* ── TABS ────────────────────────────────────────────────────────── */}
            <div className="flex border-b border-cyan-400/10 flex-shrink-0 px-4">
                {TABS.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setActiveTab(t.id)}
                        className={`px-5 py-2.5 text-[10px] uppercase tracking-widest transition-all relative ${activeTab === t.id ? 'text-cyan-300 border-b-2 border-cyan-400' : 'text-cyan-600 hover:text-cyan-400'}`}
                    >
                        {t.label}
                        {t.badge !== undefined && t.badge > 0 && (
                            <span className="ml-1.5 text-[8px] bg-cyan-400/20 text-cyan-400 px-1 py-0.5 rounded-full">{t.badge}</span>
                        )}
                    </button>
                ))}

                {/* Live log — always visible on right */}
                <div className="ml-auto flex items-center gap-2 pr-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span className="text-[9px] text-white/30 uppercase tracking-widest">Live</span>
                    {logs.length > 0 && <span className="text-[9px] text-white/40 max-w-[300px] truncate">{logs[0]}</span>}
                </div>
            </div>

            {/* ── CONTENT ─────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 overflow-y-auto p-6">

                    {/* ────────── ORGANOGRAM ────────── */}
                    {activeTab === 'organogram' && (
                        <div className="space-y-10">
                            <div className="text-center text-[10px] text-white/30 uppercase tracking-widest mb-2">Click any squad to expand agents · Active squads glow</div>

                            {/* JARVIS Root */}
                            <div className="flex justify-center">
                                <div className="border border-cyan-400/60 rounded-2xl px-8 py-4 bg-cyan-400/5 text-center" style={{ boxShadow: '0 0 30px rgba(0,212,255,0.2)' }}>
                                    <div className="text-3xl mb-1">🧠</div>
                                    <div className="text-base font-bold text-cyan-300 tracking-[0.3em]">JARVIS</div>
                                    <div className="text-[9px] text-cyan-400/50">AI Operating System · Orchestrator</div>
                                </div>
                            </div>

                            {/* Connector line */}
                            <div className="flex justify-center">
                                <div className="w-px h-8 bg-cyan-400/20" />
                            </div>

                            {/* Hierarchy levels */}
                            {HIERARCHY.map((level, li) => (
                                <div key={li}>
                                    <div className="text-[8px] text-white/20 uppercase tracking-widest text-center mb-4">
                                        {li === 0 ? 'Board — Strategic Oversight' : li === 1 ? 'Core Intelligence' : 'Execution Squads'}
                                    </div>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {level.ids.map(id => {
                                            const squad = SQUADS.find(s => s.id === id)!;
                                            return (
                                                <div key={id} className="flex flex-col items-center">
                                                    <SquadNode
                                                        squad={squad}
                                                        expanded={expandedSquads.has(id)}
                                                        onClick={() => toggleSquad(id)}
                                                        activeSquadIds={activeSquadIds}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {li < HIERARCHY.length - 1 && (
                                        <div className="flex justify-center mt-6">
                                            <div className="w-px h-6 bg-cyan-400/15" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* ────────── TASKS KANBAN ────────── */}
                    {activeTab === 'tasks' && (
                        <div>
                            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span>Real-time task board</span>
                                <span className="text-white/20">· refreshes every 3s · click card to expand result</span>
                            </div>
                            <div className="grid grid-cols-5 gap-4 min-h-[400px]">
                                {(['PENDING_APPROVAL', 'QUEUED', 'IN_PROGRESS', 'DONE', 'FAILED'] as const).map(col => {
                                    const meta = STATUS_META[col];
                                    const colTasks = kanban[col] || [];
                                    return (
                                        <div key={col} className="flex flex-col">
                                            <div className="flex items-center gap-2 mb-3 pb-2 border-b" style={{ borderColor: meta.color + '30' }}>
                                                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: meta.color }}>{meta.label}</span>
                                                <span className="text-[8px] px-1.5 py-0.5 rounded-full" style={{ background: meta.color + '20', color: meta.color }}>{colTasks.length}</span>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                {colTasks.length === 0 && (
                                                    <div className="text-[9px] text-white/20 italic text-center mt-8">Empty</div>
                                                )}
                                                {colTasks.map(task => (
                                                    <TaskCard
                                                        key={task.id}
                                                        task={task}
                                                        expanded={expandedTasks.has(task.id)}
                                                        onExpand={() => toggleTask(task.id)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ────────── PIPELINES ────────── */}
                    {activeTab === 'pipelines' && (
                        <div>
                            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4">
                                Multi-squad missions + remote channel tasks (Telegram / WhatsApp)
                            </div>
                            {pipelines.length === 0 && (
                                <div className="text-center text-white/20 italic text-sm mt-20">
                                    No pipelines yet.<br />
                                    <span className="text-[10px]">Send a mission from Telegram or WhatsApp, or launch a multi-squad mission from the Launcher.</span>
                                </div>
                            )}
                            <div className="space-y-4">
                                {pipelines.map(task => {
                                    const squadParts = task.squad.split('+').map(s => s.trim());
                                    const src = SOURCE_META[task.context?.source || 'ui'] || SOURCE_META.ui;
                                    const meta = STATUS_META[task.status] || STATUS_META.QUEUED;
                                    return (
                                        <div key={task.id} className="border border-cyan-400/10 rounded-xl p-4 bg-black/30 hover:bg-black/50 transition-all cursor-pointer" onClick={() => toggleTask(task.id)}>
                                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                                                <span className="text-[10px] px-2 py-0.5 rounded border" style={{ color: src.icon === '🖥️' ? '#00d4ff' : src.icon === '✈️' ? '#3b82f6' : '#22c55e', borderColor: 'currentcolor' }}>
                                                    {src.icon} {src.label}
                                                </span>
                                                <span className="text-[9px] font-bold text-white/80">{task.title}</span>
                                                <span className="ml-auto text-[9px] px-2 py-0.5 rounded border" style={{ color: meta.color, borderColor: meta.color + '50' }}>{meta.label}</span>
                                            </div>

                                            {/* Squad timeline */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {squadParts.map((sq, i) => {
                                                    const squadDef = SQUADS.find(s => sq.toLowerCase().includes(s.id) || s.name.toLowerCase() === sq.toLowerCase());
                                                    return (
                                                        <>
                                                            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded border" style={{ borderColor: (squadDef?.color || '#00d4ff') + '50', background: (squadDef?.color || '#00d4ff') + '10' }}>
                                                                <span className="text-sm">{squadDef?.icon || '⚡'}</span>
                                                                <span className="text-[9px]" style={{ color: squadDef?.color || '#00d4ff' }}>{sq}</span>
                                                            </div>
                                                            {i < squadParts.length - 1 && <span className="text-white/30 text-xs">→</span>}
                                                        </>
                                                    );
                                                })}
                                                {task.durationMs && (
                                                    <span className="ml-auto text-[9px] text-white/30">{Math.round(task.durationMs / 1000)}s total</span>
                                                )}
                                            </div>

                                            {expandedTasks.has(task.id) && task.result && (
                                                <div className="mt-3 pt-3 border-t border-white/10">
                                                    <p className="text-[9px] text-white/60 whitespace-pre-wrap max-h-48 overflow-y-auto">{task.result.slice(0, 800)}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ────────── HISTORY ────────── */}
                    {activeTab === 'history' && (
                        <div>
                            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4">
                                Squad Memory Feed · Persistent cross-session history
                            </div>
                            {history.length === 0 && (
                                <div className="text-center text-white/20 italic text-sm mt-20">
                                    No memory history yet.<br />
                                </div>
                            )}
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {history.map((item, i) => {
                                    const squadDef = SQUADS.find(s => item.squadId.toLowerCase().includes(s.id) || s.name.toLowerCase() === item.squadId.toLowerCase());
                                    const color = squadDef?.color || '#00d4ff';
                                    return (
                                        <div key={i} className="border border-cyan-400/20 rounded-xl p-4 bg-black/40 hover:bg-black/60 transition-all">
                                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                <span className="text-xl">{squadDef?.icon || '⚡'}</span>
                                                <span className="text-[12px] font-bold tracking-widest uppercase" style={{ color }}>{item.squadId}</span>
                                                <span className="text-[9px] text-white/40">{new Date(item.timestamp).toLocaleString()}</span>
                                                {item.durationMs && (
                                                    <span className="ml-auto text-[9px] px-2 py-0.5 rounded border border-cyan-400/30 text-cyan-400/70">{Math.round(item.durationMs / 1000)}s processing time</span>
                                                )}
                                            </div>
                                            <div className="mb-3 pl-2 border-l-2" style={{ borderColor: color + '50' }}>
                                                <p className="text-[11px] text-white/80 font-medium italic">"{item.task}"</p>
                                            </div>
                                            <div className="pt-3 border-t border-white/10">
                                                <p className="text-[10px] text-white/60 whitespace-pre-wrap max-h-40 overflow-y-auto">{item.result}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ────────── DECISION PLANNING ────────── */}
                    {activeTab === 'planning' && (
                        <div>
                            <div className="text-[10px] text-white/30 uppercase tracking-widest mb-4">
                                ReAct Loop Telemetry · Live Agent Reasoning
                            </div>
                            <div className="space-y-4 max-w-4xl mx-auto h-[600px] overflow-y-auto pr-2">
                                {decisionLogs.length === 0 && (
                                    <div className="text-[10px] text-white/20 italic text-center mt-20">Waiting for agent activity...</div>
                                )}
                                {decisionLogs.map((log, i) => {
                                    const isStep = log.message.startsWith('Step ');
                                    const isThought = log.message.startsWith('Thought:');
                                    const isObserve = log.message.startsWith('Observed');
                                    const isEval = log.message.startsWith('Eval Score:');

                                    let borderColor = 'border-white/10';
                                    let badgeColor = 'bg-white/10 text-white/60';
                                    let icon = '⚙️';

                                    if (isThought) { borderColor = 'border-purple-500/50'; badgeColor = 'bg-purple-500/20 text-purple-400'; icon = '🧠'; }
                                    else if (isObserve) { borderColor = 'border-blue-500/50'; badgeColor = 'bg-blue-500/20 text-blue-400'; icon = '👁️'; }
                                    else if (isEval) { borderColor = 'border-yellow-500/50'; badgeColor = 'bg-yellow-500/20 text-yellow-400'; icon = '⚖️'; }
                                    else if (isStep) { borderColor = 'border-cyan-500/50'; badgeColor = 'bg-cyan-500/20 text-cyan-400'; icon = '▶️'; }

                                    return (
                                        <div key={i} className={`border-l-2 pl-3 py-2 ${borderColor} bg-black/20 rounded-r-lg`}>
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs">{icon}</span>
                                                    <span className="text-[10px] font-bold text-white/80">{log.agentId.toUpperCase()}</span>
                                                    <span className={`text-[8px] px-1.5 py-0.5 rounded ${badgeColor}`}>
                                                        {isThought ? 'REASON' : isObserve ? 'OBSERVE' : isEval ? 'EVALUATE' : isStep ? 'PHASE' : 'ACTION'}
                                                    </span>
                                                </div>
                                                <span className="text-[8px] text-white/30">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                            <div className="text-[11px] text-white/70 font-mono whitespace-pre-wrap">{log.message}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ────────── LAUNCHER ────────── */}
                    {activeTab === 'launcher' && (
                        <div className="max-w-2xl mx-auto space-y-5">
                            <div className="text-[10px] text-white/30 uppercase tracking-widest">
                                Mission Brief · Squads auto-detected from your text
                            </div>

                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-cyan-400/50 mb-2 block">Mission</label>
                                <textarea
                                    ref={missionInputRef}
                                    value={missionText}
                                    onChange={e => setMissionText(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) launchMission(); }}
                                    placeholder="Ex: Pesquise os top 3 concorrentes, analise risco financeiro e crie estratégia de growth..."
                                    className="w-full h-32 bg-black/40 border border-cyan-400/20 rounded-xl p-4 text-sm text-cyan-200 placeholder-cyan-800 resize-none focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(0,243,255,0.1)] transition-all"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] uppercase tracking-widest text-cyan-400/50 mb-2 block">Priority</label>
                                <div className="flex gap-2">
                                    {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setMissionPriority(p)}
                                            className="flex-1 py-2 text-[9px] uppercase tracking-wider border rounded-lg transition-all"
                                            style={{
                                                borderColor: missionPriority === p ? PRIORITY_COLOR[p] : PRIORITY_COLOR[p] + '30',
                                                color: missionPriority === p ? PRIORITY_COLOR[p] : PRIORITY_COLOR[p] + '80',
                                                background: missionPriority === p ? PRIORITY_COLOR[p] + '15' : 'transparent',
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {detectedSquad && (
                                <div className="border rounded-xl p-4" style={{ borderColor: '#00d4ff40', background: '#00d4ff08' }}>
                                    <div className="text-[10px] text-cyan-400 mb-2">
                                        {detectedSquad.squadIcon} Auto-routed → <strong>{detectedSquad.squadName}</strong> ({detectedSquad.confidence}% match)
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {detectedSquad.agents.map((a, i) => (
                                            <span key={i} className="text-[8px] border border-cyan-400/30 px-2 py-0.5 rounded text-cyan-400">{a.split(' (')[0]}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={launchMission}
                                disabled={isLaunching || !missionText.trim()}
                                className="w-full py-4 text-sm uppercase tracking-widest font-bold border rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                style={{
                                    borderColor: isLaunching ? '#f59e0b' : '#00d4ff',
                                    color: isLaunching ? '#f59e0b' : '#00d4ff',
                                    background: isLaunching ? 'rgba(245,158,11,0.08)' : 'rgba(0,212,255,0.06)',
                                    boxShadow: isLaunching ? '0 0 20px rgba(245,158,11,0.2)' : '0 0 20px rgba(0,212,255,0.1)',
                                }}
                            >
                                {isLaunching ? '⏳ Dispatching squads...' : '⚡ Launch Mission'}
                            </button>
                            <p className="text-[9px] text-white/20 text-center">Ctrl+Enter · Squads & agents activate automatically from your text</p>

                            {taskResult && (
                                <div className="border border-green-500/30 rounded-xl bg-green-500/5 p-4">
                                    <div className="text-[10px] uppercase text-green-400 mb-2">✅ Mission Complete</div>
                                    <pre className="text-[10px] text-white/60 whitespace-pre-wrap max-h-60 overflow-y-auto">{taskResult.slice(0, 800)}</pre>
                                </div>
                            )}

                            {/* Log tail */}
                            <div className="border-t border-white/5 pt-4">
                                <div className="text-[9px] text-white/20 uppercase tracking-widest mb-2">Activity Log</div>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {logs.slice(0, 20).map((l, i) => (
                                        <div key={i} className={`text-[9px] border-l-2 pl-2 py-0.5 ${l.includes('✅') ? 'border-green-500 text-green-400' : l.includes('❌') ? 'border-red-500 text-red-400' : 'border-cyan-800 text-white/40'}`}>{l}</div>
                                    ))}
                                    {logs.length === 0 && <div className="text-[9px] text-white/20 italic">Waiting for activity...</div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SquadDashboard;
