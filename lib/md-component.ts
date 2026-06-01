export interface MarkdownRenderSection {
    content: string;
    isCentered: boolean;
}

const CENTER_BLOCK_PATTERN = /\[center\]([\s\S]*?)\[\/center\]/gi;

function transformInlineCustomSyntax(text: string): string {
    return text
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
