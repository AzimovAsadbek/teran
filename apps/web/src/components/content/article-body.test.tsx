import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleBody } from './article-body';

describe('ArticleBody', () => {
  it('renders headings, lists and paragraphs from the plain-text format', () => {
    render(
      <ArticleBody
        body={'Intro line one\ncontinues here.\n\n## Types\n- Green\n- Black\n\nClosing paragraph.'}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Types' })).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      'Green',
      'Black',
    ]);
    expect(screen.getByText('Intro line one continues here.')).toBeInTheDocument();
    expect(screen.getByText('Closing paragraph.')).toBeInTheDocument();
  });

  it('never interprets markup', () => {
    const { container } = render(<ArticleBody body={'<img src=x onerror=alert(1)> text'} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)> text')).toBeInTheDocument();
  });
});
