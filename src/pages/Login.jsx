import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { login } from '../auth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-center">
      <div className="card login-card">
        <h1 className="brand">HealthCare</h1>
        <p className="muted">Secure provider portal</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="label">
            <span className="label-text">Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@clinic.org"
              required
            />
          </label>

          <label className="label">
            <span className="label-text">Password</span>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && <div className="error">{error}</div>}

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small muted">Use your account credentials. <a href="/forgot-password">Forgot?</a> or <a href="/register">Register</a></p>
      </div>
    </div>
  )
}
