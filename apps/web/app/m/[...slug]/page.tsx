import { ModuleScreen } from '../../../lib/modulescreen';

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
  return <ModuleScreen title={title} slug={key} readyNote={READY[key]} />;
}
