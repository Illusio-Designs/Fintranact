import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '80px auto', padding: 24 }}>
      <div
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: 40,
          height: 40,
          borderRadius: 10,
          background: '#C8102E',
          color: '#fff',
          fontWeight: 900,
          fontSize: 22,
        }}
      >
        F
      </div>
      <h1 style={{ marginTop: 16, letterSpacing: '-0.02em' }}>
        Fintr<span style={{ color: '#C8102E' }}>a</span>nact
      </h1>
      <p style={{ color: '#5C5A5E' }}>
        Indian accounting · GST/TDS/TCS · job-work · payroll — for RAVI Metal Treatment.
      </p>
      <Link
        href="/login"
        style={{
          display: 'inline-block',
          marginTop: 12,
          background: '#C8102E',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 8,
          textDecoration: 'none',
          fontWeight: 600,
        }}
      >
        Sign in
      </Link>
    </main>
  );
}
