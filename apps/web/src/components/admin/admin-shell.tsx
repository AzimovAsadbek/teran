'use client';

import type { AdminBadges, CurrentUserDto } from '@teran/contracts';
import {
  BookOpen,
  Boxes,
  ClipboardList,
  FolderTree,
  Gauge,
  Images,
  Inbox,
  Layers,
  Mail,
  MapPin,
  Menu,
  ScrollText,
  Send,
  Settings,
  Shapes,
  ShieldCheck,
  Star,
  Store,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, use, useState, type ReactNode } from 'react';
import { LogoutButton } from '@/components/account/logout';
import { Wordmark } from '@/components/brand/logo';
import { Badge } from '@/components/ui/badge';
import { buttonClasses, IconButton } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { isDemoContent } from '@/lib/site';
import { AdminToaster } from './toast';

type NavKey =
  | 'dashboard'
  | 'orders'
  | 'inquiries'
  | 'reviews'
  | 'customers'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'collections'
  | 'journal'
  | 'media'
  | 'stores'
  | 'telegram'
  | 'newsletter'
  | 'settings'
  | 'delivery'
  | 'productTypes'
  | 'staff'
  | 'audit';

/** Which waiting work a menu item shows next to its name. */
type CountKind = 'newOrders' | 'newInquiries' | 'lowStock';

interface NavItem {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  count?: CountKind;
}

/* Grouped by task: daily sales work first, then the catalogue, the website, and rare settings. */
const NAV: { group: 'sales' | 'catalogue' | 'site' | 'setup'; items: NavItem[] }[] = [
  {
    group: 'sales',
    items: [
      { key: 'dashboard', href: '/admin', icon: Gauge },
      { key: 'orders', href: '/admin/orders', icon: ClipboardList, count: 'newOrders' },
      { key: 'inquiries', href: '/admin/inquiries', icon: Inbox, count: 'newInquiries' },
      { key: 'reviews', href: '/admin/reviews', icon: Star },
      { key: 'customers', href: '/admin/customers', icon: Users },
    ],
  },
  {
    group: 'catalogue',
    items: [
      { key: 'products', href: '/admin/products', icon: Boxes },
      { key: 'inventory', href: '/admin/inventory', icon: Store, count: 'lowStock' },
      { key: 'categories', href: '/admin/categories', icon: FolderTree },
      { key: 'collections', href: '/admin/collections', icon: Layers },
    ],
  },
  {
    group: 'site',
    items: [
      { key: 'journal', href: '/admin/journal', icon: BookOpen },
      { key: 'media', href: '/admin/media', icon: Images },
      { key: 'stores', href: '/admin/stores', icon: MapPin, adminOnly: true },
      { key: 'telegram', href: '/admin/telegram', icon: Send },
      { key: 'newsletter', href: '/admin/newsletter', icon: Mail },
    ],
  },
  {
    group: 'setup',
    items: [
      { key: 'settings', href: '/admin/settings', icon: Settings, adminOnly: true },
      { key: 'delivery', href: '/admin/delivery', icon: Truck },
      { key: 'productTypes', href: '/admin/product-types', icon: Shapes },
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

function countOf(badges: AdminBadges, kind: CountKind): number {
  switch (kind) {
    case 'newOrders':
      return badges.ordersByStatus.PENDING;
    case 'newInquiries':
      return badges.newInquiries.contact + badges.newInquiries.wholesale;
    case 'lowStock':
      return badges.lowStock;
  }
}

/** The number beside a menu item; streams in after the menu itself. */
function NavCount({
  badges,
  kind,
  active,
}: {
  badges: Promise<AdminBadges | null>;
  kind: CountKind;
  active: boolean;
}) {
  const t = useTranslations('Admin');
  const loaded = use(badges);
  const count = loaded ? countOf(loaded, kind) : 0;
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'ml-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-caption font-semibold tabular-nums',
        active
          ? 'bg-fg-inverse/20 text-fg-inverse'
          : kind === 'lowStock'
            ? 'bg-warning-soft text-warning'
            : 'bg-gold-100 text-gold-800',
      )}
    >
      <span aria-hidden>{count}</span>
      <span className="sr-only">
        {kind === 'lowStock' ? t('dashboard.tasksStock', { count }) : t('nav.newCount', { count })}
      </span>
    </span>
  );
}

/**
 * Staff area chrome: grouped navigation (administrator-only items hidden from managers) with the
 * waiting work beside each item. Below 1024 px the same menu opens as a drawer from the left.
 */
export function AdminShell({
  user,
  badges,
  children,
}: {
  user: CurrentUserDto;
  badges: Promise<AdminBadges | null>;
  children: ReactNode;
}) {
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
              {visible.map(({ key, href, icon: Icon, count }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={key}>
                    <Link
                      href={href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex min-h-10 items-center gap-3 rounded-control px-3 py-2 text-body-sm font-medium transition-colors',
                        active
                          ? 'bg-brand text-fg-inverse'
                          : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
                      )}
                    >
                      <Icon aria-hidden className="h-4 w-4 shrink-0" />
                      {t(`nav.${key}`)}
                      {count ? (
                        <Suspense fallback={null}>
                          <NavCount badges={badges} kind={count} active={active} />
                        </Suspense>
                      ) : null}
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

  const demoNote = isDemoContent ? (
    <p role="note" className="rounded-control bg-gold-100 px-3 py-2 text-helper text-gold-800">
      {t('demoMode')}
    </p>
  ) : null;

  const account = (
    <div className="space-y-1">
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
  );

  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-brand px-5 py-3 font-semibold text-fg-inverse shadow-overlay focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {tc('skipToContent')}
      </a>
      {/* The menu scrolls on short screens; the account, the way to the store and signing out
          stay in view at the bottom. */}
      <aside className="hidden border-r border-line bg-surface lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="px-5 pt-6 pb-2">
          {/* Often the largest thing on a page of text and figures: loaded at once. */}
          <Link href="/admin" aria-label={t('brand')}>
            <Wordmark size="compact" eager />
          </Link>
        </div>
        {demoNote ? <div className="mx-5 mt-3">{demoNote}</div> : null}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-5 [scrollbar-width:thin]">
          {navigation}
        </div>
        <div className="border-t border-line px-3 py-4">{account}</div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/95 px-2 sm:px-4 lg:hidden">
          <IconButton
            label={t('nav.openMenu')}
            icon={<Menu />}
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
          />
          <Link href="/admin" aria-label={t('brand')}>
            <Wordmark size="compact" eager />
          </Link>
          {isDemoContent ? <Badge tone="new">{t('demoBadge')}</Badge> : null}
        </header>
        <Sheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          side="left"
          title={t('nav.menu')}
          closeLabel={t('nav.closeMenu')}
          footer={account}
        >
          <div className="space-y-5 px-3 py-5">
            {demoNote ? <div className="px-2">{demoNote}</div> : null}
            {navigation}
          </div>
        </Sheet>
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-7xl px-4 py-6 focus:outline-none sm:px-8 sm:py-8 lg:py-10"
        >
          {children}
        </main>
        <AdminToaster />
      </div>
    </div>
  );
}
