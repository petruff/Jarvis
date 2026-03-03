/**
 * JARVIS Mind Clones Module — Export all components
 *
 * Components:
 * - ExpertExtractor: Extract expertise from documents
 * - MindCloneService: Manage expert clones & reasoning
 */

export { default as ExpertExtractor } from './expertExtractor';

export { default as MindCloneService } from './mindCloneService';

export type {
  MindClone,
  MindCloneDNA,
  ExpertPattern,
  DecisionRule,
  ExpertEvidence,
  ExpertInsight,
  ConsensusDecision,
  ConsensusProfile,
  ExtractionConfig,
} from './types';
