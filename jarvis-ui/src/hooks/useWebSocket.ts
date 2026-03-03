/**
 * Hook: useWebSocket
 * Real-time WebSocket connection for metric updates
 */

import { useState, useEffect } from 'react'

export const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    if (!url) return

    try {
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'metric-update') {
            setData(message.data)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
        // Attempt reconnect after 3 seconds
        setTimeout(() => {
          // Reconnect logic
        }, 3000)
      }

      return () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close()
        }
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      setIsConnected(false)
    }
  }, [url])

  return { isConnected, data }
}
