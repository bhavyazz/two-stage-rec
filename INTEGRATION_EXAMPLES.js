/**
 * INTEGRATION EXAMPLES - How to use the Smart Ingredient Substitution System
 * 
 * This file shows various ways to integrate the substitution system
 * into your application workflow.
 */

// ============================================================================
// EXAMPLE 1: Basic Backend Usage
// ============================================================================

// In any Node.js backend file:
const { getSubstitutions, getBatchSubstitutions } = require('./services/ingredientSubstitution')

// Single ingredient
const recommendations = getSubstitutions('white rice', 'diabetes', 3)
if (!recommendations.error) {
  console.log(`Found ${recommendations.recommendations.length} alternatives`)
  recommendations.recommendations.forEach(rec => {
    console.log(`- ${rec.name}: ${(rec.overallScore * 100).toFixed(0)}% match`)
  })
}

// Multiple ingredients (batch)
const batchResults = getBatchSubstitutions(
  ['white rice', 'butter', 'white bread'],
  'diabetes'
)

// ============================================================================
// EXAMPLE 2: Nutrition Route Integration
// ============================================================================

// In server/routes/nutrition.js:
router.post('/substitute', authenticateToken, async (req, res) => {
  const { ingredient, condition, topN = 3 } = req.body

  if (!ingredient) {
    return res.status(400).json({ error: 'Missing ingredient' })
  }

  const result = getSubstitutions(ingredient, condition, topN)
  
  if (result.error) {
    return res.status(404).json(result)
  }

  // Could also save to database for analytics
  // await pool.query(
  //   'INSERT INTO substitution_queries (user_id, ingredient, condition, top_choice) VALUES ($1, $2, $3, $4)',
  //   [user_id, ingredient, condition, result.recommendations[0].name]
  // )

  res.json({ ok: true, data: result })
})

// ============================================================================
// EXAMPLE 3: Frontend Component Usage
// ============================================================================

// In any React component:
import IngredientSubstitution from './components/IngredientSubstitution'

function MyPage() {
  return (
    <div>
      <h1>Food Recommendations</h1>
      <IngredientSubstitution />
    </div>
  )
}

// ============================================================================
// EXAMPLE 4: Custom Hook for Fetching Substitutions
// ============================================================================

import { useState } from 'react'

export function useSubstitution() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const getSubstitution = async (ingredient, condition = null, topN = 3) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/nutrition/substitute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient, condition, topN })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error)
        return null
      }

      setData(result.data)
      return result.data
    } catch (err) {
      setError('Failed to fetch substitutions')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, data, getSubstitution }
}

// Usage:
// const { getSubstitution, data, loading } = useSubstitution()
// await getSubstitution('white rice', 'diabetes')

// ============================================================================
// EXAMPLE 5: Integration with Nutrition Tracker
// ============================================================================

// In a nutrition logging component:
function LogFood({ food, userCondition }) {
  const [substitutions, setSubstitutions] = useState(null)

  const loadSubstitutions = async () => {
    const { getSubstitutions } = require('./services/ingredientSubstitution')
    const result = getSubstitutions(food, userCondition, 2)
    setSubstitutions(result)
  }

  return (
    <div className="food-log-item">
      <h3>{food}</h3>
      <button onClick={loadSubstitutions}>
        💡 Suggest Healthier Alternatives
      </button>
      
      {substitutions && (
        <div className="suggestions">
          <p>Consider these instead:</p>
          <ul>
            {substitutions.recommendations.map(rec => (
              <li key={rec.name}>
                {rec.name} - {(rec.overallScore * 100).toFixed(0)}% better match
                <button onClick={() => switchFood(rec.name)}>Switch</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// EXAMPLE 6: Integration with Pantry Management
// ============================================================================

// In a pantry component:
async function suggestSubstitutesForPantry(pantryItems, userCondition) {
  const { getBatchSubstitutions } = require('./services/ingredientSubstitution')
  
  const substitutions = getBatchSubstitutions(pantryItems, userCondition)
  
  return substitutions.map(sub => ({
    original: sub.original.name,
    recommendation: sub.recommendations[0]?.name,
    score: sub.recommendations[0]?.overallScore,
    reason: sub.recommendations[0]?.reason
  }))
}

// Usage:
// const items = ['white rice', 'butter', 'white bread']
// const suggestions = await suggestSubstitutesForPantry(items, 'diabetes')
// Display suggestions to user

// ============================================================================
// EXAMPLE 7: Integration with Recipe Suggestions
// ============================================================================

async function getHealthyRecipeVariations(recipe, userCondition) {
  const { getBatchSubstitutions } = require('./services/ingredientSubstitution')
  
  // recipe.ingredients = ['white rice', 'butter', 'chicken', ...]
  const substitutions = getBatchSubstitutions(recipe.ingredients, userCondition)
  
  // Create a healthier version of the recipe
  const healthierRecipe = {
    ...recipe,
    ingredients: substitutions.map((sub, idx) => {
      if (sub.recommendations.length > 0) {
        return {
          original: recipe.ingredients[idx],
          recommended: sub.recommendations[0].name,
          healthScore: sub.recommendations[0].overallScore
        }
      }
      return { original: recipe.ingredients[idx], recommended: null }
    })
  }
  
  return healthierRecipe
}

// ============================================================================
// EXAMPLE 8: Store Results in Database
// ============================================================================

async function logSubstitutionQuery(userId, ingredient, condition, selectedAlternative) {
  const { pool } = require('./db')
  
  await pool.query(
    `INSERT INTO substitution_history 
     (user_id, original_ingredient, condition, selected_alternative, created_at)
     VALUES ($1, $2, $3, $4, NOW())`,
    [userId, ingredient, condition, selectedAlternative]
  )
}

// Later, you can analyze which substitutions users prefer:
// SELECT original_ingredient, selected_alternative, COUNT(*) as popularity
// FROM substitution_history
// GROUP BY original_ingredient, selected_alternative
// ORDER BY popularity DESC

// ============================================================================
// EXAMPLE 9: Personalized Recommendations Based on History
// ============================================================================

async function getPersonalizedSubstitution(userId, ingredient) {
  const { pool } = require('./db')
  
  // Get user's condition
  const userResult = await pool.query(
    'SELECT health_condition FROM users WHERE id = $1',
    [userId]
  )
  
  const condition = userResult.rows[0]?.health_condition
  
  // Get substitution
  const { getSubstitutions } = require('./services/ingredientSubstitution')
  const result = getSubstitutions(ingredient, condition, 3)
  
  // Check which alternatives this user has previously chosen
  const history = await pool.query(
    `SELECT selected_alternative FROM substitution_history 
     WHERE user_id = $1 AND original_ingredient = $2
     ORDER BY created_at DESC LIMIT 5`,
    [userId, ingredient]
  )
  
  // Boost score if user previously selected it
  const previousChoices = history.rows.map(r => r.selected_alternative)
  result.recommendations = result.recommendations.map(rec => ({
    ...rec,
    boostedScore: previousChoices.includes(rec.name) 
      ? rec.overallScore * 1.1 
      : rec.overallScore,
    userTested: previousChoices.includes(rec.name)
  }))
  
  return result
}

// ============================================================================
// EXAMPLE 10: Real-Time Feedback
// ============================================================================

function SubstitutionWithFeedback() {
  const [substitution, setSubstitution] = useState(null)
  const [feedback, setFeedback] = useState('')

  const handleLiked = async (ingredientName) => {
    // Log positive feedback
    await fetch('/api/substitution-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient: substitution.original.name,
        recommendation: ingredientName,
        feedback: 'positive'
      })
    })
    setFeedback('Thanks! This helps improve recommendations.')
  }

  const handleDisliked = async (ingredientName) => {
    // Log negative feedback
    await fetch('/api/substitution-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredient: substitution.original.name,
        recommendation: ingredientName,
        feedback: 'negative',
        reason: 'taste' // could be: taste, price, unavailable, etc.
      })
    })
    setFeedback('Got it! We\'ll improve suggestions.')
  }

  return (
    <div>
      {substitution?.recommendations.map(rec => (
        <div key={rec.name} className="rec-card">
          <h4>{rec.name}</h4>
          <button onClick={() => handleLiked(rec.name)}>👍 This worked!</button>
          <button onClick={() => handleDisliked(rec.name)}>👎 Not for me</button>
        </div>
      ))}
      {feedback && <p>{feedback}</p>}
    </div>
  )
}

// ============================================================================
// EXAMPLE 11: Caching for Performance
// ============================================================================

const substitutionCache = new Map()

function getCachedSubstitution(ingredient, condition) {
  const cacheKey = `${ingredient}:${condition}`
  
  if (substitutionCache.has(cacheKey)) {
    console.log('✅ Cache hit for', cacheKey)
    return substitutionCache.get(cacheKey)
  }
  
  const { getSubstitutions } = require('./services/ingredientSubstitution')
  const result = getSubstitutions(ingredient, condition, 3)
  
  // Cache for 1 hour
  substitutionCache.set(cacheKey, result)
  setTimeout(() => substitutionCache.delete(cacheKey), 3600000)
  
  return result
}

// ============================================================================
// EXAMPLE 12: Batch API for Multiple Users
// ============================================================================

router.post('/api/nutrition/substitutions-for-elder-group', authenticateToken, async (req, res) => {
  const { ingredients, elderIds } = req.body
  
  // Get conditions for each elder
  const elders = await pool.query(
    'SELECT id, health_condition FROM elders WHERE id = ANY($1)',
    [elderIds]
  )
  
  const { getBatchSubstitutions } = require('./services/ingredientSubstitution')
  
  const results = {}
  for (const elder of elders.rows) {
    results[elder.id] = getBatchSubstitutions(ingredients, elder.health_condition)
  }
  
  res.json({ ok: true, data: results })
})

// ============================================================================
// EXAMPLE 13: Analytics & Insights
// ============================================================================

async function getSubstitutionInsights() {
  const { pool } = require('./db')
  
  const topSubstitutions = await pool.query(`
    SELECT 
      original_ingredient,
      selected_alternative,
      COUNT(*) as frequency,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY original_ingredient), 2) as percentage
    FROM substitution_history
    GROUP BY original_ingredient, selected_alternative
    ORDER BY frequency DESC
    LIMIT 20
  `)
  
  const conditionTrends = await pool.query(`
    SELECT 
      condition,
      COUNT(*) as queries
    FROM substitution_history
    GROUP BY condition
    ORDER BY queries DESC
  `)
  
  return {
    topSubstitutions: topSubstitutions.rows,
    conditionTrends: conditionTrends.rows
  }
}

// ============================================================================
// SUMMARY OF INTEGRATION PATTERNS
// ============================================================================

/*
✅ INTEGRATION PATTERNS SHOWN:

1. Basic Backend Service - Direct function calls
2. REST API Endpoints - HTTP endpoints for frontend
3. React Custom Hook - Reusable logic in components
4. Nutrition Tracker Integration - Inline suggestions while logging
5. Pantry Management - Batch suggestions for inventory
6. Recipe Variations - Healthier recipe versions
7. Database Logging - Track user choices
8. Personalization - Learn from user history
9. Real-Time Feedback - Collect user preferences
10. Caching - Performance optimization
11. Batch Operations - Multiple users at once
12. Analytics - Understand usage patterns

CHOOSE THE PATTERN THAT BEST FITS YOUR USE CASE!
*/
