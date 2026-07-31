"use client"

import React, { memo, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import { transformCustomSyntax } from "@/lib/md-component"

interface CardMarkdownProps {
    children: string
    className?: string
    customComponents?: Partial<Components>
}

const REMARK_PLUGINS = [remarkGfm, remarkBreaks]

function sanitizeMarkdownUrl(url: string): string {
    const trimmedUrl = url.trim()

    if (!trimmedUrl || trimmedUrl.startsWith("//")) {
        return ""
    }

    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmedUrl)) {
        return /^(https?:|mailto:|tel:)/i.test(trimmedUrl) ? trimmedUrl : ""
    }

    return trimmedUrl
}

function extractText(node: React.ReactNode): string {
    if (typeof node === "string" || typeof node === "number") return String(node)
    if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return ""
    return React.Children.toArray(node.props.children).map(extractText).join("")
}

function MarkdownStrong({ children }: { children?: React.ReactNode }) {
    const hasEmElement = React.Children.toArray(children).some(
        child => React.isValidElement(child) && child.type === MarkdownEm
    )

    return (
        <strong className={hasEmElement ? "font-bold text-amber-800" : "font-bold text-gray-800"}>
            {children}
        </strong>
    )
}

function MarkdownEm({ children }: { children?: React.ReactNode }) {
    const childArray = React.Children.toArray(children)
    const hasStrongElement = childArray.some(
        child => React.isValidElement(child) && child.type === MarkdownStrong
    )

    if (hasStrongElement) {
        return (
            <span className="font-bold text-amber-800">
                {childArray.map(extractText).join("")}
            </span>
        )
    }

    return <span className="text-amber-900">「{children}」</span>
}

const DEFAULT_COMPONENTS: Components = {
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-2 list-outside list-disc pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-2 list-outside list-decimal pl-5">{children}</ol>,
    li: ({ children }) => <li className="mb-1">{children}</li>,
    blockquote: ({ children }) => (
        <blockquote className="my-2 border-l-2 border-cyan-500/70 bg-cyan-50/70 py-1 pl-2 text-slate-700 italic">
            {children}
        </blockquote>
    ),
    strong: MarkdownStrong,
    em: MarkdownEm,
}

/**
 * 统一的卡牌 Markdown 渲染组件
 *
 * 颜色方案：
 * - **粗体** → text-gray-800（深灰加粗 #1F2937）
 * - *直角引号* → 「text-amber-900」（琥珀色，使用直角引号包裹）
 * - ***重要*** → text-amber-800（琥珀色加粗 #92400E）
 */
function CardMarkdownComponent({ children, className = "", customComponents }: CardMarkdownProps) {
    const mergedComponents = useMemo(
        () => customComponents
            ? { ...DEFAULT_COMPONENTS, ...customComponents }
            : DEFAULT_COMPONENTS,
        [customComponents],
    )
    const transformedMarkdown = useMemo(() => transformCustomSyntax(children), [children])

    return (
        <div className={className}>
            <ReactMarkdown
                components={mergedComponents}
                remarkPlugins={REMARK_PLUGINS}
                skipHtml
                urlTransform={sanitizeMarkdownUrl}
            >
                {transformedMarkdown}
            </ReactMarkdown>
        </div>
    )
}

export const CardMarkdown = memo(CardMarkdownComponent)
