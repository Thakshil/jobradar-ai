import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Dashboard() {
  const navigate  = useNavigate()
  const sessionId = localStorage.getItem('session_id')
  const resume    = JSON.parse(localStorage.getItem('resume') || '{}')
  const [jobs, setJobs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [location, setLocation] = useState('')
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [portal, setPortal]     = useState('')

  const fetchJobs = useCallback(async () => {
    if (!sessionId) { navigate('/'); return }
    setLoading(true); setError('')
    try {
      const res = await axios.get(`${API}/api/jobs/search`, {
        params: { session_id: sessionId, page: 1, page_size: 100,
          ...(location && { location }), ...(remoteOnly && { remote_only: true }),
          ...(portal && { portal }) }
      })
      setJobs(res.data.jobs || [])
      if (!(res.data.jobs || []).length) setError('No jobs found. Try adjusting filters.')
    } catch (e) {
      if (e.response?.status === 404) { navigate('/') }
      else setError('Failed to fetch jobs. Check backend is running.')
    } finally { setLoading(false) }
  }, [sessionId, location, remoteOnly, portal, navigate])

  useEffect(() => { fetchJobs() }, [])

  const avgScore    = jobs.length ? Math.round(jobs.reduce((a,j) => a + j.match_score, 0) / jobs.length) : 0
  const highMatches = jobs.filter(j => j.match_score >= 60).length
  const portals     = [...new Set(jobs.map(j => j.portal))]

  const ringColor = (s) => s >= 70 ? '#22c55e' : s >= 50 ? '#f59e0b' : s >= 30 ? '#f97316' : '#ef4444'
  const scoreBg   = (s) => s >= 70 ? 'rgba(34,197,94,.12)' : s >= 50 ? 'rgba(245,158,11,.12)' : 'rgba(249,115,22,.12)'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#07090f;font-family:'DM Sans',sans-serif;color:#e2e8f0}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:#0f172a}::-webkit-scrollbar-thumb{background:#1e293b;border-radius:99px}
        .dash{min-height:100vh;background:#07090f;position:relative}
        .grid-bg{position:fixed;inset:0;background-image:linear-gradient(rgba(79,110,247,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(79,110,247,.03) 1px,transparent 1px);background-size:50px 50px;pointer-events:none;z-index:0}
        .orb-tl{position:fixed;top:-200px;left:-200px;width:500px;height:500px;background:rgba(79,110,247,.08);border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0}
        .content{position:relative;z-index:1;max-width:1200px;margin:0 auto;padding:1.5rem 2rem}

        /* Header */
        .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:2rem;padding-bottom:1.5rem;border-bottom:1px solid rgba(255,255,255,.05)}
        .header-left{display:flex;align-items:center;gap:.75rem}
        .h-icon{width:42px;height:42px;background:linear-gradient(135deg,#4f6ef7,#7c3aed);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;box-shadow:0 0 20px rgba(79,110,247,.4)}
        .h-title{font-family:'Syne',sans-serif;font-size:1.4rem;font-weight:800;letter-spacing:-.02em;color:#fff}
        .h-title span{background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .h-sub{color:#475569;font-size:.8rem}
        .header-right{display:flex;gap:.75rem;align-items:center}
        .btn-outline{padding:.5rem 1.1rem;background:transparent;border:1px solid rgba(255,255,255,.1);color:#94a3b8;font-size:.82rem;border-radius:10px;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
        .btn-outline:hover{border-color:rgba(99,102,241,.5);color:#c7d2fe}
        .btn-export{padding:.5rem 1.1rem;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:#86efac;font-size:.82rem;border-radius:10px;cursor:pointer;transition:all .2s;text-decoration:none;display:inline-flex;align-items:center;gap:.4rem;font-family:'DM Sans',sans-serif}
        .btn-export:hover{background:rgba(34,197,94,.15)}

        /* Skills bar */
        .skills-bar{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:1rem;flex-wrap:wrap}
        .skills-label{color:#475569;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em;white-space:nowrap}
        .skill-chip{padding:.25rem .7rem;background:rgba(99,102,241,.12);border:1px solid rgba(99,102,241,.2);color:#a5b4fc;border-radius:99px;font-size:.75rem;font-weight:500}

        /* Stats */
        .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin-bottom:1.5rem}
        .stat-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:1.25rem 1.5rem;position:relative;overflow:hidden}
        .stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent,linear-gradient(90deg,#4f6ef7,#7c3aed))}
        .stat-num{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;color:#fff;line-height:1}
        .stat-lbl{color:#475569;font-size:.75rem;margin-top:.3rem;text-transform:uppercase;letter-spacing:.06em}
        .stat-icon{position:absolute;top:1.25rem;right:1.25rem;font-size:1.3rem;opacity:.4}

        /* Filters */
        .filter-bar{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:1rem 1.25rem;margin-bottom:1.5rem;display:flex;flex-wrap:wrap;gap:.75rem;align-items:center}
        .filter-label{color:#475569;font-size:.72rem;text-transform:uppercase;letter-spacing:.1em}
        .filter-input{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#e2e8f0;border-radius:10px;padding:.45rem .8rem;font-size:.83rem;font-family:'DM Sans',sans-serif;outline:none;transition:border .2s;width:180px}
        .filter-input:focus{border-color:rgba(99,102,241,.5)}
        .filter-input::placeholder{color:#334155}
        .filter-select{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#e2e8f0;border-radius:10px;padding:.45rem .8rem;font-size:.83rem;font-family:'DM Sans',sans-serif;outline:none;cursor:pointer}
        .check-label{display:flex;align-items:center;gap:.5rem;cursor:pointer;color:#94a3b8;font-size:.83rem}
        .btn-search{padding:.5rem 1.25rem;background:linear-gradient(135deg,#4f6ef7,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:.83rem;font-weight:600;cursor:pointer;font-family:'Syne',sans-serif;letter-spacing:.03em;transition:all .2s}
        .btn-search:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(79,110,247,.3)}
        .btn-search:disabled{background:rgba(255,255,255,.06);color:#334155;cursor:not-allowed;transform:none;box-shadow:none}

        /* Error */
        .err{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:.9rem 1.2rem;color:#fca5a5;margin-bottom:1.5rem;font-size:.85rem}

        /* Loading */
        .loading-state{text-align:center;padding:5rem 2rem}
        .loading-pulse{font-size:3.5rem;animation:bob 2s ease-in-out infinite;display:block;margin-bottom:1rem}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        .loading-title{color:#e2e8f0;font-family:'Syne',sans-serif;font-size:1.3rem;font-weight:700}
        .loading-sub{color:#475569;font-size:.85rem;margin-top:.4rem}

        /* Job cards */
        .jobs-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem}
        .jobs-count{color:#475569;font-size:.82rem}
        .jobs-count strong{color:#94a3b8}
        .jobs-list{display:flex;flex-direction:column;gap:.75rem}

        .job-card{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:1.25rem 1.5rem;transition:all .25s ease;display:flex;align-items:flex-start;gap:1.25rem;position:relative;overflow:hidden}
        .job-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent,linear-gradient(to bottom,#4f6ef7,#7c3aed));opacity:0;transition:opacity .25s}
        .job-card:hover{border-color:rgba(99,102,241,.25);background:rgba(99,102,241,.04);transform:translateX(3px)}
        .job-card:hover::before{opacity:1}

        .job-rank{color:#1e293b;font-size:.72rem;font-family:'Syne',sans-serif;font-weight:700;min-width:24px;padding-top:2px}
        .job-avatar{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,rgba(79,110,247,.3),rgba(124,58,237,.3));border:1px solid rgba(99,102,241,.2);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:1.1rem;color:#a5b4fc;flex-shrink:0}
        .job-body{flex:1;min-width:0}
        .job-top{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap;margin-bottom:.2rem}
        .job-title{font-family:'Syne',sans-serif;font-weight:700;font-size:1rem;color:#f1f5f9;letter-spacing:-.01em}
        .badge-live{padding:.15rem .5rem;background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.25);color:#86efac;border-radius:99px;font-size:.65rem;font-weight:600;letter-spacing:.05em}
        .job-company{color:#818cf8;font-size:.85rem;font-weight:500;margin-bottom:.4rem}
        .job-meta{display:flex;flex-wrap:wrap;gap:.75rem;color:#475569;font-size:.75rem;margin-bottom:.6rem}
        .job-meta span{display:flex;align-items:center;gap:.25rem}
        .matched-chips{display:flex;flex-wrap:wrap;gap:.35rem}
        .chip-match{padding:.2rem .55rem;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.2);color:#a5b4fc;border-radius:99px;font-size:.68rem;font-weight:500}
        .chip-miss{padding:.2rem .55rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);color:#334155;border-radius:99px;font-size:.68rem}

        .job-right{display:flex;flex-direction:column;align-items:center;gap:.75rem;flex-shrink:0;min-width:80px}
        .score-ring{text-align:center}
        .score-val{font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;line-height:1}
        .score-lbl{color:#334155;font-size:.65rem;text-transform:uppercase;letter-spacing:.08em}
        .score-bar{width:60px;height:3px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden;margin:.35rem auto}
        .score-fill{height:100%;border-radius:99px;transition:width .5s ease}
        .apply-btn{padding:.5rem 1rem;background:linear-gradient(135deg,#4f6ef7,#7c3aed);color:#fff;border:none;border-radius:10px;font-size:.75rem;font-weight:700;cursor:pointer;text-decoration:none;font-family:'Syne',sans-serif;letter-spacing:.03em;transition:all .2s;white-space:nowrap;display:inline-block;text-align:center}
        .apply-btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(79,110,247,.35)}

        /* Empty */
        .empty{text-align:center;padding:4rem 2rem;color:#334155}
        .empty-icon{font-size:3rem;margin-bottom:1rem;display:block;opacity:.4}

        @media(max-width:768px){.stats-grid{grid-template-columns:repeat(2,1fr)}.job-card{flex-wrap:wrap}.job-right{flex-direction:row;min-width:auto;width:100%;justify-content:space-between}}
      `}</style>

      <div className="dash">
        <div className="grid-bg"/><div className="orb-tl"/>
        <div className="content">

          {/* Header */}
          <div className="header">
            <div className="header-left">
              <div className="h-icon">⚡</div>
              <div>
                <div className="h-title">Thaks <span>Radar</span></div>
                <div className="h-sub">Welcome back, {resume.name || 'Candidate'}</div>
              </div>
            </div>
            <div className="header-right">
              {jobs.length > 0 && (
                <a className="btn-export" href={`${API}/api/jobs/export?session_id=${sessionId}`}>
                  📥 Export Excel
                </a>
              )}
              <button className="btn-outline" onClick={() => { localStorage.clear(); navigate('/') }}>
                ↑ New Resume
              </button>
            </div>
          </div>

          {/* Skills */}
          {resume.skills?.length > 0 && (
            <div className="skills-bar">
              <span className="skills-label">Skills Detected</span>
              {resume.skills.map(s => <span key={s} className="skill-chip">{s}</span>)}
            </div>
          )}

          {/* Stats */}
          <div className="stats-grid">
            {[
              { num: jobs.length, label: 'Total Jobs', icon: '💼', accent: 'linear-gradient(90deg,#4f6ef7,#7c3aed)' },
              { num: highMatches, label: 'High Matches', icon: '🎯', accent: 'linear-gradient(90deg,#22c55e,#16a34a)' },
              { num: `${avgScore}%`, label: 'Avg Score', icon: '📊', accent: 'linear-gradient(90deg,#f59e0b,#d97706)' },
              { num: portals.length, label: 'Portals', icon: '🌐', accent: 'linear-gradient(90deg,#0ea5e9,#0284c7)' },
            ].map(s => (
              <div key={s.label} className="stat-card" style={{'--accent': s.accent}}>
                <div className="stat-icon">{s.icon}</div>
                <div className="stat-num">{s.num}</div>
                <div className="stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="filter-bar">
            <span className="filter-label">Filters</span>
            <select className="filter-select" value={location} onChange={e => setLocation(e.target.value)}>
              <option value="">🌍 All Locations</option>
              <option value="India">🇮🇳 India</option>
              <option value="USA">🇺🇸 USA</option>
              <option value="UK">🇬🇧 UK</option>
              <option value="Canada">🇨🇦 Canada</option>
              <option value="Australia">🇦🇺 Australia</option>
            </select>
            <select className="filter-select" value={portal} onChange={e => setPortal(e.target.value)}>
              <option value="">All Portals</option>
              {portals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="check-label">
              <input type="checkbox" checked={remoteOnly} onChange={e => setRemoteOnly(e.target.checked)} />
              Remote Only
            </label>
            <button className="btn-search" onClick={fetchJobs} disabled={loading}>
              {loading ? '⏳ Searching...' : '🔍 Search'}
            </button>
            <button className="btn-outline" onClick={() => { setLocation(''); setRemoteOnly(false); setPortal('') }}>
              Clear
            </button>
          </div>

          {error && <div className="err">⚠ {error}</div>}

          {/* Loading */}
          {loading && (
            <div className="loading-state">
              <span className="loading-pulse">🔍</span>
              <div className="loading-title">Scanning job boards...</div>
              <div className="loading-sub">Checking Adzuna · Remotive · Jobicy for your skills</div>
            </div>
          )}

          {/* Jobs */}
          {!loading && jobs.length > 0 && (
            <div>
              <div className="jobs-header">
                <div className="jobs-count"><strong>{jobs.length}</strong> jobs found · ranked by match score</div>
              </div>
              <div className="jobs-list">
                {jobs.map((job, i) => (
                  <div key={job.id} className="job-card"
                    style={{'--accent': `linear-gradient(to bottom,${ringColor(job.match_score)}88,${ringColor(job.match_score)}22)`}}>
                    <div className="job-rank">#{i+1}</div>
                    <div className="job-avatar">{job.company[0].toUpperCase()}</div>
                    <div className="job-body">
                      <div className="job-top">
                        <span className="job-title">{job.title}</span>
                        {job.is_live && <span className="badge-live">LIVE</span>}
                      </div>
                      <div className="job-company">{job.company}</div>
                      <div className="job-meta">
                        <span>📍 {job.location}</span>
                        <span>🏢 {job.portal}</span>
                        {job.salary !== 'Not disclosed' && <span>💰 {job.salary}</span>}
                        {job.posted_date && <span>📅 {job.posted_date}</span>}
                      </div>
                      <div className="matched-chips">
                        {job.matched_skills?.slice(0,5).map(sk => (
                          <span key={sk} className="chip-match">✓ {sk}</span>
                        ))}
                        {job.missing_skills?.slice(0,3).map(sk => (
                          <span key={sk} className="chip-miss">+ {sk}</span>
                        ))}
                      </div>
                    </div>
                    <div className="job-right">
                      <div className="score-ring">
                        <div className="score-val" style={{color: ringColor(job.match_score)}}>
                          {job.match_score}%
                        </div>
                        <div className="score-bar">
                          <div className="score-fill"
                            style={{width:`${job.match_score}%`, background: ringColor(job.match_score)}}/>
                        </div>
                        <div className="score-lbl">match</div>
                      </div>
                      <a className="apply-btn" href={job.apply_link} target="_blank" rel="noopener noreferrer">
                        Apply →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && jobs.length === 0 && !error && (
            <div className="empty">
              <span className="empty-icon">🛸</span>
              <div style={{color:'#475569',fontSize:'1.1rem'}}>No jobs found yet</div>
              <div style={{fontSize:'.82rem',marginTop:'.4rem'}}>Upload a resume or try different filters</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
