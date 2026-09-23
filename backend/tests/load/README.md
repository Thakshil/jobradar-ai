# JobRadar Load Testing — Locust

Performance and load-testing setup for the **JobRadar AI** FastAPI backend.

---

## Project Audit Summary

| Item | Value |
|---|---|
| FastAPI entry point | `backend/main.py` |
| Startup command | `uvicorn main:app --host 0.0.0.0 --port 8000` |
| Base URL | `http://127.0.0.1:8000` |
| Database | None — in-memory session store (`sessions = {}`) |
| Authentication | None — session-based via `session_id` query param |
| Python version | 3.12.4 (Anaconda) |
| Dependency file | `backend/requirements.txt` |

### Endpoints Under Test

| Method | Path | Description | Weight |
|---|---|---|---|
| GET | `/` | Health check / liveness | 10% |
| POST | `/api/resume/upload` | Upload PDF/DOCX resume; returns `session_id` | 20% |
| GET | `/api/jobs/search` | Search + rank jobs (Adzuna, Remotive, Jobicy) | 55% |
| GET | `/api/jobs/export` | Export matched jobs as Excel | 15% |

---

## Installation

```bash
# From the backend/ directory
pip install locust
```

Verify:
```bash
python -m locust --version
# Expected: locust 2.46.6 ...
```

---

## Step 1 — Start FastAPI

```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Verify the server is up:
```bash
curl http://127.0.0.1:8000/
# {"message":"JobRadar AI running","adzuna_loaded":true}
```

---

## Step 2 — Start Locust Web UI

Open a **second terminal** from the `backend/` directory:

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000
```

Then open http://localhost:8089 in your browser to access the Locust dashboard.

---

## Test Level Commands

### Baseline — 10 users

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 10 -r 2 -t 60s --csv=results/jobradar_10_users
```

### Normal load — 50 users

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 50 -r 5 -t 120s --csv=results/jobradar_50_users
```

### Target load — 100 users

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 100 -r 10 -t 120s --csv=results/jobradar_100_users
```

### Stress test — 200 users

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 200 -r 20 -t 120s --csv=results/jobradar_200_users
```

> **Note:** These are test configurations only. They do not imply JobRadar supports 200 concurrent users.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `JOBRADAR_HOST` | `http://127.0.0.1:8000` | Base URL of the API |
| `JOBRADAR_LOCATION` | `India` | Location filter for job searches |
| `JOBRADAR_REMOTE` | `false` | Set `true` for remote-only results |

Example with env vars:
```bash
set JOBRADAR_HOST=http://127.0.0.1:8000
set JOBRADAR_LOCATION=India
python -m locust -f tests/load/locustfile.py
```

---

## Results Storage

CSV results are written to `backend/results/`:

| File | Contents |
|---|---|
| `jobradar_100_users_stats.csv` | Per-endpoint aggregate stats |
| `jobradar_100_users_stats_history.csv` | Time-series stats (for charts) |
| `jobradar_100_users_failures.csv` | Failed request details |
| `jobradar_100_users_exceptions.csv` | Python exceptions |

---

## Metrics Reference

| Metric | Meaning |
|---|---|
| **Average response time** | Mean latency across all requests in ms. Skewed by outliers. |
| **Median (P50)** | 50% of requests completed within this time. More robust than average. |
| **P95** | 95% of requests completed within this time. Key SLA metric. |
| **P99** | 99% of requests completed within this time. Reveals worst-case tail latency. |
| **RPS (Requests/sec)** | Server throughput — requests handled per second. |
| **# Requests** | Total requests made during the test. |
| **# Failures** | Requests that returned an error or unexpected status. |
| **Failure rate %** | `(failures / total_requests) * 100`. |
| **Concurrent users** | Simulated active users making requests simultaneously. |

---

## Realistic User Flow

The locustfile models this flow for each simulated user:

```
[on_start] Upload resume -> get session_id
     |
     v
health_check (10%)    -> GET /
upload_resume (20%)   -> POST /api/resume/upload  [refreshes session]
search_jobs   (55%)   -> GET /api/jobs/search     [CORE: skill matching + ranking]
export_excel  (15%)   -> GET /api/jobs/export     [Excel generation]
```

The `search_jobs` task (55% weight) is the most important endpoint because it:
1. Queries external APIs (Adzuna, Remotive, Jobicy) concurrently
2. Runs skill-matching scoring on all results
3. Sorts and paginates results
4. Implements a 6-hour in-memory result cache

---

## Database Performance Notes

JobRadar uses **no database** — all state is in-memory (`sessions = {}` in `main.py`).

**What this means for load testing:**
- No DB query time to measure
- Session data is per-process (sessions do not survive restarts)
- The `_cache` in `job_search.py` acts as an in-memory LRU cache (TTL 6h, max 200 entries)
- Under load, the cache HIT rate improves — first request per skill-set is slow (external API calls), subsequent identical searches return instantly

**To observe cache behavior:** Look at response times for `search_jobs`. The first batch of requests will be slow (external API latency). After the cache warms up, response times drop significantly.

---

## Smoke Test (Quick Start)

Run this first to verify everything works before scaling up:

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 5 -r 1 -t 30s
```

Expected: No failures, all 4 endpoints responding correctly.

---

## One-Command Full Test

```bash
python -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8000 --headless -u 10 -r 2 -t 60s --csv=results/jobradar_10_users --html=results/jobradar_10_users_report.html
```
