/**
 * Consensus Builder — Interactive Distributed Consensus Interface
 *
 * Allows:
 * - Query input
 * - Domain selection
 * - Clone count configuration
 * - Real-time consensus execution
 * - Result visualization
 */

import React, { useState } from 'react';
import { ConsensusResult } from '../hooks/useDistributedClones';

interface ConsensusBuilderProps {
  onConsensus: (
    query: string,
    domain?: string,
    minClones?: number,
    maxClones?: number
  ) => Promise<ConsensusResult | null>;
  result: ConsensusResult | null;
  isLoading: boolean;
  cloneDomains?: Record<string, number>;
}

const ConsensusBuilder: React.FC<ConsensusBuilderProps> = ({
  onConsensus,
  result,
  isLoading,
  cloneDomains = {},
}) => {
  const [query, setQuery] = useState('');
  const [domain, setDomain] = useState('');
  const [minClones, setMinClones] = useState(3);
  const [maxClones, setMaxClones] = useState(10);

  const handleExecute = async () => {
    if (!query.trim()) {
      alert('Please enter a query');
      return;
    }

    await onConsensus(query, domain || undefined, minClones, maxClones);
  };

  const domains = Object.keys(cloneDomains);

  return (
    <div className="space-y-6">
      {/* Query Builder */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">⚡ Build Distributed Consensus</h2>

        {/* Query Input */}
        <div className="mb-4">
          <label className="block text-slate-300 text-sm font-semibold mb-2">
            Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question to be answered by multiple expert clones..."
            className="w-full h-24 bg-slate-700/50 border border-slate-600 rounded p-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
        </div>

        {/* Configuration */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Domain Selection */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Domain (Optional)
            </label>
            <select
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Domains ({Object.values(cloneDomains).reduce((a, b) => a + b, 0)} clones)</option>
              {domains.map((d) => (
                <option key={d} value={d}>
                  {d} ({cloneDomains[d]} clones)
                </option>
              ))}
            </select>
          </div>

          {/* Min Clones */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Min Clones: {minClones}
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={minClones}
              onChange={(e) => setMinClones(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Max Clones */}
          <div>
            <label className="block text-slate-300 text-sm font-semibold mb-2">
              Max Clones: {maxClones}
            </label>
            <input
              type="range"
              min={minClones}
              max="50"
              value={maxClones}
              onChange={(e) => setMaxClones(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        {/* Execute Button */}
        <button
          onClick={handleExecute}
          disabled={isLoading || !query.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-slate-600 disabled:to-slate-600 text-white font-bold py-3 rounded transition-all"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 bg-white rounded-full animate-spin"></div>
              Generating Consensus...
            </span>
          ) : (
            '🚀 Get Distributed Consensus'
          )}
        </button>
      </div>

      {/* Result Display */}
      {result && (
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>✨</span> Consensus Result
          </h2>

          {/* Confidence Badge */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-slate-300">Consensus Confidence</span>
            <div className="flex items-center gap-2">
              <div className="w-32 h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{ width: result.confidence }}
                ></div>
              </div>
              <span className="font-bold text-green-400">{result.confidence}</span>
            </div>
          </div>

          {/* Experts Consulted */}
          <p className="text-sm text-slate-400 mb-4">
            💼 Consensus from <span className="font-bold text-blue-400">{result.expertsConsulted}</span> expert{' '}
            {result.expertsConsulted === 1 ? 'clone' : 'clones'} using{' '}
            <span className="font-bold text-purple-400">{result.conflictResolution}</span> resolution
          </p>

          {/* Decision */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Decision</h3>
            <p className="text-slate-100 leading-relaxed">{result.decision}</p>
          </div>

          {/* Reasoning */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-2">Reasoning</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{result.reasoning}</p>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-700/30">
            <div>
              <p className="text-slate-400 text-xs">Evidence Items</p>
              <p className="text-lg font-bold text-green-400">{result.evidenceItems}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Generated At</p>
              <p className="text-lg font-bold text-slate-300">
                {new Date(result.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isLoading && (
        <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg p-12 text-center">
          <p className="text-slate-400">
            💭 Enter a query and click "Get Distributed Consensus" to generate a consensus decision from multiple expert clones.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConsensusBuilder;
