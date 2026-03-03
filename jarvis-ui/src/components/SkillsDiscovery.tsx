// Story 4.2: Skills Discovery Dashboard Component
import React, { useState, useEffect } from 'react'

interface Skill {
  id: string
  name: string
  description: string
  successRate: number
  usageCount: number
  createdAt: string
}

interface SkillsDiscoveryProps {
  squad?: string
}

export const SkillsDiscovery: React.FC<SkillsDiscoveryProps> = ({ squad = 'default' }) => {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ totalSkills: 0, totalVersions: 0, avgSuccessRate: 0 })
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)

  useEffect(() => {
    fetchSkills()
  }, [squad])

  const fetchSkills = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/skills${squad ? `/squad/${squad}` : ''}`)
      const data = await response.json()
      setSkills(data.data?.skills || [])

      // Fetch stats
      const statsResponse = await fetch('/api/skills/stats')
      const statsData = await statsResponse.json()
      setStats(statsData.data || {})
    } catch (error) {
      console.error('Failed to fetch skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const discoverNewSkills = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/skills/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ squad, executions: [] }),
      })
      const data = await response.json()
      if (data.status === 'success') {
        fetchSkills()
      }
    } catch (error) {
      console.error('Failed to discover skills:', error)
    } finally {
      setLoading(false)
    }
  }

  const deprecateSkill = async (skillId: string) => {
    try {
      await fetch(`/api/skills/${skillId}/deprecate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replacementSkillId: null }),
      })
      fetchSkills()
    } catch (error) {
      console.error('Failed to deprecate skill:', error)
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg border border-cyan-500/30">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2">🔮 Skills Discovery</h1>
        <p className="text-slate-300">Auto-discovered reusable skills from execution patterns</p>
      </div>

      {/* Stats Panel */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">TOTAL_SKILLS</div>
          <div className="text-3xl font-bold text-white">{stats.totalSkills}</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">TOTAL_VERSIONS</div>
          <div className="text-3xl font-bold text-white">{stats.totalVersions}</div>
        </div>
        <div className="p-4 bg-slate-800/50 rounded border border-cyan-500/20">
          <div className="text-cyan-400 text-sm font-mono">AVG_SUCCESS_RATE</div>
          <div className="text-3xl font-bold text-white">{(stats.avgSuccessRate * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={discoverNewSkills}
          disabled={loading}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-semibold disabled:opacity-50"
        >
          {loading ? 'Discovering...' : '+ Discover Skills'}
        </button>
        <button
          onClick={fetchSkills}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Skills List */}
      <div className="space-y-2">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="p-4 bg-slate-800/50 rounded border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition"
            onClick={() => setSelectedSkill(skill)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-cyan-400">{skill.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{skill.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-slate-400">
                  <span>Success: {(skill.successRate * 100).toFixed(1)}%</span>
                  <span>Uses: {skill.usageCount}</span>
                  <span className="text-cyan-400 font-mono">{skill.id}</span>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deprecateSkill(skill.id)
                }}
                className="px-3 py-1 text-sm bg-red-600/30 hover:bg-red-600/50 text-red-300 rounded"
              >
                Deprecate
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected Skill Detail */}
      {selectedSkill && (
        <div className="mt-6 p-4 bg-slate-800/70 rounded border border-cyan-500/30">
          <h2 className="text-xl font-bold text-cyan-400 mb-3">Skill Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Name:</span>
              <p className="text-white font-mono">{selectedSkill.name}</p>
            </div>
            <div>
              <span className="text-slate-400">ID:</span>
              <p className="text-white font-mono">{selectedSkill.id}</p>
            </div>
            <div>
              <span className="text-slate-400">Success Rate:</span>
              <p className="text-white">{(selectedSkill.successRate * 100).toFixed(1)}%</p>
            </div>
            <div>
              <span className="text-slate-400">Usage Count:</span>
              <p className="text-white">{selectedSkill.usageCount}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SkillsDiscovery
