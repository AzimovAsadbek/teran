import type { ReactNode } from 'react';

/**
 * Renders journal article text in the reference's article type. The format is deliberately tiny and never parsed as HTML:
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
        nodes.push(
          <p key={`${key}-p`} className="mb-[1.125rem]">
            {paragraph.join(' ')}
          </p>,
        );
        paragraph = [];
      }
      if (list.length) {
        nodes.push(
          <ul key={`${key}-ul`} className="mb-[1.125rem] list-disc pl-6">
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
            className="mt-10 mb-1.5 font-headline text-[1.5rem] leading-6 text-[#121212] [--heading-case:none] [--headline-weight:600]"
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

  // The reference's article text: 18 px on 28.8 px, 18 px between paragraphs, condensed 24 px
  // headings 40 px below the text before them.
  return (
    <div className="text-[1.125rem] leading-[1.8rem] font-medium text-[#121212] [&>h2:first-child]:mt-0">
      {nodes}
    </div>
  );
}
