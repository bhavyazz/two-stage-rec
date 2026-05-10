import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { resetPassword } from '../auth'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('')
    setLoading(true)
    try {
      await resetPassword(token, password)
      setStatus('Password updated. Redirecting to sign in…')
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      setStatus(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card login-card">
        <h1 className="brand">Reset password</h1>
        <p className="muted">Set a new password for your account</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="label">
            <span className="label-text">New password</span>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {status && <div className="muted small">{status}</div>}
          <button className="btn primary" type="submit" disabled={loading}>{loading ? 'Setting…' : 'Set password'}</button>
        </form>
      </div>
    </div>
  )
}
