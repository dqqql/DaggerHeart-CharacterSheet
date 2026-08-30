/**
 * Unified Card Store Types and Constants
 * All type definitions and constants for the card system
 */

import { 
  ExtendedStandardCard, 
  ImportData, 
  ImportResult,
  CustomCardStats,
  BatchStats
} from '../card-types';

// Import CardType and CardSource to be re-exported
import { CardType, CardSource } from '../card-types';
import type { RuleSetId } from '../../lib/sheet-data';

export function createRuleSetTypeKey(
  ruleSetId: RuleSetId,
  type: CardType,
): string {
  return `${ruleSetId}:${type}`;
}

export type BatchSourceKind = 'builtin' | 'json' | 'archive' | 'unknown';
export type BatchHealthStatus = 'normal' | 'abnormal';
export type BatchActivityType = 'imported' | 'enabled' | 'disabled' | 'config_changed';

export interface BatchActivityLogEntry {
  type: BatchActivityType;
  at: string;
  summary: string;
}

export interface BatchIndexEntry {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  version?: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
  isSystemBatch?: boolean;
  disabled?: boolean;
  lastUpdatedAt?: string;
  sourceKind?: BatchSourceKind;
  healthStatus?: BatchHealthStatus;
  healthMessages?: string[];
  activityLog?: BatchActivityLogEntry[];
  loadError?: string;
}

// Type definitions (moved from deleted card-storage.ts)
export interface CustomCardIndex {
  batches: Record<string, BatchIndexEntry>;
  totalCards: number;
  totalBatches: number;
  lastUpdate: string;
}

export interface BatchData {
  metadata: {
    id: string;
    name: string;
    fileName: string;
    importTime: string;
    version?: string;
    description?: string;
    author?: string;
    imageCardIds?: string[];      // 有图片的卡牌ID列表
    imageCount?: number;           // 图片数量
    totalImageSize?: number;       // 图片总大小 (bytes)
    lastUpdatedAt?: string;
    sourceKind?: BatchSourceKind;
    healthStatus?: BatchHealthStatus;
    healthMessages?: string[];
    activityLog?: BatchActivityLogEntry[];
    loadError?: string;
  };
  cards: ExtendedStandardCard[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
}

export interface CustomFieldNamesStore {
  [category: string]: string[];
}

export interface VariantTypesForBatch {
  [typeId: string]: {
    description?: string;
    subclasses?: string[];
    levelRange?: [number, number];
  };
}

export interface CustomFieldsForBatch {
  [category: string]: string[];
}

export interface StorageStats {
  totalSize: number;
  indexSize: number;
  batchesSize: number;
  configSize: number;
  availableSpace: number;
}

export interface IntegrityReport {
  isValid: boolean;
  issues: string[];
  orphanedKeys: string[];
  missingBatches: string[];
  corruptedBatches: string[];
}

// Subclass card ID index for O(1) filtering by class
export interface SubclassCardIndex {
  [cardType: string]: {
    [subclass: string]: string[];  // Array of card IDs
  };
}

// Level card ID index for O(1) filtering by level
export interface LevelCardIndex {
  [cardType: string]: {
    [level: string]: string[];  // Array of card IDs
  };
}

// 🚀 Batch keyword index - records actual keywords present in each batch
export interface BatchKeywordIndex {
  [batchId: string]: {
    [cardType: string]: string[];  // Actual keywords/classes in this batch
  };
}

// 🚀 Batch level index - records actual levels present in each batch
export interface BatchLevelIndex {
  [batchId: string]: {
    [cardType: string]: string[];  // Actual levels in this batch
  };
}

export interface CleanupReport {
  removedKeys: string[];
  errors: string[];
  freedSpace: number;
}

// Storage configuration
export interface StorageConfig {
  maxBatches: number;
  maxStorageSize: number;
  autoCleanup: boolean;
  compressionEnabled: boolean;
}

// Batch info for internal management
export interface BatchInfo {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  lastUpdatedAt?: string;
  version?: string;
  description?: string;
  author?: string;
  cardCount: number;
  cardTypes: string[];
  size: number;
  isSystemBatch?: boolean;
  disabled?: boolean;
  sourceKind?: BatchSourceKind;
  healthStatus?: BatchHealthStatus;
  healthMessages?: string[];
  activityLog?: BatchActivityLogEntry[];
  loadError?: string;
  // 只存储卡牌ID引用，不存储完整的卡牌数据
  cardIds: string[];
  customFieldDefinitions?: CustomFieldsForBatch;
  variantTypes?: VariantTypesForBatch;
  // 有本地图片的卡牌ID列表（用于批量删除时清理IndexedDB）
  imageCardIds?: string[];
  // 图片统计信息
  imageCount?: number;
  totalImageSize?: number;
}

export interface BatchManagementRow {
  id: string;
  name: string;
  fileName: string;
  importTime: string;
  lastUpdatedAt: string;
  cardCount: number;
  cardTypes: string[];
  storageSize: number;
  isSystemBatch: boolean;
  disabled: boolean;
  sourceKind: BatchSourceKind;
  healthStatus: BatchHealthStatus;
  healthMessages: string[];
  description?: string;
  author?: string;
  imageCount: number;
  totalImageSize: number;
  loadError?: string;
  activityLog: BatchActivityLogEntry[];
  hasCustomFields: boolean;
  hasVariantTypes: boolean;
}

export interface BatchDetail extends BatchManagementRow {
  cardIds: string[];
  previewCards: ExtendedStandardCard[];
}

export interface BatchMetadataUpdate {
  lastUpdatedAt?: string;
  disabled?: boolean;
  sourceKind?: BatchSourceKind;
  healthStatus?: BatchHealthStatus;
  healthMessages?: string[];
  activityLog?: BatchActivityLogEntry[];
  loadError?: string;
  imageCardIds?: string[];
  imageCount?: number;
  totalImageSize?: number;
}

// Main store state
export interface UnifiedCardState {
  // Core data
  cards: Map<string, ExtendedStandardCard>;
  batches: Map<string, BatchInfo>;

  // 按类型预构建的卡牌ID Map，包含所有卡牌ID（不管启用禁用状态）
  cardsByType: Map<CardType, string[]>;
  cardsByRuleSetAndType: Map<string, string[]>;

  // Index data
  index: CustomCardIndex;

  // Aggregated cache (computed from batches)
  aggregatedCustomFields: CustomFieldNamesStore | null;
  aggregatedVariantTypes: VariantTypesForBatch | null;
  subclassCardIndex: SubclassCardIndex | null;
  levelCardIndex: LevelCardIndex | null;
  batchKeywordIndex: BatchKeywordIndex | null;  // 🚀 Batch-specific keyword index
  batchLevelIndex: BatchLevelIndex | null;      // 🚀 Batch-specific level index
  cacheValid: boolean;

  // System state
  initialized: boolean;
  loading: boolean;
  error: string | null;

  // Configuration
  config: StorageConfig;

  // Statistics
  stats: CustomCardStats | null;

  // Image service state
  imageService: {
    initialized: boolean;
    cache: Map<string, string>;           // LRU cache: cardId -> blob URL
    cacheOrder: string[];                 // LRU order tracking
    loadingImages: Set<string>;           // Deduplication: currently loading image IDs
    failedImages: Set<string>;            // Failed to load image IDs
    maxCacheSize: number;                 // Maximum cache entries (default: 100)
  };
}

// Store actions
export interface UnifiedCardActions {
  // System lifecycle
  initializeSystem: () => Promise<{ initialized: boolean; migrationResult?: any }>;
  resetSystem: () => Promise<void>;
  
  // Core data operations
  loadAllCards: () => ExtendedStandardCard[];
  loadCardsByType: (type: CardType) => ExtendedStandardCard[];
  loadCardsByRuleSetAndType: (
    ruleSetId: RuleSetId,
    type: CardType,
  ) => ExtendedStandardCard[];
  getCardById: (cardId: string) => ExtendedStandardCard | null;
  reloadCustomCards: () => void;
  
  // Custom card management
  importCards: (data: ImportData, batchName?: string) => Promise<ImportResult>;
  removeBatch: (batchId: string) => boolean;
  clearAllCustomCards: () => Promise<void>;
  getAllBatches: () => BatchStats[];
  
  // Aggregated data (with smart caching)
  getAggregatedCustomFields: () => CustomFieldNamesStore;
  getAggregatedVariantTypes: () => VariantTypesForBatch;
  
  // Storage management
  getStorageInfo: () => {
    used: string;
    available: string;
    total: string;
    percentage: number;
    usagePercent: number;
  };
  getStats: () => CustomCardStats;
  calculateStorageUsage: () => StorageStats;
  checkStorageSpace: (requiredSize: number) => boolean;
  
  // Data integrity
  validateIntegrity: () => IntegrityReport;
  cleanupOrphanedData: () => CleanupReport;
  
  // Batch operations
  updateBatchCustomFields: (batchId: string, definitions: CustomFieldsForBatch) => void;
  updateBatchVariantTypes: (batchId: string, types: VariantTypesForBatch) => void;
  updateBatchMetadata: (batchId: string, updates: BatchMetadataUpdate) => void;
  setBatchDisabled: (batchId: string, disabled: boolean) => Promise<boolean>;
  toggleBatchDisabled: (batchId: string) => Promise<boolean>;
  removeBatches: (batchIds: string[]) => boolean;
  getBatchDisabledStatus: (batchId: string) => boolean;
  getBatchManagementRows: () => BatchManagementRow[];
  getBatchDetail: (batchId: string) => BatchDetail | null;
  
  
  // Utilities
  getBatchName: (batchId: string) => string | null;
  generateBatchId: () => string;
  invalidateCache: () => void;

  // Image service actions
  initializeImageService: () => Promise<void>;
  getImageUrl: (cardId: string) => Promise<string | null>;
  importBatchImages: (batchId: string, images: Map<string, Blob>) => Promise<void>;
  deleteBatchImages: (imageCardIds: string[]) => Promise<void>;
  clearAllBatchImages: () => Promise<void>;
  clearImageCache: () => void;
  revokeImageUrl: (cardId: string) => void;

  // Internal helpers
  _rebuildCardsByType: () => void;
  _addCardToTypeMap: (card: ExtendedStandardCard) => void;
  _removeCardFromTypeMap: (card: ExtendedStandardCard) => void;
  _recomputeAggregations: () => void;
  _rebuildSubclassIndex: () => void;
  _syncToLocalStorage: () => void;
  _loadAllCards: () => Promise<void>;
  _loadCustomCardsFromStorage: () => void;
  _seedBuiltinCards: () => Promise<void>;
  _migrateLegacyData: () => Promise<any>;
  _computeStats: () => CustomCardStats;
  _importBuiltinCards: (jsonCardPack: any, previousDisabledStatus?: boolean, previousBuiltinEntry?: BatchIndexEntry) => Promise<void>;
  _convertImportData: (importData: ImportData) => Promise<{ success: boolean; cards: ExtendedStandardCard[]; errors?: string[] }>;
  _validateImportData: (importData: ImportData, mode?: 'strict' | 'import_relaxed') => { isValid: boolean; errors: string[]; warnings: string[] };
  _preprocessCardImages: () => void;
  _inferCardImageUrl: (card: ExtendedStandardCard) => string | null;
}

export type UnifiedCardStore = UnifiedCardState & UnifiedCardActions;

// Storage keys (maintain compatibility with existing localStorage structure)
export const STORAGE_KEYS = {
  INDEX: 'daggerheart_custom_cards_index',
  BATCH_PREFIX: 'daggerheart_custom_cards_batch_',
  CONFIG: 'daggerheart_custom_cards_config',
} as const;

// Default configuration
export const DEFAULT_CONFIG: StorageConfig = {
  maxBatches: 50,
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  autoCleanup: true,
  compressionEnabled: false
};

// Builtin batch ID
export const BUILTIN_BATCH_ID = "SYSTEM_BUILTIN_CARDS";

// Helper function to check if we're on the server
export const isServer = typeof window === 'undefined';

// Re-export types for compatibility
export type {
  ExtendedStandardCard,
  ImportData,
  ImportResult,
  CustomCardStats,
  BatchStats
};

// Re-export enums as values
export { CardType, CardSource } from '../card-types';
