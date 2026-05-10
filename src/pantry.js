const LOCAL_KEY = 'hc_pantry_v1'
const API_BASE = 'http://localhost:4000/api/pantry'
const AUTH_KEY = 'hc_user_token'

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_KEY)
  if (!token) return {}
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to load pantry', e)
    return []
  }
}

function saveLocal(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list))
}

export async function loadPantryItems() {
  try {
    const res = await fetch(API_BASE, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data
  } catch (err) {
    console.warn('Pantry API failed, using localStorage', err.message)
    return loadLocal()
  }
}

export async function savePantryItem(item) {
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.item || data
  } catch (err) {
    console.warn('Pantry save failed, falling back to local', err.message)
    const list = loadLocal()
    const entry = { id: Date.now().toString(36), ...item, created_at: new Date().toISOString() }
    list.unshift(entry)
    saveLocal(list)
    return entry
  }
}

export async function updatePantryItem(id, item) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error('API error')
    const data = await res.json()
    return data.item || data
  } catch (err) {
    console.warn('Pantry update failed, falling back to local', err.message)
    const list = loadLocal().map(i => (String(i.id) === String(id) ? { ...i, ...item } : i))
    saveLocal(list)
    return list.find(i => String(i.id) === String(id))
  }
}

export async function fetchRecipesForIngredients(ingredients, elderId = null) {
  // ingredients: array of names, elderId: optional elder_id for allergy filtering
  try {
    // call server-side ranked endpoint which returns ML-ranked recipes
    const payload = { ingredients }
    if (elderId) payload.elder_id = elderId
    console.log('[fetchRecipesForIngredients] Sending payload:', payload)
    const res = await fetch('http://localhost:4000/api/recipes/rank', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    })
    if (!res.ok) {
      const errorText = await res.text()
      console.error('[fetchRecipesForIngredients] API error status:', res.status, 'Response:', errorText)
      throw new Error(`Recipe rank API error: ${res.status} - ${errorText}`)
    }
    const data = await res.json()
    console.log('[fetchRecipesForIngredients] Success! Got recipes:', data)
    return data.recipes || data.ranked || []
  } catch (err) {
    console.error('[fetchRecipesForIngredients] Exception:', err.message, err)
    throw err
  }
}

export async function loadElders() {
  // load all elders for current user
  try {
    const res = await fetch('http://localhost:4000/api/elders', {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Elders API error')
    return await res.json()
  } catch (err) {
    console.warn('Failed to load elders', err.message)
    return []
  }
}

export async function loadElder(elderId) {
  // load single elder by id
  try {
    const res = await fetch(`http://localhost:4000/api/elders/${elderId}`, {
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('Elder API error')
    return await res.json()
  } catch (err) {
    console.warn('Failed to load elder', err.message)
    return null
  }
}

export async function deletePantryItem(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })
    if (!res.ok) throw new Error('API error')
    return true
  } catch (err) {
    console.warn('Pantry delete failed, removing from local', err.message)
    const list = loadLocal().filter((i) => String(i.id) !== String(id))
    saveLocal(list)
    return true
  }
}

export function clearPantry() {
  localStorage.removeItem(LOCAL_KEY)
}
