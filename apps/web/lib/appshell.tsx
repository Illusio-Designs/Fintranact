'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
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
  { group: 'Overview', open: true, pages: ['Dashboard', 'Widgets', 'Compliance Calendar#2', 'Documents', 'Notifications'] },
  { group: 'Accounting', open: true, pages: ['Chart of Accounts', 'Ledgers & Groups', 'Vouchers', 'Day Book', 'Bank & Cash'] },
  { group: 'Sales & Purchase', pages: ['Sales Invoices', 'Purchase Bills', 'Credit / Debit Notes', 'Customers & Vendors', 'Items & Price Lists'] },
  { group: 'GST & Returns', badge: '3', pages: ['GST Invoices', 'E-Way Bills', 'GSTR-1', 'GSTR-3B', 'GSTR-2B Reconciliation'] },
  { group: 'TDS', pages: ['TDS Deductions', 'Payable / Receivable', 'Challans ITNS 281#1', 'Returns 24Q 26Q 27Q'] },
  { group: 'TCS', pages: ['TCS Collections', 'Challans', 'Return 27EQ'] },
  { group: 'Job Work & Process', pages: ['Inward Cash Debit memo', 'Outward Challans', 'Pending Inward Outward#10', 'Job Cards', 'Lien Forfeiture#1', 'ITC-04'] },
  { group: 'Payroll & HR', pages: ['Employees', 'Salary Structures', 'Attendance & Leave', 'Payroll Run#1', 'Payslips', 'Statutory PF ESI PT'] },
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
  if (clean === 'Documents') return '/import';
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

  return (
    <>
      <div className="scrim" onClick={closeNav} />
      <div className="app">
        <aside className="rail">
          <div className="brand">
            <div className="logo-panel"><img src="/ravi-logo.gif" alt="RAVI Metal Treatment" style={{ width: '100%', maxWidth: 178, height: 'auto', display: 'block' }} /></div>
            <div className="brand-tag">Aji Deam Unit 3 · Rajkot · <b>Fintranact</b></div>
          </div>
          <nav className="nav">
            {NAV.map((g, gi) => (
              <details className="grp" key={gi} open={g.open}>
                <summary>
                  <GIcon group={g.group} />
                  {g.group}
                  {g.badge && <span className="count alert">{g.badge}</span>}
                  <Chev />
                </summary>
                <div className="sub">
                  {g.pages.map((p, i) => {
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
                  })}
                </div>
              </details>
            ))}
          </nav>
          <div className="rail-foot">
            <div className="avatar">RJ</div>
            <div className="who"><b>Rajesh J.</b><span>{roleName}</span></div>
          </div>
        </aside>

        <div className="main">
          <div className="topbar">
            <button className="hamb" onClick={openNav} aria-label="Menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}><path d="M4 6h16M4 12h16M4 18h16" /></svg></button>
            <div className="crumbs">Home / <b>{crumb}</b></div>
            <button className="switcher"><span className="dot" /> RAVI Metal Treatment <span className="gstin">· Aji Deam Unit 3 · Rajkot</span> ▾</button>
            <select className="topsel fy" defaultValue="FY 2026–27"><option>FY 2026–27</option><option>FY 2025–26</option></select>
            {setRole && (
              <select className="topsel role" value={role} onChange={(e) => setRole(e.target.value)}>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
              </select>
            )}
            <div className="spacer" />
            <div className="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg> Search… <kbd>⌘K</kbd></div>
            <button className="icon-btn" onClick={toggleTheme} title="Toggle theme"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button>
            <button className="icon-btn" title="Notifications"><span className="dot-alert num">6</span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg></button>
            <button className="btn btn-primary"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}><path d="M13 2L4 13h6l-1 9 9-11h-6z" /></svg> Quick Entry</button>
          </div>

          <div className="content">{children}</div>
        </div>
      </div>
    </>
  );
}
