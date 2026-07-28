import { AppShell } from '../../../lib/appshell';

function titleFromSlug(parts: string[]): string {
  const last = parts[parts.length - 1] ?? '';
  return last
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');
}

/** Notes for modules whose backend endpoints already exist. */
const READY: Record<string, string> = {
  'ledgers-groups': 'Backed by GET/POST /api/v1/ledgers — create, list, blacklist.',
  vouchers: 'Backed by POST /api/v1/vouchers — balanced double-entry engine.',
  'sales-invoices': 'Backed by POST /api/v1/invoices/sales — auto-composes the GST voucher.',
};

export default function ModulePage({ params }: { params: { slug: string[] } }) {
  const title = titleFromSlug(params.slug);
  const key = params.slug[params.slug.length - 1] ?? '';
  const ready = READY[key];

  return (
    <AppShell crumb={title}>
      <div className="page-head">
        <div>
          <div className="eyebrow">Module</div>
          <h1 className="display">{title}</h1>
          <p>{ready ? 'This module’s API is live — the screen is being built.' : 'Screen coming online. Use the sidebar to move between modules.'}</p>
        </div>
      </div>

      <section className="dash">
        <div className="card span-2">
          <div className="card-head"><h3>{title}</h3><span className="pill neut" style={{ marginLeft: 'auto' }}>{ready ? 'API ready' : 'In build'}</span></div>
          <div className="card-body">
            <p style={{ margin: 0, color: 'var(--text-2)', fontSize: 13.5 }}>
              {ready ?? 'The data model, permissions and audit trail are in place; the UI for this module is on the roadmap (PRD §16).'}
            </p>
            {ready && (
              <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-3)' }}>
                In this demo the backend runs separately; the dashboard and Import screens are wired end-to-end.
              </p>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
