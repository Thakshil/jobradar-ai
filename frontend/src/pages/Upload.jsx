import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = 'http://localhost:8000'

export default function Upload() {
  const [file, setFile]       = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [progress, setProgress] = useState(0)
  const inputRef              = useRef()
  const navigate              = useNavigate()

  const handleDrop = (e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  const handleUpload = async () => {
    if (!file) return setError('Please select a resume file.')
    setLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await axios.post(`${API}/api/resume/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
      })
      const { session_id, resume } = res.data
      localStorage.setItem('session_id', session_id)
      localStorage.setItem('resume', JSON.stringify(resume))
      navigate('/dashboard')
    } catch (e) {
      setError('Upload failed. Make sure backend is running at localhost:8000')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-2xl">🎯</div>
            <span className="text-3xl font-bold text-white">JobRadar <span className="text-blue-400">AI</span></span>
          </div>
          <p className="text-slate-400 text-lg">Upload your resume. Get matched to real jobs instantly.</p>
        </div>

        {/* Upload Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <div
            className="border-2 border-dashed border-slate-600 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
          >
            {file ? (
              <div>
                <div className="text-4xl mb-3">📄</div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-slate-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <div className="text-5xl mb-4">📂</div>
                <p className="text-white font-medium text-lg">Drop your resume here</p>
                <p className="text-slate-400 mt-2">or click to browse • PDF or DOCX</p>
              </div>
            )}
            <input ref={inputRef} type="file" accept=".pdf,.docx" className="hidden"
              onChange={(e) => setFile(e.target.files[0])} />
          </div>

          {error && (
            <div className="mt-4 bg-red-900/40 border border-red-500 rounded-lg p-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-4">
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-slate-400 text-sm mt-2 text-center">Analyzing resume... {progress}%</p>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="mt-6 w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors text-lg"
          >
            {loading ? 'Processing...' : '🚀 Find My Jobs'}
          </button>
        </div>

        <p className="text-center text-slate-500 text-sm mt-6">
          Your resume is processed locally. No data is stored permanently.
        </p>
      </div>
    </div>
  )
}
