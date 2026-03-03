/**
 * Mind Clone Types — Data Structures for Expert AI Agents
 *
 * Defines:
 * - Mind Clone structure (5-layer expert DNA)
 * - Expert patterns and reasoning rules
 * - Evidence linking and decision justification
 * - Consensus reasoning consensus profiles
 */

/**
 * Expert Mental Model — How an expert thinks
 */
export interface ExpertPattern {
  pattern: string; // Description of the pattern
  frequency: number; // How often this pattern appears
  confidence: number; // 0-1 confidence score
  examples: string[]; // Example cases this pattern applies to
  relatedPatterns: string[]; // Connected patterns
}

/**
 * Decision Rule — How an expert makes decisions
 */
export interface DecisionRule {
  id: string;
  condition: string; // The situation/condition
  action: string; // What to do
  reasoning: string; // Why this action
  confidence: number; // 0-1 confidence
  evidenceLinks: string[]; // Document IDs supporting this rule
  counterExamples: string[]; // Cases where rule failed
  successRate: number; // % of times rule succeeds
}

/**
 * Expert Evidence — Facts & Knowledge
 */
export interface ExpertEvidence {
  id: string;
  claim: string; // The statement being supported
  sources: string[]; // Document/chunk IDs
  confidence: number; // 0-1 confidence
  contradictions: string[]; // Evidence that contradicts this
  timestamp: number;
}

/**
 * Mind Clone DNA — 5-Layer Expert Definition
 */
export interface MindCloneDNA {
  // Layer 1: Identity
  expertName: string;
  domain: string; // e.g., "Software Architecture", "UX Design"
  bio: string;
  expertise_level: 'novice' | 'intermediate' | 'expert' | 'master';

  // Layer 2: Mental Models
  mentalModels: ExpertPattern[]; // How they think
  problemSolvingApproach: string;
  decisionMakingStyle: 'analytical' | 'intuitive' | 'balanced' | 'creative';

  // Layer 3: Decision Rules
  decisionRules: DecisionRule[]; // How they decide
  biases: string[]; // Known biases or preferences
  blindSpots: string[]; // Known weaknesses

  // Layer 4: Knowledge & Evidence
  coreBeliefs: string[];
  knowledgeBase: ExpertEvidence[];
  lessons: string[]; // Lessons learned

  // Layer 5: Personality
  communicationStyle: string;
  valueHierarchy: string[];
  trustFactors: string[]; // What they trust
  suspicionFactors: string[]; // What they distrust
}

/**
 * Mind Clone Instance — Active Expert Agent
 */
export interface MindClone {
  id: string;
  cloneId: string; // Unique identifier
  dna: MindCloneDNA; // The expert definition
  createdAt: number;
  updatedAt: number;
  sourceDocuments: string[]; // Knowledge documents used
  extractionConfidence: number; // How confident we are in extraction
  activationCount: number; // Times this clone has been used
  successRate: number; // % of decisions that led to good outcomes
  metadata: {
    version: string;
    extractedBy: string; // Which extractor created this
    notes: string;
    tags: string[];
  };
}

/**
 * Clone Consensus Profile — How experts combine reasoning
 */
export interface ConsensusProfile {
  profileId: string;
  cloneIds: string[]; // Participating expert clones
  domain: string; // Shared domain
  decisionWeights: Record<string, number>; // How much to weight each expert
  conflictResolution: 'majority' | 'consensus' | 'weighted' | 'custom';
  finalDecision?: string;
  justification?: string;
  confidence?: number;
  dissent?: Array<{
    cloneId: string;
    position: string;
    reasoning: string;
  }>;
}

/**
 * Consensus Decision — Result from multiple expert clones
 */
export interface ConsensusDecision {
  id: string;
  query: string;
  timestamp: number;
  profile: ConsensusProfile;
  decision: string;
  confidence: number;
  evidence: Array<{
    cloneId: string;
    claim: string;
    support: number; // 0-1
  }>;
  reasoning: string;
  alternatives: Array<{
    option: string;
    support: number; // 0-1
    clones: string[];
  }>;
  dissent: string[];
}

/**
 * Expert Insight — Single expert's analysis
 */
export interface ExpertInsight {
  cloneId: string;
  expertName: string;
  domain: string;
  claim: string;
  reasoning: string;
  confidence: number;
  relevantRules: DecisionRule[];
  supportingEvidence: ExpertEvidence[];
  uncertainties: string[];
}

/**
 * Clone Extraction Configuration
 */
export interface ExtractionConfig {
  targetDomain: string;
  extractPatterns: boolean;
  extractRules: boolean;
  extractBeliefs: boolean;
  minConfidence: number; // Filter low-confidence extractions
  maxPatternsPerType: number;
  useConversationContext: boolean;
}
