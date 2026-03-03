/**
 * Story 4.5: Cost Optimization Engine
 * Pricing Data - Model pricing definitions
 */

export interface ModelPricing {
  id: string
  name: string
  inputPrice: number      // per 1M tokens
  outputPrice: number     // per 1M tokens
  minCostPerCall: number
  category: 'cheap' | 'standard' | 'premium' | 'free'
}

export const DEFAULT_PRICING: Record<string, ModelPricing> = {
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    inputPrice: 0.14,
    outputPrice: 0.28,
    minCostPerCall: 0,
    category: 'cheap'
  },
  'llama-2-local': {
    id: 'llama-2-local',
    name: 'Llama 2 (Local)',
    inputPrice: 0,
    outputPrice: 0,
    minCostPerCall: 0,
    category: 'free'
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    inputPrice: 0.50,
    outputPrice: 1.50,
    minCostPerCall: 0,
    category: 'standard'
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    inputPrice: 0.25,
    outputPrice: 0.75,
    minCostPerCall: 0,
    category: 'standard'
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    inputPrice: 3.00,
    outputPrice: 6.00,
    minCostPerCall: 0,
    category: 'premium'
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    inputPrice: 3.00,
    outputPrice: 15.00,
    minCostPerCall: 0,
    category: 'premium'
  }
}

export function getPricing(modelId: string): ModelPricing {
  return DEFAULT_PRICING[modelId] || DEFAULT_PRICING['deepseek-chat']
}

export function getPricingByCategory(category: 'cheap' | 'standard' | 'premium' | 'free'): ModelPricing {
  const models = Object.values(DEFAULT_PRICING).filter(m => m.category === category)
  return models[0] || DEFAULT_PRICING['deepseek-chat']
}
