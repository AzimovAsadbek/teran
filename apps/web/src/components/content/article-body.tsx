import type { ReactNode } from 'react';

/**
 * Renders journal article text. The format is deliberately tiny and never parsed as HTML:
 * blank lines separate blocks, "## " starts a heading and lines starting with "- " form a list.
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
        nodes.push(<p key={`${key}-p`}>{paragraph.join(' ')}</p>);
        paragraph = [];
      }
      if (list.length) {
        nodes.push(
          <ul key={`${key}-ul`} className="list-disc space-y-2 pl-5 marker:text-gold-600">
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
          <h2 key={`${key}-h`} className="pt-4 font-display text-3xl font-semibold text-forest-900">
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

  return <div className="space-y-5 text-lg leading-relaxed text-ink-700">{nodes}</div>;
}
