'use client';

import type { CurrentUserDto } from '@teran/contracts';
import {
  BookOpen,
  Boxes,
  ClipboardList,
  FolderTree,
  Gauge,
  Inbox,
  Layers,
  Mail,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { LogoutButton } from '@/components/account/account-forms';
import { Wordmark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { isDemoContent } from '@/lib/site';
import { buttonClasses, iconButtonClasses } from '@/components/ui/button';

type NavKey =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'products'
  | 'categories'
  | 'collections'
  | 'inventory'
  | 'inquiries'
  | 'newsletter'
  | 'journal'
  | 'delivery'
  | 'settings'
  | 'staff'
  | 'audit';

interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

const NAV: { group: 'sales' | 'catalogue' | 'content' | 'system'; items: NavItem[] }[] = [
  {
    group: 'sales',
    items: [
      { key: 'dashboard', href: '/admin', icon: Gauge },
      { key: 'orders', href: '/admin/orders', icon: ClipboardList },
      { key: 'customers', href: '/admin/customers', icon: Users },
    ],
  },
  {
    group: 'catalogue',
    items: [
      { key: 'products', href: '/admin/products', icon: Boxes },
      { key: 'categories', href: '/admin/categories', icon: FolderTree },
      { key: 'collections', href: '/admin/collections', icon: Layers },
      { key: 'inventory', href: '/admin/inventory', icon: Store },
    ],
  },
  {
    group: 'content',
    items: [
      { key: 'inquiries', href: '/admin/inquiries', icon: Inbox },
      { key: 'newsletter', href: '/admin/newsletter', icon: Mail },
      { key: 'journal', href: '/admin/journal', icon: BookOpen },
    ],
  },
  {
    group: 'system',
    items: [
      { key: 'delivery', href: '/admin/delivery', icon: Truck },
      { key: 'settings', href: '/admin/settings', icon: Settings, adminOnly: true },
      { key: 'staff', href: '/admin/staff', icon: ShieldCheck, adminOnly: true },
      { key: 'audit', href: '/admin/audit', icon: ScrollText, adminOnly: true },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/admin'
    ? pathname === '/admin'
    : pathname === href || pathname.startsWith(`${href}/`);
}

/** Staff area chrome: grouped navigation (administrator-only items hidden from managers). */
export function AdminShell({ user, children }: { user: CurrentUserDto; children: ReactNode }) {
  const t = useTranslations('Admin');
  const tc = useTranslations('Common');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user.role === 'ADMIN';

  const navigation = (
    <nav aria-label={t('nav.label')} className="space-y-6">
      {NAV.map(({ group, items }) => {
        const visible = items.filter((item) => isAdmin || !item.adminOnly);
        if (visible.length === 0) return null;
        return (
          <div key={group}>
            <p className="px-3 text-caption font-semibold tracking-[0.12em] text-fg-subtle uppercase">
              {t(`nav.${group}`)}
            </p>
            <ul className="mt-2 space-y-0.5">
              {visible.map(({ key, href, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex h-10 items-center gap-3 rounded-control px-3 text-body-sm font-medium transition-colors',
                        active
                          ? 'bg-brand text-fg-inverse'
                          : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                      )}
                    >
                      <Icon aria-hidden className="h-4 w-4 shrink-0" />
                      {t(`nav.${key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-brand px-5 py-3 font-semibold text-fg-inverse shadow-overlay focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {tc('skipToContent')}
      </a>
      <aside
        className={cn(
          'border-line bg-surface lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto lg:border-r',
          menuOpen ? 'block border-b' : 'hidden',
        )}
      >
        <div className="hidden items-center justify-between px-5 pt-6 pb-2 lg:flex">
          <Link href="/admin" aria-label={t('brand')}>
            <Wordmark size="compact" />
          </Link>
        </div>
        {isDemoContent ? (
          <p
            role="note"
            className="mx-5 mt-3 rounded-control bg-gold-100 px-3 py-2 text-helper text-gold-800"
          >
            {t('demoMode')}
          </p>
        ) : null}
        <div className="px-3 py-5">{navigation}</div>
        <div className="space-y-1 border-t border-line px-3 py-4">
          <p className="truncate px-3 text-body-sm font-semibold text-fg">
            {[user.firstName, user.lastName].filter(Boolean).join(' ')}
          </p>
          <p className="truncate px-3 text-helper text-fg-subtle">
            {user.email} · {t(`roles.${user.role}`)}
          </p>
          <div className="flex flex-wrap gap-1 pt-2">
            <Link href="/" className={buttonClasses('ghost', 'sm')}>
              {t('nav.viewStore')}
            </Link>
            <LogoutButton />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/95 px-4 lg:hidden">
          <span className="flex items-center gap-2">
            <Link href="/admin" aria-label={t('brand')}>
              <Wordmark size="compact" />
            </Link>
            {isDemoContent ? <Badge tone="new">{t('demoBadge')}</Badge> : null}
          </span>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            className={iconButtonClasses('ghost', 'md')}
          >
            <Menu aria-hidden className="h-5 w-5" />
            <span className="sr-only">{t('nav.openMenu')}</span>
          </button>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 py-8 focus:outline-none sm:px-8 lg:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
