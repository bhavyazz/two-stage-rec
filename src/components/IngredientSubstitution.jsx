import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './IngredientSubstitution.css'

/**
 * Smart Ingredient Substitution Component
 * Recommends healthier alternatives using ML-based content filtering
 */
export default function IngredientSubstitution() {
  const [ingredient, setIngredient] = useState('')
  const [condition, setCondition] = useState('')
  const [elders, setElders] = useState([])
  const [selectedElderId, setSelectedElderId] = useState('')
  const [allergies, setAllergies] = useState('')
  const [substitutions, setSubstitutions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const API_BASE =
    (import.meta?.env?.VITE_API_BASE && `${import.meta.env.VITE_API_BASE}`.replace(/\/$/, '')) ||
    'http://localhost:4000/api'

  const conditionPlaceholders = [
    'Diabetes',
    'Hypertension / high BP',
    'Heart disease',
    'Kidney disease',
    'Celiac / gluten free',
    'High cholesterol',
    'Weight loss / low carb',
    'Custom: e.g. low sodium'
  ]

  const commonIngredients = [
    'White Rice',
    'White Bread',
    'Regular Pasta',
    'White Sugar',
    'Whole Milk',
    'Potato',
    'Butter',
    'Regular Milk'
  ]

  useEffect(() => {
    const token = localStorage.getItem('hc_user_token')
    if (!token) return

    fetch(`${API_BASE}/elders`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setElders(data)
      })
      .catch((err) => console.warn('Elder fetch failed', err))
  }, [API_BASE])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ingredient.trim()) {
      setError('Please enter an ingredient')
      return
    }

    const token = localStorage.getItem('hc_user_token')
    if (!token) {
      setError('Please log in again to use substitutions')
      return
    }

    setLoading(true)
    setError('')
    setSubstitutions(null)

    try {
      const response = await fetch(`${API_BASE}/nutrition/substitute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ingredient: ingredient.trim(),
          condition: condition !== 'None' ? condition : null,
          topN: 3,
          elderId: selectedElderId || null,
          allergies: allergies
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data.error || `Request failed (${response.status})`)
        return
      }

      const enriched = {
        ...data.data,
        elder: data.elder || data.data?.elder || null,
        allergies: data.allergies || []
      }
      setSubstitutions(enriched)
      if (data.allergies) {
        setAllergies(data.allergies.join(', '))
      }
    } catch (err) {
      setError('Error connecting to server. Is the backend running on port 4000?')
      console.error('Ingredient substitution fetch error', err)
    } finally {
      setLoading(false)
    }
  }

  const handleQuickSelect = (ing) => {
    setIngredient(ing)
  }

  const handleBack = () => navigate(-1)

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="substitution-header" style={{marginBottom:18}}>
        <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:8}}>
          <button className="back-btn" onClick={handleBack} aria-label="Go back">
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.75 4.75a.75.75 0 0 1 0 1.06L8.56 9H16a.75.75 0 0 1 0 1.5H8.56l3.19 3.19a.75.75 0 0 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z"/></svg>
            Back
          </button>
          <div className="pill">Smart Substitutions</div>
        </div>
        <h2 style={{margin:'0 0 6px 0'}}>Modern, safe swaps for every ingredient</h2>
        <p className="muted" style={{margin:0}}>Glassmorphic calm with precise recommendations that honor allergies and elder context.</p>
      </div>

      <form onSubmit={handleSubmit} className="substitution-form glass">
        <div className="form-grid">
          <div className="form-group floating">
            <input
              id="ingredient"
              type="text"
              value={ingredient}
              onChange={(e) => setIngredient(e.target.value)}
              placeholder=" "
              className="input-field"
            />
            <label htmlFor="ingredient">Ingredient</label>
            <div className="helper-text">e.g., White Rice, Butter, Regular Pasta</div>
            <div className="quick-select">
              <span className="muted small">Quick picks:</span>
              {commonIngredients.map((ing) => (
                <button
                  key={ing}
                  type="button"
                  className="quick-btn"
                  onClick={() => handleQuickSelect(ing)}
                >
                  {ing}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group floating">
            <input
              id="condition"
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder=" "
              className="input-field"
              list="condition-hints"
            />
            <label htmlFor="condition">Health condition (optional)</label>
            <datalist id="condition-hints">
              {conditionPlaceholders.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <div className="helper-text">Supports free text: diabetes, low sodium, PCOS, etc.</div>
          </div>

          <div className="form-group floating">
            <select
              id="elder"
              className="input-field"
              value={selectedElderId}
              onChange={(e) => setSelectedElderId(e.target.value)}
            >
              <option value="">-- None --</option>
              {elders.map((e) => (
                <option key={e.elder_id} value={e.elder_id}>
                  {e.name || 'Unnamed elder'}
                </option>
              ))}
            </select>
            <label htmlFor="elder">Elder profile (optional)</label>
            <div className="helper-text">Auto-applies their conditions and allergies.</div>
          </div>

          <div className="form-group floating">
            <input
              id="allergies"
              type="text"
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder=" "
              className="input-field"
            />
            <label htmlFor="allergies">Allergies (comma-separated)</label>
            <div className="helper-text">We will never suggest ingredients containing these.</div>
          </div>
        </div>

        <div style={{display:'flex', gap:10, justifyContent:'flex-start'}}>
          <button type="submit" disabled={loading} className="btn primary glow">
            {loading ? 'Finding Alternatives...' : 'Run Smart Substitutions'}
          </button>
        </div>
      </form>
      {error && <div className="error">{error}</div>}

      {substitutions && (
        <div className="results-container" style={{marginTop:16, display:'grid', gap:14}}>
          <div className="card glass-panel">
            <h3 style={{marginTop:0}}>Original Ingredient</h3>
            <div className="ingredient-name" style={{fontSize:18, fontWeight:700}}>{substitutions.original.name}</div>
            <div className="ingredient-description muted">
              {substitutions.original.description}
            </div>
            <div className="nutrition-grid">
              <div className="nutrition-item">
                <span className="label">Calories</span>
                <span className="value">{substitutions.original.calories}</span>
              </div>
              <div className="nutrition-item">
                <span className="label">Protein</span>
                <span className="value">{substitutions.original.protein}g</span>
              </div>
              <div className="nutrition-item">
                <span className="label">Carbs</span>
                <span className="value">{substitutions.original.carbs}g</span>
              </div>
              <div className="nutrition-item">
                <span className="label">Fiber</span>
                <span className="value">{substitutions.original.fiber}g</span>
              </div>
              <div className="nutrition-item">
                <span className="label">GI</span>
                <span className="value">{substitutions.original.glycemic_index}</span>
              </div>
              <div className="nutrition-item">
                <span className="label">Health Score</span>
                <span className="value">{substitutions.original.healthScore}/10</span>
              </div>
            </div>
          </div>

          <div className="card glass-panel">
            <h3 style={{marginTop:0, display:'flex', gap:10, alignItems:'center'}}>
              ✨ Healthier Alternatives
              {substitutions.condition !== 'none' && (
                <span className="pill" style={{fontSize:11}}>for {substitutions.condition}</span>
              )}
              {substitutions?.elder && (
                <span className="pill" style={{fontSize:11}}>Elder: {substitutions.elder.name || 'Profile'}</span>
              )}
            </h3>

            {substitutions?.allergies && substitutions.allergies.length > 0 && (
              <p className="muted small">Allergies applied: {substitutions.allergies.join(', ')}</p>
            )}

            {substitutions.recommendations.length === 0 ? (
              <p className="muted">No alternatives found for this ingredient.</p>
            ) : (
              <div className="recommendations-grid">
                {substitutions.recommendations.map((rec, idx) => (
                  <div key={rec.name} className="recommendation-card glass-panel">
                    <div className="rank">#{idx + 1}</div>
                    <div className="ingredient-name">{rec.name}</div>
                    <div className="ingredient-description">
                      {rec.description}
                    </div>

                    <div className="reason-badge">
                      💡 {rec.reason}
                    </div>

                    <div className="nutrition-grid">
                      <div className="nutrition-item">
                        <span className="label">Calories</span>
                        <span className="value">{rec.calories}</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="label">Protein</span>
                        <span className="value">{rec.protein}g</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="label">Carbs</span>
                        <span className="value">{rec.carbs}g</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="label">Fiber</span>
                        <span className="value">{rec.fiber}g</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="label">GI</span>
                        <span className="value">{rec.glycemic_index}</span>
                      </div>
                      <div className="nutrition-item">
                        <span className="label">Health Score</span>
                        <span className="value">{rec.healthScore}/10</span>
                      </div>
                    </div>

                    <div className="scores">
                      <div className="score-item">
                        <span>Similarity</span>
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{ width: `${rec.similarity * 100}%` }}
                          ></div>
                        </div>
                        {(rec.similarity * 100).toFixed(0)}%
                      </div>
                      <div className="score-item">
                        <span>Health Boost</span>
                        <div className="score-bar">
                          <div
                            className="score-fill positive"
                            style={{
                              width: `${Math.max(0, rec.healthImprovement * 100)}%`
                            }}
                          ></div>
                        </div>
                        {rec.healthImprovement > 0 ? '+' : ''}
                        {(rec.healthImprovement * 10).toFixed(1)}
                      </div>
                      <div className="score-item">
                        <span>Match Score</span>
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{ width: `${rec.overallScore * 100}%` }}
                          ></div>
                        </div>
                        {(rec.overallScore * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card glass-panel">
            <h4 style={{marginTop:0}}>📊 How It Works</h4>
            <ul>
              <li>
                <strong>Cosine Similarity:</strong> Compares normalized nutrition
                profiles
              </li>
              <li>
                <strong>Health Scoring:</strong> Evaluates based on glycemic
                index, fiber, and nutrients
              </li>
              <li>
                <strong>Condition-Based Filtering:</strong> Applies health
                constraints if specified
              </li>
              <li>
                <strong>Match Score:</strong> Combines similarity, health
                improvement, and condition compatibility
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
