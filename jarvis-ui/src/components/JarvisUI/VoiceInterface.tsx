import React from 'react'
import { useVoiceInput } from '../../hooks/useVoiceInput'

export const VoiceInterface: React.FC = () => {
  const { isListening, transcript, startListening, stopListening, clearTranscript } = useVoiceInput()

  const handleToggle = () => {
    if (isListening) {
      stopListening()
    } else {
      clearTranscript()
      startListening()
    }
  }

  return (
    <div className="voice-interface">
      <button
        className={`voice-button ${isListening ? 'listening' : ''}`}
        onClick={handleToggle}
        title={isListening ? 'Stop listening' : 'Start listening'}
      >
        {isListening ? (
          <>
            <span className="pulse-dot" />
            🎤 LISTENING
          </>
        ) : (
          <>🎤 SPEAK</>
        )}
      </button>

      {isListening && (
        <div className="waveform-animation">
          <div className="wave" />
          <div className="wave" />
          <div className="wave" />
        </div>
      )}

      {transcript && (
        <div className="transcript-display">
          <p>{transcript}</p>
          <button onClick={clearTranscript} className="clear-button">
            Clear
          </button>
        </div>
      )}
    </div>
  )
}

export default VoiceInterface
