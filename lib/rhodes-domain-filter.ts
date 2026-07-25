export interface RhodesDomainFilterOption {
  value: string
  label: string
  separatorBefore?: string
}

// Keep the selector aligned with the order used by the Rhodes Island rules UI.
export const RHODES_PRIMARY_DOMAIN_ORDER = [
  "迅攻",
  "攻坚",
  "坚阵",
  "精准",
  "奥术",
  "支柱",
  "秘行",
] as const

export const RHODES_SECONDARY_DOMAIN_ORDER = [
  "远见",
  "奇迹",
  "心界",
  "工业",
] as const

export const RHODES_DOMAIN_ORDER = [
  ...RHODES_PRIMARY_DOMAIN_ORDER,
  ...RHODES_SECONDARY_DOMAIN_ORDER,
] as const

const RHODES_DOMAIN_ORDER_INDEX = new Map(
  RHODES_DOMAIN_ORDER.map((domain, index) => [domain, index]),
)
const RHODES_SECONDARY_DOMAINS = new Set<string>(RHODES_SECONDARY_DOMAIN_ORDER)

export function getRhodesDomainFilterOptions(
  domains: Iterable<string>,
): RhodesDomainFilterOption[] {
  const uniqueDomains = Array.from(new Set(domains))

  uniqueDomains.sort((left, right) => {
    const leftIndex = RHODES_DOMAIN_ORDER_INDEX.get(left as typeof RHODES_DOMAIN_ORDER[number])
    const rightIndex = RHODES_DOMAIN_ORDER_INDEX.get(right as typeof RHODES_DOMAIN_ORDER[number])

    if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex
    if (leftIndex !== undefined) return -1
    if (rightIndex !== undefined) return 1
    return left.localeCompare(right, "zh-CN")
  })

  const firstSecondaryDomain = uniqueDomains.find(domain => RHODES_SECONDARY_DOMAINS.has(domain))

  return uniqueDomains.map(domain => ({
    value: domain,
    label: domain,
    ...(domain === firstSecondaryDomain
      ? { separatorBefore: "主次领域分界线" }
      : {}),
  }))
}

export function getRhodesSecondaryDomainSelectionOptions(
  primaryDomain?: string,
): RhodesDomainFilterOption[] {
  return getRhodesDomainFilterOptions(RHODES_DOMAIN_ORDER)
    .filter(option => option.value !== primaryDomain)
}
