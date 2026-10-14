import type { ReactNode } from 'react';
import { AccountNav } from '@/components/account/account-nav';

/**
 * The signed-in customer's area: section navigation and the page. Every page checks the session
 * itself (the proxy already sends visitors without a session cookie to sign-in).
 */
export default function AccountAreaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container-page pt-6 pb-section sm:pt-10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10 xl:gap-14">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <AccountNav />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
