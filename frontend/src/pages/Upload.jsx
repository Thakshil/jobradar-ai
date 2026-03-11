import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Upload() {
  const [file, setFile]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef                = useRef()
  const navigate                = useNavigate()

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return setError('Please select a resume file.')
    setLoading(true); setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post(`${API}/api/resume/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      })
      localStorage.setItem('session_id', res.data.session_id)
      localStorage.setItem('resume', JSON.stringify(res.data.resume))
      navigate('/dashboard')
    } catch { setError('Upload failed. Ensure backend is running at localhost:8000') }
    finally { setLoading(false) }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#07090f;font-family:'DM Sans',sans-serif;min-height:100vh}
        .root{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:2rem;position:relative;overflow:hidden}
        .orb{position:fixed;border-radius:50%;filter:blur(100px);pointer-events:none}
        .o1{width:700px;height:700px;background:rgba(79,110,247,0.12);top:-300px;left:-200px;animation:drift 10s ease-in-out infinite}
        .o2{width:500px;height:500px;background:rgba(124,58,237,0.1);bottom:-150px;right:-150px;animation:drift 12s ease-in-out infinite reverse}
        .o3{width:400px;height:400px;background:rgba(14,165,233,0.07);top:50%;left:50%;transform:translate(-50%,-50%);animation:pulse 6s ease-in-out infinite}
        @keyframes drift{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-40px)}}
        @keyframes pulse{0%,100%{transform:translate(-50%,-50%) scale(1)}50%{transform:translate(-50%,-50%) scale(1.15)}}
        .grid{position:fixed;inset:0;background-image:linear-gradient(rgba(79,110,247,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(79,110,247,0.04) 1px,transparent 1px);background-size:50px 50px;pointer-events:none}
        .wrap{position:relative;z-index:10;width:100%;max-width:500px}
        .logo-area{text-align:center;margin-bottom:2.5rem;animation:fadeUp .7s ease both}
        .logo-row{display:inline-flex;align-items:center;gap:.8rem;margin-bottom:.75rem}
        .logo-icon{width:50px;height:50px;background:linear-gradient(135deg,#4f6ef7,#7c3aed);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:0 0 40px rgba(79,110,247,.5)}
        .logo-name{font-family:'Syne',sans-serif;font-size:2rem;font-weight:800;letter-spacing:-.03em;color:#fff}
        .logo-name span{background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .logo-tag{color:#475569;font-size:.9rem;font-weight:300;letter-spacing:.03em}
        .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:24px;padding:2.5rem;backdrop-filter:blur(20px);box-shadow:0 30px 80px rgba(0,0,0,.5);animation:fadeUp .7s .1s ease both}
        .drop{border:2px dashed rgba(99,102,241,.3);border-radius:16px;padding:2.5rem 2rem;text-align:center;cursor:pointer;transition:all .3s ease;background:rgba(99,102,241,.03);position:relative;overflow:hidden}
        .drop:hover,.drop.over{border-color:rgba(99,102,241,.7);background:rgba(99,102,241,.07);transform:translateY(-2px);box-shadow:0 12px 40px rgba(99,102,241,.15)}
        .drop-emoji{font-size:2.8rem;display:block;margin-bottom:.8rem;animation:bob 3s ease-in-out infinite}
        @keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .drop-title{color:#e2e8f0;font-size:1.05rem;font-weight:500;margin-bottom:.3rem}
        .drop-sub{color:#475569;font-size:.82rem}
        .file-pill{display:flex;align-items:center;gap:.75rem;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.25);border-radius:10px;padding:.75rem 1rem;margin-top:1rem}
        .file-info{flex:1;min-width:0}
        .file-nm{color:#c7d2fe;font-size:.85rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .file-sz{color:#64748b;font-size:.72rem}
        .pbar{margin-top:1.25rem}
        .pbar-track{height:3px;background:rgba(255,255,255,.07);border-radius:99px;overflow:hidden}
        .pbar-fill{height:100%;background:linear-gradient(90deg,#4f6ef7,#a78bfa);border-radius:99px;transition:width .3s ease;box-shadow:0 0 8px rgba(99,102,241,.6)}
        .pbar-lbl{color:#475569;font-size:.72rem;text-align:right;margin-top:.3rem}
        .err{margin-top:1rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:.7rem 1rem;color:#fca5a5;font-size:.83rem}
        .btn{margin-top:1.5rem;width:100%;padding:.9rem;background:linear-gradient(135deg,#4f6ef7,#7c3aed);color:#fff;font-family:'Syne',sans-serif;font-weight:700;font-size:.95rem;letter-spacing:.04em;border:none;border-radius:14px;cursor:pointer;transition:all .3s ease;position:relative;overflow:hidden}
        .btn::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.12),transparent);opacity:0;transition:opacity .3s}
        .btn:hover::after{opacity:1}
        .btn:hover{transform:translateY(-2px);box-shadow:0 12px 40px rgba(79,110,247,.4)}
        .btn:disabled{background:rgba(255,255,255,.06);color:#334155;cursor:not-allowed;transform:none;box-shadow:none}
        .stats{display:flex;justify-content:center;gap:2.5rem;margin-top:2rem;animation:fadeUp .7s .3s ease both}
        .stat-n{font-family:'Syne',sans-serif;font-size:1.5rem;font-weight:800;background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center}
        .stat-l{color:#334155;font-size:.65rem;text-transform:uppercase;letter-spacing:.1em;text-align:center}
        .foot{text-align:center;color:#1e293b;font-size:.72rem;margin-top:1.5rem;animation:fadeUp .7s .4s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="root">
        <div className="orb o1"/><div className="orb o2"/><div className="orb o3"/>
        <div className="grid"/>
        <div className="wrap">
          <div className="logo-area">
            <div className="logo-row">
              <div className="logo-icon">⚡</div>
              <div className="logo-name">Thaks <span>Radar</span></div>
            </div>
            <div className="logo-tag">AI-powered job intelligence for ambitious engineers</div>
          </div>

          <div className="card">
            <div
              className={`drop ${dragOver ? 'over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current.click()}
            >
              <span className="drop-emoji">{file ? '📄' : '🎯'}</span>
              <div className="drop-title">{file ? file.name : 'Drop your resume here'}</div>
              <div className="drop-sub">{file ? `${(file.size/1024).toFixed(1)} KB • Ready to scan` : 'Click to browse · PDF or DOCX'}</div>
              <input ref={inputRef} type="file" accept=".pdf,.docx" style={{display:'none'}} onChange={(e) => setFile(e.target.files[0])} />
            </div>

            {file && (
              <div className="file-pill">
                <span style={{fontSize:'1.2rem'}}>📎</span>
                <div className="file-info">
                  <div className="file-nm">{file.name}</div>
                  <div className="file-sz">{(file.size/1024).toFixed(1)} KB · {file.name.split('.').pop().toUpperCase()}</div>
                </div>
                <span style={{color:'#4ade80',fontSize:'1rem'}}>✓</span>
              </div>
            )}

            {loading && (
              <div className="pbar">
                <div className="pbar-track"><div className="pbar-fill" style={{width:`${progress}%`}}/></div>
                <div className="pbar-lbl">Analyzing skills… {progress}%</div>
              </div>
            )}

            {error && <div className="err">⚠ {error}</div>}

            <button className="btn" onClick={handleUpload} disabled={!file || loading}>
              {loading ? '⏳  Processing Resume...' : '⚡  Scan My Jobs Now'}
            </button>
          </div>

          <div className="stats">
            {[['250+','Jobs / Day'],['3','Portals'],['AI','Matching'],['Free','Forever']].map(([n,l]) => (
              <div key={l}><div className="stat-n">{n}</div><div className="stat-l">{l}</div></div>
            ))}
          </div>
          <div className="foot">Your resume is processed in real-time and never stored permanently.</div>
        </div>
      </div>
    </>
  )
}
