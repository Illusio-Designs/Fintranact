'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { QuickPanel } from './quickpanel';
import { NotificationDrawer } from './notifications';
import { ToastHost } from './toast';
import { Dropdown } from './components';
import { notifications as NOTIF_SEED, type Notif } from './mock';
import {
  DashboardCircleIcon,
  Book02Icon,
  Invoice01Icon,
  CheckmarkBadge01Icon,
  Coins01Icon,
  ArchiveIcon,
  Factory01Icon,
  UserGroupIcon,
  Configuration01Icon,
  Analytics01Icon,
  Settings01Icon,
} from 'hugeicons-react';
import { ROLES } from './mock';

/** Sidebar nav — `#N` on a label adds a red count badge. */
const NAV: { group: string; open?: boolean; badge?: string; pages: string[] }[] = [
  { group: 'Overview', open: true, pages: ['Dashboard', 'Widgets', 'UI Library', 'Compliance Calendar#2', 'Documents', 'Notifications'] },
  { group: 'Accounting', open: true, pages: ['Chart of Accounts', 'Ledgers & Groups', 'Vouchers', 'Day Book', 'Bank & Cash'] },
  { group: 'Sales & Purchase', pages: ['Sales Invoices', 'Purchase Bills', 'Credit / Debit Notes', 'Customers & Vendors', 'Items & Price Lists'] },
  { group: 'GST & Returns', badge: '3', pages: ['GST Invoices', 'E-Way Bills', 'GSTR-1', 'GSTR-3B', 'GSTR-2B Reconciliation'] },
  { group: 'TDS', pages: ['TDS Deductions', 'Payable / Receivable', 'Challans ITNS 281#1', 'Returns 24Q 26Q 27Q'] },
  { group: 'TCS', pages: ['TCS Collections', 'Challans', 'Return 27EQ'] },
  { group: 'Job Work & Process', pages: ['Inward Cash Debit memo', 'Outward Challans', 'Pending Inward Outward#10', 'Job Cards', 'Lien Forfeiture#1', 'ITC-04'] },
  { group: 'Payroll & HR', pages: ['Employees', 'Salary Structures', 'Attendance & Leave', 'Payroll Run#1', 'Payslips', 'Form 16', 'Statutory PF ESI PT'] },
  { group: 'Masters', pages: ['Process Master', 'Rate Master', 'Item Material Master', 'Ledger Categories', 'Financial Year'] },
  { group: 'Reports', pages: ['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Ageing'] },
  { group: 'Admin · Ravi Metal Ops', pages: ['Companies & Branches', 'Users & Roles', 'Permissions', 'Audit Trail', 'System & Tax Config'] },
];

export function slug(label: string): string {
  return label.replace(/#.*/, '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function hrefFor(label: string): string {
  const clean = label.replace(/#.*/, '').trim();
  if (clean === 'Dashboard') return '/dashboard';
  if (clean === 'Widgets') return '/widgets';
  if (clean === 'UI Library') return '/ui';
  if (clean === 'Documents') return '/documents';
  if (clean === 'Compliance Calendar') return '/compliance';
  if (clean === 'Trial Balance') return '/reports/trial-balance';
  if (clean === 'Day Book') return '/reports/day-book';
  if (clean === 'Profit & Loss') return '/reports/profit-loss';
  if (clean === 'Balance Sheet') return '/reports/balance-sheet';
  if (clean === 'Ageing') return '/reports/ageing';
  if (clean === 'GSTR-1') return '/gst/gstr-1';
  if (clean === 'GSTR-3B') return '/gst/gstr-3b';
  if (clean === 'GSTR-2B Reconciliation') return '/gst/gstr-2b';
  if (clean === 'GST Invoices') return '/gst/e-invoice';
  if (clean === 'E-Way Bills') return '/gst/e-way';
  if (clean === 'Challans ITNS 281') return '/tds/challans';
  if (clean === 'Returns 24Q 26Q 27Q') return '/tds/returns';
  if (clean === 'Pending Inward Outward') return '/jobwork/pending';
  if (clean === 'ITC-04') return '/jobwork/itc04';
  if (clean === 'Lien Forfeiture') return '/jobwork/lien';
  if (clean === 'Payroll Run') return '/payroll/run';
  if (clean === 'Form 16') return '/payroll/form16';
  if (clean === 'Process Master') return '/masters/process';
  if (clean === 'Rate Master') return '/masters/rate';
  if (clean === 'Financial Year') return '/admin/periods';
  if (clean === 'Audit Trail') return '/admin/audit';
  if (clean === 'TCS Collections') return '/tcs/collections';
  if (clean === 'Return 27EQ') return '/tcs/returns';
  return `/m/${slug(clean)}`;
}

/** Distinct Hugeicons icon per nav group, rendered inside a large round badge. */
type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const GROUP_ICON: Record<string, IconCmp> = {
  Overview: DashboardCircleIcon,
  Accounting: Book02Icon,
  'Sales & Purchase': Invoice01Icon,
  'GST & Returns': CheckmarkBadge01Icon,
  TDS: Coins01Icon,
  TCS: ArchiveIcon,
  'Job Work & Process': Factory01Icon,
  'Payroll & HR': UserGroupIcon,
  Masters: Configuration01Icon,
  Reports: Analytics01Icon,
  'Admin · Ravi Metal Ops': Settings01Icon,
};
const GIcon = ({ group }: { group: string }) => {
  const Ic = GROUP_ICON[group] ?? DashboardCircleIcon;
  return (
    <span className="g-round">
      <Ic size={22} color="currentColor" strokeWidth={1.8} />
    </span>
  );
};
const Chev = () => (
  <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M9 6l6 6-6 6" /></svg>
);

function toggleTheme() {
  const el = document.documentElement;
  const cur = el.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  el.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
}
const openNav = () => document.body.classList.add('nav-open');
const closeNav = () => document.body.classList.remove('nav-open');

export function AppShell({
  children,
  role,
  setRole,
  crumb = 'Dashboard',
}: {
  children: ReactNode;
  role?: string;
  setRole?: (r: string) => void;
  crumb?: string;
}) {
  const pathname = usePathname();
  const roleName = role ? ROLES[role]?.name : 'Finance Controller';
  const [quick, setQuick] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(NOTIF_SEED);
  const unread = notifs.filter((n) => !n.read).length;
  const [fy, setFy] = useState('2026-27');
  const [branch, setBranch] = useState('aji-3');

  // Which group holds the active route — used as the default-open group.
  const activeGroup = NAV.find((g) => g.pages.some((p) => hrefFor(p) === pathname))?.group ?? NAV[0]!.group;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);
  const [collapsed, setCollapsed] = useState(false);

  // Restore the persisted open-group + collapsed state after mount (survives reload).
  useEffect(() => {
    const g = localStorage.getItem('fx-open-group');
    if (g !== null) setOpenGroup(g === '' ? null : g);
    setCollapsed(localStorage.getItem('fx-rail-collapsed') === '1');
  }, []);

  const toggleGroup = (group: string) => {
    setOpenGroup((cur) => {
      const next = cur === group ? null : group; // accordion: one open at a time
      localStorage.setItem('fx-open-group', next ?? '');
      return next;
    });
  };
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('fx-rail-collapsed', next ? '1' : '0');
      return next;
    });
  };

  const renderPages = (g: (typeof NAV)[number]) =>
    g.pages.map((p, i) => {
      const href = hrefFor(p);
      const hashIdx = p.indexOf('#');
      const tail = hashIdx >= 0 ? p.slice(hashIdx + 1) : '';
      const label = p.replace(/#.*/, '').trim();
      const active = pathname === href;
      return (
        <Link key={i} href={href} className={`page ${active ? 'active' : ''}`} onClick={closeNav}>
          <span className="pdot" />
          {label}
          {tail && <span className="tail red">{tail}</span>}
        </Link>
      );
    });

  return (
    <>
      <div className="scrim" onClick={closeNav} />
      <div className={`app ${collapsed ? 'rail-collapsed' : ''}`}>
        <aside className="rail">
          <div className="brand">
            <div className="logo-panel"><img src="/ravi-logo.gif" alt="RAVI Metal Treatment" style={{ width: '100%', maxWidth: 178, height: 'auto', display: 'block' }} /></div>
            <div className="brand-tag">Aji Deam Unit 3 · Rajkot · <b>Fintranact</b></div>
          </div>
          <nav className="nav">
            {NAV.map((g, gi) => {
              const isOpen = openGroup === g.group;
              return (
                <div className={`grp ${isOpen ? 'open' : ''}`} key={gi}>
                  <button className="grp-head" onClick={() => toggleGroup(g.group)} aria-expanded={isOpen} title={g.group}>
                    <GIcon group={g.group} />
                    <span className="grp-name">{g.group}</span>
                    {g.badge && <span className="count alert">{g.badge}</span>}
                    <Chev />
                  </button>
                  <div className="sub">{renderPages(g)}</div>
                  {/* Flyout shown on hover when the rail is collapsed */}
                  <div className="flyout">
                    <div className="fly-title">{g.group}{g.badge && <span className="count alert">{g.badge}</span>}</div>
                    <div className="fly-pages">{renderPages(g)}</div>
                  </div>
                </div>
              );
            })}
          </nav>
          <button className="collapse-btn" onClick={toggleCollapsed} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-label="Toggle sidebar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d={collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} /></svg>
            <span className="cb-label">Collapse</span>
          </button>
          <div className="rail-foot">
            <div className="avatar">RJ</div>
            <div className="who"><b>Rajesh J.</b><span>{roleName}</span></div>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <button className="hamb" onClick={openNav} aria-label="Menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="crumbs">Home / <b>{crumb}</b></div>
            <div className="topsel-dd branch"><Dropdown width={300} value={branch} onChange={setBranch}
              icon={<span className="dot" />}
              options={[{ value: 'aji-3', label: 'RAVI Metal Treatment · Aji Deam Unit 3', hint: 'Rajkot, Gujarat · 24AABCS1429P1Z5' }, { value: 'aji-1', label: 'RAVI Metal Treatment · Unit 1', hint: 'Rajkot, Gujarat' }]} /></div>
            <div className="topsel-dd fy"><Dropdown width={120} value={fy} onChange={setFy}
              options={[{ value: '2026-27', label: 'FY 2026–27' }, { value: '2025-26', label: 'FY 2025–26' }]} /></div>
            {setRole && (
              <div className="topsel-dd role"><Dropdown width={165} value={role} onChange={setRole}
                options={Object.entries(ROLES).map(([k, v]) => ({ value: k, label: v.name }))} /></div>
            )}
            <div className="spacer" />
            <div className="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg> Search… <kbd>⌘K</kbd></div>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button>
            <button className="icon-btn" title="Notifications" onClick={() => setNotifOpen(true)}>{unread > 0 && <span className="dot-alert num">{unread}</span>}<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg></button>
            <button className="btn btn-primary" onClick={() => setQuick(true)}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M13 2L4 13h6l-1 9 9-11h-6z" /></svg> Quick Entry</button>
          </div>

          <div className="content">{children}</div>
        </div>
      </div>
      <QuickPanel open={quick} onClose={() => setQuick(false)} />
      <NotificationDrawer open={notifOpen} onClose={() => setNotifOpen(false)} items={notifs} setItems={setNotifs} />
      <ToastHost />
    </>
  );
}
