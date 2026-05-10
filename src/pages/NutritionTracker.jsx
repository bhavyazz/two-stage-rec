import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import * as nutritionAPI from '../nutrition'

export default function NutritionTracker() {
  const [allEntries, setAllEntries] = useState([])
  const [food_name, setFoodName] = useState('')
  const [quantity, setQuantity] = useState('100')
  const [unit, setUnit] = useState('g')
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [sortField, setSortField] = useState('date_consumed')
  const [sortDirection, setSortDirection] = useState('desc')
  const [editingEntry, setEditingEntry] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [recommendations, setRecommendations] = useState([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [dateStats, setDateStats] = useState(null)
  const [aiAnalysis, setAIAnalysis] = useState(null)
  const [aiPeriod, setAIPeriod] = useState('7days')
  const [aiLoading, setAILoading] = useState(false)
  const [quickTip, setQuickTip] = useState(null)
  const [tipLoading, setTipLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 60000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const data = await nutritionAPI.getAllEntries()
      setAllEntries(data)
      loadRecommendations()
      loadQuickTip()
    } catch (err) {
      console.error('Failed to load entries:', err)
    }
  }

  const loadRecommendations = async () => {
    try {
      const recs = await nutritionAPI.getRecommendations()
      setRecommendations(recs)
    } catch (err) {
      console.error('Failed to load recommendations:', err)
    }
  }

  const loadQuickTip = async () => {
    try {
      setTipLoading(true)
      const tip = await nutritionAPI.getQuickTip()
      setQuickTip(tip)
    } catch (err) {
      console.error('Failed to load tip:', err)
    } finally {
      setTipLoading(false)
    }
  }

  const loadDateStats = async () => {
    try {
      setLoading(true)
      const stats = await nutritionAPI.getStatsForDate(selectedDate)
      setDateStats(stats)
      showStatus('Insights loaded successfully')
    } catch (err) {
      showStatus('Failed to load insights')
    } finally {
      setLoading(false)
    }
  }

  const loadAIAnalysis = async () => {
    try {
      setAILoading(true)
      const analysis = await nutritionAPI.getAIAnalysis(aiPeriod)
      setAIAnalysis(analysis)
    } catch (err) {
      showStatus('Failed to generate AI analysis')
    } finally {
      setAILoading(false)
    }
  }

  const handlePreview = async (e) => {
    e.preventDefault()
    if (!food_name || !quantity) {
      showStatus('Please fill in food name and quantity')
      return
    }

    try {
      setLoading(true)
      const response = await nutritionAPI.searchNutrition(food_name, quantity, unit)
      setPreview(response.preview || response)
    } catch (err) {
      console.error('Preview error:', err)
      showStatus(`Error: ${err.message}`)
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      await nutritionAPI.addEntry({
        food_name: preview.food_name,
        quantity,
        unit,
        calories: preview.calories,
        protein: preview.protein,
        fat: preview.fat,
        carbs: preview.carbs,
        date_consumed: new Date().toISOString()
      })
      setFoodName('')
      setQuantity('100')
      setUnit('grams')
      setPreview(null)
      showStatus('Entry saved successfully')
      await loadData()
    } catch (err) {
      showStatus('Failed to save entry')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return
    try {
      await nutritionAPI.deleteEntry(id)
      showStatus('Entry deleted')
      await loadData()
    } catch (err) {
      showStatus('Failed to delete entry')
    }
  }

  const handleEdit = (entry) => {
    setEditingEntry({ ...entry })
  }

  const handleUpdateEntry = async () => {
    try {
      await nutritionAPI.updateEntry(editingEntry.id, {
        quantity: editingEntry.quantity,
        unit: editingEntry.unit
      })
      setEditingEntry(null)
      showStatus('Entry updated')
      await loadData()
    } catch (err) {
      showStatus('Failed to update entry')
    }
  }

  const showStatus = (msg) => {
    setStatus(msg)
    setTimeout(() => setStatus(''), 5000)
  }

  const sortEntries = (field) => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc'
    setSortField(field)
    setSortDirection(newDirection)
  }

  const handleBack = () => navigate(-1)

  const sortedEntries = [...allEntries].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const summary = {
    total_calories: allEntries.reduce((sum, e) => sum + (parseFloat(e.calories) || 0), 0),
    total_protein: allEntries.reduce((sum, e) => sum + (parseFloat(e.protein) || 0), 0),
    total_fat: allEntries.reduce((sum, e) => sum + (parseFloat(e.fat) || 0), 0),
    total_carbs: allEntries.reduce((sum, e) => sum + (parseFloat(e.carbs) || 0), 0)
  }

  const macroBreakdown = {
    protein: summary.total_calories ? Math.round((summary.total_protein * 4) / summary.total_calories * 100) : 0,
    carbs: summary.total_calories ? Math.round((summary.total_carbs * 4) / summary.total_calories * 100) : 0,
    fat: summary.total_calories ? Math.round((summary.total_fat * 9) / summary.total_calories * 100) : 0
  }

  const calculateHealthGrade = () => {
    const calories = summary.total_calories
    const protein = summary.total_protein
    const carbs = summary.total_carbs
    const fat = summary.total_fat
    
    if (calories === 0) return { grade: '-', text: 'No data', color: '#65707a' }
    
    let score = 0
    if (calories >= 1500 && calories <= 2500) score += 30
    else if (calories >= 1200 && calories <= 3000) score += 20
    else score += 10
    
    if (protein >= summary.total_calories * 0.1 && protein <= summary.total_calories * 0.35) score += 30
    if (carbs >= summary.total_calories * 0.3 && carbs <= summary.total_calories * 0.65) score += 20
    if (fat >= summary.total_calories * 0.2 && fat <= summary.total_calories * 0.35) score += 20
    
    if (score >= 90) return { grade: 'A', text: 'Excellent nutrition', color: '#22c55e' }
    if (score >= 80) return { grade: 'B', text: 'Great balance', color: '#3b82f6' }
    if (score >= 70) return { grade: 'C', text: 'Good nutrition', color: '#f59e0b' }
    if (score >= 60) return { grade: 'D', text: 'Needs improvement', color: '#ef4444' }
    return { grade: 'F', text: 'Poor nutrition', color: '#dc2626' }
  }

  const healthGrade = calculateHealthGrade()

  return (
    <div>
      <NavBar />
      
      <main className="container">
        <div className="stack">
          {/* Header */}
          <div className="card wide">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{display:'flex',alignItems:'center',gap:12,flex:1,minWidth:260}}>
                <button className="back-btn" onClick={handleBack} aria-label="Go back">
                  <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.75 4.75a.75.75 0 0 1 0 1.06L8.56 9H16a.75.75 0 0 1 0 1.5H8.56l3.19 3.19a.75.75 0 0 1-1.06 1.06l-4.5-4.5a.75.75 0 0 1 0-1.06l4.5-4.5a.75.75 0 0 1 1.06 0Z"/></svg>
                  Back
                </button>
                <div>
                  <h2 style={{ margin: 0 }}>Nutrition Tracker</h2>
                  <p className="muted">Monitor your daily nutrition intake</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button 
                  className={activeTab === 'overview' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={activeTab === 'entries' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('entries')}
                >
                  Entries
                </button>
                <button 
                  className={activeTab === 'insights' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('insights')}
                >
                  Insights
                </button>
                <button 
                  className={activeTab === 'coach' ? 'btn primary' : 'btn'}
                  onClick={() => setActiveTab('coach')}
                >
                  Coach
                </button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className="card" style={{ 
              padding: '14px 18px',
              backgroundColor: status.includes('Error') || status.includes('Failed') ? '#fff5f5' : '#f0fdf4',
              borderLeft: `4px solid ${status.includes('Error') || status.includes('Failed') ? '#ef4444' : '#22c55e'}`
            }}>
              {status}
            </div>
          )}

          {activeTab === 'overview' && (
            <>
              {/* Stats Grid */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Total Calories</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_calories)}
                  </div>
                  <div className="muted small">kcal</div>
                </div>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Protein</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_protein)}
                  </div>
                  <div className="muted small">grams</div>
                </div>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Carbs</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_carbs)}
                  </div>
                  <div className="muted small">grams</div>
                </div>
                <div className="card">
                  <div className="muted small" style={{ marginBottom: 8 }}>Fat</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>
                    {Math.round(summary.total_fat)}
                  </div>
                  <div className="muted small">grams</div>
                </div>
              </div>

              {/* Health Grade & Macros */}
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Health Grade</h3>
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ 
                      fontSize: 72, 
                      fontWeight: 700, 
                      color: healthGrade.color,
                      lineHeight: 1,
                      marginBottom: 8
                    }}>
                      {healthGrade.grade}
                    </div>
                    <div className="muted">{healthGrade.text}</div>
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Macronutrient Balance</h3>
                  <div className="stack" style={{ gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Protein</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{macroBreakdown.protein}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${macroBreakdown.protein}%`, 
                          backgroundColor: '#22c55e',
                          transition: 'width 0.8s ease'
                        }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Carbs</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{macroBreakdown.carbs}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${macroBreakdown.carbs}%`, 
                          backgroundColor: '#3b82f6',
                          transition: 'width 0.8s ease'
                        }}></div>
                      </div>
                    </div>
                    
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>Fat</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{macroBreakdown.fat}%</span>
                      </div>
                      <div style={{ height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ 
                          height: '100%', 
                          width: `${macroBreakdown.fat}%`, 
                          backgroundColor: '#f59e0b',
                          transition: 'width 0.8s ease'
                        }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Food Form */}
              <div className="card">
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Add Food Entry</h3>
                <form onSubmit={handlePreview} className="stack">
                  <label className="label">
                    <span className="label-text">Food Item</span>
                    <input
                      className="input"
                      placeholder="e.g., chicken breast, rice, apple"
                      value={food_name}
                      onChange={(e) => setFoodName(e.target.value)}
                      required
                    />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                    <label className="label">
                      <span className="label-text">Quantity</span>
                      <input
                        className="input"
                        type="number"
                        placeholder="100"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </label>

                    <label className="label">
                      <span className="label-text">Unit</span>
                      <select
                        className="input"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      >
                        <option value="g">g</option>
                        <option value="ml">ml</option>
                        <option value="cup">cup</option>
                        <option value="piece">piece</option>
                      </select>
                    </label>
                  </div>

                  <button className="btn primary" type="submit" disabled={loading}>
                    {loading ? 'Fetching...' : 'Get Nutrition Info'}
                  </button>
                </form>
              </div>

              {/* Preview */}
              {preview && (
                <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Preview: {preview.food_name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div className="muted small">Calories</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.calories)}</div>
                    </div>
                    <div>
                      <div className="muted small">Protein</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.protein)}g</div>
                    </div>
                    <div>
                      <div className="muted small">Fat</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.fat)}g</div>
                    </div>
                    <div>
                      <div className="muted small">Carbs</div>
                      <div style={{ fontSize: 24, fontWeight: 600 }}>{Math.round(preview.carbs)}g</div>
                    </div>
                  </div>
                  <button className="btn primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              )}

              {/* Quick Tip */}
              {quickTip && (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 18 }}>Daily Tip</h3>
                    <button className="btn" onClick={loadQuickTip} disabled={tipLoading}>
                      {tipLoading ? 'Loading...' : 'New Tip'}
                    </button>
                  </div>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{quickTip.tip}</p>
                </div>
              )}

              {/* Recommendations */}
              {recommendations.length > 0 && (
                <div className="card">
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Recommendations</h3>
                  <div className="stack">
                    {recommendations.map((rec, idx) => (
                      <div 
                        key={idx}
                        style={{
                          padding: 12,
                          borderLeft: `3px solid ${
                            rec.type === 'warning' ? '#f59e0b' :
                            rec.type === 'success' ? '#22c55e' : '#3b82f6'
                          }`,
                          backgroundColor: '#f8fafc',
                          borderRadius: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{rec.message}</span>
                        {rec.priority === 'high' && (
                          <span style={{ 
                            fontSize: 11, 
                            padding: '2px 8px', 
                            backgroundColor: '#ef4444', 
                            color: 'white', 
                            borderRadius: 4,
                            fontWeight: 600
                          }}>
                            HIGH
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'entries' && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>All Entries ({allEntries.length})</h3>
              {allEntries.length === 0 ? (
                <p className="muted">No entries yet. Add your first food item in the Overview tab.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                        <th onClick={() => sortEntries('food_name')} style={{ padding: 12, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Food {sortField === 'food_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('quantity')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Quantity {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('calories')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Calories {sortField === 'calories' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('protein')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Protein {sortField === 'protein' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('fat')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Fat {sortField === 'fat' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('carbs')} style={{ padding: 12, textAlign: 'right', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Carbs {sortField === 'carbs' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th onClick={() => sortEntries('date_consumed')} style={{ padding: 12, textAlign: 'left', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>
                          Date {sortField === 'date_consumed' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </th>
                        <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEntries.map((entry) => (
                        <tr key={entry.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: 12, fontWeight: 600 }}>{entry.food_name}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{entry.quantity} {entry.unit}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.calories)}</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.protein)}g</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.fat)}g</td>
                          <td style={{ padding: 12, textAlign: 'right' }}>{Math.round(entry.carbs)}g</td>
                          <td style={{ padding: 12 }}>{new Date(entry.date_consumed).toLocaleDateString()}</td>
                          <td style={{ padding: 12, textAlign: 'center' }}>
                            <button
                              className="btn"
                              onClick={() => handleEdit(entry)}
                              style={{ padding: '4px 10px', fontSize: 13, marginRight: 6 }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn"
                              onClick={() => handleDelete(entry.id)}
                              style={{ padding: '4px 10px', fontSize: 13 }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Historical Insights & Analysis</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' }}>
                <label className="label" style={{ flex: 1, minWidth: 150 }}>
                  <span className="label-text">Select Date</span>
                  <input
                    type="date"
                    className="input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </label>
                <button 
                  className="btn" 
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                >
                  Today
                </button>
                <button 
                  className="btn primary" 
                  onClick={loadDateStats}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load Insights'}
                </button>
              </div>
              
              {dateStats && (
                <>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: 16 }}>📊 Complete Nutrition Analysis for {selectedDate}</h4>
                  
                  {/* Summary Cards */}
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                      <div style={{ padding: 16, backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 12, border: '1px solid rgba(92,225,230,0.2)' }}>
                        <div className="muted small">Total Calories</div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>{Math.round(dateStats.total_calories)}</div>
                        <div className="muted small" style={{ marginTop: 6 }}>kcal</div>
                      </div>
                      <div style={{ padding: 16, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div className="muted small">Protein</div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: '#22c55e', lineHeight: 1 }}>{Math.round(dateStats.total_protein)}</div>
                        <div className="muted small" style={{ marginTop: 6 }}>grams</div>
                      </div>
                      <div style={{ padding: 16, backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div className="muted small">Carbs</div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>{Math.round(dateStats.total_carbs)}</div>
                        <div className="muted small" style={{ marginTop: 6 }}>grams</div>
                      </div>
                      <div style={{ padding: 16, backgroundColor: 'rgba(245,158,11,0.1)', borderRadius: 12, border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div className="muted small">Fat</div>
                        <div style={{ fontSize: 36, fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>{Math.round(dateStats.total_fat)}</div>
                        <div className="muted small" style={{ marginTop: 6 }}>grams</div>
                      </div>
                    </div>
                  </div>

                  {/* Macronutrient Pie Chart */}
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--accent)' }}>🎯 Macro Distribution (Calories)</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                      {(() => {
                        const totalCals = dateStats.total_calories || 1
                        const proteinCals = dateStats.total_protein * 4
                        const carbsCals = dateStats.total_carbs * 4
                        const fatCals = dateStats.total_fat * 9
                        const proteinPercent = (proteinCals / totalCals) * 100
                        const carbsPercent = (carbsCals / totalCals) * 100
                        const fatPercent = (fatCals / totalCals) * 100

                        // Simple pie chart using SVG
                        const radius = 50
                        let startAngle = 0
                        
                        const getSlice = (percent, color) => {
                          const angle = (percent / 100) * 360
                          const startRad = (startAngle - 90) * (Math.PI / 180)
                          const endRad = (startAngle + angle - 90) * (Math.PI / 180)
                          const x1 = 60 + radius * Math.cos(startRad)
                          const y1 = 60 + radius * Math.sin(startRad)
                          const x2 = 60 + radius * Math.cos(endRad)
                          const y2 = 60 + radius * Math.sin(endRad)
                          const largeArc = angle > 180 ? 1 : 0
                          const path = `M 60 60 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`
                          startAngle += angle
                          return { path, color, x: 60 + (radius + 15) * Math.cos((startAngle - angle/2 - 90) * (Math.PI / 180)), y: 60 + (radius + 15) * Math.sin((startAngle - angle/2 - 90) * (Math.PI / 180)) }
                        }

                        const slices = [
                          getSlice(proteinPercent, '#22c55e'),
                          getSlice(carbsPercent, '#3b82f6'),
                          getSlice(fatPercent, '#f59e0b')
                        ]

                        return (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <svg width="140" height="140" viewBox="0 0 140 140">
                                {slices.map((slice, idx) => (
                                  <path key={idx} d={slice.path} fill={slice.color} opacity="0.8" stroke="var(--bg-2)" strokeWidth="2" />
                                ))}
                              </svg>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 16, height: 16, backgroundColor: '#22c55e', borderRadius: 3 }}></div>
                                <span>Protein: {proteinPercent.toFixed(1)}% ({Math.round(proteinCals)} cal)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 16, height: 16, backgroundColor: '#3b82f6', borderRadius: 3 }}></div>
                                <span>Carbs: {carbsPercent.toFixed(1)}% ({Math.round(carbsCals)} cal)</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 16, height: 16, backgroundColor: '#f59e0b', borderRadius: 3 }}></div>
                                <span>Fat: {fatPercent.toFixed(1)}% ({Math.round(fatCals)} cal)</span>
                              </div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Detailed Macronutrient Progress */}
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--accent)' }}>🥗 Macronutrient Breakdown</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                      {(() => {
                        const totalCals = dateStats.total_calories || 1
                        const proteinCals = dateStats.total_protein * 4
                        const carbsCals = dateStats.total_carbs * 4
                        const fatCals = dateStats.total_fat * 9
                        const proteinPercent = (proteinCals / totalCals) * 100
                        const carbsPercent = (carbsCals / totalCals) * 100
                        const fatPercent = (fatCals / totalCals) * 100

                        return (
                          <>
                            <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', padding: 16, borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>Protein</span>
                                <span style={{ color: '#22c55e', fontWeight: 600 }}>{proteinPercent.toFixed(1)}%</span>
                              </div>
                              <div style={{ height: 10, backgroundColor: 'rgba(34,197,94,0.2)', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                                <div style={{ height: '100%', width: `${Math.min(proteinPercent, 100)}%`, backgroundColor: '#22c55e', borderRadius: 5 }}></div>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{Math.round(dateStats.total_protein)}g consumed</div>
                              <div style={{ fontSize: 12, backgroundColor: 'rgba(34,197,94,0.2)', padding: 6, borderRadius: 4, color: 'var(--text)' }}>Target: 50-75g (20-30%)</div>
                            </div>

                            <div style={{ backgroundColor: 'rgba(59,130,246,0.1)', padding: 16, borderRadius: 10, border: '1px solid rgba(59,130,246,0.3)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>Carbohydrates</span>
                                <span style={{ color: '#3b82f6', fontWeight: 600 }}>{carbsPercent.toFixed(1)}%</span>
                              </div>
                              <div style={{ height: 10, backgroundColor: 'rgba(59,130,246,0.2)', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                                <div style={{ height: '100%', width: `${Math.min(carbsPercent, 100)}%`, backgroundColor: '#3b82f6', borderRadius: 5 }}></div>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{Math.round(dateStats.total_carbs)}g consumed</div>
                              <div style={{ fontSize: 12, backgroundColor: 'rgba(59,130,246,0.2)', padding: 6, borderRadius: 4, color: 'var(--text)' }}>Target: 225-325g (45-65%)</div>
                            </div>

                            <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', padding: 16, borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: 14, fontWeight: 600 }}>Fats</span>
                                <span style={{ color: '#f59e0b', fontWeight: 600 }}>{fatPercent.toFixed(1)}%</span>
                              </div>
                              <div style={{ height: 10, backgroundColor: 'rgba(245,158,11,0.2)', borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                                <div style={{ height: '100%', width: `${Math.min(fatPercent, 100)}%`, backgroundColor: '#f59e0b', borderRadius: 5 }}></div>
                              </div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{Math.round(dateStats.total_fat)}g consumed</div>
                              <div style={{ fontSize: 12, backgroundColor: 'rgba(245,158,11,0.2)', padding: 6, borderRadius: 4, color: 'var(--text)' }}>Target: 50-80g (20-35%)</div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Foods Breakdown */}
                  {allEntries.filter(e => e.date_consumed.split('T')[0] === selectedDate).length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--accent)' }}>🍽️ Foods Consumed</h4>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid rgba(92,225,230,0.2)' }}>
                            <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Food Item</th>
                            <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Qty</th>
                            <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Cal</th>
                            <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Protein</th>
                            <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Carbs</th>
                            <th style={{ padding: 12, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Fat</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allEntries.filter(e => e.date_consumed.split('T')[0] === selectedDate).map((entry) => (
                            <tr key={entry.id} style={{ borderBottom: '1px solid rgba(92,225,230,0.1)' }}>
                              <td style={{ padding: 12, fontWeight: 500 }}>{entry.food_name}</td>
                              <td style={{ padding: 12, textAlign: 'right', color: 'var(--muted)' }}>{entry.quantity}{entry.unit}</td>
                              <td style={{ padding: 12, textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{Math.round(entry.calories)}</td>
                              <td style={{ padding: 12, textAlign: 'right', color: '#22c55e' }}>{Math.round(entry.protein)}g</td>
                              <td style={{ padding: 12, textAlign: 'right', color: '#3b82f6' }}>{Math.round(entry.carbs)}g</td>
                              <td style={{ padding: 12, textAlign: 'right', color: '#f59e0b' }}>{Math.round(entry.fat)}g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  )}

                  {/* Intelligent Analysis */}
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--accent)' }}>💡 Smart Analysis</h4>
                    <div style={{ backgroundColor: 'rgba(92,225,230,0.05)', padding: 16, borderRadius: 10, border: '1px solid rgba(92,225,230,0.15)' }}>
                      {(() => {
                        const totalCals = dateStats.total_calories
                        const proteinCals = dateStats.total_protein * 4
                        const carbsCals = dateStats.total_carbs * 4
                        const fatCals = dateStats.total_fat * 9
                        const proteinPercent = totalCals > 0 ? (proteinCals / totalCals) * 100 : 0
                        const carbsPercent = totalCals > 0 ? (carbsCals / totalCals) * 100 : 0
                        const fatPercent = totalCals > 0 ? (fatCals / totalCals) * 100 : 0
                        const mealCount = dateStats.total_items

                        let analysis = []

                        // Calorie analysis
                        if (totalCals < 1200) {
                          analysis.push('🔴 Underfeeding Risk: Your intake is significantly below recommended. This can slow metabolism and reduce energy.')
                        } else if (totalCals < 1500) {
                          analysis.push('🟡 Low Calorie Day: Consider adding a snack to meet daily energy needs.')
                        } else if (totalCals > 3000) {
                          analysis.push('🔴 High Calorie Day: You\'ve exceeded typical daily targets. Review portion sizes.')
                        } else if (totalCals > 2500) {
                          analysis.push('🟡 Elevated Intake: Monitor portions to maintain balance.')
                        } else {
                          analysis.push('🟢 Calorie Balance: Your intake is within healthy range.')
                        }

                        // Meal frequency
                        if (mealCount < 2) {
                          analysis.push('⏰ Meal Frequency: Consider eating 3+ meals daily for better metabolism and energy.')
                        } else if (mealCount >= 4) {
                          analysis.push('⏰ Meal Frequency: Good - regular meals support steady energy and blood sugar.')
                        }

                        // Protein analysis
                        if (proteinPercent < 12) {
                          analysis.push('🍗 Protein Deficiency: Aim for 15-30% of calories from protein for muscle support.')
                        } else if (proteinPercent > 40) {
                          analysis.push('⚠️ High Protein: Balance with more vegetables and whole grains.')
                        } else {
                          analysis.push('✅ Protein Level: Optimal range for muscle and recovery.')
                        }

                        // Carbs analysis
                        if (carbsPercent < 35) {
                          analysis.push('🌾 Low Carbs: Add whole grains, fruits, or starchy vegetables for energy.')
                        } else if (carbsPercent > 70) {
                          analysis.push('⚠️ High Carbs: Balance with more protein and healthy fats.')
                        } else {
                          analysis.push('✅ Carb Balance: Optimal for sustained energy.')
                        }

                        // Fat analysis
                        if (fatPercent < 15) {
                          analysis.push('🥑 Low Healthy Fats: Include nuts, avocado, olive oil, or fish.')
                        } else if (fatPercent > 40) {
                          analysis.push('⚠️ High Fat: Reduce fried foods and excessive oils.')
                        } else {
                          analysis.push('✅ Healthy Fats: Good balance for hormone and nutrient absorption.')
                        }

                        // Calorie per meal distribution
                        const avgCalPerMeal = mealCount > 0 ? Math.round(totalCals / mealCount) : 0
                        if (avgCalPerMeal > 1000) {
                          analysis.push('🍽️ Large Meal Portions: Your average meal is quite large. Consider distributing calories more evenly.')
                        } else if (avgCalPerMeal < 300) {
                          analysis.push('🍽️ Small Meal Portions: Your meals are quite small. Eat fuller portions for better satiety.')
                        } else {
                          analysis.push('🍽️ Meal Portions: Good portion distribution across meals.')
                        }

                        // Food variety
                        const uniqueFoods = new Set(allEntries.filter(e => e.date_consumed.split('T')[0] === selectedDate).map(e => e.food_name.toLowerCase())).size
                        if (uniqueFoods < 3) {
                          analysis.push('🌈 Food Variety: Low variety. Include more different foods for diverse nutrients.')
                        } else if (uniqueFoods >= 6) {
                          analysis.push('🌈 Food Variety: Excellent variety! You\'re getting diverse nutrients from different sources.')
                        } else {
                          analysis.push('🌈 Food Variety: Good mix of foods. Continue exploring new options.')
                        }

                        return analysis.map((point, idx) => (
                          <div key={idx} style={{ marginBottom: 12, lineHeight: 1.6, fontSize: 14 }}>
                            {point}
                          </div>
                        ))
                      })()}
                    </div>
                  </div>



                  {/* Hydration & Recovery Tips */}
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--accent)' }}>💧 Hydration & Recovery Guide</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                      {(() => {
                        const estimatedWaterNeed = (dateStats.total_calories / 1000 * 1.5).toFixed(1)
                        
                        return (
                          <>
                            <div style={{ backgroundColor: 'rgba(6,182,212,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(6,182,212,0.2)' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>💧 Water Target</div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Based on your {Math.round(dateStats.total_calories)} calorie intake, aim for approximately {estimatedWaterNeed} liters of water daily.</div>
                            </div>

                            <div style={{ backgroundColor: 'rgba(249,115,22,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(249,115,22,0.2)' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>⚡ Energy Timing</div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Eat carbs + protein 1-2 hours before activity, and within 30 mins after for recovery.</div>
                            </div>

                            <div style={{ backgroundColor: 'rgba(192,132,250,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(192,132,250,0.2)' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>😴 Sleep Support</div>
                              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Avoid heavy meals 3 hours before bed. Light carbs + magnesium help sleep quality.</div>
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 15, color: 'var(--accent)' }}>🎯 Personalized Recommendations</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                      <div style={{ backgroundColor: 'rgba(34,197,94,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>💪 Protein Goal</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Aim for 20-30% of daily calories. Include lean meats, fish, eggs, dairy, or legumes at every meal.</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(59,130,246,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(59,130,246,0.2)' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>🌾 Carb Quality</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Choose whole grains, oats, sweet potatoes, and fruits over refined carbs for sustained energy.</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(245,158,11,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>🥑 Healthy Fats</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Include avocados, nuts, seeds, olive oil, and fatty fish (2-3x per week) for optimal health.</div>
                      </div>
                      <div style={{ backgroundColor: 'rgba(92,225,230,0.1)', padding: 14, borderRadius: 10, border: '1px solid rgba(92,225,230,0.2)' }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>💧 Hydration</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6 }}>Drink 8-10 glasses of water daily. Hydration supports metabolism and nutrient absorption.</div>
                      </div>
                    </div>
                  </div>
                </>
              )}


            </div>
          )}

          {activeTab === 'coach' && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>AI Nutrition Coach</h3>
              <div style={{ marginBottom: 16 }}>
                <label className="label">
                  <span className="label-text">Analysis Period</span>
                  <select
                    className="input"
                    value={aiPeriod}
                    onChange={(e) => setAIPeriod(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="1day">Last 24 Hours</option>
                    <option value="3days">Last 3 Days</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                  </select>
                </label>
                <button 
                  className="btn primary" 
                  onClick={loadAIAnalysis}
                  disabled={aiLoading}
                  style={{ marginTop: 12 }}
                >
                  {aiLoading ? 'Analyzing...' : 'Generate Analysis'}
                </button>
              </div>

              {aiLoading && (
                <div style={{ padding: 24, textAlign: 'center', backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 8, border: '1px solid rgba(92,225,230,0.2)' }}>
                  <p className="muted">AI Coach is analyzing your nutrition data...</p>
                </div>
              )}

              {!aiLoading && aiAnalysis && (
                <>
                  <div style={{ marginBottom: 24 }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Stats Summary</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 16 }}>
                      <div style={{ padding: 12, backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 8, border: '1px solid rgba(92,225,230,0.2)' }}>
                        <div className="muted small">Total Entries</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{aiAnalysis.stats.total_entries}</div>
                      </div>
                      <div style={{ padding: 12, backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 8, border: '1px solid rgba(92,225,230,0.2)' }}>
                        <div className="muted small">Total Calories</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{Math.round(aiAnalysis.stats.total_calories)}</div>
                      </div>
                      <div style={{ padding: 12, backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 8, border: '1px solid rgba(92,225,230,0.2)' }}>
                        <div className="muted small">Avg Daily</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{aiAnalysis.stats.avg_daily_calories}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ padding: 16, backgroundColor: 'rgba(92,225,230,0.1)', borderRadius: 8, border: '1px solid rgba(92,225,230,0.2)', color: 'var(--text)' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 16 }}>AI Analysis</h4>
                    <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {aiAnalysis.analysis}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edit Modal */}
          {editingEntry && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 20
            }}>
              <div className="card" style={{ maxWidth: 400, width: '100%' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 18 }}>Edit Entry: {editingEntry.food_name}</h3>
                <div className="stack">
                  <label className="label">
                    <span className="label-text">Quantity</span>
                    <input
                      className="input"
                      type="number"
                      value={editingEntry.quantity}
                      onChange={(e) => setEditingEntry({ ...editingEntry, quantity: e.target.value })}
                    />
                  </label>
                  <label className="label">
                    <span className="label-text">Unit</span>
                    <select
                      className="input"
                      value={editingEntry.unit}
                      onChange={(e) => setEditingEntry({ ...editingEntry, unit: e.target.value })}
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="cup">cup</option>
                      <option value="piece">piece</option>
                    </select>
                  </label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn primary" onClick={handleUpdateEntry}>Update</button>
                    <button className="btn" onClick={() => setEditingEntry(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
