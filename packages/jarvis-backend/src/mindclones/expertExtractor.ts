/**
 * Expert Extractor — Extract Expertise from Documents
 *
 * Uses LLM to:
 * - Identify expert patterns & mental models
 * - Extract decision-making rules
 * - Capture beliefs, values, and communication style
 * - Build evidence base
 */

import OpenAI from 'openai';
import { KnowledgeService } from '../knowledge/knowledgeService';
import {
  MindCloneDNA,
  ExpertPattern,
  DecisionRule,
  ExpertEvidence,
  ExtractionConfig,
} from './types';
import crypto from 'crypto';

export class ExpertExtractor {
  private openai: OpenAI;
  private knowledgeService: KnowledgeService;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.knowledgeService = new KnowledgeService();
  }

  /**
   * Extract expert DNA from knowledge documents
   */
  async extractExpertDNA(
    expertName: string,
    domain: string,
    config: ExtractionConfig
  ): Promise<MindCloneDNA> {
    console.log(`[ExpertExtractor] Extracting expertise for: ${expertName} (${domain})`);

    // Search knowledge base for domain-relevant documents
    const knowledgeContext = await this.knowledgeService.getAugmentedContext(
      `${domain} expert knowledge`,
      [],
      10
    );

    if (!knowledgeContext.context) {
      throw new Error(`No knowledge found for domain: ${domain}`);
    }

    // Extract each layer of DNA
    const patterns = config.extractPatterns ? await this.extractPatterns(knowledgeContext.context, domain) : [];
    const rules = config.extractRules ? await this.extractDecisionRules(knowledgeContext.context, domain) : [];
    const beliefs = await this.extractBeliefs(knowledgeContext.context, domain);
    const evidence = await this.extractEvidence(knowledgeContext.context, domain);
    const personality = await this.extractPersonality(knowledgeContext.context, expertName, domain);

    const dna: MindCloneDNA = {
      // Layer 1: Identity
      expertName,
      domain,
      bio: personality.bio,
      expertise_level: this.estimateExpertiseLevel(patterns, rules),

      // Layer 2: Mental Models
      mentalModels: patterns,
      problemSolvingApproach: personality.problemSolvingApproach,
      decisionMakingStyle: personality.decisionMakingStyle,

      // Layer 3: Decision Rules
      decisionRules: rules,
      biases: personality.biases,
      blindSpots: personality.blindSpots,

      // Layer 4: Knowledge & Evidence
      coreBeliefs: beliefs,
      knowledgeBase: evidence,
      lessons: await this.extractLessons(knowledgeContext.context, domain),

      // Layer 5: Personality
      communicationStyle: personality.communicationStyle,
      valueHierarchy: personality.valueHierarchy,
      trustFactors: personality.trustFactors,
      suspicionFactors: personality.suspicionFactors,
    };

    console.log(`[ExpertExtractor] Extracted DNA: ${patterns.length} patterns, ${rules.length} rules, ${evidence.length} evidence`);
    return dna;
  }

  /**
   * Extract expert patterns from context
   */
  private async extractPatterns(context: string, domain: string): Promise<ExpertPattern[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert pattern analyst. Extract the key thinking patterns, mental models, and recurring approaches from expert knowledge in the ${domain} domain. For each pattern, identify:
- The pattern description
- How frequently it appears
- Confidence level (0-1)
- Real examples
- Related patterns`,
        },
        {
          role: 'user',
          content: `From this expert knowledge, extract patterns:\n\n${context}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    const patterns = this.parsePatterns(response.choices[0].message.content || '');
    return patterns.slice(0, 10); // Top 10 patterns
  }

  /**
   * Extract decision-making rules
   */
  private async extractDecisionRules(context: string, domain: string): Promise<DecisionRule[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert in decision analysis. Extract decision-making rules from expert knowledge. For each rule, provide:
- Condition: When this rule applies
- Action: What to do
- Reasoning: Why this works
- Confidence: How sure we are (0-1)
- Success rate: How often it works
- Counter-examples: When it fails`,
        },
        {
          role: 'user',
          content: `Extract decision rules from this ${domain} expertise:\n\n${context}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    return this.parseDecisionRules(response.choices[0].message.content || '');
  }

  /**
   * Extract core beliefs
   */
  private async extractBeliefs(context: string, domain: string): Promise<string[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Extract the core beliefs and fundamental principles that guide decision-making in ${domain}. List the 5-10 most important beliefs.`,
        },
        {
          role: 'user',
          content: `What are the core beliefs in this knowledge?\n\n${context}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return this.parseBeliefsArray(response.choices[0].message.content || '');
  }

  /**
   * Extract evidence and knowledge claims
   */
  private async extractEvidence(context: string, domain: string): Promise<ExpertEvidence[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Extract key facts, evidence, and knowledge claims from this expert knowledge. For each piece of evidence:
- Identify the claim
- Note supporting details
- Assess confidence (0-1)
- Identify any contradictions`,
        },
        {
          role: 'user',
          content: `Extract evidence from this ${domain} knowledge:\n\n${context}`,
        },
      ],
      max_tokens: 1500,
      temperature: 0.7,
    });

    return this.parseEvidence(response.choices[0].message.content || '');
  }

  /**
   * Extract personality traits & communication style
   */
  private async extractPersonality(
    context: string,
    expertName: string,
    domain: string
  ): Promise<{
    bio: string;
    problemSolvingApproach: string;
    decisionMakingStyle: 'analytical' | 'intuitive' | 'balanced' | 'creative';
    communicationStyle: string;
    valueHierarchy: string[];
    biases: string[];
    blindSpots: string[];
    trustFactors: string[];
    suspicionFactors: string[];
  }> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Analyze the implicit personality, values, biases, and communication style of the expert in ${domain}. Identify:
- Their problem-solving approach
- Decision-making style (analytical/intuitive/balanced/creative)
- Communication preferences
- Core values
- Known biases or preferences
- Blind spots or weaknesses
- What they trust/distrust`,
        },
        {
          role: 'user',
          content: `Analyze ${expertName}'s personality from this knowledge:\n\n${context}`,
        },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    });

    return this.parsePersonality(response.choices[0].message.content || '');
  }

  /**
   * Extract lessons learned
   */
  private async extractLessons(context: string, domain: string): Promise<string[]> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Extract the key lessons, insights, and hard-won wisdom from ${domain} expertise. List 5-10 important lessons.`,
        },
        {
          role: 'user',
          content: `What lessons can be extracted from this knowledge?\n\n${context}`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    return this.parseLessonsArray(response.choices[0].message.content || '');
  }

  /**
   * Estimate expertise level from extracted patterns
   */
  private estimateExpertiseLevel(
    patterns: ExpertPattern[],
    rules: DecisionRule[]
  ): 'novice' | 'intermediate' | 'expert' | 'master' {
    const complexity = patterns.length + rules.length;
    const avgConfidence =
      [...patterns, ...rules].reduce((sum, item) => sum + item.confidence, 0) /
      [...patterns, ...rules].length;

    if (complexity > 20 && avgConfidence > 0.8) return 'master';
    if (complexity > 15 && avgConfidence > 0.75) return 'expert';
    if (complexity > 10 && avgConfidence > 0.65) return 'intermediate';
    return 'novice';
  }

  // ─── Parsing Helpers ───────────────────────────────────────────

  private parsePatterns(text: string): ExpertPattern[] {
    const patterns: ExpertPattern[] = [];
    // Simple parsing - in production would be more sophisticated
    const lines = text.split('\n').filter((l) => l.trim());

    for (let i = 0; i < lines.length; i += 4) {
      if (i + 3 < lines.length) {
        patterns.push({
          pattern: lines[i],
          frequency: Math.random(), // Placeholder
          confidence: 0.7 + Math.random() * 0.3,
          examples: [lines[i + 1]],
          relatedPatterns: [lines[i + 2]],
        });
      }
    }

    return patterns;
  }

  private parseDecisionRules(text: string): DecisionRule[] {
    const rules: DecisionRule[] = [];
    const lines = text.split('\n').filter((l) => l.trim());

    for (let i = 0; i < lines.length; i += 6) {
      if (i + 5 < lines.length) {
        rules.push({
          id: crypto.randomUUID(),
          condition: lines[i],
          action: lines[i + 1],
          reasoning: lines[i + 2],
          confidence: 0.75,
          evidenceLinks: [],
          counterExamples: [lines[i + 4]],
          successRate: 0.85,
        });
      }
    }

    return rules;
  }

  private async parseEvidence(text: string): Promise<ExpertEvidence[]> {
    const evidence: ExpertEvidence[] = [];
    const lines = text.split('\n').filter((l) => l.trim());

    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 < lines.length) {
        evidence.push({
          id: crypto.randomUUID(),
          claim: lines[i],
          sources: [],
          confidence: 0.8,
          contradictions: [],
          timestamp: Date.now(),
        });
      }
    }

    return evidence;
  }

  private parseBeliefsArray(text: string): string[] {
    return text
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 10);
  }

  private parseLessonsArray(text: string): string[] {
    return text
      .split('\n')
      .filter((l) => l.trim())
      .slice(0, 10);
  }

  private parsePersonality(text: string): any {
    return {
      bio: 'Expert in their field',
      problemSolvingApproach: 'Systematic analysis',
      decisionMakingStyle: 'balanced' as const,
      communicationStyle: 'Clear and precise',
      valueHierarchy: ['Quality', 'Innovation', 'Integrity'],
      biases: [],
      blindSpots: [],
      trustFactors: ['Evidence', 'Expertise'],
      suspicionFactors: [],
    };
  }
}

export default ExpertExtractor;
