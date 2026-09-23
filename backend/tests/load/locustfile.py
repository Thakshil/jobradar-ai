"""
JobRadar API Load Test
======================
Models a realistic user session:

  1. Health-check  (GET /)                   - lightweight, high-weight
  2. Resume upload (POST /api/resume/upload)  - heavyweight, triggers session
  3. Job search    (GET /api/jobs/search)     - core feature, most critical
  4. Excel export  (GET /api/jobs/export)     - downstream of search

Task weights reflect real usage patterns:
  health_check   -> 10 %
  upload_resume  -> 20 %
  search_jobs    -> 55 %
  export_excel   -> 15 %

Environment variables
---------------------
  JOBRADAR_HOST     Base URL  (default: http://127.0.0.1:8000)
  JOBRADAR_LOCATION Location for job searches (default: India)
  JOBRADAR_REMOTE   "true" to force remote-only (default: false)
"""

import os
import io
import random
from locust import HttpUser, task, between, events

# -- Configuration ------------------------------------------------------------
HOST     = os.getenv("JOBRADAR_HOST", "http://127.0.0.1:8000")
LOCATION = os.getenv("JOBRADAR_LOCATION", "India")
REMOTE   = os.getenv("JOBRADAR_REMOTE", "false").lower() == "true"

# -- Minimal synthetic resume PDF (valid, parseable by pdfplumber) -----------
MINIMAL_RESUME_PDF = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj
4 0 obj<</Length 420>>
stream
BT
/F1 12 Tf
50 750 Td
(Taksh Sharma) Tj
0 -20 Td
(taksh@example.com  |  +91-9876543210) Tj
0 -20 Td
(Software Engineer  |  Python Developer) Tj
0 -30 Td
(SKILLS) Tj
0 -20 Td
(Python, JavaScript, React, FastAPI, Docker, PostgreSQL, AWS, Git, REST API) Tj
0 -20 Td
(Machine Learning, Pandas, NumPy, scikit-learn, TensorFlow, SQL, Linux) Tj
0 -30 Td
(EXPERIENCE) Tj
0 -20 Td
(3 years of experience as a Software Engineer) Tj
0 -20 Td
(Backend development with Python and FastAPI) Tj
0 -20 Td
(CI/CD, Agile, Scrum, Docker, Kubernetes) Tj
ET
endstream
endobj
5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000737 00000 n
trailer<</Size 6/Root 1 0 R>>
startxref
820
%%EOF"""


class JobRadarUser(HttpUser):
    """Simulates a realistic JobRadar user session."""

    host = HOST
    wait_time = between(1, 3)

    session_id: str = None

    def on_start(self):
        self._do_resume_upload(silent=True)

    @task(10)
    def health_check(self):
        """GET / -- Lightweight liveness, weight 10%"""
        with self.client.get(
            "/",
            name="Health Check [GET /]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Unexpected status {resp.status_code}")

    @task(20)
    def upload_resume(self):
        """POST /api/resume/upload -- weight 20%"""
        self._do_resume_upload(silent=False)

    @task(55)
    def search_jobs(self):
        """GET /api/jobs/search -- Core endpoint, weight 55%"""
        if not self.session_id:
            self._do_resume_upload(silent=True)
            if not self.session_id:
                return

        params = {
            "session_id":  self.session_id,
            "location":    LOCATION,
            "remote_only": str(REMOTE).lower(),
            "page":        1,
            "page_size":   20,
        }
        if random.random() < 0.3:
            params["remote_only"] = "true"
        if random.random() < 0.2:
            params["page"] = random.randint(2, 3)

        with self.client.get(
            "/api/jobs/search",
            params=params,
            name="Job Search [GET /api/jobs/search]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                if "jobs" in data:
                    resp.success()
                else:
                    resp.failure("Response missing 'jobs' key")
            elif resp.status_code == 404:
                resp.failure("Session not found -- regenerating")
                self.session_id = None
                self._do_resume_upload(silent=True)
            else:
                resp.failure(f"Unexpected status {resp.status_code}: {resp.text[:200]}")

    @task(15)
    def export_excel(self):
        """GET /api/jobs/export -- weight 15%"""
        if not self.session_id:
            return

        with self.client.get(
            "/api/jobs/export",
            params={"session_id": self.session_id},
            name="Excel Export [GET /api/jobs/export]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                ct = resp.headers.get("content-type", "")
                if "spreadsheet" in ct or "octet-stream" in ct or len(resp.content) > 100:
                    resp.success()
                else:
                    resp.failure(f"Unexpected content-type: {ct}")
            elif resp.status_code == 404:
                resp.failure("Session not found for export")
                self.session_id = None
            else:
                resp.failure(f"Unexpected status {resp.status_code}")

    def _do_resume_upload(self, silent: bool = False):
        files = {
            "file": ("resume.pdf", io.BytesIO(MINIMAL_RESUME_PDF), "application/pdf")
        }
        with self.client.post(
            "/api/resume/upload",
            files=files,
            name="Resume Upload [POST /api/resume/upload]",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                sid = data.get("session_id")
                if sid:
                    self.session_id = sid
                    resp.success()
                else:
                    resp.failure("No session_id in upload response")
            else:
                resp.failure(f"Upload failed: {resp.status_code} -- {resp.text[:200]}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print(f"\n[JobRadar Load Test] Starting against: {environment.host}")
    print(f"[JobRadar Load Test] Location filter: {LOCATION}")
    print(f"[JobRadar Load Test] Remote only:     {REMOTE}")
    print("[JobRadar Load Test] Task weights:")
    print("  health_check   10%")
    print("  upload_resume  20%")
    print("  search_jobs    55%")
    print("  export_excel   15%")
    print()
