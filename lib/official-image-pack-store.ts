"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { OfficialImagePackMetadata } from "@/lib/official-image-pack"

interface OfficialImagePackStore {
  metadata: OfficialImagePackMetadata | null
  hydrated: boolean
  setMetadata: (metadata: OfficialImagePackMetadata) => void
  clearMetadata: () => void
  setHydrated: (hydrated: boolean) => void
}

export const useOfficialImagePackStore = create<OfficialImagePackStore>()(
  persist(
    (set) => ({
      metadata: null,
      hydrated: false,
      setMetadata: (metadata) => set({ metadata }),
      clearMetadata: () => set({ metadata: null }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "official-image-pack-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)
