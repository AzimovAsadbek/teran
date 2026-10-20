import type { ReactNode } from 'react';

/**
 * Renders journal article text for reading (ADR-051): TERAN's serif for its headings, list marks in
 * the brand's teal. The format is deliberately tiny and never parsed as HTML: blank lines separate
 * blocks, "## " starts a heading and lines starting with "- " form a list.
 */
export function ArticleBody({ body }: { body: string }) {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/);
  const nodes: ReactNode[] = [];

  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    let paragraph: string[] = [];
    let list: string[] = [];
    const flush = (key: string) => {
      if (paragraph.length) {
        nodes.push(
          <p key={`${key}-p`} className="mb-[1.125rem]">
            {paragraph.join(' ')}
          </p>,
        );
        paragraph = [];
      }
      if (list.length) {
        nodes.push(
          <ul key={`${key}-ul`} className="mb-[1.125rem] list-disc pl-6 marker:text-forest-900">
            {list.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>,
        );
        list = [];
      }
    };

    lines.forEach((line, lineIndex) => {
      const key = `${blockIndex}-${lineIndex}`;
      if (line.startsWith('## ')) {
        flush(key);
        nodes.push(
          <h2
            key={`${key}-h`}
            className="mt-11 mb-3 font-heading text-[1.75rem] leading-tight text-balance text-fg"
          >
            {line.slice(3).trim()}
          </h2>,
        );
      } else if (line.startsWith('- ')) {
        if (paragraph.length) flush(`${key}-before`);
        list.push(line.slice(2).trim());
      } else {
        if (list.length) flush(`${key}-before`);
        paragraph.push(line.trim());
      }
    });
    flush(`${blockIndex}-end`);
  });

  // 18 px on 30 px, 18 px between paragraphs, 28 px headings well clear of the text before them.
  return (
    <div className="text-[1.125rem] leading-[1.875rem] text-pretty text-fg [&>h2:first-child]:mt-0">
      {nodes}
    </div>
  );
}
