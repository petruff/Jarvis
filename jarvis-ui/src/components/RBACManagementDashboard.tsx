/**
 * RBAC Management Dashboard — Phase 7 Enterprise Feature
 *
 * Capabilities:
 * - Role and permission management
 * - User role assignment
 * - Permission matrix visualization
 * - Authorization audit log
 */

import React, { useState, useCallback, useEffect } from 'react';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  is_built_in: boolean;
}

interface UserRole {
  user_id: string;
  roles: Role[];
}

interface PermissionAuditLog {
  id: string;
  user_id: string;
  action: string;
  resource_type: string;
  permission: string;
  result: 'ALLOW' | 'DENY';
  timestamp: number;
}

interface RBACManagementDashboardProps {
  tenantId: string;
}

const ALL_PERMISSIONS = [
  'clone:create',
  'clone:read',
  'clone:update',
  'clone:delete',
  'clone:rollback',
  'clone:archive',
  'consensus:execute',
  'consensus:review',
  'history:view',
  'team:manage',
  'rbac:manage',
  'tenant:admin',
  'audit:view',
];

export const RBACManagementDashboard: React.FC<RBACManagementDashboardProps> = ({
  tenantId,
}) => {
  const [activeTab, setActiveTab] = useState<'roles' | 'users' | 'audit'>('roles');
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [auditLog, setAuditLog] = useState<PermissionAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mindclones/enterprise/rbac/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch roles');
      }

      const data = await response.json();
      setRoles(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  const fetchAuditLog = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/mindclones/enterprise/rbac/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, limit: 50 }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch audit log');
      }

      const data = await response.json();
      setAuditLog(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (activeTab === 'roles') {
      fetchRoles();
    } else if (activeTab === 'audit') {
      fetchAuditLog();
    }
  }, [activeTab, fetchRoles, fetchAuditLog]);

  const createRole = async () => {
    if (!newRoleName.trim()) {
      setError('Role name is required');
      return;
    }

    try {
      const response = await fetch('/api/mindclones/enterprise/rbac/roles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: newRoleName,
          permissions: selectedPermissions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create role');
      }

      setShowCreateRoleModal(false);
      setNewRoleName('');
      setSelectedPermissions([]);
      await fetchRoles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    );
  };

  return (
    <div className="w-full bg-slate-800 rounded-lg p-6 border border-slate-700">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">🔐 RBAC Management</h2>
        <p className="text-slate-400">Manage roles, permissions, and authorization audit logs</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-slate-700">
        {(['roles', 'users', 'audit'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {tab === 'roles' ? '👥 Roles' : tab === 'users' ? '👤 Users' : '📋 Audit Log'}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500 rounded p-4 mb-6 text-red-300">
          ⚠️ {error}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <button
            onClick={() => setShowCreateRoleModal(true)}
            className="mb-6 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
          >
            + Create Custom Role
          </button>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-slate-400 mt-2">Loading roles...</p>
            </div>
          ) : roles.length > 0 ? (
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                      {role.is_built_in && (
                        <span className="text-xs text-slate-400 mt-1">Built-in role</span>
                      )}
                    </div>
                    {!role.is_built_in && (
                      <button className="text-red-400 hover:text-red-300 text-sm font-semibold">
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300">Permissions:</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {role.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-600"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-700/30 rounded-lg p-6 text-center">
              <p className="text-slate-400 text-sm">No roles found</p>
            </div>
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="bg-slate-700/30 rounded-lg p-6 text-center">
            <p className="text-slate-400 text-sm">User role management coming soon</p>
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div>
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin">⏳</div>
              <p className="text-slate-400 mt-2">Loading audit log...</p>
            </div>
          ) : auditLog.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-3 text-slate-300">User</th>
                    <th className="text-left py-2 px-3 text-slate-300">Permission</th>
                    <th className="text-left py-2 px-3 text-slate-300">Resource</th>
                    <th className="text-left py-2 px-3 text-slate-300">Result</th>
                    <th className="text-left py-2 px-3 text-slate-300">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-700 hover:bg-slate-700/30">
                      <td className="py-2 px-3 text-slate-300">{entry.user_id}</td>
                      <td className="py-2 px-3 text-slate-300">{entry.permission}</td>
                      <td className="py-2 px-3 text-slate-300">
                        {entry.resource_type}
                        {entry.action && ` (${entry.action})`}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded ${
                            entry.result === 'ALLOW'
                              ? 'bg-green-900/30 text-green-300'
                              : 'bg-red-900/30 text-red-300'
                          }`}
                        >
                          {entry.result}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-xs">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-slate-700/30 rounded-lg p-6 text-center">
              <p className="text-slate-400 text-sm">No audit log entries</p>
            </div>
          )}
        </div>
      )}

      {/* Create Role Modal */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-600 max-w-2xl w-full">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white">Create Custom Role</h3>
              <button
                onClick={() => {
                  setShowCreateRoleModal(false);
                  setNewRoleName('');
                  setSelectedPermissions([]);
                }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                  placeholder="e.g., Data Analyst"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Permissions</label>
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {ALL_PERMISSIONS.map((perm) => (
                    <label key={perm} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPermissions.includes(perm)}
                        onChange={() => togglePermission(perm)}
                        className="w-4 h-4 rounded bg-slate-700 border-slate-600"
                      />
                      <span className="text-sm text-slate-300">{perm}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createRole}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded transition"
                >
                  Create Role
                </button>
                <button
                  onClick={() => {
                    setShowCreateRoleModal(false);
                    setNewRoleName('');
                    setSelectedPermissions([]);
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RBACManagementDashboard;
