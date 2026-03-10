"""
JobRadar AI - Job Search Engine
1. Adzuna  — free 250/day, India + global, needs App ID + App Key
2. Remotive — free, no key, remote jobs searched by skill keyword
3. Jobicy  — free, no key, remote jobs searched by skill tag
"""

import os, asyncio, hashlib, re
from typing import List, Optional, Dict
import httpx

ADZUNA_APP_ID  = os.getenv("ADZUNA_APP_ID", "").strip()
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY", "").strip()

ALL_SKILLS = [
    "Python","JavaScript","TypeScript","Java","C++","C#","Go","Rust","Ruby","PHP",
    "React","Vue","Angular","Next.js","Node.js","FastAPI","Django","Flask","Spring Boot",
    "AWS","GCP","Azure","Docker","Kubernetes","Terraform","CI/CD","Linux","Git",
    "PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","SQL","Cassandra","DynamoDB",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch","scikit-learn","NLP",
    "Pandas","NumPy","Kafka","Spark","Hadoop","Airflow","GraphQL","REST API","Microservices",
    "React Native","Flutter","Figma","Tableau","Power BI","Blockchain","Solidity",
]

SOFT_SKILLS = {
    "collaboration","communication","excel","powerpoint","word","ms office",
    "agile","scrum","leadership","teamwork","presentation","matplotlib",
    "oracle","ms excel","power bi","tableau","ms word",
}


def strip_html(text: str) -> str:
    return re.sub(r'<[^>]+>', ' ', text or "")


def get_tech_skills(skills: List[str]) -> List[str]:
    return [s for s in skills if s.lower() not in SOFT_SKILLS]


def compute_match(user_skills: List[str], description: str,
                  req_skills: List[str] = None) -> Dict:
    user_set   = set(s.lower() for s in user_skills)
    desc_l     = strip_html(description).lower()
    job_skills = set(s.lower() for s in (req_skills or []))
    for sk in ALL_SKILLS:
        if sk.lower() in desc_l:
            job_skills.add(sk.lower())
    if not job_skills:
        return {"match_score": 20.0, "matched_skills": [], "missing_skills": []}
    matched = sorted(user_set & job_skills)
    missing = sorted(job_skills - user_set)[:5]
    score   = min(99.0, max(10.0, (len(matched) / len(job_skills)) * 100 + min(15, len(matched) * 3)))
    return {
        "match_score":    round(score, 1),
        "matched_skills": matched,
        "missing_skills": missing,
    }


def make_job(url, title, company, location, portal, desc,
             salary="Not disclosed", posted="", req=None):
    if not url or not (title or "").strip() or not (company or "").strip():
        return None
    return {
        "id":                  hashlib.md5(url.encode()).hexdigest()[:16],
        "title":               title.strip(),
        "company":             company.strip(),
        "location":            location or "Not specified",
        "portal":              portal,
        "apply_link":          url,
        "is_live":             True,
        "description":         strip_html(desc)[:800],
        "experience_required": "Not specified",
        "job_type":            "Full-time",
        "posted_date":         (posted or "")[:10],
        "salary":              salary or "Not disclosed",
        "_desc":               desc,
        "_req":                req or [],
    }


# ── Adzuna ────────────────────────────────────────────────────────────────────

def adzuna_country(location: Optional[str]) -> str:
    if not location: return "in"
    l = location.lower()
    if any(x in l for x in ["india","bangalore","hyderabad","pune","mumbai","delhi","chennai","noida"]): return "in"
    if any(x in l for x in ["usa","united states","new york","seattle","san francisco","austin"]): return "us"
    if any(x in l for x in ["uk","london","england"]): return "gb"
    if any(x in l for x in ["canada","toronto","vancouver"]): return "ca"
    if any(x in l for x in ["australia","sydney","melbourne"]): return "au"
    return "in"


async def fetch_adzuna(query: str, location: Optional[str]) -> List[Dict]:
    if not (ADZUNA_APP_ID and ADZUNA_APP_KEY):
        return []
    country = adzuna_country(location)
    params = {
        "app_id":           ADZUNA_APP_ID,
        "app_key":          ADZUNA_APP_KEY,
        "results_per_page": 20,
        "sort_by":          "relevance",
        "what":             query,
        "content-type":     "application/json",
    }
    if location and "remote" not in location.lower():
        params["where"] = location
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get(
                f"https://api.adzuna.com/v1/api/jobs/{country}/search/1",
                params=params)
            r.raise_for_status()
            items = r.json().get("results", [])
    except Exception as e:
        print(f"[Adzuna] Error '{query}': {e}")
        return []
    jobs = []
    for item in items:
        url = item.get("redirect_url", "")
        if not url: continue
        sm, sx = item.get("salary_min"), item.get("salary_max")
        sal = (f"₹{int(sm/100000):.0f}L–₹{int(sx/100000):.0f}L"
               if sm and sx and country == "in" else
               f"${int(sm):,}–${int(sx):,}" if sm and sx else "Not disclosed")
        job = make_job(
            url=url,
            title=item.get("title", ""),
            company=(item.get("company") or {}).get("display_name", ""),
            location=(item.get("location") or {}).get("display_name", "") or location or "India",
            portal="Adzuna",
            desc=item.get("description", ""),
            salary=sal,
            posted=item.get("created", ""),
        )
        if job: jobs.append(job)
    print(f"[Adzuna] '{query}' ({country}): {len(jobs)} jobs")
    return jobs


# ── Remotive ──────────────────────────────────────────────────────────────────

async def fetch_remotive(skill: str) -> List[Dict]:
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get("https://remotive.com/api/remote-jobs",
                            params={"search": skill, "limit": 20})
            r.raise_for_status()
            items = r.json().get("jobs", [])
    except Exception as e:
        print(f"[Remotive] Error '{skill}': {e}")
        return []
    skill_l = skill.lower()
    jobs = []
    for item in items:
        title_l = (item.get("title") or "").lower()
        tags    = " ".join(t.lower() for t in (item.get("tags") or []))
        # Only include if skill is in title or tags — not just description
        if skill_l not in title_l and skill_l not in tags:
            continue
        url = item.get("url", "")
        if not url: continue
        job = make_job(
            url=url,
            title=item.get("title", ""),
            company=item.get("company_name", ""),
            location="Remote",
            portal="Remotive",
            desc=item.get("description", ""),
            salary=item.get("salary", ""),
            posted=item.get("publication_date", ""),
            req=item.get("tags", []),
        )
        if job: jobs.append(job)
    print(f"[Remotive] '{skill}': {len(jobs)} relevant jobs")
    return jobs


# ── Jobicy ────────────────────────────────────────────────────────────────────

async def fetch_jobicy(skill: str) -> List[Dict]:
    try:
        async with httpx.AsyncClient(timeout=12) as c:
            r = await c.get("https://jobicy.com/api/v2/remote-jobs",
                            params={"count": 20, "tag": skill.lower()})
            r.raise_for_status()
            items = r.json().get("jobs", [])
    except Exception as e:
        print(f"[Jobicy] Error '{skill}': {e}")
        return []
    jobs = []
    for item in items:
        url = item.get("url", "") or item.get("jobApply", "")
        if not url: continue
        job = make_job(
            url=url,
            title=item.get("jobTitle", ""),
            company=item.get("companyName", ""),
            location=item.get("jobGeo", "Remote") or "Remote",
            portal="Jobicy",
            desc=item.get("jobDescription", ""),
            posted=item.get("pubDate", ""),
        )
        if job: jobs.append(job)
    print(f"[Jobicy] '{skill}': {len(jobs)} jobs")
    return jobs


# ── Engine ────────────────────────────────────────────────────────────────────

class JobSearchEngine:

    async def search(self, skills, job_titles, location=None,
                     remote_only=False, experience_level=None, portal_filter=None):

        print(f"\n[JobRadar] ── New Search ──")
        print(f"[JobRadar] Skills: {skills}")
        print(f"[JobRadar] Location: {location} | Remote: {remote_only}")
        print(f"[JobRadar] Adzuna: {bool(ADZUNA_APP_ID)}")

        tech  = get_tech_skills(skills)
        if not tech: tech = skills[:5]
        top   = tech[:5]
        title = (job_titles or ["Software Engineer"])[0]

        print(f"[JobRadar] Searching top skills: {top}")

        tasks = []
        # Adzuna — one search per skill (best results)
        for sk in top:
            tasks.append(fetch_adzuna(f"{title} {sk}", location))

        # Remotive + Jobicy — free fallback
        for sk in top:
            tasks.append(fetch_remotive(sk))
            tasks.append(fetch_jobicy(sk))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Deduplicate
        seen: set     = set()
        raw: List[Dict] = []
        for r in results:
            if isinstance(r, list):
                for job in r:
                    if job and job.get("id") and job["id"] not in seen:
                        seen.add(job["id"])
                        raw.append(job)

        print(f"[JobRadar] Total unique jobs: {len(raw)}")

        if not raw:
            print("[JobRadar] No jobs found from any API")
            return []

        # Score all jobs
        for job in raw:
            desc = job.pop("_desc", "")
            req  = job.pop("_req", [])
            job.update(compute_match(skills, desc, req))

        # Sort by match score
        raw.sort(key=lambda x: x["match_score"], reverse=True)

        top_score = raw[0]["match_score"] if raw else 0
        print(f"[JobRadar] Top match: {top_score}% | Jobs ≥40%: {sum(1 for j in raw if j['match_score'] >= 40)}")

        # Filters
        if remote_only:
            raw = [j for j in raw if "remote" in j["location"].lower()]
        if experience_level:
            raw = [j for j in raw if experience_level.lower() in (j.get("experience_required") or "").lower()]
        if portal_filter:
            raw = [j for j in raw if portal_filter.lower() in j["portal"].lower()]

        print(f"[JobRadar] Returning {len(raw)} jobs\n")
        return raw
