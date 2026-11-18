import React from 'react';

export default function AuditLogTable({ audits, onSelectAudit, backendOnline, onDeleteAudit }) {
  if (!audits || audits.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
        No matching ACME validation records found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900">
      <table className="w-full text-left text-sm" data-testid="audit-log-table">
        <thead className="bg-slate-800/60 text-slate-400 uppercase font-mono text-xs">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Challenge</th>
            <th className="p-3">Domain</th>
            <th className="p-3">Key Alg</th>
            <th className="p-3">Vantage Quorum</th>
            <th className="p-3">Status</th>
            <th className="p-3">Audit Notes</th>
            {backendOnline && <th className="p-3 text-right">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {audits.map((audit) => (
            <tr
              key={audit.id}
              onClick={() => onSelectAudit && onSelectAudit(audit)}
              className="hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <td className="p-3 font-mono text-slate-400">{audit.id}</td>
              <td className="p-3 font-mono font-semibold text-emerald-400">{audit.challenge_type}</td>
              <td className="p-3 font-mono text-slate-200">{audit.domain}</td>
              <td className="p-3 font-mono text-xs text-slate-300">{audit.key_algorithm}</td>
              <td className="p-3 font-mono">
                <span className={audit.vantage_points_passed >= 6 ? 'text-sky-400' : 'text-amber-400'}>
                  {audit.vantage_points_passed} / 7
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border ${audit.status === 'VALID' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'}`}>
                  {audit.status}
                </span>
              </td>
              <td className="p-3 text-xs text-slate-400 max-w-md truncate">{audit.notes}</td>
              {backendOnline && (
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAudit(audit.id);
                    }}
                    className="text-xs font-mono text-rose-400 hover:text-rose-300 px-2 py-1 rounded border border-rose-900/60 bg-rose-950/30"
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
