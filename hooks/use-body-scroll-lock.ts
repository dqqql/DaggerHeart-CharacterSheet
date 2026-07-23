"use client"

import { useEffect } from "react"

let activeLockCount = 0
let previousOverflow = ""
let previousPaddingRight = ""

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === "undefined") {
      return
    }

    const body = document.body

    if (activeLockCount === 0) {
      previousOverflow = body.style.overflow
      previousPaddingRight = body.style.paddingRight

      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
      if (scrollbarWidth > 0) {
        const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
        body.style.paddingRight = `${currentPadding + scrollbarWidth}px`
      }

      body.style.overflow = "hidden"
    }

    activeLockCount += 1

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1)

      if (activeLockCount === 0) {
        body.style.overflow = previousOverflow
        body.style.paddingRight = previousPaddingRight
      }
    }
  }, [locked])
}
