import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8000'

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
  const [searched, setSearched] = useState(false)

  const fetchJobs = useCallback(async () => {
    if (!sessionId) { navigate('/'); return }
    setLoading(true)
    setError('')
    try {
      const params = {
        session_id: sessionId,
        page: 1,
        page_size: 100,
        ...(location    && { location }),
        ...(remoteOnly  && { remote_only: true }),
        ...(portal      && { portal }),
      }
      console.log('[JobRadar] Fetching jobs...', params)
      const res = await axios.get(`${API}/api/jobs/search`, { params })
      console.log(`[JobRadar] Got ${res.data.jobs?.length} jobs`)
      setJobs(res.data.jobs || [])
      if ((res.data.jobs || []).length === 0) {
        setError('No jobs found. Try clearing filters or check backend logs.')
      }
    } catch (e) {
      console.error('[JobRadar] Error:', e)
      if (e.response?.status === 404) {
        setError('Session expired. Please upload your resume again.')
        setTimeout(() => navigate('/'), 2000)
      } else {
        setError('Failed to fetch jobs. Check backend is running.')
      }
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }, [sessionId, location, remoteOnly, portal, navigate])

  useEffect(() => {
    fetchJobs()
  }, [])

  const avgScore    = jobs.length ? Math.round(jobs.reduce((a, j) => a + j.match_score, 0) / jobs.length) : 0
  const highMatches = jobs.filter(j => j.match_score >= 60).length
  const portals     = [...new Set(jobs.map(j => j.portal))]

  const scoreColor = (s) => {
    if (s >= 70) return 'text-green-400'
    if (s >= 50) return 'text-yellow-400'
    if (s >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  const scoreBg = (s) => {
    if (s >= 70) return 'bg-green-500'
    if (s >= 50) return 'bg-yellow-500'
    if (s >= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-xl">🎯</div>
          <div>
            <h1 className="text-xl font-bold text-white">JobRadar AI</h1>
            <p className="text-slate-400 text-sm">Welcome, {resume.name || 'Candidate'}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          ↑ New Resume
        </button>
      </div>

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
          <p className="text-slate-400 text-xs uppercase tracking-wider mb-2">Skills from Resume</p>
          <div className="flex flex-wrap gap-2">
            {resume.skills.map(s => (
              <span key={s} className="px-2 py-1 bg-blue-900/50 border border-blue-700 text-blue-300 rounded text-xs font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Jobs', value: jobs.length, icon: '💼' },
          { label: 'High Matches', value: highMatches, icon: '🎯' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: '📊' },
          { label: 'Portals', value: portals.length, icon: '🌐' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-slate-400 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-slate-400 text-xs block mb-1">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Bangalore, India"
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm w-48 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-400 text-xs block mb-1">Portal</label>
            <select
              value={portal}
              onChange={e => setPortal(e.target.value)}
              className="bg-slate-700 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">All Portals</option>
              {portals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={e => setRemoteOnly(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span className="text-white text-sm">Remote Only</span>
          </label>
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? '⏳ Searching...' : '🔍 Search'}
          </button>
          <button
            onClick={() => { setLocation(''); setRemoteOnly(false); setPortal('') }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/40 border border-red-500 rounded-xl p-4 mb-6 text-red-300">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4 animate-pulse">🔍</div>
          <p className="text-white text-lg font-medium">Searching jobs matching your skills...</p>
          <p className="text-slate-400 mt-2">Checking Adzuna, Remotive, Jobicy...</p>
        </div>
      )}

      {/* Jobs List */}
      {!loading && jobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-sm">{jobs.length} jobs found • sorted by match score</p>
            <a
              href={`${API}/api/jobs/export?session_id=${sessionId}`}
              className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              📥 Export Excel
            </a>
          </div>

          <div className="space-y-3">
            {jobs.map((job, i) => (
              <div key={job.id} className="bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-xl p-5 transition-colors group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Rank + Logo */}
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <span className="text-slate-500 text-xs">#{i + 1}</span>
                      <div className="w-10 h-10 rounded-lg bg-blue-900/60 border border-blue-700 flex items-center justify-center text-blue-300 font-bold text-lg">
                        {job.company[0].toUpperCase()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-semibold text-base group-hover:text-blue-300 transition-colors">
                          {job.title}
                        </h3>
                        {job.is_live && (
                          <span className="px-2 py-0.5 bg-green-900/60 border border-green-600 text-green-400 rounded text-xs">Live</span>
                        )}
                      </div>
                      <p className="text-blue-400 text-sm mt-0.5">{job.company}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-slate-400 text-xs">
                        <span>📍 {job.location}</span>
                        <span>🏢 {job.portal}</span>
                        {job.salary !== 'Not disclosed' && <span>💰 {job.salary}</span>}
                        {job.posted_date && <span>📅 {job.posted_date}</span>}
                      </div>

                      {/* Matched skills */}
                      {job.matched_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.matched_skills.slice(0, 6).map(sk => (
                            <span key={sk} className="px-2 py-0.5 bg-blue-900/40 border border-blue-800 text-blue-300 rounded text-xs">
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Missing skills */}
                      {job.missing_skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {job.missing_skills.slice(0, 4).map(sk => (
                            <span key={sk} className="px-2 py-0.5 bg-slate-700 border border-slate-600 text-slate-400 rounded text-xs">
                              + {sk}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Score + Apply */}
                  <div className="flex flex-col items-center gap-3 shrink-0">
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${scoreColor(job.match_score)}`}>
                        {job.match_score}%
                      </div>
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                        <div className={`h-full ${scoreBg(job.match_score)} rounded-full`}
                             style={{ width: `${job.match_score}%` }} />
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">match</div>
                    </div>
                    <a
                      href={job.apply_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      Apply Now →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && jobs.length === 0 && !error && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-white text-lg">No matching jobs found</p>
          <p className="text-slate-400 mt-2">Try removing filters or upload a different resume</p>
        </div>
      )}
    </div>
  )
}
