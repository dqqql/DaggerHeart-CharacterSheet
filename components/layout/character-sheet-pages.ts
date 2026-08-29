import { isEmptyCard } from "@/card/card-types"
import CharacterSheet from "@/components/character-sheet"
import { CharacterSheetPageFour, CharacterSheetPageFive } from "@/components/character-sheet-page-card-print"
import CharacterSheetPageAdventureNotes from "@/components/character-sheet-page-adventure-notes"
import ArmorTemplatePage from "@/components/character-sheet-page-iknis"
import CharacterSheetPageThree from "@/components/character-sheet-page-ranger-companion"
import CharacterSheetPageRhodesRelationships from "@/components/character-sheet-page-rhodes-relationships"
import CharacterSheetPageTwo from "@/components/character-sheet-page-two"
import type { PageDefinition } from "@/lib/page-registry"

export const CHARACTER_SHEET_PAGES = [
  {
    id: "page1",
    label: "第一页",
    component: CharacterSheet,
    printClass: "page-one",
    visibility: { type: "always" },
    printOrder: 1,
    showInTabs: true,
  },
  {
    id: "page2",
    label: "第二页",
    component: CharacterSheetPageTwo,
    printClass: "page-two",
    visibility: { type: "always" },
    printOrder: 2,
    showInTabs: true,
  },
  {
    id: "rhodes-relationships",
    label: "关系与问题",
    component: CharacterSheetPageRhodesRelationships,
    printClass: "page-rhodes-relationships",
    ruleSetIds: ["rhodes-island"],
    visibility: { type: "config", configKey: "relationshipQuestions" },
    printOrder: 3,
    showInTabs: true,
  },
  {
    id: "page3",
    label: "游侠伙伴",
    component: CharacterSheetPageThree,
    printClass: "page-three",
    ruleSetIds: ["daggerheart"],
    visibility: { type: "config", configKey: "rangerCompanion" },
    printOrder: 4,
    showInTabs: true,
  },
  {
    id: "page4",
    label: "主板扩展",
    component: ArmorTemplatePage,
    printClass: "page-iknis",
    ruleSetIds: ["daggerheart"],
    visibility: { type: "config", configKey: "armorTemplate" },
    printOrder: 5,
    showInTabs: true,
  },
  {
    id: "adventure-notes",
    label: "冒险笔记",
    component: CharacterSheetPageAdventureNotes,
    printClass: "page-adventure-notes",
    ruleSetIds: ["daggerheart"],
    visibility: { type: "config", configKey: "adventureNotes" },
    printOrder: 6,
    showInTabs: true,
  },
  {
    id: "focused-cards",
    label: "配置卡组",
    component: CharacterSheetPageFour,
    printClass: "page-four",
    visibility: {
      type: "data",
      dataCheck: data =>
        !!data.cards?.slice(1).some(card => card && !isEmptyCard(card)),
    },
    printOrder: 7,
    showInTabs: false,
  },
  {
    id: "inventory-cards",
    label: "宝库卡组",
    component: CharacterSheetPageFive,
    printClass: "page-five",
    visibility: {
      type: "data",
      dataCheck: data =>
        !!data.inventory_cards?.some(card => card && !isEmptyCard(card)),
    },
    printOrder: 8,
    showInTabs: false,
  },
] satisfies readonly PageDefinition[]
