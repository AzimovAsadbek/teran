import type { Metadata } from 'next';
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
    <html lang="uz">
      <body className="flex min-h-dvh items-center justify-center bg-ivory-50 p-6 text-center">
        <main className="max-w-md">
          <p className="text-eyebrow text-gold-700">404</p>
          <h1 className="text-display-md mt-3 text-forest-900">Sahifa topilmadi</h1>
          <p className="mt-2 text-ink-700" lang="ru">
            Страница не найдена
          </p>
          <p className="mt-1 text-ink-700" lang="en">
            Page not found
          </p>
          <a
            href="/"
            className="mt-8 inline-flex rounded-full bg-forest-900 px-6 py-3 text-sm font-semibold text-ivory-50 hover:bg-forest-800"
          >
            TERAN
          </a>
        </main>
      </body>
    </html>
  );
}
