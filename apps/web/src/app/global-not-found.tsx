import type { Metadata } from 'next';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: '404 — TERAN',
  robots: { index: false, follow: false },
};

/**
 * Rendered for URLs that match no route at all (outside the locale tree), so it cannot know the
 * visitor's language and therefore speaks all three.
 */
export default function GlobalNotFound() {
  return (
    <html lang="uz" className={fontVariables}>
      <body className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <main className="max-w-md">
          <p className="text-eyebrow text-accent-fg">404</p>
          <h1 className="mt-3 text-display-md text-forest-900">Sahifa topilmadi</h1>
          <p className="mt-2 text-fg-muted" lang="ru">
            Страница не найдена
          </p>
          <p className="mt-1 text-fg-muted" lang="en">
            Page not found
          </p>
          {/* A full page load is intended: this page has its own root layout, outside the app. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="mt-8 inline-flex h-11 items-center rounded-control bg-brand px-5 text-button text-fg-inverse hover:bg-brand-hover"
          >
            TERAN
          </a>
        </main>
      </body>
    </html>
  );
}
