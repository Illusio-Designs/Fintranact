import type { ReactNode } from 'react';
import { Factory01Icon, Coins01Icon, UserGroupIcon, Analytics01Icon, Invoice01Icon, Settings01Icon } from 'hugeicons-react';
import { AppShell } from '../../lib/appshell';

/** @fintranact/ui — shared component library / design system reference. */

function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-head"><div><h3>{title}</h3>{sub && <div className="csub">{sub}</div>}</div></div>
      <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>{children}</div>
    </div>
  );
}
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700, color: 'var(--text-3)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

const swatches: [string, string][] = [
  ['Ink', 'var(--ink)'], ['Red', 'var(--red)'], ['Red press', 'var(--red-press)'],
  ['Paper', 'var(--paper)'], ['Surface', 'var(--paper-2)'], ['Line', 'var(--line)'],
  ['Good', 'var(--good)'], ['Warn', 'var(--warn)'], ['Red tint', 'var(--red-tint)'],
];

export default function UILibrary() {
  return (
    <AppShell crumb="UI Library">
      <div className="page-head">
        <div>
          <div className="eyebrow">Design system · @fintranact/ui</div>
          <h1 className="display">UI Library</h1>
          <p>The shared component kit powering web + Windows desktop + admin. One source of truth for buttons, forms, cards, tiles, pills and tokens.</p>
        </div>
      </div>

      <Section title="Design tokens" sub="Colours are CSS variables, theme-aware (light / dark).">
        {swatches.map(([name, v]) => (
          <div key={name} style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 48, borderRadius: 10, background: v, border: '1px solid var(--line)' }} />
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 5 }}>{name}</div>
          </div>
        ))}
      </Section>

      <Section title="Typography">
        <Row label="Display"><h1 className="display" style={{ margin: 0 }}>Good evening, Rajesh</h1></Row>
        <Row label="Body"><p style={{ margin: 0, color: 'var(--text-2)' }}>Regular body text — 65ch measure.</p></Row>
        <Row label="Eyebrow"><span className="eyebrow">FY 2026–27 · Q2</span></Row>
        <Row label="Tabular nums"><span className="num" style={{ fontSize: 18 }}>₹1,42,00,000.00</span></Row>
      </Section>

      <Section title="Buttons">
        <Row label="Primary / ghost"><button className="btn btn-primary">Quick Entry</button><button className="btn btn-ghost">Export</button></Row>
        <Row label="Icon"><button className="icon-btn"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg></button></Row>
        <Row label="Mini (row actions)"><button className="mini">Reject</button><button className="mini go">Approve</button></Row>
      </Section>

      <Section title="Form controls">
        <Row label="Input"><input className="ctl" placeholder="Party name" style={{ width: 180 }} /></Row>
        <Row label="Select"><select className="ctl" style={{ width: 180 }}><option>Customer</option><option>Supplier</option></select></Row>
        <Row label="Search"><div className="search" style={{ width: 220 }}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg> Search… <kbd>⌘K</kbd></div></Row>
        <Row label="Segmented"><div className="seg"><button className="on">All</button><button>Sales</button><button>Purchase</button></div></Row>
        <Row label="Toggle"><div className="toggle2"><button className="on">Debit</button><button>Cash</button></div></Row>
      </Section>

      <Section title="Pills, tags & badges">
        <Row label="Status pills"><span className="pill crit">4 days</span><span className="pill warn">11 days</span><span className="pill ok">Ready</span><span className="pill neut">Draft</span></Row>
        <Row label="Tags"><span className="tag">Sales · IRN ✓</span><span className="tag">TDS 194C</span></Row>
        <Row label="Count badge"><span className="count alert">3</span></Row>
      </Section>

      <Section title="Round icons (Hugeicons)">
        {[Factory01Icon, Coins01Icon, UserGroupIcon, Analytics01Icon, Invoice01Icon, Settings01Icon].map((Ic, i) => (
          <span key={i} style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'var(--paper)', border: '1px solid var(--line)', color: 'var(--text)' }}>
            <Ic size={22} color="currentColor" strokeWidth={1.8} />
          </span>
        ))}
      </Section>

      <div className="dash">
        <div style={{ gridColumn: '1 / -1' }}>
          <span className="eyebrow">Composite components</span>
        </div>

        {/* KPI tiles */}
        <div className="tile"><div className="label">Cash &amp; Bank</div><div className="value num">₹84.62 L</div><div className="delta up">▲ 6.4% vs last month</div></div>
        <div className="tile accent"><div className="label">GST Liability · Jun</div><div className="value num">₹9.18 L</div><div className="delta down">Net payable ₹6.4L</div></div>

        {/* Card with KV */}
        <div className="card span-2">
          <div className="card-head"><h3>Card + key-value rows</h3><span className="pill ok" style={{ marginLeft: 'auto' }}>GP 45.2%</span></div>
          <div className="card-body">
            <div className="kv"><span className="k">Process charges</span><span className="v">₹38,60,000</span></div>
            <div className="kv"><span className="k">GST @ 18%</span><span className="v">₹6,94,800</span></div>
            <div className="kv"><span className="k" style={{ fontWeight: 700 }}>Total</span><span className="v" style={{ fontSize: 15 }}>₹45,54,800</span></div>
          </div>
        </div>

        {/* Table */}
        <div className="card span-2">
          <div className="card-head"><h3>Data table</h3></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Voucher</th><th>Party</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
              <tbody>
                <tr><td className="vno">SI/26-27/0482</td><td className="party">Mahalaxmi Traders</td><td className="amt">₹2,48,600</td></tr>
                <tr><td className="vno">PB/26-27/0311</td><td className="party">Gujarat Poly Pvt Ltd</td><td className="amt">₹1,12,000</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
