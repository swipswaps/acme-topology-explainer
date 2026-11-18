"""
SQLite Persistence Layer with WAL Mode and FTS5 External Content Triggers.
Citations:
  - https://www.sqlite.org/wal.html
  - https://www.sqlite.org/fts5.html#external_content_tables
"""
import os
import sqlite3
import logging

logger = logging.getLogger("acme_db")
DB_PATH = os.getenv("DATABASE_PATH", "/app/data/audit.db")

def get_db() -> sqlite3.Connection:
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db() -> None:
    conn = get_db()
    try:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                challenge_type TEXT NOT NULL CHECK(challenge_type IN ('HTTP-01', 'TLS-ALPN-01', 'DNS-01')),
                domain TEXT NOT NULL,
                ca_endpoint TEXT NOT NULL DEFAULT 'https://acme-v02.api.letsencrypt.org/directory',
                key_algorithm TEXT NOT NULL DEFAULT 'ECDSA-P256',
                vantage_points_passed INTEGER NOT NULL CHECK(vantage_points_passed >= 0 AND vantage_points_passed <= 7),
                status TEXT NOT NULL CHECK(status IN ('VALID', 'PENDING', 'INVALID', 'REVOKED')),
                notes TEXT DEFAULT ''
            );
        """)
        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS audit_fts USING fts5(
                domain, challenge_type, ca_endpoint, key_algorithm, status, notes,
                content='audit_logs', content_rowid='id'
            );
        """)
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS audit_logs_ai AFTER INSERT ON audit_logs BEGIN
                INSERT INTO audit_fts(rowid, domain, challenge_type, ca_endpoint, key_algorithm, status, notes)
                VALUES (new.id, new.domain, new.challenge_type, new.ca_endpoint, new.key_algorithm, new.status, new.notes);
            END;
        """)
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS audit_logs_ad AFTER DELETE ON audit_logs BEGIN
                INSERT INTO audit_fts(audit_fts, rowid, domain, challenge_type, ca_endpoint, key_algorithm, status, notes)
                VALUES ('delete', old.id, old.domain, old.challenge_type, old.ca_endpoint, old.key_algorithm, old.status, old.notes);
            END;
        """)
        conn.execute("""
            CREATE TRIGGER IF NOT EXISTS audit_logs_au AFTER UPDATE ON audit_logs BEGIN
                INSERT INTO audit_fts(audit_fts, rowid, domain, challenge_type, ca_endpoint, key_algorithm, status, notes)
                VALUES ('delete', old.id, old.domain, old.challenge_type, old.ca_endpoint, old.key_algorithm, old.status, old.notes);
                INSERT INTO audit_fts(rowid, domain, challenge_type, ca_endpoint, key_algorithm, status, notes)
                VALUES (new.id, new.domain, new.challenge_type, new.ca_endpoint, new.key_algorithm, new.status, new.notes);
            END;
        """)
        if conn.execute("SELECT COUNT(*) FROM audit_logs").fetchone()[0] == 0:
            seeds = [
                ("HTTP-01", "demoacme.appar.net", "https://acme-staging-v02.api.letsencrypt.org/directory", "ECDSA-P256", 7, "VALID", "RFC 8555 Sec 8.3 token served over TCP/80 across 1 primary + 6 remote vantage points"),
                ("TLS-ALPN-01", "appar.net", "https://acme-v02.api.letsencrypt.org/directory", "ECDSA-P384", 7, "VALID", "RFC 8737 acme-tls/1 ALPN extension negotiated on TCP/443 via Caddy"),
                ("DNS-01", "*.appar.net", "https://acme-v02.api.letsencrypt.org/directory", "ECDSA-P256", 7, "VALID", "RFC 8555 Sec 8.4 _acme-challenge TXT record propagated for wildcard CDN edge termination")
            ]
            conn.executemany(
                "INSERT INTO audit_logs (challenge_type, domain, ca_endpoint, key_algorithm, vantage_points_passed, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
                seeds
            )
        conn.commit()
    except Exception as exc:
        logger.error("Database initialization failed: %s", exc)
        raise
    finally:
        conn.close()
