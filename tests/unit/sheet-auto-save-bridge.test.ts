import { afterEach, describe, expect, it, vi } from "vitest"
import type { SheetData } from "@/lib/sheet-data"
import { defaultSheetData } from "@/lib/default-sheet-data"
import { subscribeToSheetAutoSave } from "@/lib/sheet-auto-save-bridge"

type TestState = {
  sheetData: SheetData
  sheetDataGeneration: number
}

function createTestStore(initialState: TestState) {
  let state = initialState
  const listeners = new Set<(state: TestState, previousState: TestState) => void>()

  return {
    getState: () => state,
    subscribe: (listener: (state: TestState, previousState: TestState) => void) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setState: (nextState: TestState) => {
      const previousState = state
      state = nextState
      listeners.forEach((listener) => listener(state, previousState))
    },
  }
}

describe("sheet auto-save bridge", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("debounces edits without requiring a React subscription", () => {
    vi.useFakeTimers()
    const initialData = { ...defaultSheetData, name: "A" }
    const store = createTestStore({
      sheetData: initialData,
      sheetDataGeneration: 0,
    })
    const save = vi.fn()
    const unsubscribe = subscribeToSheetAutoSave({
      store,
      resolveCharacterId: () => "character-1",
      save,
    })

    const firstEdit = { ...initialData, name: "B" }
    store.setState({ sheetData: firstEdit, sheetDataGeneration: 0 })
    vi.advanceTimersByTime(200)
    const secondEdit = { ...firstEdit, name: "C" }
    store.setState({ sheetData: secondEdit, sheetDataGeneration: 0 })

    vi.advanceTimersByTime(299)
    expect(save).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(save).toHaveBeenCalledOnce()
    expect(save).toHaveBeenCalledWith("character-1", secondEdit)

    unsubscribe()
  })

  it("cancels pending writes and skips whole-sheet replacements", () => {
    vi.useFakeTimers()
    const initialData = { ...defaultSheetData, name: "Old" }
    const store = createTestStore({
      sheetData: initialData,
      sheetDataGeneration: 0,
    })
    const save = vi.fn()
    const unsubscribe = subscribeToSheetAutoSave({
      store,
      resolveCharacterId: () => "character-1",
      save,
    })

    store.setState({
      sheetData: { ...initialData, name: "Unsaved edit" },
      sheetDataGeneration: 0,
    })
    store.setState({
      sheetData: { ...defaultSheetData, name: "Loaded character" },
      sheetDataGeneration: 1,
    })
    vi.advanceTimersByTime(300)

    expect(save).not.toHaveBeenCalled()
    unsubscribe()
  })
})
