const AUTH_KEY = 'hc_user_token'

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:4000/api'

export function isAuthenticated() {
  return !!localStorage.getItem(AUTH_KEY)
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  const data = await handleResponse(res)
  localStorage.setItem(AUTH_KEY, data.token)
  localStorage.setItem('hc_user_email', data.email)
  return data
}

export async function register(name, email, password) {
  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password })
  })
  return handleResponse(res)
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
  return handleResponse(res)
}

export async function resetPassword(token, password) {
  const res = await fetch(`${API_BASE}/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  })
  return handleResponse(res)
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
  localStorage.removeItem('hc_user_email')
}

export function getUserEmail() {
  return localStorage.getItem('hc_user_email') || ''
}
