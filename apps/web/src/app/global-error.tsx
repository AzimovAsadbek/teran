'use client';

import { buttonClasses } from '@/components/ui/button';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

/**
 * Last-resort error page, shown only when the root layout itself fails. It replaces that layout,
 * so it has no translations or navigation and speaks all three languages. Never shows details.
 */
export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="uz" className={fontVariables}>
      <body className="flex min-h-dvh items-center justify-center bg-canvas p-6 text-center">
        <title>TERAN</title>
        <meta name="robots" content="noindex" />
        <main className="max-w-md" role="alert">
          <h1 className="text-display-md text-fg">Nimadir notoʻgʻri ketdi</h1>
          <p className="mt-2 text-fg-muted" lang="ru">
            Что-то пошло не так
          </p>
          <p className="mt-1 text-fg-muted" lang="en">
            Something went wrong
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={retry} className={buttonClasses('primary')}>
              Qayta urinish · Повторить · Try again
            </button>
            {/* A full page load is intended: the app's own layout failed to render. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" className={buttonClasses('secondary')}>
              TERAN
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
