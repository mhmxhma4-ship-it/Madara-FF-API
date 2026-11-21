const routes = [
  ["GET", "/api/health", "Service + database status"],
  ["POST", "/api/player", "Register or update a Madara player"],
  ["GET", "/api/player?uid=123456789", "Read a registered player"],
  ["GET", "/api/stats?uid=123456789", "Madara platform activity stats"],
  ["GET", "/api/friends?uid=123456789", "List saved Madara contacts"],
  ["POST", "/api/friends", "Save a contact between registered UIDs"],
  ["POST", "/api/5group", "Create a squad of up to five players"],
  ["GET", "/api/5group?id=GROUP_ID", "Read a squad and its members"],
  ["POST", "/api/5group", "Join a squad using groupId + uid"],
  ["POST", "/api/guild", "Create a Madara community guild"],
  ["GET", "/api/guild?guildId=GUILD_ID", "Read a Madara community guild"]
];

export default function Home() {
  return <main className="shell">
    <div className="eyebrow">Private API · EU Region</div>
    <section className="hero">
      <span className="status">MADARA OWNED BACKEND</span>
      <h1>MADARA <span>FF</span> API</h1>
      <p className="lead">A private player registry, squad manager, contacts and community-guild API. Data is stored in your own PostgreSQL database. No paid Free Fire data provider is required.</p>
    </section>
    <section className="panel">
      <h2>Available endpoints</h2>
      <div className="routes">{routes.map(([method, path, description], i) => <div className="route" key={i}><div><span className="method">{method}</span>{path}</div><small>{description}</small></div>)}</div>
    </section>
    <section className="panel">
      <h2>Authentication</h2>
      <p className="note">Every API route requires the private key in the <code>x-api-key</code> header or an Authorization Bearer token. Configure <code>MADARA_API_KEY</code> and <code>DATABASE_URL</code> as server environment variables. Never expose either secret in browser code or GitHub.</p>
    </section>
    <section className="panel">
      <h2>Important limitation</h2>
      <p className="note">Player profiles, friend links, guilds, squads and activity counters in this version are Madara database records. They are not read from or written into Free Fire. Official in-game stats, friend lists, party invites and emotes require a documented and authorized Garena interface.</p>
    </section>
    <p className="foot">Madara FF API · Private project · Independent tool, not affiliated with Garena</p>
  </main>;
}
