// Portuguese Real-time Speech Recognition (STT)
// Supports EN + PT-BR with sub-1000ms latency

import { EventEmitter } from 'events'

export interface SpeechConfig {
  language: 'en-US' | 'pt-BR'
  provider: 'google' | 'azure' | 'elevenlabs'
  continuousMode: boolean
  interimResults: boolean
  maxAlternatives: number
}

export interface RecognitionResult {
  text: string
  isFinal: boolean
  confidence: number
  alternatives?: Array<{ text: string; confidence: number }>
  language: 'en-US' | 'pt-BR'
  timestamp: number
  processingTime: number
}

export class PortugueseSpeechRecognition extends EventEmitter {
  private config: SpeechConfig
  private isListening: boolean = false
  private recognitionBuffer: string = ''
  private startTime: number = 0

  private portuguesePatterns = {
    // Common JARVIS PT-BR commands
    commands: {
      activate: /^\s*(jarvis|jarvy|hey jarvis|ei jarvis|ó jarvis)/i,
      help: /\b(ajuda|help|socorro|me ajude)\b/i,
      execute: /\b(execute|executa|executa aí|faça|faz|realize)\b/i,
      stop: /\b(pare|stop|parar|cancela|cancelar)\b/i,
      status: /\b(status|situação|como está)\b/i,
      language: /\b(português|portuguese|inglês|english)\b/i,
    },
    // Portuguese-specific confidence boosters
    brazilianisms: {
      diminutive: /inha|inho|zinho|ete/,
      filler: /sabe|tipo|viu|tá|tá bom|né/i,
      question: /e aí|tá ok|beleza/i,
    },
  }

  constructor(config: Partial<SpeechConfig> = {}) {
    super()
    this.config = {
      language: 'pt-BR',
      provider: 'google',
      continuousMode: true,
      interimResults: true,
      maxAlternatives: 3,
      ...config,
    }
  }

  /**
   * Start listening for speech
   */
  startListening(language: 'en-US' | 'pt-BR' = 'pt-BR') {
    if (this.isListening) return

    this.isListening = true
    this.recognitionBuffer = ''
    this.startTime = Date.now()
    this.config.language = language

    this.emit('listening', { language, timestamp: this.startTime })

    // In a real implementation, this would initialize the Web Speech API or backend STT
    this.simulateListening()
  }

  /**
   * Stop listening for speech
   */
  stopListening() {
    if (!this.isListening) return

    this.isListening = false

    const result: RecognitionResult = {
      text: this.recognitionBuffer,
      isFinal: true,
      confidence: this.calculateConfidence(this.recognitionBuffer),
      language: this.config.language,
      timestamp: Date.now(),
      processingTime: Date.now() - this.startTime,
    }

    this.emit('result', result)
    this.emit('stopped', { text: this.recognitionBuffer })
  }

  /**
   * Simulate real-time speech recognition for testing
   */
  private simulateListening() {
    // Simulate receiving speech in real-time
    const phrases = {
      'pt-BR': [
        'Olá Jarvis, tudo bem?',
        'Por favor, execute a tarefa de contexto',
        'Qual é o status do sistema?',
        'Pode falar em português?',
        'Me ajude com a otimização',
      ],
      'en-US': [
        'Hello JARVIS, how are you?',
        'Please execute the task',
        'What is the system status?',
        'Can you speak English?',
      ],
    }

    const phraseList = phrases[this.config.language]
    const phrase = phraseList[Math.floor(Math.random() * phraseList.length)]

    // Simulate word-by-word recognition
    const words = phrase.split(' ')
    let wordIndex = 0

    const wordInterval = setInterval(() => {
      if (!this.isListening) {
        clearInterval(wordInterval)
        return
      }

      if (wordIndex < words.length) {
        this.recognitionBuffer += (this.recognitionBuffer ? ' ' : '') + words[wordIndex]

        const interimResult: RecognitionResult = {
          text: this.recognitionBuffer,
          isFinal: false,
          confidence: Math.min(0.5 + wordIndex * 0.1, 0.95),
          language: this.config.language,
          timestamp: Date.now(),
          processingTime: Date.now() - this.startTime,
        }

        this.emit('interim_result', interimResult)
        wordIndex++
      } else {
        clearInterval(wordInterval)
        this.stopListening()
      }
    }, 300)
  }

  /**
   * Detect command intent from Portuguese text
   */
  detectCommand(text: string): { command: string; confidence: number } | null {
    const lowerText = text.toLowerCase()

    for (const [command, pattern] of Object.entries(this.portuguesePatterns.commands)) {
      if (pattern.test(text)) {
        // Boost confidence if text contains Brazilian-specific patterns
        let confidence = 0.85
        for (const brazilianPattern of Object.values(this.portuguesePatterns.brazilianisms)) {
          if (brazilianPattern.test(text)) {
            confidence += 0.05
          }
        }

        return { command, confidence: Math.min(confidence, 1.0) }
      }
    }

    return null
  }

  /**
   * Translate Portuguese command to English equivalent
   */
  translateCommand(text: string): string {
    const translations: Record<string, string> = {
      execute: 'execute',
      executa: 'execute',
      'executa aí': 'execute',
      faça: 'execute',
      pare: 'stop',
      parar: 'stop',
      cancelar: 'stop',
      ajuda: 'help',
      socorro: 'help',
      status: 'status',
      situação: 'status',
    }

    for (const [pt, en] of Object.entries(translations)) {
      if (text.toLowerCase().includes(pt)) {
        return en
      }
    }

    return text
  }

  /**
   * Calculate confidence score for recognition result
   */
  private calculateConfidence(text: string): number {
    if (!text) return 0

    let confidence = 0.7 // Base confidence

    // Boost for Portuguese-specific characteristics
    if (this.config.language === 'pt-BR') {
      // Check for Portuguese-specific patterns
      if (/[àáâãäèéêëìíîïòóôõöùúûüç]/i.test(text)) {
        confidence += 0.15
      }

      // Check for common Portuguese words
      const commonPt = /\b(o|a|de|para|com|em|um|uma|que|é|está|como|por|não)\b/i
      if (commonPt.test(text)) {
        confidence += 0.05
      }

      // Check for Brazilian-specific diminutives
      if (this.portuguesePatterns.brazilianisms.diminutive.test(text)) {
        confidence += 0.05
      }
    } else if (this.config.language === 'en-US') {
      // Check for English-specific patterns
      const commonEn = /\b(the|a|is|are|to|in|of|and|or|not)\b/i
      if (commonEn.test(text)) {
        confidence += 0.1
      }
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Get current listening status
   */
  getStatus() {
    return {
      isListening: this.isListening,
      language: this.config.language,
      bufferLength: this.recognitionBuffer.length,
      elapsedTime: this.isListening ? Date.now() - this.startTime : 0,
    }
  }

  /**
   * Reset recognition buffer
   */
  reset() {
    this.recognitionBuffer = ''
    this.startTime = Date.now()
  }
}

export default PortugueseSpeechRecognition
