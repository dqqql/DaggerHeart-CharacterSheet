import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useAutoResizeFont } from "@/hooks/use-auto-resize-font"

type ResizeCallback = ResizeObserverCallback

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = []

  readonly callback: ResizeCallback
  readonly observe = vi.fn()
  readonly unobserve = vi.fn()
  readonly disconnect = vi.fn()

  constructor(callback: ResizeCallback) {
    this.callback = callback
    ResizeObserverMock.instances.push(this)
  }

  resize(target: Element, width: number) {
    this.callback(
      [{ target, contentRect: { width } as DOMRectReadOnly } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
}

function Harness({
  text,
  width,
  refs,
}: {
  text: string
  width: number
  refs: Array<React.Ref<HTMLInputElement>>
}) {
  const { getElementProps } = useAutoResizeFont()
  const props = getElementProps(text, "field")
  refs.push(props.ref)

  return <input data-testid="field" data-test-width={width} {...props} />
}

describe("useAutoResizeFont", () => {
  const frames: FrameRequestCallback[] = []
  const measureText = vi.fn((text: string) => ({ width: text.length * 10 }))

  beforeEach(() => {
    ResizeObserverMock.instances = []
    frames.length = 0
    measureText.mockClear()
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {})
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText,
    } as unknown as CanvasRenderingContext2D)
    Object.defineProperty(HTMLInputElement.prototype, "clientWidth", {
      configurable: true,
      get() {
        return Number(this.dataset.testWidth ?? 0)
      },
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  function flushAnimationFrames() {
    act(() => {
      while (frames.length > 0) {
        frames.shift()?.(performance.now())
      }
    })
  }

  it("uses one stable ref and canvas measurements without temporary spans", () => {
    const refs: Array<React.Ref<HTMLInputElement>> = []
    const createElement = vi.spyOn(document, "createElement")
    const { getByTestId, rerender } = render(
      <Harness text="abcdefghij" width={50} refs={refs} />,
    )
    const input = getByTestId("field") as HTMLInputElement

    flushAnimationFrames()

    expect(createElement.mock.calls.some(([tag]) => tag === "span")).toBe(false)
    expect(input.dataset.textOverflow).toBe("true")
    expect(input.style.getPropertyValue("--print-font-size")).toBe("10px")

    const firstRef = refs.at(-1)
    const measuredCallCount = measureText.mock.calls.length

    rerender(<Harness text="abcdefghij" width={50} refs={refs} />)
    expect(refs.at(-1)).toBe(firstRef)
    expect(frames).toHaveLength(0)
    expect(measureText).toHaveBeenCalledTimes(measuredCallCount)

    rerender(<Harness text="abc" width={50} refs={refs} />)
    flushAnimationFrames()

    expect(refs.at(-1)).toBe(firstRef)
    expect(input.dataset.textOverflow).toBe("false")
    expect(input.style.getPropertyValue("--print-font-size")).toBe("14px")
  })

  it("batches resize and print changes into animation frames", () => {
    const refs: Array<React.Ref<HTMLInputElement>> = []
    const { getByTestId } = render(
      <Harness text="abcdef" width={100} refs={refs} />,
    )
    const input = getByTestId("field") as HTMLInputElement
    flushAnimationFrames()

    act(() => {
      ResizeObserverMock.instances[0].resize(input, 30)
      ResizeObserverMock.instances[0].resize(input, 30)
    })
    expect(frames).toHaveLength(1)
    flushAnimationFrames()

    expect(input.dataset.textOverflow).toBe("true")
    expect(input.style.getPropertyValue("--print-font-size")).toBe("10px")

    act(() => {
      window.dispatchEvent(new Event("beforeprint"))
      window.dispatchEvent(new Event("beforeprint"))
    })
    expect(frames).toHaveLength(1)
    flushAnimationFrames()
  })
})
