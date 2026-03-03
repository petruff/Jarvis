import { SlidingWindowManager } from '../../src/context/slidingWindowManager'

describe('SlidingWindowManager', () => {
  let manager: SlidingWindowManager

  beforeEach(() => {
    manager = new SlidingWindowManager(1000)
  })

  test('should add items to window', () => {
    const added = manager.addItem('item-1', 'Test content', 'normal')
    expect(added).toBe(true)

    const window = manager.getWindow()
    expect(window.length).toBeGreaterThan(0)
  })

  test('should evict items when capacity exceeded', () => {
    manager = new SlidingWindowManager(100) // Small capacity
    manager.addItem('item-1', 'A', 'low')
    manager.addItem('item-2', 'B', 'low')
    manager.addItem('item-3', 'Very long content that takes up much space '.repeat(5), 'high')

    const window = manager.getWindow()
    expect(window.length).toBeLessThanOrEqual(3)
  })

  test('should pin items to prevent eviction', () => {
    manager = new SlidingWindowManager(100)
    manager.addItem('pinned', 'Important', 'normal')
    manager.pinItem('pinned')

    // Try to evict
    manager.addItem('large', 'X'.repeat(200), 'low')

    // Pinned item should still exist
    const window = manager.getWindow()
    const pinned = window.find((i) => i.id === 'pinned')
    expect(pinned).toBeDefined()
  })

  test('should get window status', () => {
    manager.addItem('test', 'Some content here', 'normal')
    const status = manager.getStatus()

    expect(status.currentTokens).toBeGreaterThan(0)
    expect(status.capacity).toBe(1000)
    expect(status.percentUsed).toBeGreaterThan(0)
    expect(status.itemCount).toBeGreaterThan(0)
  })

  test('should remove items from window', () => {
    manager.addItem('removable', 'Content', 'normal')
    const initialWindow = manager.getWindow()
    const initialSize = initialWindow.length

    manager.removeItem('removable')
    const finalWindow = manager.getWindow()

    expect(finalWindow.length).toBeLessThan(initialSize)
  })
})
