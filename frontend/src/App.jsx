import React, { useState, useEffect, useCallback } from 'react';
import AcmeScene3D from './components/AcmeScene3D.jsx';
import AuditLogTable from './components/AuditLogTable.jsx';

const API_BASE = 'http://127.0.0.1:8000';

const STATIC_FALLBACK_AUDITS = [
  { id: 1, timestamp: '2026-11-18 03:41:00', challenge_type: 'HTTP-01', domain: 'demoacme.appar.net', key_algorithm: 'ECDSA-P256', vantage_points_passed: 7, status: 'VALID', notes: 'RFC 8555 Sec 8.3 token served over TCP/80 across 1 primary + 6 remote vantage points' },
  { id: 2, timestamp: '2026-11-18 03:39:12', challenge_type: 'TLS-ALPN-01', domain: 'appar.net', key_algorithm: 'ECDSA-P384', vantage_points_passed: 7, status: 'VALID', notes: 'RFC 8737 acme-tls/1 ALPN extension negotiated on TCP/443 via Caddy' },
  { id: 3, timestamp: '2026-11-18 03:30:00', challenge_type: 'DNS-01', domain: '*.appar.net', key_algorithm: 'ECDSA-P256', vantage_points_passed: 7, status: 'VALID', notes: 'RFC 8555 Sec 8.4 _acme-challenge TXT record propagated for wildcard CDN edge termination' }
];

export default function App() {
  const [audits, setAudits] = useState(STATIC_FALLBACK_AUDITS);
  const [backendOnline, setBackendOnline] = useState(false);
  const [backendBanner, setBackendBanner] = useState('Probing local Docker SQLite backend...');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState('HTTP-01');
  const [selectedQuorum, setSelectedQuorum] = useState(7);

  const [domainInput, setDomainInput] = useState('edge-node-01.example.net');
  const [challengeInput, setChallengeInput] = useState('TLS-ALPN-01');
  const [quorumInput, setQuorumInput] = useState(7);
  const [notesInput, setNotesInput] = useState('Automated multi-vantage verification check');

  const fetchAudits = useCallback(async (query = '') => {
    try {
      const healthRes = await fetch(`${API_BASE}/api/health`);
      if (!healthRes.ok) throw new Error();
      const healthData = await healthRes.json();
      setBackendOnline(true);
      setBackendBanner(`Docker Backend Detected | SQLite (${healthData.journal_mode.toUpperCase()} + FTS5)`);

      const url = query.trim() ? `${API_BASE}/api/audits?q=${encodeURIComponent(query.trim())}` : `${API_BASE}/api/audits`;
      const listRes = await fetch(url);
      if (listRes.ok) setAudits(await listRes.json());
    } catch (_err) {
      setBackendOnline(false);
      setBackendBanner('Static GitHub Pages Mode (Start Docker Compose on :8000 for SQLite WAL + FTS5)');
      if (query.trim()) {
        const lower = query.toLowerCase();
        setAudits(STATIC_FALLBACK_AUDITS.filter((item) => item.domain.toLowerCase().includes(lower) || item.challenge_type.toLowerCase().includes(lower) || item.notes.toLowerCase().includes(lower)));
      } else {
        setAudits(STATIC_FALLBACK_AUDITS);
      }
    }
  }, []);

  useEffect(() => { fetchAudits(); }, [fetchAudits]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchAudits(val);
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!backendOnline) return;
    const res = await fetch(`${API_BASE}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challenge_type: challengeInput,
        domain: domainInput,
        key_algorithm: 'ECDSA-P256',
        vantage_points_passed: Number(quorumInput),
        status: Number(quorumInput) >= 6 ? 'VALID' : 'INVALID',
        notes: notesInput
      })
    });
    if (res.ok) {
      setSelectedChallenge(challengeInput);
      setSelectedQuorum(Number(quorumInput));
      fetchAudits(searchQuery);
    }
  };

  const handleDeleteAudit = async (id) => {
    if (!backendOnline) return;
    const res = await fetch(`${API_BASE}/api/audit/${id}`, { method: 'DELETE' });
    if (res.ok) fetchAudits(searchQuery);
  };

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto flex flex-col gap-8">
      <header className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-emerald-400">
            ACME Protocol & Multi-Vantage Point Auditor
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            IETF RFC 8555, RFC 6962 Certificate Transparency, and Multi-Perspective BGP Hijack Mitigation
          </p>
        </div>
        <div data-testid="backend-status-badge" className={`text-xs font-mono px-3 py-2 rounded border ${backendOnline ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-slate-900 border-slate-700 text-amber-300'}`}>
          {backendBanner}
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="flex flex-col justify-between gap-4 bg-slate-900/60 border border-slate-800 p-6 rounded-xl">
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-slate-100">Cryptographic & Validation Mechanics</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Modern TLS session confidentiality relies on ephemeral Elliptic Curve Diffie-Hellman (ECDHE) key exchange for Perfect Forward Secrecy (PFS), whereas X.509 certificates provide cryptographic server authentication. Let&apos;s Encrypt validates domain control from 1 primary datacenter and 6 remote global vantage points to defeat localized BGP prefix hijacks.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              {['HTTP-01', 'TLS-ALPN-01', 'DNS-01'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedChallenge(mode)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${selectedChallenge === mode ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'}`}
                >
                  Simulate {mode}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 text-xs text-slate-400 space-y-1 font-mono">
            <div>[1] IETF RFC 8555: <a href="https://datatracker.ietf.org/doc/html/rfc8555" target="_blank" rel="noreferrer" className="text-sky-400 underline">datatracker.ietf.org/doc/html/rfc8555</a></div>
            <div>[2] USENIX Security (BGP Hijack Mitigation): <a href="https://www.usenix.org/conference/usenixsecurity18/presentation/birge-lee" target="_blank" rel="noreferrer" className="text-sky-400 underline">usenix.org/conference/usenixsecurity18</a></div>
          </div>
        </div>
        <div className="h-[380px] w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
          <AcmeScene3D activeChallenge={selectedChallenge} vantagePassed={selectedQuorum} />
        </div>
      </section>

      {backendOnline && (
        <section className="bg-slate-900 border border-emerald-800/60 rounded-xl p-5" data-testid="docker-write-panel">
          <h2 className="text-sm font-mono uppercase tracking-wider text-emerald-400 mb-3">
            Live SQLite WAL + FTS5 Audit Ingestion (Docker Backend Active)
          </h2>
          <form onSubmit={handleCreateAudit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <select value={challengeInput} onChange={(e) => setChallengeInput(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-100">
              <option value="HTTP-01">HTTP-01</option>
              <option value="TLS-ALPN-01">TLS-ALPN-01</option>
              <option value="DNS-01">DNS-01</option>
            </select>
            <input type="text" required value={domainInput} onChange={(e) => setDomainInput(e.target.value)} placeholder="Domain" className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-100" />
            <input type="number" min="0" max="7" required value={quorumInput} onChange={(e) => setQuorumInput(e.target.value)} className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-100" />
            <input type="text" value={notesInput} onChange={(e) => setNotesInput(e.target.value)} placeholder="Notes" className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100" />
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded px-4 py-2 text-sm transition-colors">Commit to SQLite</button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h2 className="text-xl font-semibold text-slate-200">Validation Telemetry & FTS5 Audit Ledger</h2>
          <input type="search" value={searchQuery} onChange={handleSearchChange} placeholder="Search records..." data-testid="audit-search-input" className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 w-full sm:w-80" />
        </div>
        <AuditLogTable audits={audits} backendOnline={backendOnline} onDeleteAudit={handleDeleteAudit} onSelectAudit={(row) => { setSelectedChallenge(row.challenge_type); setSelectedQuorum(row.vantage_points_passed); }} />
      </section>
    </div>
  );
}
