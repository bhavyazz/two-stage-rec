import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

export default function Nutrition() {
  const [entries, setEntries] = useState([])
  const [item, setItem] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [status, setStatus] = useState('')
  const navigate = useNavigate()

  function handleAdd() {
    if (!item || !calories) {
      setStatus('Item name and calories are required')
      return
    }

    const newEntry = {
      item,
      calories,
      protein: protein || '—'
    }

    setEntries([...entries, newEntry])
    setItem('')
    setCalories('')
    setProtein('')
    setStatus('Added')
  }

  function handleBack() {
    navigate(-1)
  }

  return (
    <div>
      <NavBar />

      <main className="container">
        <div className="stack">
          {/* Header card */}
          <div className="card wide">
            <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <button className="back-btn" onClick={handleBack} aria-label="Go back">
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.75 4.75a.75.75 0 0 1 0 1.06L8.56 9H16a.75.75 0 0 1 0 1.5H8.56l3.19 3.19a.75.75 0 0 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z"/></svg>
                Back
              </button>
              <div>
                <h2 style={{ margin: 0 }}>Nutrition Tracker</h2>
                <p className="muted">Track daily food intake and basic nutritional values.</p>
              </div>
            </div>
          </div>

          {/* Add entry card */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Add Food Item</h3>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <input
                className="input"
                placeholder="Food item (e.g. Rice)"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                style={{ flex: '1 1 200px' }}
              />
              <input
                className="input"
                placeholder="Calories"
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                style={{ flex: '1 1 120px' }}
              />
              <input
                className="input"
                placeholder="Protein (g)"
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                style={{ flex: '1 1 120px' }}
              />
            </div>

            <div style={{ display: 'flex', marginTop: 12, alignItems: 'center' }}>
              <button className="btn primary" onClick={handleAdd}>
                Add Entry
              </button>
              <div className="muted small" style={{ marginLeft: 'auto' }}>
                {status}
              </div>
            </div>
          </div>

          {/* Entries list */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Today’s Entries</h3>

            {entries.length === 0 ? (
              <div className="muted">No nutrition data added yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="muted small">
                    <th align="left">Item</th>
                    <th align="left">Calories</th>
                    <th align="left">Protein</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i}>
                      <td>{e.item}</td>
                      <td>{e.calories}</td>
                      <td>{e.protein}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
