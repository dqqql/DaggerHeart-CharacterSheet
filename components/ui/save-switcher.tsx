"use client"

import { CharacterMetadata } from "@/lib/sheet-data"
import { promptDialog } from "@/components/ui/confirm-dialog"

interface SaveSwitcherProps {
  characterList: CharacterMetadata[]
  currentCharacterId: string | null
  onRenameCharacter: (characterId: string, newSaveName: string) => boolean
}

export function SaveSwitcher({
  characterList,
  currentCharacterId,
  onRenameCharacter,
}: SaveSwitcherProps) {
  const currentSave = characterList.find(char => char.id === currentCharacterId)
  const displayName = currentSave?.saveName || '加载中...'

  const handleClick = async () => {
    if (!currentCharacterId || !currentSave) return

    const newSaveName = await promptDialog({ title: '重命名存档', label: '新的存档名称', defaultValue: currentSave.saveName, confirmText: '重命名' })
    if (newSaveName && newSaveName.trim() !== currentSave.saveName) {
      onRenameCharacter(currentCharacterId, newSaveName.trim())
    }
  }

  return (
    <h1 
      className="text-xl font-medium text-gray-900 cursor-pointer hover:text-gray-700 transition-colors duration-200"
      onClick={handleClick}
      title="点击修改存档名称"
    >
      {displayName}
    </h1>
  )
}