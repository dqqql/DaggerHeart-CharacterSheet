import {
  SheetData,
  CharacterMetadata,
  CharacterList,
  RuleSetId,
  ActiveCharacterRecord,
  normalizeRuleSetId,
} from "./sheet-data";
import { defaultSheetData } from "./default-sheet-data";
import { migrateSheetData } from "./sheet-data-migration";

// ===== 多角色系统存储键 =====
export const CHARACTER_LIST_KEY = "dh_character_list";       // 角色元数据列表
export const CHARACTER_DATA_PREFIX = "dh_character_";        // 单个角色数据前缀 
export const ACTIVE_CHARACTER_ID_KEY = "dh_active_character_id"; // 当前活动角色ID
export const ACTIVE_CHARACTER_RECORD_KEY = "dh_active_character_record";

// ===== 旧系统存储键（仅用于迁移） =====
const LEGACY_SHEET_DATA_KEY = "charactersheet_data";
const LEGACY_FOCUSED_CARDS_KEY = "focused_card_ids";
const LEGACY_PERSISTENT_FORM_DATA_KEY = "persistentFormData";

// ===== 常量 =====
export const MAX_CHARACTERS = 10;

function emptyCharacterList(): CharacterList {
  return {
    characters: [],
    activeCharacterId: null,
    activeCharacterIds: {},
    activeRuleSetId: "daggerheart",
    lastUpdated: new Date().toISOString(),
  };
}

function normalizeCharacterList(value: Record<string, unknown>): CharacterList {
  const rawCharacters = Array.isArray(value.characters) ? value.characters : [];
  const characters = rawCharacters
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, index) => ({
      ...item,
      id: String(item.id ?? ""),
      saveName: String(item.saveName ?? "未命名存档"),
      lastModified: String(item.lastModified ?? new Date().toISOString()),
      createdAt: String(item.createdAt ?? item.lastModified ?? new Date().toISOString()),
      order: Number.isFinite(item.order) ? Number(item.order) : index,
      ruleSetId: normalizeRuleSetId(item.ruleSetId),
    })) as CharacterMetadata[];

  const legacyActiveId = typeof value.activeCharacterId === "string" ? value.activeCharacterId : null;
  const rawActiveIds = value.activeCharacterIds && typeof value.activeCharacterIds === "object"
    ? value.activeCharacterIds as Record<string, unknown>
    : {};
  const activeCharacterIds: Partial<Record<RuleSetId, string | null>> = {
    daggerheart: typeof rawActiveIds.daggerheart === "string"
      ? rawActiveIds.daggerheart
      : legacyActiveId,
    "rhodes-island": typeof rawActiveIds["rhodes-island"] === "string"
      ? rawActiveIds["rhodes-island"]
      : null,
  };

  return {
    characters,
    activeCharacterId: legacyActiveId,
    activeCharacterIds,
    activeRuleSetId: normalizeRuleSetId(value.activeRuleSetId),
    lastUpdated: typeof value.lastUpdated === "string" ? value.lastUpdated : new Date().toISOString(),
  };
}

// ===== UUID生成器 =====
export function generateCharacterId(): string {
  // 只在客户端生成ID，避免服务端/客户端不一致
  if (typeof window === 'undefined') {
    // 服务器端返回一个临时占位符，实际调用应该在客户端
    console.warn('[generateCharacterId] Called on server side, returning placeholder');
    return 'temp-server-id';
  }

  // 客户端使用UUID v4算法
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ===== 角色列表管理 =====
export function loadCharacterList(): CharacterList {
  try {
    const stored = localStorage.getItem(CHARACTER_LIST_KEY);
    if (!stored) {
      return emptyCharacterList();
    }

    const parsed = JSON.parse(stored);
    // 基本结构验证
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.characters)) {
      console.error('[CharacterList] Invalid structure, returning default');
      return emptyCharacterList();
    }

    const normalized = normalizeCharacterList(parsed);
    if (JSON.stringify(normalized) !== JSON.stringify(parsed)) {
      saveCharacterList(normalized);
    }
    return normalized;
  } catch (error) {
    console.error('[CharacterList] Load failed (Fast Fail):', error);
    return emptyCharacterList();
  }
}

export function saveCharacterList(list: CharacterList): void {
  try {
    list.lastUpdated = new Date().toISOString();
    localStorage.setItem(CHARACTER_LIST_KEY, JSON.stringify(list));
  } catch (error) {
    console.error('[CharacterList] Save failed (Fast Fail):', error);
    throw error; // 快速失败
  }
}

export function getCharactersForRuleSet(ruleSetId: RuleSetId): CharacterMetadata[] {
  return loadCharacterList().characters.filter(character => character.ruleSetId === ruleSetId);
}

export function addCharacterToMetadataList(
  saveName: string,
  ruleSetId: RuleSetId = "daggerheart"
): CharacterMetadata | null {
  const list = loadCharacterList();

  // 检查数量限制
  const ruleCharacters = list.characters.filter(character => character.ruleSetId === ruleSetId);
  if (ruleCharacters.length >= MAX_CHARACTERS) {
    console.error(`[CharacterList] Cannot add character: limit of ${MAX_CHARACTERS} reached`);
    return null;
  }

  const id = generateCharacterId();
  const now = new Date().toISOString();

  const metadata: CharacterMetadata = {
    id,
    saveName: saveName || "未命名存档",
    lastModified: now,
    createdAt: now,
    order: ruleCharacters.length,
    ruleSetId,
  };

  list.characters.push(metadata);
  saveCharacterList(list);

  return metadata;
}

export function updateCharacterInMetadataList(
  characterId: string,
  updates: Partial<Pick<CharacterMetadata, 'saveName'>>
): void {
  const list = loadCharacterList();
  const index = list.characters.findIndex(char => char.id === characterId);

  if (index === -1) {
    console.error(`[CharacterList] Character ${characterId} not found for update`);
    return;
  }

  if (updates.saveName !== undefined) {
    list.characters[index].saveName = updates.saveName;
  }

  list.characters[index].lastModified = new Date().toISOString();
  saveCharacterList(list);
}

export function removeCharacterFromMetadataList(characterId: string): void {
  // 1. 先删除元数据（确保 UI 一致性优先）
  const list = loadCharacterList();
  const removedRuleSetId = list.characters.find(char => char.id === characterId)?.ruleSetId;
  list.characters = list.characters.filter(char => char.id !== characterId);

  // 如果删除的是活动角色，清除活动状态
  if (list.activeCharacterId === characterId) {
    list.activeCharacterId = null;
  }
  if (removedRuleSetId && list.activeCharacterIds?.[removedRuleSetId] === characterId) {
    list.activeCharacterIds[removedRuleSetId] = null;
  }

  saveCharacterList(list);

  // 2. 元数据保存成功后，删除实际数据
  // 即使数据删除失败，也只是留下僵尸数据（不比现在更糟）
  try {
    const deleted = deleteCharacterById(characterId);
    if (deleted) {
      console.log(`[CharacterList] Successfully deleted character data: ${characterId}`);
    } else {
      console.warn(`[CharacterList] Failed to delete character data: ${characterId}`);
    }
  } catch (error) {
    console.error(`[CharacterList] Error deleting character data: ${characterId}`, error);
  }
}

// ===== 单个角色数据管理 =====
export function saveCharacterById(id: string, data: SheetData): string {
  try {
    const key = CHARACTER_DATA_PREFIX + id;
    const lastModified = new Date().toISOString();
    // 保存入口只补规则身份；结构迁移仍统一在读取/导入阶段执行，保持既有时序。
    const normalizedData: SheetData = {
      ...data,
      ruleSetId: normalizeRuleSetId(data.ruleSetId),
    };
    localStorage.setItem(key, JSON.stringify(normalizedData));

    // 不再同步更新元数据中的角色名称
    // 只更新最后修改时间
    const list = loadCharacterList();
    const index = list.characters.findIndex(char => char.id === id);
    if (index !== -1) {
      list.characters[index].ruleSetId = normalizedData.ruleSetId;
      list.characters[index].lastModified = lastModified;
      saveCharacterList(list);
    }

    return lastModified;
  } catch (error) {
    console.error(`[Character] Save failed for ${id} (Fast Fail):`, error);
    throw error; // 快速失败
  }
}

function getStoredCharacterRecord(
  id: string,
  options: { logMissing?: boolean } = {}
): { parsed: Record<string, unknown> } | null {
  const { logMissing = true } = options;
  const key = CHARACTER_DATA_PREFIX + id;
  const stored = localStorage.getItem(key);

  if (!stored) {
    if (logMissing) {
      console.warn(`[Character] No data found for ${id}`);
    }
    return null;
  }

  const parsed = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object") {
    console.error(`[Character] Invalid data structure for ${id}`);
    return null;
  }

  return {
    parsed: parsed as Record<string, unknown>,
  };
}

function cloneCharacterRecord<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function stableSerializeCharacterRecord(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableSerializeCharacterRecord).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );

    return `{${entries
      .map(
        ([key, nestedValue]) =>
          `${JSON.stringify(key)}:${stableSerializeCharacterRecord(nestedValue)}`
      )
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function loadCharacterById(id: string): SheetData | null {
  try {
    const characterRecord = getStoredCharacterRecord(id);
    if (!characterRecord) {
      return null;
    }

    const parsedRecord = characterRecord.parsed;
    const originalSerialized = stableSerializeCharacterRecord(parsedRecord);

    console.log(`[Migration] Applying migrations for character ${id}`);
    const metadataRuleSetId = loadCharacterList().characters.find(character => character.id === id)?.ruleSetId;
    const migratedData = migrateSheetData({
      ...cloneCharacterRecord(parsedRecord),
      ...(metadataRuleSetId && parsedRecord.ruleSetId === undefined
        ? { ruleSetId: metadataRuleSetId }
        : {}),
    });
    const migratedSerialized = stableSerializeCharacterRecord(migratedData);

    if (migratedSerialized !== originalSerialized) {
      console.log(`[Migration] Saving migrated data for character ${id}`);
      saveCharacterById(id, migratedData);
    }

    return migratedData;
  } catch (error) {
    console.error(`[Character] Load failed for ${id} (Fast Fail):`, error);
    return null;
  }
}

export function loadCharacterDisplayNameById(id: string): string | null {
  try {
    const characterRecord = getStoredCharacterRecord(id, { logMissing: false });
    if (!characterRecord) {
      return null;
    }

    const displayName = characterRecord.parsed.name;
    return typeof displayName === "string" && displayName.trim()
      ? displayName.trim()
      : null;
  } catch (error) {
    console.error(`[Character] Display name load failed for ${id} (Fast Fail):`, error);
    return null;
  }
}

export function deleteCharacterById(id: string): boolean {
  try {
    const key = CHARACTER_DATA_PREFIX + id;
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Character] Delete failed for ${id} (Fast Fail):`, error);
    return false;
  }
}

// ===== 活动角色管理 =====
export function setActiveCharacterId(id: string | null, requestedRuleSetId?: RuleSetId): void {
  try {
    if (id === null) {
      localStorage.removeItem(ACTIVE_CHARACTER_ID_KEY);
    } else {
      localStorage.setItem(ACTIVE_CHARACTER_ID_KEY, id);
    }

    // 同步更新角色列表中的活动状态（旧字段继续表示全局当前存档）
    const list = loadCharacterList();
    const matchedRuleSetId = id
      ? list.characters.find(character => character.id === id)?.ruleSetId
      : undefined;
    const ruleSetId = requestedRuleSetId ?? matchedRuleSetId ?? list.activeRuleSetId ?? "daggerheart";
    list.activeCharacterId = id;
    list.activeRuleSetId = ruleSetId;
    list.activeCharacterIds = {
      ...list.activeCharacterIds,
      [ruleSetId]: id,
    };
    saveCharacterList(list);
    const record: ActiveCharacterRecord = { ruleSetId, characterId: id };
    localStorage.setItem(ACTIVE_CHARACTER_RECORD_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('[ActiveCharacter] Set failed (Fast Fail):', error);
    throw error;
  }
}

export function getActiveCharacterId(ruleSetId?: RuleSetId): string | null {
  try {
    if (ruleSetId) {
      const list = loadCharacterList();
      const activeId = list.activeCharacterIds?.[ruleSetId];
      return activeId && list.characters.some(character => character.id === activeId && character.ruleSetId === ruleSetId)
        ? activeId
        : null;
    }
    return localStorage.getItem(ACTIVE_CHARACTER_ID_KEY);
  } catch (error) {
    console.error('[ActiveCharacter] Get failed (Fast Fail):', error);
    return null;
  }
}

export function getActiveCharacterRecord(): ActiveCharacterRecord {
  try {
    const stored = localStorage.getItem(ACTIVE_CHARACTER_RECORD_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ActiveCharacterRecord>;
      const ruleSetId = normalizeRuleSetId(parsed.ruleSetId);
      return { ruleSetId, characterId: getActiveCharacterId(ruleSetId) };
    }
  } catch (error) {
    console.warn("[ActiveCharacter] Invalid active record, using legacy state", error);
  }
  const list = loadCharacterList();
  const ruleSetId = normalizeRuleSetId(list.activeRuleSetId);
  return { ruleSetId, characterId: getActiveCharacterId(ruleSetId) };
}

// ===== 角色操作 =====
export function createNewCharacter(
  name: string,
  ruleSetId: RuleSetId = "daggerheart"
): SheetData {
  const newCharacter: SheetData = {
    ...defaultSheetData,
    ruleSetId,
    name: name || "新角色",
    // 注释：移除了 focused_card_ids 初始化，聚焦功能由双卡组系统取代
  };

  return newCharacter;
}

export interface RuleSetSwitchResult {
  ruleSetId: RuleSetId
  characterId: string
  characterData: SheetData
  created: boolean
}

/** Select the target ruleset's last active save, or create its first blank save. */
export function switchToRuleSet(ruleSetId: RuleSetId): RuleSetSwitchResult {
  const list = loadCharacterList();
  const candidates = list.characters.filter(character => character.ruleSetId === ruleSetId);
  let characterId = getActiveCharacterId(ruleSetId);
  let created = false;

  if (!characterId && candidates.length > 0) {
    characterId = [...candidates].sort((left, right) =>
      right.lastModified.localeCompare(left.lastModified)
    )[0].id;
  }

  if (!characterId) {
    const metadata = addCharacterToMetadataList("存档 1", ruleSetId);
    if (!metadata) {
      throw new Error(`无法为规则 ${ruleSetId} 创建存档`);
    }
    characterId = metadata.id;
    saveCharacterById(characterId, createNewCharacter("", ruleSetId));
    created = true;
  }

  const characterData = loadCharacterById(characterId);
  if (!characterData) {
    throw new Error(`规则 ${ruleSetId} 的活动存档不存在: ${characterId}`);
  }
  setActiveCharacterId(characterId, ruleSetId);
  return { ruleSetId, characterId, characterData, created };
}

export function duplicateCharacter(originalId: string, newName: string): SheetData | null {
  const originalData = loadCharacterById(originalId);
  if (!originalData) {
    console.error(`[Character] Cannot duplicate ${originalId}: not found`);
    return null;
  }

  // 复制数据并应用迁移（确保复制的数据是最新格式）
  const duplicatedData = migrateSheetData({
    ...originalData,
    name: newName || `${originalData.name} (副本)`,
  });

  return duplicatedData;
}

// ===== 数据迁移（快速失败策略） =====
export function migrateToMultiCharacterStorage(): void {
  console.log('[Migration] Starting multi-character storage migration...');

  try {
    // 检查是否已迁移
    const existingList = localStorage.getItem(CHARACTER_LIST_KEY);
    if (existingList) {
      console.log('[Migration] Already migrated, skipping');
      return;
    }

    const recoveredList = recoverCharacterListFromDataKeys();
    if (recoveredList) {
      console.warn(`[Migration] Recovered ${recoveredList.characters.length} existing character saves, skipping default migration`);
      return;
    }

    // 加载旧数据
    const legacySheetData = localStorage.getItem(LEGACY_SHEET_DATA_KEY);
    const legacyFocusedCards = localStorage.getItem(LEGACY_FOCUSED_CARDS_KEY);

    let migratedCharacterData: SheetData;

    if (legacySheetData) {
      console.log('[Migration] Found legacy character data, migrating...');

      try {
        const parsed = JSON.parse(legacySheetData);

        // 创建迁移的角色数据
        migratedCharacterData = {
          ...parsed,
          // 合并旧的全局聚焦卡牌ID到角色数据中
          focused_card_ids: legacyFocusedCards ? JSON.parse(legacyFocusedCards) : [],
          // 为旧数据添加第三页导出控制字段
          includePageThreeInExport: parsed.includePageThreeInExport ?? true
        };

        console.log('[Migration] Legacy data parsed successfully');
      } catch (parseError) {
        console.error('[Migration] Failed to parse legacy data (Fast Fail):', parseError);
        const errorMessage = parseError instanceof Error ? parseError.message : '未知解析错误';
        throw new Error(`数据迁移失败：旧数据格式无效 - ${errorMessage}`);
      }
    } else {
      console.log('[Migration] No legacy data found, creating default character');

      // 没有旧数据，创建默认空白角色
      migratedCharacterData = createNewCharacter("我的角色");
    }

    // 生成新角色ID并保存
    const newCharacterId = generateCharacterId();
    saveCharacterById(newCharacterId, migratedCharacterData);

    // 创建角色元数据
    const metadata: CharacterMetadata = {
      id: newCharacterId,
      saveName: "迁移的存档", // 迁移时使用默认存档名
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      order: 0,
      ruleSetId: "daggerheart",
    };

    // 创建新的角色列表
    const newCharacterList: CharacterList = {
      characters: [metadata],
      activeCharacterId: newCharacterId,
      activeCharacterIds: { daggerheart: newCharacterId },
      activeRuleSetId: "daggerheart",
      lastUpdated: new Date().toISOString()
    };

    // 保存新结构
    saveCharacterList(newCharacterList);
    setActiveCharacterId(newCharacterId);

    // 清理旧数据（关键步骤）
    console.log('[Migration] Cleaning up legacy storage keys...');
    localStorage.removeItem(LEGACY_SHEET_DATA_KEY);
    localStorage.removeItem(LEGACY_FOCUSED_CARDS_KEY);
    localStorage.removeItem(LEGACY_PERSISTENT_FORM_DATA_KEY);

    console.log('[Migration] Successfully completed migration to multi-character system');

  } catch (error) {
    console.error('[Migration] CRITICAL FAILURE (Fast Fail):', error);

    // 快速失败：不尝试回滚，清晰提示用户
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    alert(`数据迁移失败！\n\n错误详情：${errorMessage}\n\n请刷新页面重试，或联系技术支持。`);

    throw error; // 向上抛出，阻止应用继续运行
  }
}

// ===== 安全清理函数 =====
export function safeCleanupForTesting(): void {
  console.log('[SafeCleanup] Starting safe cleanup for testing...');

  // 只清理角色系统相关的键
  const keysToRemove = [
    LEGACY_SHEET_DATA_KEY,
    LEGACY_FOCUSED_CARDS_KEY,
    LEGACY_PERSISTENT_FORM_DATA_KEY,
    CHARACTER_LIST_KEY,
    ACTIVE_CHARACTER_ID_KEY,
    ACTIVE_CHARACTER_RECORD_KEY,
  ];

  keysToRemove.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      console.log(`[SafeCleanup] Removed ${key}`);
    }
  });

  // 清理所有角色数据文件 (dh_character_*)
  const keysToCheck = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CHARACTER_DATA_PREFIX)) {
      keysToCheck.push(key);
    }
  }

  keysToCheck.forEach(key => {
    localStorage.removeItem(key);
    console.log(`[SafeCleanup] Removed character data: ${key}`);
  });

  console.log(`[SafeCleanup] Cleanup completed. Removed ${keysToRemove.length + keysToCheck.length} keys.`);
}

// ===== 获取所有角色相关的localStorage键 =====
export function getAllCharacterStorageKeys(): string[] {
  const characterKeys = [];

  // 添加系统键
  const systemKeys = [
    LEGACY_SHEET_DATA_KEY,
    LEGACY_FOCUSED_CARDS_KEY,
    LEGACY_PERSISTENT_FORM_DATA_KEY,
    CHARACTER_LIST_KEY,
    ACTIVE_CHARACTER_ID_KEY,
    ACTIVE_CHARACTER_RECORD_KEY,
  ];

  systemKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      characterKeys.push(key);
    }
  });

  // 添加角色数据键
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CHARACTER_DATA_PREFIX)) {
      characterKeys.push(key);
    }
  }

  return characterKeys;
}

/**
 * Rebuild character metadata from existing character payloads.
 *
 * This is a recovery path for cases where dh_character_list is missing or
 * corrupted while individual dh_character_<id> saves are still present.
 */
export function recoverCharacterListFromDataKeys(): CharacterList | null {
  try {
    const recoveredCharacters: CharacterMetadata[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CHARACTER_DATA_PREFIX) || key === CHARACTER_LIST_KEY) {
        continue;
      }

      const id = key.substring(CHARACTER_DATA_PREFIX.length);
      if (!id || recoveredCharacters.some(character => character.id === id)) {
        continue;
      }

      const stored = localStorage.getItem(key);
      if (!stored) {
        continue;
      }

      try {
        const parsed = JSON.parse(stored);
        if (!parsed || typeof parsed !== 'object') {
          console.warn(`[Recovery] Skipping invalid character payload: ${key}`);
          continue;
        }

        const now = new Date().toISOString();
        const displayName = typeof parsed.name === 'string' && parsed.name.trim()
          ? parsed.name.trim()
          : `恢复的存档 ${recoveredCharacters.length + 1}`;

        recoveredCharacters.push({
          id,
          saveName: displayName,
          lastModified: now,
          createdAt: now,
          order: recoveredCharacters.filter(character => character.ruleSetId === normalizeRuleSetId(parsed.ruleSetId)).length,
          ruleSetId: normalizeRuleSetId(parsed.ruleSetId),
        });
      } catch (error) {
        console.warn(`[Recovery] Failed to parse character payload: ${key}`, error);
      }
    }

    if (recoveredCharacters.length === 0) {
      return null;
    }

    recoveredCharacters.sort((a, b) => a.order - b.order);

    const limitedCharacters = recoveredCharacters.filter((character, index, all) =>
      all.filter(candidate => candidate.ruleSetId === character.ruleSetId).indexOf(character) < MAX_CHARACTERS
    );
    recoveredCharacters.splice(0, recoveredCharacters.length, ...limitedCharacters);

    const activeId = getActiveCharacterId();
    const recoveredActiveId = activeId && recoveredCharacters.some(character => character.id === activeId)
      ? activeId
      : recoveredCharacters[0].id;

    const recoveredList: CharacterList = {
      characters: recoveredCharacters,
      activeCharacterId: recoveredActiveId,
      activeCharacterIds: {
        daggerheart: recoveredCharacters.find(character => character.ruleSetId === "daggerheart" && character.id === activeId)?.id
          ?? recoveredCharacters.find(character => character.ruleSetId === "daggerheart")?.id
          ?? null,
        "rhodes-island": recoveredCharacters.find(character => character.ruleSetId === "rhodes-island" && character.id === activeId)?.id
          ?? recoveredCharacters.find(character => character.ruleSetId === "rhodes-island")?.id
          ?? null,
      },
      activeRuleSetId: recoveredCharacters.find(character => character.id === recoveredActiveId)?.ruleSetId ?? "daggerheart",
      lastUpdated: new Date().toISOString()
    };

    saveCharacterList(recoveredList);
    setActiveCharacterId(recoveredActiveId);

    console.warn(`[Recovery] Rebuilt character list with ${recoveredCharacters.length} saves`);
    return recoveredList;
  } catch (error) {
    console.error('[Recovery] Failed to rebuild character list:', error);
    return null;
  }
}

/**
 * 清理孤立的角色数据（僵尸数据）
 *
 * 僵尸数据的产生原因：
 * - Bug 修复前删除角色时只删除了元数据，实际数据残留
 *
 * 清理策略：
 * - 只在应用启动时运行一次
 * - 删除在 localStorage 中存在但不在元数据列表中的角色数据
 * - 采用保守策略，详细记录日志
 *
 * @returns 清理的僵尸数据文件数量
 */
export function cleanupOrphanedCharacterData(): number {
  try {
    // 1. 加载元数据列表，获取所有有效角色 ID
    const list = loadCharacterList();
    const validCharacterIds = new Set(list.characters.map(c => c.id));

    console.log(`[Cleanup] Valid character count: ${validCharacterIds.size}`);
    console.log(`[Cleanup] Valid character IDs: ${Array.from(validCharacterIds).join(', ') || '(none)'}`);

    // 2. 遍历 localStorage 找出所有角色数据键
    const orphanedKeys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CHARACTER_DATA_PREFIX)) {
        // 排除系统键（dh_character_list 本身）
        if (key === CHARACTER_LIST_KEY) {
          continue;
        }

        const characterId = key.substring(CHARACTER_DATA_PREFIX.length);

        // 3. 检查是否为孤立数据（不在元数据列表中）
        if (!validCharacterIds.has(characterId)) {
          orphanedKeys.push(key);
          console.log(`[Cleanup] Found orphaned data: ${key} (ID: ${characterId})`);
        }
      }
    }

    if (validCharacterIds.size === 0 && orphanedKeys.length > 0) {
      console.warn(
        `[Cleanup] Metadata list is empty but ${orphanedKeys.length} character payloads exist. ` +
        `Skipping cleanup to avoid data loss.`
      );
      return 0;
    }

    // 4. 安全检查：如果发现异常多的孤立数据，发出警告
    if (orphanedKeys.length > 5) {
      console.warn(
        `[Cleanup] Found ${orphanedKeys.length} orphaned files. ` +
        `This seems unusual. Proceeding with caution.`
      );
    }

    // 5. 删除所有孤立数据
    orphanedKeys.forEach(key => {
      console.log(`[Cleanup] Removing orphaned character data: ${key}`);
      localStorage.removeItem(key);
    });

    // 6. 报告清理结果
    if (orphanedKeys.length > 0) {
      console.log(`[Cleanup] ✅ Successfully cleaned up ${orphanedKeys.length} orphaned character data files`);
    } else {
      console.log(`[Cleanup] No orphaned data found. Storage is clean.`);
    }

    return orphanedKeys.length;
  } catch (error) {
    console.error('[Cleanup] ❌ Failed to cleanup orphaned data:', error);
    // 出错时返回 0，不删除任何数据（安全优先）
    return 0;
  }
}
