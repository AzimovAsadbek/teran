'use client';

import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { Link } from '@/i18n/navigation';

/**
 * The reference's "Was this article helpful?" row under a help article, over a rule: the question
 * at the left, Yes and No (with their thumbs) at the right. The answer stays in this browser only
 * (nothing is sent); after No, the row points to the contact page.
 */
export function ArticleRating({
  labels,
}: {
  labels: { question: string; yes: string; no: string; thanks: string; thanksNo: string };
}) {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);
  return (
    <div className="mt-10 flex min-h-[5.0625rem] flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[#ddd] py-[1.5625rem]">
      {answer ? (
        <p role="status" className="text-[1rem] leading-6 text-[#6a6a6a]">
          {answer === 'yes' ? (
            labels.thanks
          ) : (
            <Link href="/contact" className="underline underline-offset-2 hover:text-[#161616]">
              {labels.thanksNo}
            </Link>
          )}
        </p>
      ) : (
        <>
          <p className="text-[1rem] leading-[1.15] text-[#6a6a6a]">{labels.question}</p>
          <div className="flex items-center gap-8 pr-4">
            {(['yes', 'no'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAnswer(value)}
                className="flex items-center gap-2 text-[1rem] leading-[1.15] text-black hover:underline"
              >
                {value === 'yes' ? (
                  <ThumbsUp aria-hidden className="h-5 w-5 fill-current" strokeWidth={1.5} />
                ) : (
                  <ThumbsDown aria-hidden className="h-5 w-5 fill-current" strokeWidth={1.5} />
                )}
                {value === 'yes' ? labels.yes : labels.no}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
