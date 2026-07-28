import 'dotenv/config';

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  db: {
    host: req('DB_HOST', '127.0.0.1'),
    port: Number(process.env.DB_PORT ?? 3306),
    user: req('DB_USER', 'fintranact'),
    password: req('DB_PASSWORD', ''),
    database: req('DB_NAME', 'fintranact'),
  },
  jwt: {
    secret: req('JWT_SECRET', 'dev-insecure-secret-change-me'),
    expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 900),
  },
  /** Passphrase for app-level field encryption (PAN/Aadhaar/bank/salary). */
  fieldKey: process.env.FIELD_ENCRYPTION_KEY ?? 'dev-insecure-field-key-change-me',
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  /**
   * External integrations. Each defaults to 'sandbox' (deterministic, no network)
   * so the app works out of the box; set mode=live + credentials to hit the real
   * IRP (e-invoice), NIC (e-way) and Meta Cloud API (WhatsApp).
   */
  integrations: {
    // GSP is Whitebooks (whitebooks.in) — one credential set drives e-invoice + e-way.
    gsp: {
      provider: process.env.GSP_PROVIDER ?? 'whitebooks',
      baseUrl: process.env.GSP_BASE_URL ?? 'https://api.whitebooks.in',
      email: process.env.GSP_EMAIL ?? '',
      username: process.env.GSP_USERNAME ?? '',
      password: process.env.GSP_PASSWORD ?? '',
      clientId: process.env.GSP_CLIENT_ID ?? '',
      clientSecret: process.env.GSP_CLIENT_SECRET ?? '',
      gstin: process.env.GSP_GSTIN ?? '',
    },
    einvoice: {
      mode: process.env.EINVOICE_MODE ?? 'sandbox', // 'sandbox' | 'live'
      apiUrl: process.env.EINVOICE_API_URL ?? '',    // GSP/IRP endpoint (falls back to gsp.baseUrl)
      apiKey: process.env.EINVOICE_API_KEY ?? '',
    },
    eway: {
      mode: process.env.EWAY_MODE ?? 'sandbox',
      apiUrl: process.env.EWAY_API_URL ?? '',
      apiKey: process.env.EWAY_API_KEY ?? '',
    },
    whatsapp: {
      mode: process.env.WHATSAPP_MODE ?? 'sandbox',
      apiUrl: process.env.WHATSAPP_API_URL ?? 'https://graph.facebook.com/v20.0',
      token: process.env.WHATSAPP_TOKEN ?? '',
      phoneId: process.env.WHATSAPP_PHONE_ID ?? '',
    },
  },
} as const;

export const isProd = config.env === 'production';
