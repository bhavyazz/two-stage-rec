import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadElders, addElder, updateElder, deleteElder, setElderPreferences } from '../elders'
import { UserIcon } from '../components/Icons'

const defaultConditions = ['Diabetes', 'Hypertension', 'Cardiovascular', 'COPD', 'Arthritis']
const defaultMeds = ['Metformin', 'Lisinopril', 'Atorvastatin', 'Aspirin']

function EmptyState({ onAdd }) {
  return (
    <div className="card">
      <h3>No elder profiles yet</h3>
      <p className="muted">Create a profile to get started. Profiles store basic medical information for personalized features.</p>
      <div style={{marginTop:12}}>
        <button className="btn primary" onClick={onAdd}>Add first elder</button>
      </div>
    </div>
  )
}

function ProfileCard({ elder, onOpen, onDelete }) {
  return (
    <article className="card feature-card" style={{cursor:'pointer'}} onClick={() => onOpen(elder)}>
      <div className="feature-top">
        <div className="icon-wrap"><UserIcon /></div>
        <div>
          <h3 style={{margin:0}}>{elder.name}</h3>
          <div className="muted small">Age {elder.age} • {elder.gender} • {elder.diet || '—'}</div>
        </div>
      </div>
      <div className="card-actions">
        <button className="btn" onClick={(e)=>{e.stopPropagation(); onOpen(elder)}}>View</button>
        <button className="btn" onClick={(e)=>{e.stopPropagation(); onDelete(elder.id)}} style={{marginLeft:8}}>Delete</button>
      </div>
    </article>
  )
}

function ProfileForm({ initial = {}, onCancel, onSave }) {
  const [name, setName] = useState(initial.name || '')
  const [age, setAge] = useState(initial.age || '')
  const [gender, setGender] = useState(initial.gender || 'Other')
  const [height, setHeight] = useState(initial.height || '')
  const [weight, setWeight] = useState(initial.weight || '')
  const [conditions, setConditions] = useState(initial.conditions || [])
  const [customCondition, setCustomCondition] = useState('')
  const [allergies, setAllergies] = useState(initial.allergies || '')
  const [meds, setMeds] = useState(initial.meds || [])
  const [customMed, setCustomMed] = useState('')
  const [diet, setDiet] = useState(initial.diet || 'Non-veg')
  const [likes, setLikes] = useState((initial.preferences && initial.preferences.likes) || [])
  const [dislikes, setDislikes] = useState((initial.preferences && initial.preferences.dislikes) || [])
  const [prefInput, setPrefInput] = useState('')
  const [prefTarget, setPrefTarget] = useState('likes')

  function toggleCondition(c) {
    setConditions((s) => (s.includes(c) ? s.filter(x => x !== c) : [...s, c]))
  }
  function toggleMed(m) {
    setMeds((s) => (s.includes(m) ? s.filter(x => x !== m) : [...s, m]))
  }

  function handleAddCondition() {
    if (!customCondition) return
    toggleCondition(customCondition)
    setCustomCondition('')
  }
  function handleAddMed() {
    if (!customMed) return
    toggleMed(customMed)
    setCustomMed('')
  }

  function submit(e) {
    e.preventDefault()
    const payload = { name, age, gender, height, weight, conditions, allergies, meds, diet, preferences: { likes, dislikes } }
    onSave(payload)
  }

  return (
    <form onSubmit={submit} className="stack">
      <label className="label"><span className="label-text">Name</span><input className="input" value={name} onChange={(e)=>setName(e.target.value)} required /></label>
      <div style={{display:'flex',gap:10}}>
        <label className="label" style={{flex:1}}><span className="label-text">Age</span><input type="number" className="input" value={age} onChange={(e)=>setAge(e.target.value)} required /></label>
        <label className="label" style={{flex:1}}><span className="label-text">Gender</span>
          <select className="input" value={gender} onChange={(e)=>setGender(e.target.value)}>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </label>
      </div>

      <div style={{display:'flex',gap:10}}>
        <label className="label" style={{flex:1}}><span className="label-text">Height (cm)</span><input className="input" value={height} onChange={(e)=>setHeight(e.target.value)} /></label>
        <label className="label" style={{flex:1}}><span className="label-text">Weight (kg)</span><input className="input" value={weight} onChange={(e)=>setWeight(e.target.value)} /></label>
      </div>

      <div>
        <div className="label-text">Medical conditions</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          {defaultConditions.map(c => (
            <button type="button" key={c} className={`btn ${ (conditions||[]).includes(c) ? 'primary' : '' }`} onClick={()=>toggleCondition(c)}>{c}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <input className="input" placeholder="Add condition" value={customCondition} onChange={(e)=>setCustomCondition(e.target.value)} />
          <button type="button" className="btn" onClick={handleAddCondition}>Add</button>
        </div>
      </div>

      <label className="label"><span className="label-text">Allergies</span><input className="input" value={allergies} onChange={(e)=>setAllergies(e.target.value)} placeholder="e.g. Penicillin, Peanuts" /></label>

      <div>
        <div className="label-text">Current medicines</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          {defaultMeds.map(m => (
            <button type="button" key={m} className={`btn ${ (meds||[]).includes(m) ? 'primary' : '' }`} onClick={()=>toggleMed(m)}>{m}</button>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <input className="input" placeholder="Add medicine" value={customMed} onChange={(e)=>setCustomMed(e.target.value)} />
          <button type="button" className="btn" onClick={handleAddMed}>Add</button>
        </div>
      </div>

      <div>
        <div className="label-text">Dietary preference</div>
        <div style={{display:'flex',gap:12,marginTop:8}}>
          <label style={{display:'flex',alignItems:'center',gap:8}}><input type="radio" name="diet" checked={diet==='Veg'} onChange={()=>setDiet('Veg')} /> Veg</label>
          <label style={{display:'flex',alignItems:'center',gap:8}}><input type="radio" name="diet" checked={diet==='Non-veg'} onChange={()=>setDiet('Non-veg')} /> Non-veg</label>
        </div>
      </div>

      <div>
        <div className="label-text">Food preferences</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
          <div style={{flex:1}}>
            <div className="muted small">Likes</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
              {likes.map((l, idx) => (
                <button key={l + idx} type="button" className="btn" onClick={() => setLikes(s => s.filter(x => x !== l))}>{l} ✕</button>
              ))}
            </div>
          </div>
          <div style={{flex:1}}>
            <div className="muted small">Dislikes</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>
              {dislikes.map((d, idx) => (
                <button key={d + idx} type="button" className="btn" onClick={() => setDislikes(s => s.filter(x => x !== d))}>{d} ✕</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{display:'flex',gap:8,marginTop:8}}>
          <select value={prefTarget} onChange={(e)=>setPrefTarget(e.target.value)} className="input" style={{width:120}}>
            <option value="likes">Add to Likes</option>
            <option value="dislikes">Add to Dislikes</option>
          </select>
          <input className="input" placeholder="e.g. mushrooms" value={prefInput} onChange={(e)=>setPrefInput(e.target.value)} />
          <button type="button" className="btn" onClick={()=>{
            const v = (prefInput||'').trim()
            if (!v) return
            if (prefTarget === 'likes') setLikes(s => s.includes(v) ? s : [...s, v])
            else setDislikes(s => s.includes(v) ? s : [...s, v])
            setPrefInput('')
          }}>Add</button>
        </div>
      </div>

      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <button className="btn primary" type="submit">Save profile</button>
      </div>
    </form>
  )
}

export default function Profiles() {
  const [elders, setElders] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const navigate = useNavigate()

  function normalize(raw) {
    if (!raw) return null
    return {
      id: raw.id || raw.elder_id || (raw.created_at ? String(raw.created_at) : undefined),
      name: raw.name,
      age: raw.age,
      gender: raw.gender,
      height: raw.height || raw.height_cm || '',
      weight: raw.weight || raw.weight_kg || '',
      conditions: raw.conditions || [],
      allergies: raw.allergies || '',
      meds: raw.medicines || raw.meds || [],
      diet: raw.diet || '',
      preferences: raw.preferences || (raw.diet ? (typeof raw.diet === 'string' ? (() => { try { return JSON.parse(raw.diet) } catch (e){ return [] } })() : raw.diet) : []),
      created_at: raw.created_at,
      updated_at: raw.updated_at
    }
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const list = await loadElders()
      if (!mounted) return
      setElders((list || []).map(normalize))
    })()
    return () => { mounted = false }
  }, [])

  async function refresh() {
    const list = await loadElders()
    setElders((list || []).map(normalize))
  }

  function handleAdd() {
    setEditing(null)
    setShowForm(true)
  }

  function handleSave(payload) {
    ;(async () => {
      let saved = null
      if (editing && editing.id) {
        saved = await updateElder(editing.id, payload)
      } else {
        saved = await addElder(payload)
      }
      // if preferences supplied, persist via dedicated endpoint
      try {
        if (payload && payload.preferences && saved && saved.id) {
          await setElderPreferences(saved.id, payload.preferences)
        }
      } catch (e) {
        console.warn('Failed saving preferences', e.message)
      }
      setShowForm(false)
      await refresh()
    })()
  }

  function handleOpen(elder) {
    setEditing(elder)
    setShowForm(true)
  }

  function handleDelete(id) {
    if (!confirm('Delete this profile?')) return
    ;(async () => {
      await deleteElder(id)
      await refresh()
    })()
  }

  function handleBack() {
    navigate(-1)
  }

  return (
    <main className="container">
      <div className="stack">
        <div className="card wide">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:260}}>
              <button className="back-btn" onClick={handleBack} aria-label="Go back">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.75 4.75a.75.75 0 0 1 0 1.06L8.56 9H16a.75.75 0 0 1 0 1.5H8.56l3.19 3.19a.75.75 0 0 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z"/></svg>
                Back
              </button>
              <div>
                <h2 style={{margin:0}}>Elder Profiles</h2>
                <p className="muted">Manage profiles for elders — create once, view and update details anytime.</p>
              </div>
            </div>
            <div>
              <button className="btn primary" onClick={handleAdd}>Add elder</button>
            </div>
          </div>
        </div>

        {elders.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <section className="feature-grid">
            {elders.map(e => (
              <ProfileCard key={e.id} elder={e} onOpen={handleOpen} onDelete={handleDelete} />
            ))}
          </section>
        )}

        {showForm && (
          <div className="card" style={{marginTop:8}}>
            <h3>{editing ? 'Edit profile' : 'New elder profile'}</h3>
            <ProfileForm initial={editing || {}} onCancel={()=>setShowForm(false)} onSave={handleSave} />
          </div>
        )}
      </div>
    </main>
  )
}
