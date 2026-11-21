const routes = [
  ["GET", "/api/health"], ["GET", "/api/player?uid=123456789&region=EU"],
  ["GET", "/api/stats?uid=123456789&region=EU"], ["GET", "/api/friends?uid=123456789&region=EU"],
  ["GET", "/api/guild?uid=123456789&region=EU"], ["POST", "/api/5group"],
  ["POST", "/api/6group"], ["POST", "/api/emote"]
];

export default function Home() {
  return <main className="shell">
    <div className="eyebrow">Private API Gateway · EU</div>
    <section className="hero">
      <span className="status">PRIVATE ACCESS</span>
      <h1>MADARA <span>FF</span> API</h1>
      <p className="lead">A private, authenticated API gateway for Free Fire-related integrations. Built with Next.js and ready for deployment on Vercel.</p>
    </section>
    <section className="panel">
      <h2>Available endpoints</h2>
      <div className="routes">{routes.map(([method, path]) => <div className="route" key={path}><span className="method">{method}</span>{path}</div>)}</div>
    </section>
    <section className="panel">
      <h2>Authentication</h2>
      <p className="note">Send your private key using the <code>x-api-key</code> header or an Authorization Bearer token. Keep the key in a server-side environment variable named <code>MADARA_API_KEY</code>. Never place it in browser code or publish it in a repository.</p>
    </section>
    <section className="panel">
      <h2>Integration status</h2>
      <p className="note">The gateway and request validation are implemented. Game actions and player data require a verified, authorized provider integration. Until one is configured, those endpoints return a clear 503 response instead of fabricated results.</p>
    </section>
    <p className="foot">Madara FF API · Private project · Not affiliated with Garena</p>
  </main>;
}