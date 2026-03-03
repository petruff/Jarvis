import { ModelSelector } from '../../src/costs/modelSelector'

describe('ModelSelector', () => {
  let selector: ModelSelector

  beforeEach(() => {
    selector = new ModelSelector()
  })

  describe('analyzeComplexity', () => {
    it('should return simple complexity for low values', () => {
      const analysis = selector.analyzeComplexity(500, 5, 1)
      expect(analysis.category).toBe('simple')
      expect(analysis.score).toBeLessThan(4)
    })

    it('should return standard complexity for medium values', () => {
      const analysis = selector.analyzeComplexity(4000, 15, 5)
      expect(analysis.category).toBe('standard')
      expect(analysis.score).toBeGreaterThanOrEqual(4)
      expect(analysis.score).toBeLessThanOrEqual(7)
    })

    it('should return complex complexity for high values', () => {
      const analysis = selector.analyzeComplexity(16000, 30, 15)
      expect(analysis.category).toBe('complex')
      expect(analysis.score).toBeGreaterThan(7)
    })

    it('should calculate score correctly', () => {
      const analysis = selector.analyzeComplexity(1000, 10, 3)
      // Expected: (1000/4000*4 + 10/25*3 + 3/10*3)/10 = (1 + 1.2 + 0.9)/10 = 0.31
      expect(analysis.score).toBeCloseTo((1 + 1.2 + 0.9) / 10, 1)
    })
  })

  describe('selectModel', () => {
    it('should select cheap model for simple complexity', () => {
      const model = selector.selectModel({ category: 'simple', score: 2 })
      expect(['deepseek-chat', 'llama-2-local']).toContain(model)
    })

    it('should select standard model for standard complexity', () => {
      const model = selector.selectModel({ category: 'standard', score: 5.5 })
      expect(['gpt-3.5-turbo', 'claude-3-haiku']).toContain(model)
    })

    it('should select premium model for complex tasks', () => {
      const model = selector.selectModel({ category: 'complex', score: 8.5 })
      expect(['gpt-4-turbo', 'claude-3-opus']).toContain(model)
    })
  })

  describe('getModelByContext', () => {
    it('should select cheap model for small context', () => {
      const model = selector.getModelByContext(1000)
      expect(['deepseek-chat', 'llama-2-local']).toContain(model)
    })

    it('should select standard model for medium context', () => {
      const model = selector.getModelByContext(8000)
      expect(['gpt-3.5-turbo', 'claude-3-haiku']).toContain(model)
    })

    it('should select premium model for large context', () => {
      const model = selector.getModelByContext(32000)
      expect(['gpt-4-turbo', 'claude-3-opus']).toContain(model)
    })
  })

  describe('estimateCostSavings', () => {
    it('should calculate positive savings when switching to cheaper model', () => {
      const savings = selector.estimateCostSavings('gpt-4-turbo', 'deepseek-chat', 1_000_000, 500_000)
      expect(savings).toBeGreaterThan(0)
    })

    it('should show zero savings when switching to same model', () => {
      const savings = selector.estimateCostSavings('deepseek-chat', 'deepseek-chat', 1_000_000, 500_000)
      expect(savings).toBe(0)
    })

    it('should show negative savings when switching to expensive model', () => {
      const savings = selector.estimateCostSavings('deepseek-chat', 'gpt-4-turbo', 1_000_000, 500_000)
      expect(savings).toBeLessThan(0)
    })

    it('should calculate correct savings magnitude', () => {
      // GPT-4: (1M * 3 + 500k * 6) / 1M = 6
      // DeepSeek: (1M * 0.14 + 500k * 0.28) / 1M = 0.28
      // Savings: 6 - 0.28 = 5.72
      const savings = selector.estimateCostSavings('gpt-4-turbo', 'deepseek-chat', 1_000_000, 500_000)
      expect(savings).toBeCloseTo(5.72, 1)
    })
  })

  describe('edge cases', () => {
    it('should handle zero tokens', () => {
      const cost = selector.estimateCostSavings('gpt-4-turbo', 'deepseek-chat', 0, 0)
      expect(cost).toBe(0)
    })

    it('should handle invalid complexity gracefully', () => {
      // Should not throw
      expect(() => {
        selector.selectModel({ category: 'simple' as any, score: 0 })
      }).not.toThrow()
    })
  })
})
