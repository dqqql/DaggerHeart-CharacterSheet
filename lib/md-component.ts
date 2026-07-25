export interface MarkdownRenderSection {
    content: string;
    isCentered: boolean;
}

const CENTER_BLOCK_PATTERN = /\[center\]([\s\S]*?)\[\/center\]/gi;

function transformInlineCustomSyntax(text: string): string {
    return text
        // 罗德岛卡库以独占段落开头的反斜杠表示规则补充或释义。
        // 转为 Markdown 引用块，让所有卡牌视图都以注释样式呈现，而非显示原始标记。
        .replace(/(^|\r?\n\s*\r?\n)[\t ]*\\(?!~)(?=\S)/g, "$1> ")
        // 卡库中的 `\\~` 是名称与说明之间的旧分隔符。
        .replace(/\\~/g, "：")
        .replace(/\[(input|box):(\d+)\]/g, (_, type: string, value: string) => `\`card-${type}:${value}\``)
        .replace(/\[(checkbox):(\d+)\]/g, (_, type: string, value: string) => `\`card-${type}:${value}\``)
        .replace(/\[(checkbox)\]/g, (_, type: string) => `\`card-${type}\``);
}

export function transformCustomSyntax(text: string): string {
    return transformInlineCustomSyntax(text);
}

export function splitMarkdownRenderSections(text: string): MarkdownRenderSection[] {
    const sections: MarkdownRenderSection[] = [];
    let lastIndex = 0;

    for (const match of text.matchAll(CENTER_BLOCK_PATTERN)) {
        const matchIndex = match.index ?? 0;

        if (matchIndex > lastIndex) {
            sections.push({
                content: transformInlineCustomSyntax(text.slice(lastIndex, matchIndex)),
                isCentered: false,
            });
        }

        sections.push({
            content: transformInlineCustomSyntax(match[1] ?? ""),
            isCentered: true,
        });

        lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < text.length) {
        sections.push({
            content: transformInlineCustomSyntax(text.slice(lastIndex)),
            isCentered: false,
        });
    }

    if (sections.length === 0) {
        return [{ content: transformInlineCustomSyntax(text), isCentered: false }];
    }

    return sections.filter(section => section.content.length > 0);
}

export function normalizeLegacyHtmlToMarkdown(text: string): string {
    if (!text) {
        return text;
    }

    return text
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/?strong>/gi, "**")
        .replace(/<\/?em>/gi, "*");
}
