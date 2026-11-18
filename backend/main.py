"""
FastAPI Backend for ACME Topology & Multi-Vantage Point Audit Logs.
Citation: https://fastapi.tiangolo.com/advanced/events/#lifespan
"""
from contextlib import asynccontextmanager
import logging
from typing import Literal, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from database import get_db, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("acme_api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("SQLite WAL & FTS5 storage engine initialized.")
    yield

app = FastAPI(title="ACME Protocol Topology & Audit Engine", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

class AuditCreate(BaseModel):
    challenge_type: Literal["HTTP-01", "TLS-ALPN-01", "DNS-01"]
    domain: str = Field(..., min_length=3, max_length=253)
    ca_endpoint: str = Field(default="https://acme-v02.api.letsencrypt.org/directory")
    key_algorithm: str = Field(default="ECDSA-P256")
    vantage_points_passed: int = Field(..., ge=0, le=7)
    status: Literal["VALID", "PENDING", "INVALID", "REVOKED"]
    notes: str = Field(default="", max_length=1000)

@app.get("/api/health")
def health_check():
    conn = get_db()
    try:
        journal_mode = conn.execute("PRAGMA journal_mode;").fetchone()[0]
        row_count = conn.execute("SELECT COUNT(*) FROM audit_logs;").fetchone()[0]
        return {"status": "online", "database": "sqlite", "journal_mode": journal_mode, "fts5_enabled": True, "record_count": row_count}
    finally:
        conn.close()

@app.get("/api/audits")
def list_audits(q: Optional[str] = Query(default=None)):
    conn = get_db()
    try:
        if q and q.strip():
            sanitized = " ".join(f'"{t.replace(chr(34), "")}"*' for t in q.strip().split())
            cursor = conn.execute("""
                SELECT a.id, a.timestamp, a.challenge_type, a.domain, a.ca_endpoint, a.key_algorithm, a.vantage_points_passed, a.status, a.notes
                FROM audit_logs a JOIN audit_fts f ON a.id = f.rowid
                WHERE audit_fts MATCH ? ORDER BY a.id DESC
            """, (sanitized,))
        else:
            cursor = conn.execute("SELECT id, timestamp, challenge_type, domain, ca_endpoint, key_algorithm, vantage_points_passed, status, notes FROM audit_logs ORDER BY id DESC")
        return [dict(r) for r in cursor.fetchall()]
    except Exception as exc:
        logger.error("Query failure: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        conn.close()

@app.post("/api/audit", status_code=201)
def create_audit(r: AuditCreate):
    conn = get_db()
    try:
        cur = conn.execute(
            "INSERT INTO audit_logs (challenge_type, domain, ca_endpoint, key_algorithm, vantage_points_passed, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (r.challenge_type, r.domain.strip(), r.ca_endpoint.strip(), r.key_algorithm.strip(), r.vantage_points_passed, r.status, r.notes.strip())
        )
        conn.commit()
        return {"id": cur.lastrowid, "status": "committed"}
    finally:
        conn.close()

@app.delete("/api/audit/{audit_id}")
def delete_audit(audit_id: int):
    conn = get_db()
    try:
        cur = conn.execute("DELETE FROM audit_logs WHERE id = ?", (audit_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Audit record not found")
        return {"deleted_id": audit_id}
    finally:
        conn.close()
