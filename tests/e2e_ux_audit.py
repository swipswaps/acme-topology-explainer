import logging
import os
import subprocess
import time
import urllib.request

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ux_audit")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://127.0.0.1:4173")

def wait_for_server(url, timeout=10):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False

def test_components_and_ux():
    preview_proc = subprocess.Popen(
        ["npm", "run", "preview", "--", "--host", "127.0.0.1", "--port", "4173"],
        cwd=os.path.join(os.path.dirname(__file__), "..", "frontend"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    if not wait_for_server(FRONTEND_URL, timeout=10):
        preview_proc.terminate()
        raise RuntimeError(f"Vite preview server failed to start at {FRONTEND_URL}")

    try:
        with urllib.request.urlopen(FRONTEND_URL, timeout=10) as resp:
            html = resp.read().decode("utf-8")
            assert resp.status == 200
            assert "ACME Protocol" in html
            logger.info("[HTTP_PASS] Vite preview server verified on %s", FRONTEND_URL)

        try:
            from playwright.sync_api import sync_playwright, expect
            console_errors = []
            page_errors = []
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(viewport={"width": 1440, "height": 900})
                page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
                page.on("pageerror", lambda e: page_errors.append(str(e)))
                page.goto(FRONTEND_URL, wait_until="networkidle", timeout=15000)
                expect(page.locator("h1")).to_contain_text("ACME Protocol & Multi-Vantage Point Auditor")
                expect(page.locator("canvas")).to_be_visible()
                page.get_by_role("button", name="Simulate DNS-01").click()
                expect(page.locator("[data-testid='threejs-canvas-container']").locator("..")).to_contain_text("DNS-01")
                expect(page.locator("[data-testid='audit-log-table']")).to_be_visible()
                assert len(page_errors) == 0, f"Page errors: {page_errors}"
                assert len(console_errors) == 0, f"Console errors: {console_errors}"
                logger.info("[PLAYWRIGHT_PASS] All component assertions passed.")
                browser.close()
        except ImportError:
            logger.warning("Playwright not installed; HTTP preview check succeeded.")
    finally:
        preview_proc.terminate()
        preview_proc.wait(timeout=5)

if __name__ == "__main__":
    test_components_and_ux()