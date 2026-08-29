"use client"

import dynamic from "next/dynamic"
import { forwardRef, useEffect, useImperativeHandle, useState } from "react"
import { CardType } from "@/card"
import type { RuleSetId } from "@/lib/sheet-data"
import { getRuleSetModule } from "@/lib/rulesets/registry"

const loadWeaponSelectionModal = () =>
  import("@/components/modals/weapon-selection-modal")
const loadArmorSelectionModal = () =>
  import("@/components/modals/armor-selection-modal")
const loadGenericCardSelectionModal = () =>
  import("@/components/modals/generic-card-selection-modal")

function SelectionModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="h-24 w-72 animate-pulse rounded-xl border border-slate-200 bg-white/95 shadow-xl" />
    </div>
  )
}

const WeaponSelectionModal = dynamic(
  () => loadWeaponSelectionModal().then((mod) => mod.WeaponSelectionModal),
  { ssr: false, loading: SelectionModalSkeleton },
)
const ArmorSelectionModal = dynamic(
  () => loadArmorSelectionModal().then((mod) => mod.ArmorSelectionModal),
  { ssr: false, loading: SelectionModalSkeleton },
)
const GenericCardSelectionModal = dynamic(
  () => loadGenericCardSelectionModal().then((mod) => mod.GenericCardSelectionModal),
  { ssr: false, loading: SelectionModalSkeleton },
)

export type GenericSelectionRequest = {
  type: "profession" | "ancestry" | "community" | "subclass"
  field?: string
  levelFilter?: number
}

export interface CharacterSheetSelectionModalsHandle {
  openWeapon: (
    field: string,
    slotType: "primary" | "secondary" | "inventory",
  ) => void
  openArmor: () => void
  openGeneric: (request: GenericSelectionRequest) => void
}

interface CharacterSheetSelectionModalsProps {
  ruleSetId: RuleSetId
  onWeaponSelect: (
    field: string,
    weaponId: string,
    weaponType: "primary" | "secondary",
  ) => void
  onArmorSelect: (armorId: string) => void
  onGenericSelect: (
    request: GenericSelectionRequest,
    cardId: string,
    field?: string,
  ) => void
}

function getModalCardType(
  modalType: GenericSelectionRequest["type"],
): Exclude<CardType, CardType.Domain> {
  switch (modalType) {
    case "profession":
      return CardType.Profession
    case "ancestry":
      return CardType.Ancestry
    case "community":
      return CardType.Community
    case "subclass":
      return CardType.Subclass
  }
}

export const CharacterSheetSelectionModals = forwardRef<
  CharacterSheetSelectionModalsHandle,
  CharacterSheetSelectionModalsProps
>(function CharacterSheetSelectionModals({
  ruleSetId,
  onWeaponSelect,
  onArmorSelect,
  onGenericSelect,
}, ref) {
  const ruleSet = getRuleSetModule(ruleSetId)
  const [weaponRequest, setWeaponRequest] = useState<{
    field: string
    slotType: "primary" | "secondary" | "inventory"
  } | null>(null)
  const [armorOpen, setArmorOpen] = useState(false)
  const [genericRequest, setGenericRequest] =
    useState<GenericSelectionRequest | null>(null)

  useEffect(() => {
    const preload = () => {
      void loadWeaponSelectionModal()
      void loadArmorSelectionModal()
      void loadGenericCardSelectionModal()
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback) => number
      cancelIdleCallback?: (handle: number) => void
    }
    if (idleWindow.requestIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preload)
      return () => idleWindow.cancelIdleCallback?.(idleId)
    }
    const timeoutId = window.setTimeout(preload, 1200)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useImperativeHandle(ref, () => ({
    openWeapon: (field, slotType) => setWeaponRequest({ field, slotType }),
    openArmor: () => setArmorOpen(true),
    openGeneric: (request) => setGenericRequest(request),
  }), [])

  return (
    <>
      {weaponRequest && (
        <WeaponSelectionModal
          isOpen
          onClose={() => setWeaponRequest(null)}
          weaponSlotType={weaponRequest.slotType}
          onSelect={(weaponId, weaponType) => {
            onWeaponSelect(weaponRequest.field, weaponId, weaponType)
            setWeaponRequest(null)
          }}
          title="选择武器"
        />
      )}

      {armorOpen && (
        <ArmorSelectionModal
          isOpen
          onClose={() => setArmorOpen(false)}
          onSelect={(armorId) => {
            onArmorSelect(armorId)
            setArmorOpen(false)
          }}
          title="选择护甲"
          isRhodesIsland={ruleSet.capabilities.managedPrimaryWeapon}
        />
      )}

      {genericRequest && (
        <GenericCardSelectionModal
          isOpen
          onClose={() => setGenericRequest(null)}
          onSelect={(cardId, field) => {
            onGenericSelect(genericRequest, cardId, field)
            setGenericRequest(null)
          }}
          title={
            genericRequest.type === "profession"
              ? "选择职业"
              : genericRequest.type === "ancestry"
                ? "选择种族"
                : genericRequest.type === "community"
                  ? "选择社群"
                  : `选择${ruleSet.labels.subclass}`
          }
          cardType={getModalCardType(genericRequest.type)}
          field={genericRequest.field}
          levelFilter={genericRequest.levelFilter}
        />
      )}
    </>
  )
})
