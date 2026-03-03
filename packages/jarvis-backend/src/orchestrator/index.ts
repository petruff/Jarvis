/**
 * JARVIS AGI Orchestrator - Complete System for Autonomous Goal Execution
 *
 * Exports all orchestrator components:
 * - MasterOrchestrator: Main goal orchestration engine
 * - SquadCreator: Dynamic squad creation based on goal analysis
 * - TaskDecomposer: Break goals into actionable micro-tasks
 * - AgentCoordinator: Assign and execute tasks with agents
 * - SafetyGate: Permission system for destructive operations
 * - ProgressTracker: Real-time execution monitoring
 * - ResultMerger: Intelligent multi-agent output synthesis
 */

export { MasterOrchestrator, Goal, ClarifyingQuestion, OrchestrationContext } from './MasterOrchestrator'
export { SquadCreator, Squad, AVAILABLE_AGENTS, PREDEFINED_SQUADS } from './SquadCreator'
export { TaskDecomposer, Task } from './TaskDecomposer'
export { AgentCoordinator, AgentInfo, TaskAssignment } from './AgentCoordinator'
export { SafetyGate, DestructiveOperation, PermissionRequest } from './SafetyGate'
export { ProgressTracker, ProgressMetrics, OrchestrationMetrics } from './ProgressTracker'
export { ResultMerger, MergedResult } from './ResultMerger'

/**
 * Initialize the complete AGI orchestrator system
 */
export function initializeAGIOrchestrator() {
  console.log(`\n🚀 [JARVIS AGI] Initializing Orchestrator System...`)
  console.log(`   Components:`)
  console.log(`     ✓ Master Orchestrator - Goal execution engine`)
  console.log(`     ✓ Squad Creator - Dynamic squad management`)
  console.log(`     ✓ Task Decomposer - Goal to task breakdown`)
  console.log(`     ✓ Agent Coordinator - Agent assignment & execution`)
  console.log(`     ✓ Safety Gate - Permission system`)
  console.log(`     ✓ Progress Tracker - Real-time monitoring`)
  console.log(`     ✓ Result Merger - Multi-agent synthesis`)
  console.log(`\n   🎯 JARVIS AGI is ready to accept goals and coordinate agents autonomously`)
}

export default {
  initializeAGIOrchestrator
}
