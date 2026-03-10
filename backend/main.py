import os
import uuid
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import tempfile

from resume_parser import parse_resume
from job_search import JobSearchEngine
from excel_export import export_to_excel

app = FastAPI(title="JobRadar AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sessions = {}

@app.get("/")
def root():
    return {
        "message": "JobRadar AI running",
        "adzuna_loaded": bool(os.getenv("ADZUNA_APP_ID")),
    }

@app.post("/api/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    content = await file.read()
    suffix = ".pdf" if file.filename.endswith(".pdf") else ".docx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    resume = parse_resume(tmp_path)
    os.unlink(tmp_path)

    session_id = uuid.uuid4().hex
    sessions[session_id] = {"resume": resume, "jobs": []}
    return {"session_id": session_id, "resume": resume}

@app.get("/api/jobs/search")
async def search_jobs(
    session_id: str = Query(...),
    location: Optional[str] = Query(None),
    remote_only: Optional[bool] = Query(False),
    experience_level: Optional[str] = Query(None),
    portal: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
):
    print(f"\n>>> SEARCH: session={session_id[:8]}... location={location}")
    print(f">>> Adzuna key set: {bool(os.getenv('ADZUNA_APP_ID'))}")

    if session_id not in sessions:
        raise HTTPException(404, "Session not found. Please upload resume first.")

    resume = sessions[session_id]["resume"]
    print(f">>> Skills: {resume.get('skills')}")

    engine = JobSearchEngine()
    jobs = await engine.search(
        skills=resume["skills"],
        job_titles=resume["job_titles"],
        location=location,
        remote_only=remote_only,
        experience_level=experience_level,
        portal_filter=portal,
    )
    sessions[session_id]["jobs"] = jobs
    total = len(jobs)
    start = (page - 1) * page_size
    return {
        "jobs": jobs[start: start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }

@app.get("/api/jobs/export")
async def export_excel_endpoint(session_id: str = Query(...)):
    if session_id not in sessions:
        raise HTTPException(404, "Session not found.")
    data = sessions[session_id]
    return export_to_excel(data["resume"], data.get("jobs", []))
