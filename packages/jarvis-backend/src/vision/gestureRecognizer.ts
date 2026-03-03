/**
 * Gesture Recognizer — Hand Gesture & Pose Detection
 *
 * Detects:
 * - Hand gestures (open hand, pointing, thumbs up, etc.)
 * - Movement patterns (swipe, circle, wave)
 * - Head/body pose
 * - Confidence levels
 */

export type GestureType =
    | 'open_hand'
    | 'closed_fist'
    | 'thumbs_up'
    | 'thumbs_down'
    | 'pointing'
    | 'peace_sign'
    | 'ok_sign'
    | 'wave'
    | 'swipe_left'
    | 'swipe_right'
    | 'circle'
    | 'double_tap'
    | 'palm_up'
    | 'palm_down'
    | 'unknown';

export interface Gesture {
    type: GestureType;
    confidence: number;
    position: { x: number; y: number };
    hand: 'left' | 'right' | 'both';
    timestamp: number;
    duration?: number;
}

export interface GestureSequence {
    gestures: Gesture[];
    pattern: GestureType[];
    totalDuration: number;
    confidence: number;
}

class GestureRecognizer {
    private gestureHistory: Gesture[] = [];
    private maxHistorySize = 100;
    private consecutiveFrameThreshold = 3; // Require detection in 3+ frames
    private movementThreshold = 50; // pixels

    /**
     * Recognize gesture from image analysis
     */
    async recognizeGesture(
        analysisText: string,
        position: { x: number; y: number },
        hand: 'left' | 'right' | 'both' = 'right'
    ): Promise<Gesture | null> {
        try {
            const gesture = this.parseGesture(analysisText, position, hand);

            if (gesture) {
                this.addToHistory(gesture);
            }

            return gesture;
        } catch (error) {
            console.error('[GestureRecognizer] Recognition error:', error);
            return null;
        }
    }

    /**
     * Detect gesture sequence (multiple gestures in sequence)
     */
    getGestureSequence(windowSize: number = 10): GestureSequence | null {
        if (this.gestureHistory.length < windowSize) {
            return null;
        }

        const recentGestures = this.gestureHistory.slice(-windowSize);
        const pattern = recentGestures
            .map((g) => g.type)
            .filter((t) => t !== 'unknown');

        if (pattern.length === 0) {
            return null;
        }

        const totalDuration =
            recentGestures[recentGestures.length - 1].timestamp -
            recentGestures[0].timestamp;
        const avgConfidence =
            recentGestures.reduce((a, g) => a + g.confidence, 0) /
            recentGestures.length;

        return {
            gestures: recentGestures,
            pattern,
            totalDuration,
            confidence: avgConfidence,
        };
    }

    /**
     * Detect continuous movement (swipe, circle, wave)
     */
    detectMovement(): {
        type: 'swipe_left' | 'swipe_right' | 'circle' | 'wave' | 'none';
        velocity: number;
        direction: { x: number; y: number };
    } {
        if (this.gestureHistory.length < 5) {
            return { type: 'none', velocity: 0, direction: { x: 0, y: 0 } };
        }

        const recent = this.gestureHistory.slice(-5);
        const positions = recent.map((g) => g.position);

        // Calculate movement vector
        const startPos = positions[0];
        const endPos = positions[positions.length - 1];

        const dx = endPos.x - startPos.x;
        const dy = endPos.y - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const velocity = distance / 5; // per frame

        // Classify movement
        let movementType: 'swipe_left' | 'swipe_right' | 'circle' | 'wave' | 'none' = 'none';

        if (distance > this.movementThreshold) {
            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal movement
                movementType = dx < 0 ? 'swipe_left' : 'swipe_right';
            } else {
                // Vertical movement could be wave
                movementType = 'wave';
            }

            // Check for circular motion
            if (this.isCircularMotion(positions)) {
                movementType = 'circle';
            }
        }

        return {
            type: movementType,
            velocity,
            direction: { x: dx / distance, y: dy / distance },
        };
    }

    /**
     * Check if movement forms a circle
     */
    private isCircularMotion(positions: Array<{ x: number; y: number }>): boolean {
        if (positions.length < 4) return false;

        // Calculate center
        const centerX =
            positions.reduce((a, p) => a + p.x, 0) / positions.length;
        const centerY =
            positions.reduce((a, p) => a + p.y, 0) / positions.length;

        // Check if all points are roughly equidistant from center
        const distances = positions.map((p) =>
            Math.sqrt(
                Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2)
            )
        );

        const avgDistance = distances.reduce((a, d) => a + d, 0) / distances.length;
        const variance =
            distances.reduce((a, d) => a + Math.pow(d - avgDistance, 2), 0) /
            distances.length;

        // Circular if low variance in distances
        return Math.sqrt(variance) < avgDistance * 0.3;
    }

    /**
     * Parse gesture from text analysis
     */
    private parseGesture(
        analysisText: string,
        position: { x: number; y: number },
        hand: 'left' | 'right' | 'both'
    ): Gesture | null {
        const text = analysisText.toLowerCase();

        // Gesture patterns
        const patterns: Array<[RegExp, GestureType, number]> = [
            [/open hand|palm up|open palm/, 'open_hand', 0.9],
            [/closed fist|fist|clenched/, 'closed_fist', 0.85],
            [/thumbs up|thumb up/, 'thumbs_up', 0.95],
            [/thumbs down|thumb down/, 'thumbs_down', 0.95],
            [/pointing|finger point/, 'pointing', 0.88],
            [/peace sign|victory|v sign/, 'peace_sign', 0.9],
            [/ok sign|ok gesture/, 'ok_sign', 0.87],
            [/wave|waving/, 'wave', 0.85],
            [/swipe left|left swipe/, 'swipe_left', 0.8],
            [/swipe right|right swipe/, 'swipe_right', 0.8],
            [/circle|circular/, 'circle', 0.75],
            [/double tap|double click/, 'double_tap', 0.8],
            [/palm down|facing down/, 'palm_down', 0.85],
        ];

        for (const [pattern, gestureType, confidence] of patterns) {
            if (pattern.test(text)) {
                return {
                    type: gestureType,
                    confidence,
                    position,
                    hand,
                    timestamp: Date.now(),
                };
            }
        }

        return null;
    }

    /**
     * Add gesture to history
     */
    private addToHistory(gesture: Gesture): void {
        this.gestureHistory.push(gesture);

        // LRU eviction
        if (this.gestureHistory.length > this.maxHistorySize) {
            this.gestureHistory.shift();
        }
    }

    /**
     * Get recent gestures
     */
    getRecentGestures(count: number = 10): Gesture[] {
        return this.gestureHistory.slice(-count);
    }

    /**
     * Get gesture statistics
     */
    getStatistics(): {
        totalGestures: number;
        averageConfidence: number;
        mostFrequent: GestureType;
        timeline: Array<{ gesture: GestureType; count: number }>;
    } {
        const gestures = this.gestureHistory;

        if (gestures.length === 0) {
            return {
                totalGestures: 0,
                averageConfidence: 0,
                mostFrequent: 'unknown',
                timeline: [],
            };
        }

        // Calculate average confidence
        const avgConfidence =
            gestures.reduce((a, g) => a + g.confidence, 0) / gestures.length;

        // Find most frequent gesture
        const gestureCount = new Map<GestureType, number>();
        gestures.forEach((g) => {
            gestureCount.set(g.type, (gestureCount.get(g.type) || 0) + 1);
        });

        const mostFrequent = Array.from(gestureCount.entries()).sort(
            (a, b) => b[1] - a[1]
        )[0]?.[0] || 'unknown';

        const timeline = Array.from(gestureCount.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([gesture, count]) => ({ gesture, count }));

        return {
            totalGestures: gestures.length,
            averageConfidence: avgConfidence,
            mostFrequent,
            timeline,
        };
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        this.gestureHistory = [];
    }
}

export default GestureRecognizer;
