/**
 * Clone Management — Clone Registry Operations
 *
 * Allows:
 * - View clone list
 * - Rollback to previous version
 * - Archive clones
 * - Filter by domain
 */

import React, { useState } from 'react';
import { Clone } from '../hooks/useDistributedClones';

interface CloneManagementProps {
  clones?: Clone[];
  onRollback: (cloneId: string, version: number) => Promise<boolean>;
  onArchive: (cloneId: string, reason: string) => Promise<boolean>;
  isLoading: boolean;
  onRefresh: () => void;
}

const CloneManagement: React.FC<CloneManagementProps> = ({
  clones = [],
  onRollback,
  onArchive,
  isLoading,
  onRefresh,
}) => {
  const [filterDomain, setFilterDomain] = useState<string | null>(null);
  const [expandedClone, setExpandedClone] = useState<string | null>(null);
  const [showArchiveModal, setShowArchiveModal] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const filteredClones = filterDomain
    ? clones.filter((c) => c.domain === filterDomain)
    : clones;

  const domains = Array.from(new Set(clones.map((c) => c.domain)));

  const handleArchive = async (cloneId: string) => {
    if (await onArchive(cloneId, archiveReason)) {
      setShowArchiveModal(null);
      setArchiveReason('');
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-slate-300 text-sm">Filter by Domain:</label>
          <select
            value={filterDomain || ''}
            onChange={(e) => setFilterDomain(e.target.value || null)}
            className="bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Domains ({clones.length})</option>
            {domains.map((d) => (
              <option key={d} value={d}>
                {d} ({clones.filter((c) => c.domain === d).length})
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white px-4 py-2 rounded font-semibold transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Clone List */}
      <div className="space-y-3">
        {filteredClones.length > 0 ? (
          filteredClones.map((clone) => (
            <div key={clone.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
              {/* Clone Header */}
              <button
                onClick={() => setExpandedClone(expandedClone === clone.id ? null : clone.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-semibold text-slate-100">{clone.expertName}</h3>
                    <p className="text-sm text-slate-400">{clone.domain}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">
                      {(clone.successRate * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-slate-400">success rate</p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-400">v{clone.version}</p>
                    <p className="text-xs text-slate-400">version</p>
                  </div>

                  <span className="text-slate-400">
                    {expandedClone === clone.id ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedClone === clone.id && (
                <div className="bg-slate-700/20 border-t border-slate-700 p-4 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Activations</p>
                      <p className="text-lg font-bold text-slate-200">
                        {clone.activationCount}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 text-xs mb-1">Status</p>
                      <span className="inline-block px-2 py-1 bg-green-900/30 border border-green-700 text-green-300 text-xs rounded">
                        {clone.status}
                      </span>
                    </div>

                    <div>
                      <p className="text-slate-400 text-xs mb-1">Created</p>
                      <p className="text-sm text-slate-300">
                        {new Date(clone.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 text-xs mb-1">Updated</p>
                      <p className="text-sm text-slate-300">
                        {new Date(clone.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-slate-700">
                    <button
                      disabled={clone.version === 1}
                      onClick={() => {
                        if (confirm('Rollback to previous version?')) {
                          onRollback(clone.id, clone.version - 1);
                        }
                      }}
                      className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 disabled:bg-slate-600/30 text-purple-300 disabled:text-slate-500 px-3 py-2 rounded font-semibold text-sm transition-colors"
                    >
                      ↶ Rollback to v{clone.version - 1}
                    </button>

                    <button
                      onClick={() => setShowArchiveModal(clone.id)}
                      className="flex-1 bg-red-600/30 hover:bg-red-600/50 text-red-300 px-3 py-2 rounded font-semibold text-sm transition-colors"
                    >
                      📦 Archive
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-lg p-8 text-center">
            <p className="text-slate-400">
              {clones.length === 0
                ? '🤖 No clones available. Create clones from Phase 4 first.'
                : '❌ No clones match the selected domain.'}
            </p>
          </div>
        )}
      </div>

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">📦 Archive Clone</h2>

            <p className="text-slate-300 mb-4">
              Are you sure you want to archive this clone? It will be preserved but not used in future consensus operations.
            </p>

            <textarea
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              placeholder="Optional: Reason for archival..."
              className="w-full h-20 bg-slate-700/50 border border-slate-600 rounded p-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500 mb-4"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowArchiveModal(null);
                  setArchiveReason('');
                }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded font-semibold transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => handleArchive(showArchiveModal)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold transition-colors"
              >
                Confirm Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloneManagement;
