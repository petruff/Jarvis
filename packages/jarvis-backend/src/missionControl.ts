
export interface StopableJob {
    stop(): void;
    id?: string;
}

class MissionControl {
    private isStopRequested = false;
    private backgroundJobs: Set<StopableJob> = new Set();
    private stopListeners: Set<() => void> = new Set();

    /**
     * Request a global stop for all running tasks and background cycles.
     */
    stopAll(): void {
        console.log('🛑 [MISSION CONTROL] GLOBAL STOP REQUESTED');
        this.isStopRequested = true;

        // 1. Stop background loops
        for (const job of this.backgroundJobs) {
            try {
                job.stop();
                console.log(`[MISSION CONTROL] Halted job: ${job.id || 'anonymous'}`);
            } catch (err) {
                console.error(`[MISSION CONTROL] Failed to stop job: ${err}`);
            }
        }

        // 2. Trigger stop listeners (for ReAct loops)
        for (const listener of this.stopListeners) {
            try {
                listener();
            } catch (err) {
                console.error(`[MISSION CONTROL] Failed to trigger stop listener: ${err}`);
            }
        }

        // Reset the flag after a short delay to allow new tasks to start later if needed
        // but keep it true for current loops to catch it.
        setTimeout(() => {
            this.isStopRequested = false;
            console.log('🟢 [MISSION CONTROL] System ready for new missions.');
        }, 5000);
    }

    /**
     * Check if a stop has been requested.
     */
    shouldStop(): boolean {
        return this.isStopRequested;
    }

    /**
     * Register a background job to be stopped on global halt.
     */
    registerJob(job: StopableJob): void {
        this.backgroundJobs.add(job);
    }

    /**
     * Register a listener for the stop signal.
     */
    onStop(listener: () => void): void {
        this.stopListeners.add(listener);
    }

    /**
     * Unregister a listener.
     */
    removeStopListener(listener: () => void): void {
        this.stopListeners.delete(listener);
    }
}

export const missionControl = new MissionControl();
