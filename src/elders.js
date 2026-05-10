const LOCAL_KEY = 'hc_elders_v1'
const API_BASE = 'http://localhost:4000/api/elders'
const AUTH_KEY = 'hc_user_token'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_KEY)
  if (!token) return { 'Content-Type': 'application/json' }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

async function fallbackFetch(fn) {
  try {
    return await fn()
  } catch (err) {
    console.warn('Network request failed, falling back to localStorage', err.message)
    // fallback to localStorage operations
    return null
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load elders', e)
    return []
  }
}

function saveLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export async function loadElders() {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(API_BASE, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return res.json()
  })
  if (remote) return remote
  return loadLocal()
}

export async function addElder(elder) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(elder)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.elder
  })
  if (remote) return remote
  const list = loadLocal()
  const id = Date.now().toString(36)
  const entry = { id, created_at: new Date().toISOString(), ...elder }
  list.unshift(entry)
  saveLocal(list)
  return entry
}

export async function updateElder(id, patch) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(patch)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.elder
  })
  if (remote) return remote
  const list = loadLocal().map((e) => (e.id === id ? { ...e, ...patch, updated_at: new Date().toISOString() } : e))
  saveLocal(list)
  return list.find((e) => e.id === id)
}

export async function getElder(id) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return res.json()
  })
  if (remote) return remote
  return loadLocal().find((e) => e.id === id)
}

export async function deleteElder(id) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return true
  })
  if (remote !== null) return remote
  const list = loadLocal().filter((e) => e.id !== id)
  saveLocal(list)
  return true
}

export async function setElderPreferences(id, preferences) {
  const remote = await fallbackFetch(async () => {
    const res = await fetch(`${API_BASE}/${id}/preferences`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ preferences })
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.elder
  })
  if (remote) return remote
  // fallback to localStorage: merge into local elder entry
  const list = loadLocal().map((e) => (e.id === id ? { ...e, preferences, updated_at: new Date().toISOString() } : e))
  saveLocal(list)
  return list.find((e) => e.id === id)
}
