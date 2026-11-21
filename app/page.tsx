import Link from "next/link";
const routes = [
  ["GET", "/api/health", "API + database status"],
  ["POST", "/api/player", "Register a Madara player"],
  ["POST", "/api/5group", "Create a Madara squad (up to five)"],
  ["GET", "/api/5group?id=GROUP_ID", "Read squad members"],
  ["POST", "/api/guild", "Create or join a Madara guild"]
];
export default function Home() {
  return <main className="shell">
    <div className="eyebrow">Private API · EU Region</div>
    <section className="hero">
      <span className="status">MADARA OWNED BACKEND</span>
      <h1>MADARA <span>FF</span> API</h1>
      <p className="lead">Private player registry and five-player squad manager, with a secure control panel for your Madara project.</p>
      <Link className="dashboard-link" href="/dashboard">Open 5 Player Control Panel <span>→</span></Link>
    </section>
    <section className="panel"><h2>Available endpoints</h2><div className="routes">{routes.map(([method,path,description])=><div className="route" key={path}><div><span className="method">{method}</span>{path}</div><small>{description}</small></div>)}</div></section>
    <section className="panel"><h2>Security</h2><p className="note">The dashboard uses a server-side session. Your API key is not stored in browser storage or exposed in dashboard requests. Configure MADARA_API_KEY and DATABASE_URL in Vercel.</p></section>
    <section className="panel"><h2>Important limitation</h2><p className="note">The dashboard creates and manages squads in the Madara database only. It does not create a real Free Fire lobby, send game invites, read official game stats or trigger emotes. Those actions require a documented and authorized Garena integration.</p></section>
    <p className="foot">Madara FF API · Private project · Independent tool, not affiliated with Garena</p>
  </main>;
}
