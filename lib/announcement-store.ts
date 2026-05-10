"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AnnouncementStore {
  lastSeenAnnouncementId: string | null
  hydrated: boolean
  markAnnouncementSeen: (announcementId: string) => void
  setHydrated: (hydrated: boolean) => void
}

export const useAnnouncementStore = create<AnnouncementStore>()(
  persist(
    (set) => ({
      lastSeenAnnouncementId: null,
      hydrated: false,
      markAnnouncementSeen: (announcementId) =>
        set({ lastSeenAnnouncementId: announcementId }),
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: "announcement-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)
