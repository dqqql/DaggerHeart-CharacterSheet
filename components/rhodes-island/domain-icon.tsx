"use client"

import type React from "react"
import { useEffect, useState } from "react"

export type RhodesDomainName =
  | "远见"
  | "攻坚"
  | "坚阵"
  | "秘行"
  | "奇迹"
  | "精准"
  | "支柱"
  | "奥术"
  | "工业"
  | "心界"
  | "迅攻"

const PROFESSION_DOMAIN_BY_ID: Record<string, RhodesDomainName> = {
  "ri-profession-2d1b8c4a3249": "迅攻",
  "ri-profession-81bb919f5f13": "攻坚",
  "ri-profession-102152bab2bd": "精准",
  "ri-profession-1fed1ec9a637": "奥术",
  "ri-profession-1529538bc255": "秘行",
  "ri-profession-76d8dd1c763a": "坚阵",
  "ri-profession-0319582eb790": "支柱",
}

const PROFESSION_DOMAIN_BY_NAME: Record<string, RhodesDomainName> = {
  先锋: "迅攻",
  近卫: "攻坚",
  狙击: "精准",
  术师: "奥术",
  特种: "秘行",
  重装: "坚阵",
  辅助: "支柱",
}

const DOMAIN_ENGLISH: Record<RhodesDomainName, string> = {
  远见: "FORESIGHT",
  攻坚: "ASSAULT",
  坚阵: "BULWARK",
  秘行: "STEALTH",
  奇迹: "MIRACLE",
  精准: "PRECISION",
  支柱: "PILLAR",
  奥术: "ARCANE",
  工业: "INDUSTRIAL",
  心界: "MINDSPHERE",
  迅攻: "BLITZ",
}

export function isRhodesDomainName(value: string): value is RhodesDomainName {
  return value in DOMAIN_ENGLISH
}

export function getRhodesProfessionDomain(
  professionId?: string,
  professionName?: string,
): RhodesDomainName | undefined {
  if (professionId && PROFESSION_DOMAIN_BY_ID[professionId]) {
    return PROFESSION_DOMAIN_BY_ID[professionId]
  }

  if (!professionName) return undefined
  const shortName = professionName.split(/\s+-\s+/)[0].trim()
  return PROFESSION_DOMAIN_BY_NAME[shortName]
}

export function getRhodesDomainEnglish(domain: RhodesDomainName): string {
  return DOMAIN_ENGLISH[domain]
}

interface RhodesDomainIconProps {
  domain: RhodesDomainName
  animated?: boolean
  className?: string
  title?: string
}

export function RhodesDomainIcon({
  domain,
  animated = false,
  className = "",
  title,
}: RhodesDomainIconProps) {
  const animationClass = animated ? "rhodes-domain-icon--animated" : ""
  const commonProps = {
    className: `rhodes-domain-icon rhodes-domain-${DOMAIN_ENGLISH[domain].toLowerCase()} ${animationClass} ${className}`,
    role: "img",
    "aria-label": title || `${domain}领域图标`,
    fill: "currentColor",
    xmlns: "http://www.w3.org/2000/svg",
  }

  switch (domain) {
    case "远见":
      return (
        <svg {...commonProps} viewBox="0 0 50.44 43.47">
          <polygon className="ak-part ak-left-wing" points="10.52 0 20.91 37.8 0 23.78 10.99 26.33 10.52 0" />
          <polygon className="ak-part ak-right-wing" points="39.92 0 29.53 37.8 50.44 23.78 39.45 26.33 39.92 0" />
          <polygon className="ak-part ak-crown" points="19.74 25.64 22.28 21.23 25.22 16.15 28.16 21.23 30.7 25.64 31.81 21.52 29.2 16.37 31.41 12.16 25.22 12.16 19.03 12.16 21.24 16.37 18.63 21.52 19.74 25.64" />
          <polygon className="ak-part ak-core" points="25.22 20.05 27.37 23.78 29.53 27.51 25.22 27.51 20.91 27.51 23.06 23.78 25.22 20.05" />
          <polygon className="ak-part ak-spike" points="25.22 27.31 20.91 27.31 21.51 29.73 25.22 43.47 28.93 29.73 29.53 27.31 25.22 27.31" />
        </svg>
      )
    case "攻坚":
      return (
        <svg {...commonProps} viewBox="0 0 42.87 41.25">
          <polyline className="ak-part ak-trail" points="7.14 0 42.87 10.42 9.79 10.8" />
          <polygon className="ak-part ak-wedge" points="36.68 12.14 6.25 41.25 33.89 30.18 26.17 30.18 36.68 12.14" />
          <polygon className="ak-part ak-blade" points="4.71 1.88 11.52 29.7 0 18.83 6.25 21.29 4.71 1.88" />
          <polygon className="ak-part ak-core" points="10.61 13.23 14.64 29.7 32.32 12.78 10.61 13.23" />
        </svg>
      )
    case "坚阵":
      return (
        <svg {...commonProps} viewBox="0 0 34.17 40.22">
          <polygon className="ak-part ak-base" points="17.08 26.22 3.47 22.02 3.47 30.05 17.08 40.22 30.7 30.05 30.7 22.02 17.08 26.22" />
          <polygon className="ak-part ak-pillar-l" points="15.96 18.79 7.34 15.65 7.34 2.22 15.96 0 15.96 18.79" />
          <polygon className="ak-part ak-pillar-r" points="18.21 18.79 26.83 15.65 26.83 2.22 18.21 0 18.21 18.79" />
          <polygon className="ak-part ak-arch" points="30.38 4.76 30.38 10.71 23.73 12.71 17.08 14.7 10.43 12.71 3.78 10.71 3.78 4.76 0 5.82 0 18.56 8.54 21.11 17.08 23.67 25.63 21.11 34.17 18.56 34.17 5.76 30.38 4.76" />
        </svg>
      )
    case "秘行":
      return (
        <svg {...commonProps} viewBox="0 0 43.92 38.89">
          <polygon className="ak-part ak-blade" points="32.8 23.98 31.72 18.01 30.64 12.04 29.56 18.01 29.04 20.94 0 32.01 19.94 38.89 32.8 23.98" />
          <polygon className="ak-part ak-cloak" points="43.92 6.89 23.99 0 11.38 15.28 12.46 21.25 13.54 27.22 14.61 21.25 15.23 17.82 43.92 6.89" />
        </svg>
      )
    case "奇迹": {
      const starPath = "m31.1,12.16l-2.91-7.6-1.77,4.62-5.3-1.59-2.91-7.6-2.91,7.6-5.3,1.59-1.77-4.62-2.91,7.6-5.32,1.6,5.32,1.6,2.91,10.95.5-1.88,5.95,1.79,3.53,13.27,3.53-13.27,5.95-1.79.5,1.88,2.91-10.95,5.32-1.6-5.32-1.6Zm-4.69-2.96l-1.13,2.96-4.91,1.48.76-2.84,5.29-1.59Zm-11.11,1.59l.76,2.84-4.91-1.48-1.13-2.96,5.29,1.59Zm-6.48,13.31l2.32-8.74,4.97-1.5.74,2.79-2.18,5.68-5.86,1.76Zm12.92-1.76l-2.18-5.68.74-2.79,4.97,1.5,2.32,8.74-5.86-1.76Z"
      return (
        <svg {...commonProps} viewBox="0 0 36.42 39.49">
          <path className="ak-part ak-ring" d={starPath} fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path className="ak-part ak-starburst" d={starPath} />
        </svg>
      )
    }
    case "精准":
      return (
        <svg {...commonProps} viewBox="0 0 42.86 39.41">
          <polygon className="ak-part ak-crown" points="21.43 0 26.92 4.6 32.41 9.2 21.43 5.16 10.46 9.2 15.94 4.6 21.43 0" />
          <polygon className="ak-part ak-bar" points="21.43 6.85 32.15 10.64 42.86 15.25 21.42 12.33 0 15.25 10.72 10.64 21.43 6.85" />
          <polygon className="ak-part ak-shaft" points="21.54 39.41 19.54 24.95 17.54 10.49 21.54 9.09 25.53 10.49 23.54 24.95 21.54 39.41" />
          <polygon className="ak-part ak-wing-l" points="20.86 12.41 5.96 24.94 21.54 22.72 14.58 21.13 20.86 12.41" />
          <polygon className="ak-part ak-wing-r" points="22.1 12.41 37.01 24.94 21.43 22.72 28.39 21.13 22.1 12.41" />
        </svg>
      )
    case "支柱":
      return (
        <svg {...commonProps} viewBox="0 0 31.68 35.29">
          <polygon className="ak-part ak-cap" points="15.84 3.55 19.55 1.72 19.55 1.71 19.45 1.71 17.65 .88 15.75 0 13.85 .88 12.08 1.7 15.84 3.55" />
          <polygon className="ak-part ak-pillar-l" points="11.95 2.85 11.95 8.43 2.22 3.64 0 6.91 11.4 12.52 3.97 16.18 3.97 20.54 11.95 16.61 11.95 33.86 12.05 33.86 13.85 34.69 15.15 35.29 15.15 4.42 11.95 2.85" />
          <polygon className="ak-part ak-pillar-r" points="31.68 6.91 29.46 3.64 19.55 8.51 19.55 2.94 16.53 4.42 16.53 35.21 17.65 34.69 19.45 33.86 19.55 33.86 19.55 16.53 27.71 20.54 27.71 16.18 20.28 12.52 31.68 6.91" />
        </svg>
      )
    case "奥术":
      return (
        <svg {...commonProps} viewBox="0 0 35.19 32.23">
          <g transform="translate(-6.24 17.16) rotate(-45)">
            <rect className="ak-part ak-crystal" x="13.53" y="12.04" width="8.14" height="8.14" />
          </g>
          <polygon className="ak-part ak-arc-top" points="10.21 13.28 15.44 8.05 17.6 0 1.48 16.11 0 23.71 7.38 14.02 10.21 13.28" />
          <polygon className="ak-part ak-arc-bot" points="24.98 18.94 19.75 24.17 17.6 32.23 33.71 16.11 35.19 8.51 27.81 18.2 24.98 18.94" />
          <polygon className="ak-part ak-rune-l" points="6.65 14.65 4.17 18.06 14.31 28.2 15.37 23.37 6.65 14.65" />
          <polygon className="ak-part ak-rune-r" points="28.89 17.31 31.37 13.89 21.24 3.76 20.17 8.59 28.89 17.31" />
        </svg>
      )
    case "工业":
      return (
        <svg {...commonProps} viewBox="0 0 35.5 35.07">
          <g className="ak-hex-group">
            <path className="ak-part ak-hex-ring" d="m17.75,3.64l-13.61,7.86v15.71s13.61,7.86,13.61,7.86l13.61-7.86v-15.71s-13.61-7.86-13.61-7.86Zm10.4,21.82l-10.31,5.95-10.31-5.95v-11.9s10.31-5.95,10.31-5.95l10.31,5.95v11.9Z" />
            <polygon className="ak-part ak-hex-core" points="17.84 13.19 12.37 16.35 12.37 22.67 17.84 25.83 23.31 22.67 23.31 16.35 17.84 13.19" />
            <rect className="ak-part ak-gear-t" x="16.15" width="3.38" height="7.61" />
            <g transform="translate(70.78 13.97) rotate(120)">
              <rect className="ak-part ak-gear-br" x="29.67" y="23.62" width="3.38" height="7.61" />
            </g>
            <g transform="translate(-17.54 44.71) rotate(-120)">
              <rect className="ak-part ak-gear-bl" x="2.45" y="23.62" width="3.38" height="7.61" />
            </g>
          </g>
        </svg>
      )
    case "心界":
      return (
        <svg {...commonProps} viewBox="0 0 42.14 31.91">
          <polygon className="ak-part ak-frame" points="36.87 5.32 31.61 0 26.34 5.32 25.37 6.29 33 13.92 21.07 25.85 9.14 13.92 16.77 6.29 15.8 5.32 10.54 0 5.27 5.32 0 10.64 10.54 21.28 21.07 31.91 31.61 21.28 42.14 10.64 42.14 10.64 36.87 5.32" />
          <polygon className="ak-part ak-core" points="25.37 6.29 21.07 1.99 16.77 6.29 21.07 10.64 25.37 6.29" />
          <polygon className="ak-part ak-eye-l" points="17.15 10.02 15.19 12 13.23 14.18 17.15 14.18 21.07 14.18 19.11 12 17.15 10.02" />
          <polygon className="ak-part ak-eye-r" points="24.99 10.02 23.03 12 21.07 14.18 24.99 14.18 28.91 14.18 26.95 12 24.99 10.02" />
          <polygon className="ak-part ak-eye-c" points="21.07 21.89 24.99 17.93 28.91 13.78 21.07 13.78 13.23 13.78 17.15 17.93 21.07 21.89" />
        </svg>
      )
    case "迅攻":
      return (
        <svg {...commonProps} viewBox="0 0 37.32 38.59">
          <polygon className="ak-part ak-bolt" points="37.32 0 17.01 6 27.16 28.2 21.73 7.41 37.32 0" />
          <polyline className="ak-part ak-sweep" points="24.62 22.63 0 38.59 27.16 28.2 29.76 27.49 21.73 7.41" />
          <polyline className="ak-part ak-slash-l" points="20.12 20.88 0 38.59 17.95 16.39" />
          <polyline className="ak-part ak-accent" points="28.29 13.2 29.47 16.39 36.43 10.2" />
        </svg>
      )
  }
}

interface ProfessionDomainAnimationProps {
  professionId?: string
  professionName?: string
  replayKey?: React.Key
}

export function ProfessionDomainAnimation({
  professionId,
  professionName,
  replayKey,
}: ProfessionDomainAnimationProps) {
  const domain = getRhodesProfessionDomain(professionId, professionName)
  const [animationStarted, setAnimationStarted] = useState(false)

  useEffect(() => {
    setAnimationStarted(false)

    if (!domain) return

    const startTimer = window.setTimeout(() => {
      setAnimationStarted(true)
    }, 500)

    return () => window.clearTimeout(startTimer)
  }, [domain, professionId, replayKey])

  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-slate-600/80 bg-slate-950/70"
      aria-live="polite"
    >
      <div aria-hidden="true" className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(103,232,249,.13)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,.13)_1px,transparent_1px)] [background-size:18px_18px]" />
      {domain ? (
        <div className="relative flex h-full w-full items-center justify-center gap-3 px-3 py-1 text-cyan-50">
          <div className="h-9 w-11 shrink-0">
            {animationStarted && (
              <RhodesDomainIcon domain={domain} animated className="h-9 w-11 drop-shadow-[0_0_7px_rgba(165,243,252,.75)]" />
            )}
          </div>
          <div className="leading-none">
            <div className="text-[11px] font-semibold tracking-[0.28em]">{domain}</div>
            <div className="mt-1 text-[7px] tracking-[0.18em] text-cyan-200/70">{getRhodesDomainEnglish(domain)}</div>
          </div>
        </div>
      ) : (
        <span className="relative text-[8px] tracking-[0.3em] text-slate-400 print:hidden">等待职业同步</span>
      )}
    </div>
  )
}
