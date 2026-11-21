"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";

type Player = { uid: string; nickname: string; region: string };
type Member = { uid: string; nickname: string; role: string };
type Group = { id: string; name: string; status: string; members: Member[] };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...options?.headers }, cache: "no-store" });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || "Kerkesa deshtoi");
  return data as T;
}

export default function Dashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [uid, setUid] = useState("");
  const [nickname, setNickname] = useState("");
  const [groupName, setGroupName] = useState("Madara Squad");
  const [uids, setUids] = useState(["", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [p, g] = await Promise.all([
      request<{ players: Player[] }>("/api/dashboard/players"),
      request<{ groups: Group[] }>("/api/dashboard/groups")
    ]);
    setPlayers(p.players);
    setGroups(g.groups);
  }, []);

  useEffect(() => {
    request("/api/dashboard/players").then(async () => {
      setAuthenticated(true);
      await load();
    }).catch(() => undefined);
  }, [load]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await request("/api/dashboard/auth", { method: "POST", body: JSON.stringify({ password }) });
      setAuthenticated(true); setPassword("");
      try { await load(); } catch (error) { setMessage(error instanceof Error ? error.message : "Database error"); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Hyrja deshtoi"); }
    finally { setBusy(false); }
  }

  async function addPlayer(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      await request("/api/dashboard/players", { method: "POST", body: JSON.stringify({ uid, nickname }) });
      setUid(""); setNickname(""); await load(); setMessage("Lojtari u regjistrua.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gabim"); }
    finally { setBusy(false); }
  }

  async function createGroup(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await request<{ group: { id: string } }>("/api/dashboard/groups", {
        method: "POST", body: JSON.stringify({ name: groupName, leaderUid: uids[0], members: uids.slice(1) })
      });
      setUids(["", "", "", "", ""]); await load();
      setMessage("Grupi u krijua ne Madara. ID: " + result.group.id + " (jo lobby ne Free Fire).");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gabim"); }
    finally { setBusy(false); }
  }

  async function logout() {
    await request("/api/dashboard/logout", { method: "POST" });
    setAuthenticated(false); setPlayers([]); setGroups([]);
  }

  if (!authenticated) return <main className="dash-shell"><section className="login-card">
    <div className="brand-mark">M</div><p className="dash-kicker">MADARA FF / PRIVATE ACCESS</p><h1>Control Panel</h1>
    <p className="muted">Hyr me MADARA_API_KEY qe ke vendosur ne Vercel. Celesi dergohet vetem te serveri yt dhe nuk ruhet ne browser.</p>
    <form onSubmit={login} className="stack"><label>API key<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required /></label><button disabled={busy}>{busy ? "Duke u lidhur..." : "Hyr ne panel"}</button></form>
    {message && <p className="notice">{message}</p>}
  </section></main>;

  return <main className="dash-shell">
    <header className="dash-header"><div><p className="dash-kicker">MADARA FF / EUROPE</p><h1>5 Player Bot</h1><p className="muted">Menaxhim UID-sh dhe skuadrash ne Madara.</p></div><button className="secondary" onClick={logout}>Dil</button></header>
    <div className="stats-row"><div className="stat"><span>Players</span><strong>{players.length}</strong></div><div className="stat"><span>Squads</span><strong>{groups.length}</strong></div><div className="stat"><span>Squad size</span><strong>5</strong></div></div>
    <section className="dash-card"><div className="section-head"><div><p className="dash-kicker">PLAYER REGISTRY</p><h2>Regjistro lojtar</h2></div><span className="pill">EU</span></div>
      <form onSubmit={addPlayer} className="form-grid"><label>Free Fire UID<input inputMode="numeric" value={uid} onChange={e=>setUid(e.target.value.replace(/\D/g,""))} placeholder="123456789" required /></label><label>Nickname<input value={nickname} onChange={e=>setNickname(e.target.value)} maxLength={32} placeholder="Player name" required /></label><button disabled={busy}>Shto lojtar</button></form>
      <div className="player-list">{players.map(p=><div className="player-row" key={p.uid}><span className="avatar">{p.nickname.slice(0,1).toUpperCase()}</span><div><strong>{p.nickname}</strong><small>UID: {p.uid}</small></div><span className="region">{p.region}</span></div>)}{players.length===0&&<p className="muted">Nuk ka lojtare te regjistruar.</p>}</div>
    </section>
    <section className="dash-card"><div className="section-head"><div><p className="dash-kicker">SQUAD BUILDER</p><h2>Create 5 Player Group</h2></div><span className="pill">5 / 5</span></div>
      <form onSubmit={createGroup} className="stack"><label>Emri i grupit<input value={groupName} onChange={e=>setGroupName(e.target.value)} maxLength={40} required /></label>
        <div className="uid-grid">{uids.map((value,index)=><label key={index}>{index===0?"Lider UID":"Player "+(index+1)+" UID"}<input inputMode="numeric" value={value} onChange={e=>setUids(old=>old.map((v,i)=>i===index?e.target.value.replace(/\D/g,""):v))} placeholder="UID" required /></label>)}</div>
        <button disabled={busy}>{busy?"Duke krijuar...":"CREATE 5 PLAYER GROUP"}</button>
      </form>
      <p className="warning-note">Ky buton krijon skuadren ne databazen Madara. Nuk fut lojtaret ne lobby te Free Fire.</p>
    </section>
    <section className="dash-card"><div className="section-head"><div><p className="dash-kicker">RECENT SQUADS</p><h2>Grupet e krijuara</h2></div><button className="secondary small" onClick={()=>load()}>Rifresko</button></div>
      {groups.map(g=><article className="group-row" key={g.id}><div className="group-top"><strong>{g.name}</strong><span className="pill">{g.members.length}/5</span></div><small>{g.id}</small><div className="member-chips">{g.members.map(m=><span key={m.uid}>{m.nickname}</span>)}</div></article>)}{groups.length===0&&<p className="muted">Ende nuk ka grupe.</p>}
    </section>
    {message&&<p className="notice">{message}</p>}
    <footer className="dash-footer">MADARA FF · Private project · Independent from Garena</footer>
  </main>;
}
