import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { loadPantryItems, savePantryItem, deletePantryItem, updatePantryItem, fetchRecipesForIngredients, loadElders } from '../pantry'

export default function Pantry() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState({})
  const [recipes, setRecipes] = useState([])
  const [recipeSort, setRecipeSort] = useState('score')
  const [recipeDetails, setRecipeDetails] = useState(null)
  const [sortBy, setSortBy] = useState('created_at')
  const [editingId, setEditingId] = useState(null)
  const [editFields, setEditFields] = useState({})
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [unit, setUnit] = useState('')
  const [status, setStatus] = useState('')
  const [listening, setListening] = useState(false)
  const [elders, setElders] = useState([])
  const [selectedElderId, setSelectedElderId] = useState(null)
  const [selectedRecipes, setSelectedRecipes] = useState({})
  const [shoppingList, setShoppingList] = useState(null)
  const [shoppingListChecked, setShoppingListChecked] = useState({})
  const recognitionRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => { 
    refresh()
    loadEldersData()
  }, [])

  async function loadEldersData() {
    const eldersList = await loadElders()
    setElders(eldersList || [])
  }

  async function refresh() {
    const list = await loadPantryItems()
    setItems(list || [])
  }

  async function handleAdd(e) {
    e && e.preventDefault()
    if (!name) return setStatus('Enter item name')
    setStatus('Saving...')
    const saved = await savePantryItem({ item_name: name, quantity: parseFloat(qty) || 1, unit, notes: null })
    setStatus('Saved')
    setName('')
    setQty('1')
    setUnit('')
    await refresh()
  }

  async function handleDelete(id) {
    if (!confirm('Delete item?')) return
    await deletePantryItem(id)
    await refresh()
  }

  function toggleSelect(id, name) {
    setSelected(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = name
      return next
    })
  }

  function startEdit(it) {
    setEditingId(it.id)
    setEditFields({ item_name: it.item_name || it.name || '', quantity: it.quantity || it.qty || 1, unit: it.unit || '' })
  }

  async function saveEdit(id) {
    const payload = { item_name: editFields.item_name, quantity: parseFloat(editFields.quantity) || 1, unit: editFields.unit }
    await updatePantryItem(id, payload)
    setEditingId(null)
    setEditFields({})
    await refresh()
  }

  function cancelEdit() { setEditingId(null); setEditFields({}) }

  function sortedItems() {
    const copy = [...(items || [])]
    if (sortBy === 'name') return copy.sort((a,b)=>String((a.item_name||a.name||'')).localeCompare(String((b.item_name||b.name||''))))
    return copy.sort((a,b)=>{ return new Date(b.created_at || 0) - new Date(a.created_at || 0) })
  }

  async function getRecipes() {
    const names = Object.values(selected)
    if (!names.length) return setRecipes([])
    console.log('[getRecipes] Selected ingredients:', names, 'Elder ID:', selectedElderId)
    setStatus('Fetching recipes...')
    try {
      const res = await fetchRecipesForIngredients(names, selectedElderId)
      console.log('[getRecipes] Received recipes:', res)
      const list = Array.isArray(res) ? res : res?.recipes || []
      setRecipes(list)
      setRecipeDetails(null)
      if (list.length > 0) {
        setStatus(`Got ${list.length} recipes!`)
      } else if (res?.message) {
        setStatus(res.message)
      } else {
        setStatus('No recipes found. Try selecting different items.')
      }
    } catch (err) {
      console.error('[getRecipes] Failed:', err)
      setRecipes([])
      setStatus(err?.message ? `Recipe search failed: ${err.message}` : 'Recipe search failed')
    }
  }

  async function openRecipe(id) {
    try {
      const token = localStorage.getItem('hc_user_token')
      const h = token ? { Authorization: `Bearer ${token}` } : {}
      const r = await fetch(`http://localhost:4000/api/recipes/${id}`, { headers: { ...h } })
      if (!r.ok) throw new Error('Failed')
      const d = await r.json()
      setRecipeDetails(d.recipe || null)
    } catch (e) {
      console.error('Failed to load recipe details', e)
    }
  }

  async function generateShoppingList() {
    try {
      const selectedIds = Object.keys(selectedRecipes).filter(id => selectedRecipes[id])
      if (selectedIds.length === 0) {
        setStatus('Select at least one recipe')
        return
      }
      setStatus('Generating...')
      const token = localStorage.getItem('hc_user_token')
      const h = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch('http://localhost:4000/api/recipes/generate-shopping-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ recipe_ids: selectedIds })
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setShoppingList(data.shopping_list || [])
      setShoppingListChecked({})
      setStatus('Shopping list generated!')
    } catch (e) {
      console.error('Failed to generate shopping list', e)
      setStatus('Failed to generate shopping list')
    }
  }

  function toggleRecipeSelection(recipeId) {
    setSelectedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }))
  }

  function toggleShoppingItem(index) {
    setShoppingListChecked(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  function clearShoppingList() {
    setShoppingList(null)
    setShoppingListChecked({})
    setSelectedRecipes({})
  }

  function downloadShoppingList() {
    if (!shoppingList) return
    const text = shoppingList.map(item => `${item.checked ? '✓' : '☐'} ${item.name}${item.amount ? ' - ' + item.amount : ''}`).join('\n')
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text))
    element.setAttribute('download', 'shopping-list.txt')
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  // Voice input via Web Speech API
  function startListening() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setStatus('Speech recognition not supported in this browser')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript
      // naive parse: allow "5 bananas" or "bananas 5"
      setStatus('Heard: ' + text)
      const m = text.match(/(\d+(?:\.\d+)?)\s*(\w+)/)
      if (m) {
        setQty(m[1])
        setName(m[2])
      } else {
        setName(text)
      }
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = (err) => { console.error(err); setStatus('Recognition error'); setListening(false) }
    recognition.start()
    setListening(true)
    recognitionRef.current = recognition
  }

  function stopListening() {
    if (recognitionRef.current) recognitionRef.current.stop()
    setListening(false)
  }

  function handleBack() {
    navigate(-1)
  }

  return (
    <div>
      <NavBar />
      <main className="container">
        <div className="stack">
          <div className="card wide">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <button className="back-btn" onClick={handleBack} aria-label="Go back">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.75 4.75a.75.75 0 0 1 0 1.06L8.56 9H16a.75.75 0 0 1 0 1.5H8.56l3.19 3.19a.75.75 0 0 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z"/></svg>
                Back
              </button>
              <div style={{flex:1,minWidth:240}}>
                <h2 style={{margin:0}}>Pantry</h2>
                <p className="muted">View and add pantry items. Use voice input to dictate items quickly.</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>Add item</h3>
            <form onSubmit={handleAdd} className="stack">
              <div style={{display:'grid',gridTemplateColumns:'1.2fr 0.6fr 0.6fr auto',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <input className="input" placeholder="Item name" value={name} onChange={(e)=>setName(e.target.value)} />
                <input className="input" placeholder="Qty" value={qty} onChange={(e)=>setQty(e.target.value)} />
                <input className="input" placeholder="Unit" value={unit} onChange={(e)=>setUnit(e.target.value)} />
                <button className="btn primary" type="submit">Add</button>
              </div>
              <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                <button type="button" className="btn" onClick={listening ? stopListening : startListening}>{listening ? 'Stop' : 'Speak'}</button>
                <div className="muted small" style={{minHeight:20}}>{status}</div>
              </div>
            </form>
          </div>

          <div className="card">
            <h3 style={{marginTop:0}}>My pantry items</h3>
            <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8,flexWrap:'wrap'}}>
              <label className="muted small">Sort:</label>
              <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)}>
                <option value="created_at">Newest</option>
                <option value="name">Name</option>
              </select>
              {elders.length > 0 && (
                <>
                  <label className="muted small" style={{marginLeft:8}}>Consider elder:</label>
                  <select value={selectedElderId || ''} onChange={(e)=>setSelectedElderId(e.target.value || null)}>
                    <option value="">None (ignore allergies)</option>
                    {elders.map(e => (
                      <option key={e.elder_id} value={e.elder_id}>{e.name}</option>
                    ))}
                  </select>
                </>
              )}
              <button className="btn" style={{marginLeft:8}} onClick={getRecipes}>Get recipes</button>
            </div>

            {sortedItems().length === 0 ? (
              <div className="muted">No pantry items yet.</div>
            ) : (
              <ul>
                {sortedItems().map(it => (
                  <li key={it.id || it.item_name + it.created_at} style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <input type="checkbox" aria-label="select" checked={!!selected[it.id]} onChange={()=>toggleSelect(it.id, it.item_name || it.name || '')} />
                      {editingId === it.id ? (
                        <div>
                          <input className="input" value={editFields.item_name} onChange={(e)=>setEditFields(f=>({...f,item_name:e.target.value}))} />
                          <div style={{display:'flex',gap:6}}>
                            <input className="input" style={{width:80}} value={editFields.quantity} onChange={(e)=>setEditFields(f=>({...f,quantity:e.target.value}))} />
                            <input className="input" style={{width:80}} value={editFields.unit} onChange={(e)=>setEditFields(f=>({...f,unit:e.target.value}))} />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{fontWeight:600}}>{it.item_name || it.name || it.item}</div>
                          <div className="muted small">{it.quantity || it.qty} {it.unit || ''}</div>
                        </div>
                      )}
                    </div>
                    <div>
                      {editingId === it.id ? (
                        <>
                          <button className="btn" onClick={()=>saveEdit(it.id)}>Save</button>
                          <button className="btn" onClick={cancelEdit}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="btn" onClick={()=>startEdit(it)}>Edit</button>
                          <button className="btn" onClick={()=>handleDelete(it.id || it.id)}>Delete</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          {recipes.length > 0 && (
            <div className="card">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <h3 style={{margin:0}}>Recipes</h3>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <label className="muted small">Sort:</label>
                  <select value={recipeSort} onChange={(e)=>setRecipeSort(e.target.value)}>
                    <option value="score">Score</option>
                    <option value="matches">Matches</option>
                  </select>
                </div>
              </div>
              {recipes.length > 0 && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 8, border: '1px solid rgba(92,225,230,0.2)' }}>
                  <div style={{ fontSize: 14, marginBottom: 8, color: 'var(--accent)' }}>
                    {Object.values(selectedRecipes).filter(Boolean).length} recipe(s) selected
                  </div>
                  <button className="btn" onClick={generateShoppingList} style={{ marginRight: 8 }}>
                    📋 Generate Shopping List
                  </button>
                </div>
              )}
              <ul>
                {(() => {
                  const list = [...recipes]
                  if (recipeSort === 'matches') {
                    list.sort((a,b) => (b.usedIngredientCount || 0) - (a.usedIngredientCount || 0) || (b.score||0) - (a.score||0))
                  } else {
                    list.sort((a,b) => (b.score||0) - (a.score||0))
                  }
                  return list.map(r => (
                    <li key={r.id || r.recipe_id} style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'center'}}>
                      <div style={{display:'flex',alignItems:'center',gap:12,flex:1}}>
                        <input 
                          type="checkbox" 
                          checked={!!selectedRecipes[r.id || r.recipe_id]}
                          onChange={() => toggleRecipeSelection(r.id || r.recipe_id)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:20}}>{r.title}</div>
                          <div className="muted small">Score: {typeof r.score !== 'undefined' ? Number(r.score).toFixed(3) : 'N/A'}</div>
                          <div className="muted small">Uses {typeof r.usedIngredientCount !== 'undefined' ? r.usedIngredientCount : '0'} selected, missing {typeof r.missedIngredientCount !== 'undefined' ? r.missedIngredientCount : '0'}</div>
                        </div>
                      </div>
                      <div>
                        <button className="btn" onClick={()=>openRecipe(r.id || r.recipe_id)}>Open</button>
                      </div>
                    </li>
                  ))
                })()}
              </ul>
            </div>
          )}

          {recipeDetails && (
            <div className="card">
              <h3>{recipeDetails.title}</h3>
              {(() => {
                const PLACEHOLDER = 'https://via.placeholder.com/320x200?text=No+Image'
                const src = recipeDetails.image || PLACEHOLDER
                return <img src={src} alt={recipeDetails.title || 'recipe'} style={{width:200,maxWidth:'100%'}} onError={(e)=>{ e.currentTarget.src = PLACEHOLDER }} />
              })()}
              <h4>Ingredients</h4>
              <ul>
                {recipeDetails.ingredients.map(i=> <li key={i.id}>{i.original}</li>)}
              </ul>
              <h4>Steps</h4>
              <ol>
                {recipeDetails.steps.map(s=> <li key={s.number}>{s.step}</li>)}
              </ol>
              {recipeDetails.sourceUrl && recipeDetails.sourceUrl.trim() !== '' ? (
                <a href={recipeDetails.sourceUrl} target="_blank" rel="noreferrer" style={{ cursor: 'pointer', color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--accent)' }}>
                  View source
                </a>
              ) : null}
            </div>
          )}

          {shoppingList && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>🛒 Shopping List</h3>
                <div>
                  <button className="btn" onClick={downloadShoppingList} style={{ marginRight: 8 }}>
                    📥 Download
                  </button>
                  <button className="btn" onClick={clearShoppingList} style={{ backgroundColor: '#ef4444' }}>
                    Clear
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 14 }}>
                {Object.values(shoppingListChecked).filter(Boolean).length} of {shoppingList.length} items checked
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {shoppingList.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      borderBottom: '1px solid rgba(92,225,230,0.2)',
                      backgroundColor: shoppingListChecked[idx] ? 'rgba(34,197,94,0.1)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onClick={() => toggleShoppingItem(idx)}
                  >
                    <input
                      type="checkbox"
                      checked={!!shoppingListChecked[idx]}
                      onChange={() => toggleShoppingItem(idx)}
                      style={{ cursor: 'pointer', width: 20, height: 20 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        textDecoration: shoppingListChecked[idx] ? 'line-through' : 'none',
                        color: shoppingListChecked[idx] ? 'var(--muted)' : 'var(--text)',
                        fontWeight: 500
                      }}>
                        {item.name}
                      </div>
                      {item.amount && (
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                          {item.amount}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
