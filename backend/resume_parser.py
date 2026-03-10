import re
import os
from typing import Dict, List

SKILLS_DB = [
    "Python","JavaScript","TypeScript","Java","C++","C#","Go","Rust","Ruby","PHP","Swift","Kotlin",
    "React","Vue","Angular","Next.js","Node.js","FastAPI","Django","Flask","Spring Boot","Express",
    "AWS","GCP","Azure","Docker","Kubernetes","Terraform","CI/CD","Linux","Git","Jenkins",
    "PostgreSQL","MySQL","MongoDB","Redis","Elasticsearch","SQL","DynamoDB","Cassandra","Oracle",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch","scikit-learn","NLP","Pandas","NumPy",
    "Matplotlib","Seaborn","Kafka","Spark","Hadoop","Airflow","GraphQL","REST API","Microservices",
    "React Native","Flutter","Figma","Tableau","Power BI","Blockchain","Solidity",
    "Excel","Word","PowerPoint","Agile","Scrum","Collaboration","Communication","Leadership",
    "System Design","Data Structures","Algorithms","OOP","SOLID","TDD","CI/CD","DevOps",
]

JOB_TITLE_KEYWORDS = [
    "software engineer","software developer","full stack","frontend","backend",
    "data scientist","data engineer","data analyst","ml engineer","machine learning engineer",
    "devops engineer","cloud engineer","platform engineer","sre","site reliability",
    "android developer","ios developer","mobile developer","react developer",
    "python developer","java developer","web developer",
]


def extract_text_from_pdf(path: str) -> str:
    try:
        import pdfplumber
        with pdfplumber.open(path) as pdf:
            return "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception as e:
        print(f"[Parser] PDF error: {e}")
        return ""


def extract_text_from_docx(path: str) -> str:
    try:
        from docx import Document
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        print(f"[Parser] DOCX error: {e}")
        return ""


def extract_skills(text: str) -> List[str]:
    found = []
    text_l = text.lower()
    for skill in SKILLS_DB:
        if skill.lower() in text_l:
            found.append(skill)
    return found


def extract_email(text: str) -> str:
    m = re.search(r'[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}', text)
    return m.group(0) if m else ""


def extract_phone(text: str) -> str:
    m = re.search(r'(\+?\d[\d\s\-().]{8,}\d)', text)
    return m.group(0).strip() if m else ""


def extract_name(text: str) -> str:
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    for line in lines[:5]:
        if (len(line.split()) in [2, 3] and
                not any(x in line.lower() for x in ['@','http','phone','email','address'])):
            return line
    return lines[0] if lines else "Candidate"


def extract_experience_years(text: str) -> int:
    patterns = [
        r'(\d+)\+?\s*years?\s*(?:of\s*)?experience',
        r'experience[:\s]+(\d+)\+?\s*years?',
    ]
    for p in patterns:
        m = re.search(p, text, re.IGNORECASE)
        if m:
            return int(m.group(1))
    return 0


def extract_job_titles(text: str, skills: List[str]) -> List[str]:
    text_l = text.lower()
    found  = [kw.title() for kw in JOB_TITLE_KEYWORDS if kw in text_l]

    # Infer from skills
    skill_l = [s.lower() for s in skills]
    if not found:
        if any(s in skill_l for s in ["machine learning","tensorflow","pytorch","deep learning","pandas","numpy"]):
            found.append("Data Scientist")
        elif any(s in skill_l for s in ["react","vue","angular","next.js","typescript"]):
            found.append("Frontend Developer")
        elif any(s in skill_l for s in ["docker","kubernetes","terraform","aws","devops"]):
            found.append("DevOps Engineer")
        else:
            found.append("Software Engineer")

    return list(dict.fromkeys(found))[:3]


def parse_resume(file_path: str) -> Dict:
    ext  = os.path.splitext(file_path)[1].lower()
    text = extract_text_from_pdf(file_path) if ext == ".pdf" else extract_text_from_docx(file_path)

    if not text.strip():
        return {
            "name": "Candidate", "email": "", "phone": "",
            "skills": ["Python", "Java"], "experience_years": 0,
            "job_titles": ["Software Engineer"], "education": [], "summary": "",
        }

    skills = extract_skills(text)

    return {
        "name":             extract_name(text),
        "email":            extract_email(text),
        "phone":            extract_phone(text),
        "skills":           skills,
        "experience_years": extract_experience_years(text),
        "job_titles":       extract_job_titles(text, skills),
        "education":        [],
        "summary":          text[:500],
    }
