import type { ImportResult } from '@/card/index'
import { DhcbImportError } from '@/card/utils/dhcb-importer'

export interface ImportResultWithFileName extends ImportResult {
  fileName: string
  imageCount?: number
}

export type DisplayImportResult = ImportResult | ImportResultWithFileName

export type IssueTone = 'warning' | 'error'

export interface ImportIssueSection {
  title: string
  items: string[]
  tone: IssueTone
}

export function getResultWarnings(result: DisplayImportResult) {
  return result.warnings ?? []
}

export function getResultImageErrors(result: DisplayImportResult) {
  return result.imageErrors ?? []
}

export function hasResultHints(result: DisplayImportResult) {
  return getResultWarnings(result).length > 0 || getResultImageErrors(result).length > 0
}

export function getImportIssueSections(result: DisplayImportResult): ImportIssueSection[] {
  const sections: ImportIssueSection[] = []

  const warnings = getResultWarnings(result)
  if (warnings.length > 0) {
    sections.push({
      title: '提示信息：',
      items: warnings,
      tone: 'warning',
    })
  }

  const imageErrors = getResultImageErrors(result)
  if (imageErrors.length > 0) {
    sections.push({
      title: '图片处理问题：',
      items: imageErrors,
      tone: result.success ? 'warning' : 'error',
    })
  }

  if (result.errors.length > 0) {
    sections.push({
      title: '错误信息：',
      items: result.errors,
      tone: 'error',
    })
  }

  return sections
}

export function buildFailedDhcbResult(fileName: string, error: unknown): ImportResultWithFileName {
  if (error instanceof DhcbImportError) {
    return {
      success: false,
      imported: 0,
      errors: error.validationErrors.length > 0 ? error.validationErrors : [error.message],
      warnings: error.warnings,
      imageErrors: error.imageErrors,
      fileName,
    }
  }

  return {
    success: false,
    imported: 0,
    errors: [error instanceof Error ? error.message : '文件解析失败'],
    fileName,
  }
}

export function getImportStatusErrorMessage(results: ImportResultWithFileName[]) {
  const hasFailure = results.some((result) => !result.success)
  if (!hasFailure) {
    return null
  }

  return results.length === 1
    ? '导入失败，请检查下方结果'
    : '部分文件导入失败，请检查下方结果'
}
