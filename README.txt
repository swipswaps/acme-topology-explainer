ACME PROTOCOL TOPOLOGY AND MULTI-VANTAGE POINT AUDIT ENGINE
===========================================================

1. ARCHITECTURAL OVERVIEW
Dual-plane, local-first visualization and telemetry auditing suite for the Automated Certificate Management Environment (ACME) protocol (IETF RFC 8555).

Plane A (Static Edge Frontend - GitHub Pages):
React 18, Vite, Tailwind CSS, and Three.js modeling cryptographic handshakes, multi-perspective global vantage point validation (1 primary + 6 remote vantage points to mitigate BGP/DNS hijacking), and CDN edge-to-origin certificate distribution. Auto-probes http://127.0.0.1:8000/api/health and upgrades from static demonstration telemetry to live SQLite-backed persistence when the local Docker backend is running.

Plane B (Local Docker Telemetry Backend):
Python 3.12, FastAPI, and SQLite configured in Write-Ahead Logging (WAL) mode with Full-Text Search (FTS5) virtual tables and synchronous AFTER INSERT/UPDATE/DELETE triggers.

2. ACADEMIC AND PROTOCOL CITATIONS
- Barnes, R., Hoffman-Andrews, J., McCarney, D., & Kasten, J. (2019). Automatic Certificate Management Environment (ACME). IETF RFC 8555. https://datatracker.ietf.org/doc/html/rfc8555
- Laurie, B., Langley, A., & Kasper, E. (2013). Certificate Transparency. IETF RFC 6962. https://datatracker.ietf.org/doc/html/rfc6962
- Shoemaker, R. B. (2018). The TLS-ALPN-01 Challenge for ACME. IETF RFC 8737. https://datatracker.ietf.org/doc/html/rfc8737
- Birge-Lee, H., et al. (2018). Bamboozling Certificate Authorities with BGP. USENIX Security Symposium. https://www.usenix.org/conference/usenixsecurity18/presentation/birge-lee
- SQLite Consortium. Write-Ahead Logging and FTS5 Extension Documentation. https://www.sqlite.org/wal.html and https://www.sqlite.org/fts5.html
- apalrd's adventures (2026). How do free ACME certificates work, anyway? http://www.youtube.com/watch?v=7qXXcPgjueQ

3. EXECUTION
Docker Backend:
  docker compose up -d --build

Frontend Dev Server:
  cd frontend && npm install && npm run dev

Playwright UX & API Verification:
  python3 -m pytest tests/e2e_ux_audit.py -v
