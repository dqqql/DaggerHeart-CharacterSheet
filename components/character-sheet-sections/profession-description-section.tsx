import React from 'react';
import { splitMarkdownRenderSections } from '@/lib/md-component';
import { CardMarkdown } from '@/components/ui/card-markdown';

interface ProfessionDescriptionSectionProps {
    description: string | undefined;
}

const ProfessionDescriptionSection: React.FC<ProfessionDescriptionSectionProps> = ({ description }) => {
    const transformedSections = description ? splitMarkdownRenderSections(description) : [];

    const extractText = (child: React.ReactNode): string => {
        if (typeof child === 'string') {
            return child;
        }

        if (typeof child === 'number') {
            return String(child);
        }

        if (React.isValidElement(child)) {
            const childProps = child.props as { children?: React.ReactNode } | null;

            if (childProps?.children !== undefined) {
                return React.Children.toArray(childProps.children).map(extractText).join('');
            }
        }

        return '';
    };

    return (
        <div className="border-2 border-gray-300 rounded-lg p-1.5 text-xs markdown-content h-[250px] overflow-auto">
            {transformedSections.map((section, index) => (
                <div key={`${index}-${section.isCentered ? 'center' : 'normal'}`} className={section.isCentered ? 'text-center' : undefined}>
                    <CardMarkdown
                        customComponents={{
                            p: ({ children }) => <p className="first:mt-0 mb-0 mt-1">{children}</p>,
                            li: ({ children }) => <li className="mb-0.5 last:mb-0">{children}</li>,
                            strong: ({ children }) => {
                                const childArray = React.Children.toArray(children);
                                const hasEmElement = childArray.some(
                                    child => React.isValidElement(child) && typeof child.type === 'function' && child.type.name === 'em'
                                );

                                if (hasEmElement) {
                                    return <strong className="font-bold italic text-gray-800">{children}</strong>;
                                }

                                return <strong className="font-bold text-gray-800">{children}</strong>;
                            },
                            em: ({ children }) => {
                                const childArray = React.Children.toArray(children);
                                const hasStrongElement = childArray.some(
                                    child => React.isValidElement(child) && typeof child.type === 'function' && child.type.name === 'strong'
                                );

                                if (hasStrongElement) {
                                    const textContent = childArray.map(extractText).join('');
                                    return <span className="font-bold italic text-gray-800">{textContent}</span>;
                                }

                                return <span className="text-amber-800">「{children}」</span>;
                            },
                            code: ({ className, children, ...props }) => {
                                const placeholder = React.Children.toArray(children).map(extractText).join('').trim();
                                const match = /^card-(input|box|checkbox)(?::(\d+))?$/.exec(placeholder);

                                if (match) {
                                    const [, dataType, rawValue] = match;

                                    if (dataType === 'input') {
                                        const len = parseInt(rawValue ?? '', 10) || 8;
                                        return <input type="text" className="border-b border-black outline-none px-1 mx-1 bg-transparent" style={{ width: `${len * 9.6}px` }} />;
                                    }

                                    if (dataType === 'box') {
                                        const size = parseInt(rawValue ?? '', 10) || 1;
                                        const px = 8 * size;
                                        const fontSize = 6 * size;
                                        return <input type="text" className="border border-black outline-none text-center mx-1 bg-transparent" style={{ width: `${px}px`, height: `${px}px`, fontSize: `${fontSize}px` }} />;
                                    }

                                    const count = parseInt(rawValue ?? '', 10) || 1;
                                    return (
                                        <span className="inline-flex items-center">
                                            {Array.from({ length: count }, (_, checkboxIndex) => (
                                                <input
                                                    key={checkboxIndex}
                                                    type="checkbox"
                                                    className="mx-0.5 align-middle w-3 h-3 appearance-none border border-black rounded-sm bg-white checked:bg-black checked:border-black focus:outline-none focus:ring-0"
                                                />
                                            ))}
                                        </span>
                                    );
                                }

                                return (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                        }}
                    >
                        {section.content}
                    </CardMarkdown>
                </div>
            ))}
        </div>
    );
};

export default ProfessionDescriptionSection;
