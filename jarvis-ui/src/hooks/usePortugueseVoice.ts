// Portuguese Real-time Voice Hook
// Handles TTS + STT for bi-directional Portuguese speech with JARVIS

import { useState, useCallback, useRef, useEffect } from 'react'

interface VoiceConfig {
  language: 'pt-BR' | 'en-US'
  autoPlay: boolean
  continuousListening: boolean
}

interface VoiceSession {
  sessionId: string
  isListening: boolean
  isPlaying: boolean
  recognizedText: string
  lastCommand: string | null
  confidence: number
  language: 'pt-BR' | 'en-US'
}

export const usePortugueseVoice = (config: Partial<VoiceConfig> = {}) => {
  const [session, setSession] = useState<VoiceSession>({
    sessionId: `voice-${Date.now()}`,
    isListening: false,
    isPlaying: false,
    recognizedText: '',
    lastCommand: null,
    confidence: 0,
    language: 'pt-BR',
  })

  const [interimText, setInterimText] = useState('')
  const [metrics, setMetrics] = useState({
    totalPhrasesRecognized: 0,
    averageConfidence: 0,
    avgProcessingTime: 0,
  })

  const socketRef = useRef<WebSocket | null>(null)

  const defaultConfig: VoiceConfig = {
    language: 'pt-BR',
    autoPlay: true,
    continuousListening: true,
    ...config,
  }

  /**
   * Initialize voice session with real-time updates via WebSocket
   */
  useEffect(() => {
    // Connect to backend WebSocket for real-time voice updates
    // In real implementation, connect to Socket.IO or WebSocket
    console.log(`[Voice] Initializing Portuguese voice session: ${session.sessionId}`)

    return () => {
      if (socketRef.current) {
        socketRef.current.close()
      }
    }
  }, [session.sessionId])

  /**
   * Start listening for Portuguese speech
   */
  const startListening = useCallback(async () => {
    try {
      setSession((prev) => ({ ...prev, isListening: true }))
      setInterimText('')

      const response = await fetch('/api/voice/listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          language: defaultConfig.language,
        }),
      })

      const data = await response.json()

      if (data.status !== 'success') {
        throw new Error('Failed to start listening')
      }

      // Simulate real-time interim results (in real app, would come from WebSocket)
      const simulateInterim = setInterval(() => {
        setInterimText((prev) => {
          if (prev.length > 50) {
            clearInterval(simulateInterim)
            return prev
          }
          return prev + '.'
        })
      }, 200)

      return () => clearInterval(simulateInterim)
    } catch (error) {
      console.error('Failed to start listening:', error)
      setSession((prev) => ({ ...prev, isListening: false }))
    }
  }, [session.sessionId, defaultConfig.language])

  /**
   * Stop listening and process speech
   */
  const stopListening = useCallback(async () => {
    try {
      const response = await fetch('/api/voice/stop-listen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (data.status === 'success') {
        setSession((prev) => ({ ...prev, isListening: false }))
        setInterimText('')
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to stop listening:', error)
      return false
    }
  }, [])

  /**
   * Send text command and get JARVIS response with TTS
   */
  const sendCommand = useCallback(
    async (text: string) => {
      try {
        // Process the Portuguese command
        const processResponse = await fetch('/api/voice/process-command', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        const processData = await processResponse.json()

        if (processData.status !== 'success') {
          throw new Error('Failed to process command')
        }

        const { detectedCommand, confidence, translatedCommand } = processData.data

        // Update session with recognized command
        setSession((prev) => ({
          ...prev,
          recognizedText: text,
          lastCommand: detectedCommand,
          confidence,
        }))

        // Update metrics
        setMetrics((prev) => ({
          ...prev,
          totalPhrasesRecognized: prev.totalPhrasesRecognized + 1,
          averageConfidence: (prev.averageConfidence + confidence) / 2,
        }))

        // Get TTS response from JARVIS
        if (defaultConfig.autoPlay) {
          await speakResponse(`Entendi. Você disse: ${text}`)
        }

        return {
          command: detectedCommand,
          confidence,
          originalText: text,
          translatedCommand,
        }
      } catch (error) {
        console.error('Failed to send command:', error)
        return null
      }
    },
    [defaultConfig.autoPlay]
  )

  /**
   * Speak text response with Portuguese TTS
   */
  const speakResponse = useCallback(
    async (text: string, emotion: 'neutral' | 'friendly' | 'formal' = 'friendly') => {
      try {
        setSession((prev) => ({ ...prev, isPlaying: true }))

        const response = await fetch('/api/voice/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            text,
            language: defaultConfig.language,
            emotion,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to get TTS audio')
        }

        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        // Create and play audio
        const audio = new Audio(audioUrl)
        audio.onended = () => {
          setSession((prev) => ({ ...prev, isPlaying: false }))
        }

        audio.play().catch((error) => {
          console.error('Failed to play audio:', error)
          setSession((prev) => ({ ...prev, isPlaying: false }))
        })

        return true
      } catch (error) {
        console.error('Failed to speak response:', error)
        setSession((prev) => ({ ...prev, isPlaying: false }))
        return false
      }
    },
    [session.sessionId, defaultConfig.language]
  )

  /**
   * Toggle listening on/off
   */
  const toggleListening = useCallback(async () => {
    if (session.isListening) {
      await stopListening()
    } else {
      await startListening()
    }
  }, [session.isListening, startListening, stopListening])

  /**
   * Common Portuguese commands for quick action
   */
  const quickCommands = {
    hello: {
      pt: 'Olá Jarvis',
      en: 'Hello JARVIS',
    },
    help: {
      pt: 'Jarvis, me ajude',
      en: 'JARVIS, help me',
    },
    status: {
      pt: 'Qual é o status?',
      en: 'What is the status?',
    },
    execute: {
      pt: 'Execute agora',
      en: 'Execute now',
    },
  }

  /**
   * Send quick command and get response
   */
  const sendQuickCommand = useCallback(
    async (command: keyof typeof quickCommands) => {
      const text = defaultConfig.language === 'pt-BR' ? quickCommands[command].pt : quickCommands[command].en

      const result = await sendCommand(text)
      return result
    },
    [defaultConfig.language, sendCommand]
  )

  return {
    // Session state
    session,
    interimText,
    metrics,

    // Controls
    startListening,
    stopListening,
    toggleListening,
    sendCommand,
    speakResponse,
    sendQuickCommand,

    // Commands
    quickCommands,

    // Config
    config: defaultConfig,
  }
}

export default usePortugueseVoice
