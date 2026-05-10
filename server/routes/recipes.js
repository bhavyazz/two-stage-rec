const express = require('express')
const router = express.Router()
const { authenticateToken } = require('../middleware/auth')
const spoon = require('../services/spoonacular')
const { pool } = require('../db')

const PLACEHOLDER_IMAGE = (process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT || 4000}`) + '/public/placeholder.svg'
const SERVER_BASE = process.env.SERVER_ORIGIN || `http://localhost:${process.env.PORT || 4000}`

function ensureAbsoluteImage(img) {
  if (!img) return PLACEHOLDER_IMAGE
  const s = String(img).trim()
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  if (s.includes('recipeImages')) return 'https://spoonacular.com/' + s.replace(/^\/+/, '')
  if (s.startsWith('/')) return SERVER_BASE + s
  return SERVER_BASE + '/' + s
}

function computeFallbackScore(candidate, selected) {
  try {
    const sel = (selected || []).map(s => String(s||'').toLowerCase())
    const ings = (candidate.ingredients || []).map(i => String(i||'').toLowerCase())
    const used = sel.filter(s => ings.includes(s)).length
    const numSel = Math.max(1, sel.length)
    const used_frac = used / numSel
    const calories = Number(candidate.calories || 500)
    const protein = Number(candidate.protein || 0)
    const popularity = Number(candidate.popularity || 0)
    const pop_norm = Math.min(1, popularity / 100)
    const score = 0.6 * used_frac + 0.2 * Math.tanh((1 - Math.min(1, Math.abs(calories - 500) / 800)) / 3) + 0.2 * pop_norm
    return Number(Math.max(-10, Math.min(10, score)).toFixed(6))
  } catch (e) {
    return 0
  }
}

function penalizeForConditions(score, candidate, conditions) {
  if (!conditions || conditions.length === 0) return score
  let penalty = 0
  const cond = conditions.map(c => String(c).toLowerCase())
  const calories = Number(candidate.calories || 500)
  const sodium = Number(candidate.sodium || 0)
  const fat = Number(candidate.fat || 0)
  const carbs = Number(candidate.carbs || 0)
  const protein = Number(candidate.protein || 0)
  if (cond.some(c => c.includes('diabet'))) {
    if (calories > 800) penalty += 0.15
    if (carbs > 60) penalty += 0.2
  }
  if (cond.some(c => c.includes('hypertension') || c.includes('high blood pressure') || c.includes('hbp'))) {
    if (sodium > 800) penalty += 0.25
    if (sodium > 1200) penalty += 0.15
  }
  if (cond.some(c => c.includes('cholesterol') || c.includes('heart'))) {
    if (fat > 30) penalty += 0.2
    if (fat > 50) penalty += 0.15
  }
  if (cond.some(c => c.includes('kidney'))) {
    if (sodium > 600) penalty += 0.2
    if (protein > 40) penalty += 0.15
  }
  if (cond.some(c => c.includes('obesity') || c.includes('overweight'))) {
    if (calories > 1000) penalty += 0.25
    if (calories > 1200) penalty += 0.15
  }
  if (cond.some(c => c.includes('anemia'))) {
    if (protein > 25) penalty -= 0.1
  }
  return Math.max(-1, score - penalty)
}

function generateScoreExplanation(candidate, elderId = null, elderAllergies = [], elderConditions = []) {
  const explanations = []
  const calories = Number(candidate.calories || 500)
  const sodium = Number(candidate.sodium || 0)
  const fat = Number(candidate.fat || 0)
  const carbs = Number(candidate.carbs || 0)
  const protein = Number(candidate.protein || 0)
  if (elderAllergies.length > 0) {
    const recipeIngs = ((candidate.ingredients || []).map(i => String(i).toLowerCase()) || [])
    const hasAllergen = elderAllergies.some(allergen => recipeIngs.some(ing => ing.includes(allergen) || allergen.includes(ing)))
    if (hasAllergen) explanations.push('❌ Contains allergen')
  }
  const cond = (elderConditions || []).map(c => String(c).toLowerCase())
  if (cond.some(c => c.includes('diabet'))) {
    if (carbs > 60) explanations.push(`⚠️ High carbs (${carbs}g) - risky for diabetes`)
    else if (carbs > 40) explanations.push(`⚠️ Moderate carbs (${carbs}g) - check portion`)
    if (calories > 800) explanations.push(`⚠️ High calories (${calories}kcal) - not ideal for diabetes`)
  }
  if (cond.some(c => c.includes('hypertension') || c.includes('high blood pressure'))) {
    if (sodium > 1200) explanations.push(`⚠️ Very high sodium (${sodium}mg) - avoid`)
    else if (sodium > 800) explanations.push(`⚠️ High sodium (${sodium}mg) - limit intake`)
  }
  if (cond.some(c => c.includes('cholesterol') || c.includes('heart'))) {
    if (fat > 50) explanations.push(`⚠️ Very high fat (${fat}g) - not suitable`)
    else if (fat > 30) explanations.push(`⚠️ High fat (${fat}g) - choose lighter option`)
  }
  if (cond.some(c => c.includes('kidney'))) {
    if (sodium > 600) explanations.push(`⚠️ High sodium (${sodium}mg) - kidney concern`)
    if (protein > 40) explanations.push(`⚠️ High protein (${protein}g) - strain on kidneys`)
  }
  if (cond.some(c => c.includes('obesity') || c.includes('overweight'))) {
    if (calories > 1200) explanations.push(`⚠️ Very high calories (${calories}kcal) - too much`)
    else if (calories > 1000) explanations.push(`⚠️ High calories (${calories}kcal) - watch portion`)
  }
  if (cond.some(c => c.includes('anemia'))) {
    if (protein > 25) explanations.push(`✅ Good protein (${protein}g) - helps with anemia`)
  }
  if (explanations.length === 0) explanations.push('✅ Good match for selected elder')
  return explanations.join(' | ')
}

router.use(authenticateToken)

// POST /api/recipes - lightweight search
router.post('/', async (req, res) => {
  const { ingredients } = req.body || {}
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) return res.status(400).json({ error: 'Missing ingredients array' })
  try {
    const cleaned = ingredients.map(i => String(i || '').toLowerCase().replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()\[\]"]+/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    const results = await spoon.findRecipesByIngredients(cleaned)
    const mapped = (results || []).map(r => ({ id: r.id, title: r.title, image: ensureAbsoluteImage(r.image || null), usedIngredientCount: r.usedIngredientCount || 0, missedIngredientCount: r.missedIngredientCount || 0 }))
    return res.json({ ok: true, recipes: mapped })
  } catch (err) {
    console.error('POST /api/recipes', err && err.message ? err.message : err)
    return res.status(500).json({ error: 'Recipe search failed', detail: String(err) })
  }
})

// POST /api/recipes/rank - fetch candidates, enrich, attempt ML rank, fallback
router.post('/rank', async (req, res) => {
  const { ingredients, elder_id } = req.body || {}
  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) return res.status(400).json({ error: 'Missing ingredients array' })

  console.log('[POST /api/recipes/rank] Received request with ingredients:', ingredients, 'elder_id:', elder_id)

  // load elder info if provided
  let elderAllergies = []
  let elderConditions = []
  let elderPreferences = { likes: [], dislikes: [] }
  if (elder_id) {
    try {
      const userId = req.user?.user_id
      if (!userId) {
        console.error('[POST /api/recipes/rank] No user_id in req.user')
        return res.status(401).json({ error: 'Unauthorized' })
      }
      const q = await pool.query('SELECT allergies, conditions, diet FROM "Elder" WHERE elder_id=$1 AND user_id=$2', [elder_id, userId])
      const row = q.rows[0]
      if (row) {
        try {
          const a = row.allergies
          if (typeof a === 'string') {
            try { elderAllergies = JSON.parse(a) } catch { elderAllergies = a.split(',').map(s=>s.trim()).filter(Boolean) }
          } else if (Array.isArray(a)) elderAllergies = a
          elderAllergies = elderAllergies.map(s=>String(s).toLowerCase())
        } catch (e) { elderAllergies = [] }
        try {
          const c = row.conditions
          if (typeof c === 'string') {
            try { elderConditions = JSON.parse(c) } catch { elderConditions = c.split(',').map(s=>s.trim()).filter(Boolean) }
          } else if (Array.isArray(c)) elderConditions = c
          elderConditions = elderConditions.map(s=>String(s).toLowerCase())
        } catch (e) { elderConditions = [] }
        try {
          const p = row.diet
          if (p) {
            if (typeof p === 'string') {
              try { elderPreferences = JSON.parse(p) } catch { elderPreferences = { likes: String(p).split(',').map(s=>s.trim()).filter(Boolean), dislikes: [] } }
            } else if (typeof p === 'object') elderPreferences = p
            elderPreferences.likes = (elderPreferences.likes||[]).map(s=>String(s).toLowerCase())
            elderPreferences.dislikes = (elderPreferences.dislikes||[]).map(s=>String(s).toLowerCase())
          }
        } catch (e) { elderPreferences = { likes: [], dislikes: [] } }
      }
    } catch (e) {
      console.error('Failed to load elder', e && e.message ? e.message : e)
    }
  }

  try {
    const cleaned = ingredients.map(i => String(i || '').toLowerCase().replace(/[\.,\/#!$%\^&\*;:{}=\-_`~()\[\]"]+/g, '').replace(/\s+/g, ' ').trim()).filter(Boolean)
    console.log('[POST /api/recipes/rank] Cleaned ingredients:', cleaned)
    let results = []
    let providerError = null
    try {
      results = await spoon.findRecipesByIngredients(cleaned)
      console.log('[POST /api/recipes/rank] Got', results.length, 'initial results from Spoonacular')
    } catch (err) {
      const status = err?.response?.status
      const detail = err?.response?.data || err.message || 'Unknown error'
      providerError = { status, detail }
      console.error('[POST /api/recipes/rank] Spoonacular error status:', status, 'detail:', detail)
      // proceed with empty results so fallback can run; avoids hard failure on quota
      results = []
    }

    const candidates = (results || []).map(r => {
      const defaultImg = `https://spoonacular.com/recipeImages/${r.id}-312x231.jpg`
      const ingredientsList = (r.usedIngredients || []).map(u => u.name || u.original || '').concat((r.missedIngredients || []).map(m => m.name || m.original || ''))
      return {
        recipe_id: r.id,
        title: r.title,
        image: r.image || defaultImg,
        ingredients: ingredientsList,
        usedIngredientCount: r.usedIngredientCount || (Array.isArray(r.usedIngredients) ? r.usedIngredients.length : 0),
        missedIngredientCount: r.missedIngredientCount || (Array.isArray(r.missedIngredients) ? r.missedIngredients.length : 0),
        calories: r.calories || null,
        protein: r.protein || null,
        fat: r.fat || null,
        carbs: r.carbs || null,
        sodium: r.sodium || null,
        popularity: r.aggregateLikes || r.popularity || 0
      }
    })

    // if provider failed and no candidates, short-circuit return
    if (!candidates.length) {
      const message = providerError ? 'Recipe provider unavailable or quota exceeded.' : 'No recipes found.'
      return res.json({ ok: true, recipes: [], message, providerError })
    }

    // enrichment (parallel)
    const enrichPromises = candidates.map(c => {
      if (c.recipe_id && (c.calories === null || c.protein === null || c.fat === null || c.carbs === null || c.sodium === null)) {
        return spoon.getRecipeNutrition(c.recipe_id).then(nutr => {
          if (nutr) {
            c.calories = c.calories || nutr.calories || c.calories
            c.protein = c.protein || nutr.protein || c.protein
            c.fat = c.fat || nutr.fat || c.fat
            c.carbs = c.carbs || nutr.carbs || c.carbs
            c.sodium = c.sodium || nutr.sodium || c.sodium
          }
        }).catch(()=>{})
      }
      return Promise.resolve()
    })
    await Promise.all(enrichPromises)
    console.log('[POST /api/recipes/rank] Enriched', candidates.length, 'candidates')

    // attempt ML ranker
    try {
      console.log('[POST /api/recipes/rank] Calling ML ranker...')
      const mlRes = await fetch('http://127.0.0.1:8001/rank', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ selected_ingredients: cleaned, candidates }) })
      if (mlRes && mlRes.ok) {
        console.log('[POST /api/recipes/rank] ML ranker returned OK')
        const mlData = await mlRes.json()
        const rankedRaw = (mlData.ranked || mlData.recipes || mlData || [])
        let ranked = rankedRaw.map(r => {
          const recipe = (r && typeof r === 'object') ? r : {}
          const rawScore = typeof recipe.score !== 'undefined' ? Number(recipe.score) : computeFallbackScore(recipe, cleaned)
          const image = ensureAbsoluteImage(recipe.image || recipe.img || null)
          const rid = recipe.recipe_id || recipe.id || recipe.recipeId
          const original = candidates.find(c => String(c.recipe_id) === String(rid))
          const usedCount = original && typeof original.usedIngredientCount === 'number' ? original.usedIngredientCount : (typeof recipe.usedIngredientCount === 'number' ? recipe.usedIngredientCount : 0)
          const missedCount = original && typeof original.missedIngredientCount === 'number' ? original.missedIngredientCount : (typeof recipe.missedIngredientCount === 'number' ? recipe.missedIngredientCount : 0)
          const ingredientsList = original && original.ingredients ? original.ingredients : (recipe.ingredients || [])
          let finalUsed = usedCount
          let finalMissed = missedCount
          if ((finalUsed === 0 && (ingredientsList && ingredientsList.length > 0)) || finalMissed === 0) {
            const ings = (ingredientsList || []).map(i => String(i).toLowerCase())
            const used = cleaned.filter(s => ings.includes(s)).length
            finalUsed = used
            finalMissed = Math.max(0, (ings.length || 0) - used)
          }
          return Object.assign({}, recipe, { id: rid, recipe_id: rid, score: rawScore, image, usedIngredientCount: finalUsed, missedIngredientCount: finalMissed, ingredients: ingredientsList })
        })

        // apply elder penalties/preferences
        if (elderAllergies.length) {
          ranked = ranked.map(r => {
            const ings = ((r.ingredients || []).map(i=>String(i).toLowerCase())||[])
            const hasAllergen = elderAllergies.some(a => ings.some(i => i.includes(a) || a.includes(i)))
            return { ...r, score: hasAllergen ? Math.max(0, r.score - 0.5) : r.score, allergen_warning: hasAllergen ? 'Contains potential allergen' : null }
          })
        }
        if (elderConditions.length) {
          ranked = ranked.map(r => ({ ...r, score: penalizeForConditions(r.score, r, elderConditions) }))
        }
        if (elderPreferences && (elderPreferences.likes.length || elderPreferences.dislikes.length)) {
          ranked = ranked.map(r => {
            const ings = ((r.ingredients || [])).map(i=>String(i).toLowerCase())
            let s = r.score
            let delta = 0
            (elderPreferences.likes||[]).forEach(l => { if (ings.some(i=>i.includes(l) || l.includes(i))) delta += 0.08 })
            (elderPreferences.dislikes||[]).forEach(d => { if (ings.some(i=>i.includes(d) || d.includes(i))) delta -= 0.15 })
            return { ...r, score: s + delta }
          })
        }

        if (elder_id) ranked = ranked.map(r => ({ ...r, explanation: generateScoreExplanation(r, elder_id, elderAllergies, elderConditions) }))

        // normalize
        try {
          const scores = ranked.map(x => (typeof x.score === 'number' ? x.score : 0))
          const min = Math.min(...scores)
          const max = Math.max(...scores)
          const range = max - min
          if (range < 1e-6) ranked = ranked.map(x=>({ ...x, score: 0.5 }))
          else ranked = ranked.map(x => ({ ...x, score: Number(((x.score - min) / range * 0.98 + 0.01).toFixed(6)) }))
        } catch (e) {}

        console.log('[POST /api/recipes/rank] Returning', ranked.length, 'recipes from ML ranker')
        return res.json({ ok: true, recipes: ranked })
      } else {
        const txt = mlRes ? await mlRes.text() : 'no response'
        console.error('ML ranker returned non-OK', txt)
      }
    } catch (e) {
      console.error('ML ranker call failed', e && e.message ? e.message : e)
    }

    // fallback
    try {
      console.log('[POST /api/recipes/rank] Using fallback scoring (ML ranker not available)')
      let fallback = candidates.map(c => ({ id: c.recipe_id, recipe_id: c.recipe_id, title: c.title, image: ensureAbsoluteImage(c.image || null), ingredients: c.ingredients || [], score: computeFallbackScore(c, cleaned), usedIngredientCount: c.usedIngredientCount || 0, missedIngredientCount: c.missedIngredientCount || 0 }))
      if (elderAllergies.length) {
        fallback = fallback.map(r => { const ings = ((r.ingredients||[]).map(i=>String(i).toLowerCase())); const hasAllergen = elderAllergies.some(a => ings.some(i=>i.includes(a)||a.includes(i))); return { ...r, score: hasAllergen ? Math.max(0, r.score - 0.5) : r.score, allergen_warning: hasAllergen ? 'Contains potential allergen' : null } })
      }
      if (elderConditions.length) fallback = fallback.map(r => ({ ...r, score: penalizeForConditions(r.score, r, elderConditions) }))
      if (elderPreferences && (elderPreferences.likes.length || elderPreferences.dislikes.length)) {
        fallback = fallback.map(r => { const ings = ((r.ingredients||[]).map(i=>String(i).toLowerCase())); let s=r.score; (elderPreferences.likes||[]).forEach(l=>{ if (ings.some(i=>i.includes(l)||l.includes(i))) s+=0.08}); (elderPreferences.dislikes||[]).forEach(d=>{ if (ings.some(i=>i.includes(d)||d.includes(i))) s-=0.15}); return { ...r, score: s } })
      }
      if (elder_id) fallback = fallback.map(r => ({ ...r, explanation: generateScoreExplanation(r, elder_id, elderAllergies, elderConditions) }))
      // normalize
      try {
        const scores = fallback.map(x => (typeof x.score === 'number' ? x.score : 0))
        const min = Math.min(...scores)
        const max = Math.max(...scores)
        const range = max - min
        if (range < 1e-6) fallback = fallback.map(x=>({ ...x, score: 0.5 }))
        else fallback = fallback.map(x => ({ ...x, score: Number(((x.score - min) / range * 0.98 + 0.01).toFixed(6)) }))
      } catch (e) {}
      console.log('[POST /api/recipes/rank] Returning', fallback.length, 'recipes with fallback scoring')
      return res.json({ ok: true, recipes: fallback })
    } catch (e) {
      const fallback = candidates.map(c => ({ id: c.recipe_id, recipe_id: c.recipe_id, title: c.title, image: ensureAbsoluteImage(c.image || null), score: 0.5 }))
      console.log('[POST /api/recipes/rank] Final fallback: returning', fallback.length, 'recipes')
      return res.json({ ok: true, recipes: fallback })
    }

  } catch (err) {
    console.error('[POST /api/recipes/rank] CRITICAL ERROR:', err && err.message ? err.message : err, err && err.stack ? err.stack : '')
    return res.status(500).json({ error: 'Rank failed', detail: String(err) })
  }
})

// GET /api/recipes/:id
router.get('/:id', async (req, res) => {
  const id = req.params.id
  try {
    const info = await spoon.getRecipeInformation(id)
    let steps = []
    if (Array.isArray(info.analyzedInstructions) && info.analyzedInstructions.length > 0) steps = info.analyzedInstructions[0].steps.map(s=>({ number: s.number, step: s.step }))
    const ingredients = (info.extendedIngredients || []).map(ing => ({ id: ing.id, name: ing.name, original: ing.original }))
    res.json({ ok: true, recipe: { id: info.id, title: info.title, image: ensureAbsoluteImage(info.image || null), ingredients, steps, sourceUrl: null } })
  } catch (err) {
    console.error('GET /api/recipes/:id', err && err.message ? err.message : err)
    
    // Fallback response if API fails (e.g., 402 Payment Required or quota exceeded)
    if (err.response?.status === 402) {
      console.warn('⚠️ Spoonacular API quota exceeded (402). Returning mock recipe data.')
      return res.json({
        ok: true,
        recipe: {
          id: id,
          title: `Recipe #${id}`,
          image: PLACEHOLDER_IMAGE,
          ingredients: [
            { id: 1, name: 'Ingredient 1', original: '100g Ingredient 1' },
            { id: 2, name: 'Ingredient 2', original: '2 cups Ingredient 2' }
          ],
          steps: [
            { number: 1, step: 'Prepare ingredients' },
            { number: 2, step: 'Cook for 15-20 minutes' },
            { number: 3, step: 'Serve and enjoy' }
          ],
          sourceUrl: null,
          source: 'fallback_mock'
        }
      })
    }
    
    res.status(500).json({ error: 'Failed to fetch recipe details', detail: String(err) })
  }
})

// POST /api/recipes/generate-shopping-list
router.post('/generate-shopping-list', async (req, res) => {
  try {
    const { recipe_ids } = req.body
    if (!Array.isArray(recipe_ids) || recipe_ids.length === 0) {
      return res.status(400).json({ error: 'No recipe IDs provided' })
    }

    // Fetch all recipes and combine ingredients
    const allIngredients = []
    const ingredientMap = {} // To combine quantities

    for (const recipeId of recipe_ids) {
      try {
        const info = await spoon.getRecipeInformation(recipeId)
        if (info.extendedIngredients) {
          info.extendedIngredients.forEach(ing => {
            const key = (ing.name || '').toLowerCase().trim()
            if (!ingredientMap[key]) {
              ingredientMap[key] = {
                name: ing.name || 'Unknown',
                amount: 0,
                unit: ing.unit || '',
                original: ing.original || ''
              }
            }
            ingredientMap[key].amount += ing.amount || 0
          })
        }
      } catch (e) {
        console.error(`Failed to fetch recipe ${recipeId}:`, e.message)
      }
    }

    // Convert map to array and format
    const shoppingList = Object.values(ingredientMap).map(item => ({
      name: item.name,
      amount: item.amount > 0 ? `${item.amount.toFixed(1)} ${item.unit}`.trim() : item.original || item.name,
      checked: false
    }))

    res.json({ ok: true, shopping_list: shoppingList })
  } catch (err) {
    console.error('POST /api/recipes/generate-shopping-list', err && err.message ? err.message : err)
    res.status(500).json({ error: 'Failed to generate shopping list', detail: String(err) })
  }
})

module.exports = router
