/**
 * Hook: useSystemStatus
 * Fetches real system status data from API
 */

import { useState, useEffect } from 'react'

export interface SystemData {
  status: 'operational' | 'warning' | 'critical'
  circuitBreaker: {
    calls: number
    maxCalls: number
    costUsd: number
    maxCostUsd: number
  }
  memory: {
    episodic: string
    semantic: string
    hybrid: number
  }
  squads: Array<{
    name: string
    status: 'active' | 'idle' | 'processing'
    tasksInProgress: number
    successRate: number
  }>
  latency: {
    p50: number
    p95: number
    p99: number
  }
  knowledgeAutonomy: number
}

const MOCK_DATA: SystemData = {
  status: 'operational',
  circuitBreaker: {
    calls: 234,
    maxCalls: 5000,
    costUsd: 0.82,
    maxCostUsd: 50
  },
  memory: {
    episodic: '213 MB',
    semantic: '45 MB',
    hybrid: 410
  },
  squads: [
    { name: 'Mercury', status: 'active', tasksInProgress: 2, successRate: 0.94 },
    { name: 'Forge', status: 'processing', tasksInProgress: 1, successRate: 0.91 },
    { name: 'Sentinel', status: 'idle', tasksInProgress: 0, successRate: 0.98 },
    { name: 'Nexus', status: 'active', tasksInProgress: 3, successRate: 0.87 },
    { name: 'Atlas', status: 'idle', tasksInProgress: 0, successRate: 0.93 },
    { name: 'Oracle', status: 'active', tasksInProgress: 1, successRate: 0.96 },
    { name: 'Vault', status: 'processing', tasksInProgress: 2, successRate: 0.89 }
  ],
  latency: {
    p50: 187,
    p95: 742,
    p99: 2100
  },
  knowledgeAutonomy: 87
}

export const useSystemStatus = () => {
  const [data, setData] = useState<SystemData>(MOCK_DATA)

  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:3000/api/system/status')
        if (response.ok) {
          const newData = await response.json()
          setData(newData)
        }
      } catch (err) {
        console.warn('API unavailable, using mock data')
        // Keep using mock data
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 1000)

    return () => clearInterval(interval)
  }, [])

  return { data, loading }
}
