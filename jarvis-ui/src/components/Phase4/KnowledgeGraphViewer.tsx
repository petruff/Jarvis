import { useState } from 'react';

interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, any>;
}

interface GraphEdge {
  from: string;
  to: string;
  relation: string;
  weight: number;
}

export default function KnowledgeGraphViewer() {
  const [selectedEntity, setSelectedEntity] = useState<string>('test_1');
  const nodes: GraphNode[] = [
    { id: 'agi_core', label: 'AGI Architecture', type: 'Concept', properties: { category: 'AI' } },
    { id: 'phase_4', label: 'Phase 4 Systems', type: 'Milestone', properties: { status: 'active' } },
    { id: 'quimera', label: 'Quimera Engine', type: 'System', properties: { type: 'synthesis' } },
    { id: 'vector_rag', label: 'Vector RAG', type: 'Component', properties: { engine: 'LanceDB' } },
    { id: 'knowledge_graph', label: 'Knowledge Graph', type: 'Component', properties: { backend: 'SQLite' } },
    { id: 'test_1', label: 'Test Entity', type: 'Concept', properties: { priority: 'high' } },
  ];

  const edges: GraphEdge[] = [
    { from: 'phase_4', to: 'quimera', relation: 'USES', weight: 0.95 },
    { from: 'quimera', to: 'vector_rag', relation: 'DEPENDS_ON', weight: 0.9 },
    { from: 'quimera', to: 'knowledge_graph', relation: 'DEPENDS_ON', weight: 0.9 },
    { from: 'vector_rag', to: 'agi_core', relation: 'SUPPORTS', weight: 0.8 },
    { from: 'knowledge_graph', to: 'agi_core', relation: 'SUPPORTS', weight: 0.8 },
    { from: 'agi_core', to: 'test_1', relation: 'RELATED_TO', weight: 0.7 },
  ];


  const getNodeColor = (type: string) => {
    switch (type) {
      case 'Concept':
        return '#00d9ff';
      case 'System':
        return '#0099ff';
      case 'Component':
        return '#ff6b35';
      case 'Milestone':
        return '#f7b801';
      default:
        return '#a0b0d4';
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedEntity);
  const relatedEdges = edges.filter((e) => e.from === selectedEntity || e.to === selectedEntity);
  const relatedNodes = relatedEdges.flatMap((e) => [
    nodes.find((n) => n.id === (e.from === selectedEntity ? e.to : e.from)),
  ]).filter(Boolean) as GraphNode[];

  return (
    <div className="holographic-card p-6 flex flex-col gap-4">
      <div>
        <div className="text-primary font-bold mb-2 uppercase text-sm">Knowledge Graph — Quimera Synthesis</div>
        <p className="text-text-secondary text-xs">Vector RAG merged with semantic connections ({nodes.length} entities, {edges.length} relations)</p>
      </div>

      {/* Graph Visualization */}
      <div className="bg-surface/30 border border-border rounded-lg p-4 relative overflow-hidden" style={{ height: '300px' }}>
        <svg width="100%" height="100%" className="absolute inset-0">
          <defs>
            <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00d9ff" />
              <stop offset="100%" stopColor="#0099ff" />
            </linearGradient>
            <linearGradient id="gradient-secondary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b35" />
              <stop offset="100%" stopColor="#f7b801" />
            </linearGradient>
          </defs>

          {/* Edges */}
          {edges.map((edge, idx) => {
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            if (!fromNode || !toNode) return null;

            const fromX = Math.sin((idx * Math.PI) / edges.length) * 100 + 150;
            const fromY = Math.cos((idx * Math.PI) / edges.length) * 80 + 100;
            const toX = Math.sin(((idx + 1) * Math.PI) / edges.length) * 100 + 150;
            const toY = Math.cos(((idx + 1) * Math.PI) / edges.length) * 80 + 100;

            return (
              <line
                key={`edge-${idx}`}
                x1={fromX}
                y1={fromY}
                x2={toX}
                y2={toY}
                stroke={`rgba(0, 217, 255, ${edge.weight * 0.6})`}
                strokeWidth="1.5"
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, idx) => {
            const angle = (idx / nodes.length) * Math.PI * 2;
            const x = Math.sin(angle) * 100 + 150;
            const y = Math.cos(angle) * 80 + 100;
            const isSelected = node.id === selectedEntity;

            return (
              <g key={node.id}>
                {/* Node Circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 12 : 8}
                  fill={getNodeColor(node.type)}
                  opacity={isSelected ? 1 : 0.6}
                  className="cursor-pointer hover:opacity-100 transition-opacity"
                  onClick={() => setSelectedEntity(node.id)}
                  filter={isSelected ? 'drop-shadow(0 0 8px rgba(0, 217, 255, 0.8))' : undefined}
                />
                {/* Node Label */}
                {isSelected && (
                  <text x={x} y={y + 20} textAnchor="middle" fontSize="10" fill="#e0e8ff" className="pointer-events-none">
                    {node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Overlay Message */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <span className="text-primary font-mono text-xs">KNOWLEDGE GRAPH TOPOLOGY</span>
        </div>
      </div>

      {/* Entity Details */}
      <div className="grid grid-cols-2 gap-3">
        {/* Selected Entity */}
        <div className="bg-surface-light/50 border border-primary/30 rounded p-3">
          <div className="text-primary text-xs font-bold mb-1 uppercase">SELECTED ENTITY</div>
          {selectedNode && (
            <>
              <div className="text-text-primary text-sm font-bold">{selectedNode.label}</div>
              <div className="text-text-secondary text-xs mt-1">Type: {selectedNode.type}</div>
            </>
          )}
        </div>

        {/* Statistics */}
        <div className="bg-surface-light/50 border border-primary/30 rounded p-3">
          <div className="text-primary text-xs font-bold mb-1 uppercase">GRAPH STATISTICS</div>
          <div className="text-text-secondary text-xs space-y-1">
            <div className="flex justify-between">
              <span>Nodes:</span>
              <span className="text-primary">{nodes.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Edges:</span>
              <span className="text-primary">{edges.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Weight:</span>
              <span className="text-success">{(edges.reduce((s, e) => s + e.weight, 0) / edges.length).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Related Entities */}
      <div className="bg-surface-light/50 border border-border rounded p-3">
        <div className="text-primary text-xs font-bold mb-2 uppercase">Connected Entities ({relatedNodes.length})</div>
        <div className="flex flex-wrap gap-2">
          {relatedNodes.map((node) => {
            const edge = relatedEdges.find((e) => e.from === selectedEntity ? e.to === node.id : e.from === node.id);
            return (
              <button
                key={node.id}
                onClick={() => setSelectedEntity(node.id)}
                className="text-xs px-2 py-1 rounded bg-primary/10 border border-primary/30 text-primary hover:border-primary transition-all whitespace-nowrap"
              >
                {node.label} {edge && `(${edge.relation})`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
