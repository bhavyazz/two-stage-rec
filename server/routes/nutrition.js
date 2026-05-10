const express = require('express')
const router = express.Router()
const { pool } = require('../db')
const { authenticateToken } = require('../middleware/auth')
const { getSubstitutions, getBatchSubstitutions } = require('../services/ingredientSubstitution')

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY

// Fallback nutrition database for common foods (per 100g or unit)
const NUTRITION_DATABASE = {
  'chicken': { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  'chicken breast': { calories: 165, protein: 31, fat: 3.6, carbs: 0 },
  'rice': { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  'white rice': { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 },
  'brown rice': { calories: 111, protein: 2.6, fat: 0.9, carbs: 23 },
  'milk': { calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, perUnit: 'ml' },
  'egg': { calories: 155, protein: 13, fat: 11, carbs: 1.1, perUnit: 'piece' },
  'bread': { calories: 265, protein: 9, fat: 3.3, carbs: 49, perUnit: 'slice' },
  'banana': { calories: 89, protein: 1.1, fat: 0.3, carbs: 23 },
  'apple': { calories: 52, protein: 0.3, fat: 0.2, carbs: 14 },
  'broccoli': { calories: 34, protein: 2.8, fat: 0.4, carbs: 7 },
  'carrot': { calories: 41, protein: 0.9, fat: 0.2, carbs: 10 },
  'potato': { calories: 77, protein: 2, fat: 0.1, carbs: 17 },
  'fish': { calories: 96, protein: 20, fat: 1.1, carbs: 0 },
  'salmon': { calories: 208, protein: 20, fat: 13, carbs: 0 },
  'beef': { calories: 250, protein: 26, fat: 17, carbs: 0 },
  'yogurt': { calories: 59, protein: 3.5, fat: 0.4, carbs: 3.3 },
  'cheese': { calories: 402, protein: 25, fat: 33, carbs: 1.3 },
  'peanut butter': { calories: 588, protein: 25, fat: 50, carbs: 20 },
  'olive oil': { calories: 884, protein: 0, fat: 100, carbs: 0, perUnit: 'ml' },
  'pasta': { calories: 131, protein: 5, fat: 1.1, carbs: 25 },
  'lentils': { calories: 116, protein: 9, fat: 0.4, carbs: 20 },
  'almonds': { calories: 579, protein: 21, fat: 50, carbs: 22 },
  'almond butter': { calories: 588, protein: 21, fat: 50, carbs: 24 },
  'nuts': { calories: 600, protein: 20, fat: 55, carbs: 20 },
  'walnuts': { calories: 654, protein: 9, fat: 66, carbs: 13 },
  'peanuts': { calories: 567, protein: 26, fat: 49, carbs: 16 },
  'cashews': { calories: 553, protein: 18, fat: 44, carbs: 30 },
  'oats': { calories: 389, protein: 17, fat: 7, carbs: 66 },
  'oatmeal': { calories: 389, protein: 17, fat: 7, carbs: 66 },
  'spinach': { calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6 },
  'tomato': { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9 },
  'cucumber': { calories: 16, protein: 0.7, fat: 0.1, carbs: 3.6 },
  'lettuce': { calories: 15, protein: 1.2, fat: 0.3, carbs: 2.9 },
  'orange': { calories: 47, protein: 0.9, fat: 0.3, carbs: 12 },
  'strawberry': { calories: 32, protein: 0.7, fat: 0.3, carbs: 7.7 },
  'blueberry': { calories: 57, protein: 0.7, fat: 0.3, carbs: 14 },
  'grapes': { calories: 67, protein: 0.6, fat: 0.2, carbs: 17 },
  'watermelon': { calories: 30, protein: 0.6, fat: 0.2, carbs: 7.6 },
  'honey': { calories: 304, protein: 0.3, fat: 0, carbs: 82, perUnit: 'tbsp' },
  'sugar': { calories: 387, protein: 0, fat: 0, carbs: 100, perUnit: 'tsp' },
  'butter': { calories: 717, protein: 0.9, fat: 81, carbs: 0.1 },
  'coffee': { calories: 2, protein: 0.3, fat: 0, carbs: 0.3, perUnit: 'cup' },
  'tea': { calories: 2, protein: 0, fat: 0, carbs: 0.4, perUnit: 'cup' },
  'water': { calories: 0, protein: 0, fat: 0, carbs: 0, perUnit: 'cup' },
  'orange juice': { calories: 45, protein: 0.7, fat: 0.3, carbs: 10, perUnit: 'cup' },
  'apple juice': { calories: 48, protein: 0.1, fat: 0.2, carbs: 11, perUnit: 'cup' },
  'beer': { calories: 43, protein: 0.5, fat: 0, carbs: 3.6, perUnit: 'cup' }
}

function parseListField(value) {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.filter(Boolean)
    } catch (e) {
      return value.split(',').map((v) => v.trim()).filter(Boolean)
    }
  }
  return []
}

// POST /api/nutrition/preview - Fetch nutrition data from API ONLY
router.post('/preview', authenticateToken, async (req, res) => {
  const { food_name, quantity, unit } = req.body

  if (!food_name || !quantity || !unit) {
    return res.status(400).json({ error: 'Missing food_name, quantity, or unit' })
  }

  try {
    const normalizedUnit = normalizeUnit(unit)
    
    console.log('🔍 Looking for food:', food_name)

    // ONLY use Spoonacular API - NO fallback database
    if (!SPOONACULAR_API_KEY || SPOONACULAR_API_KEY === 'invalid') {
      return res.status(500).json({ error: 'Spoonacular API key not configured' })
    }

    console.log('📤 Fetching from Spoonacular API...')
    
    // Try the nutrition/estimate endpoint instead
    const url = `https://api.spoonacular.com/recipes/guessNutrition?title=${encodeURIComponent(food_name)}&apiKey=${SPOONACULAR_API_KEY}`

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })

    console.log('API Response Status:', response.status)
    const data = await response.json()
    console.log('API Response Data:', data)

    if (response.ok && data && data.calories) {
      console.log('✅ Got nutrition data from Spoonacular API')
      
      // Extract values from nested objects
      const caloriesValue = data.calories?.value || 0
      const proteinValue = data.protein?.value || 0
      const fatValue = data.fat?.value || 0
      const carbsValue = data.carbs?.value || 0
      
      console.log('Extracted nutrition:', { caloriesValue, proteinValue, fatValue, carbsValue })
      
      // Calculate multiplier based on quantity
      let multiplier = 1
      if (normalizedUnit === 'g' || normalizedUnit === 'grams') {
        multiplier = quantity / 100
      } else if (normalizedUnit === 'ml') {
        multiplier = quantity / 100
      } else if (normalizedUnit === 'cup') {
        multiplier = quantity
      } else {
        multiplier = quantity / 100
      }

      const response_obj = {
        ok: true,
        preview: {
          food_name,
          quantity,
          unit: normalizedUnit,
          calories: Math.round((caloriesValue || 0) * multiplier * 100) / 100,
          protein: Math.round((proteinValue || 0) * multiplier * 100) / 100,
          fat: Math.round((fatValue || 0) * multiplier * 100) / 100,
          carbs: Math.round((carbsValue || 0) * multiplier * 100) / 100,
          source: 'spoonacular_api'
        }
      }
      console.log('Final response:', response_obj)
      return res.json(response_obj)
    } else {
      console.error('API Error:', response.status, data)
      return res.status(404).json({ 
        error: `Food "${food_name}" not found in API. Response: ${data.message || 'Unknown error'}` 
      })
    }

  } catch (err) {
    console.error('❌ Preview error:', err.message)
    res.status(500).json({ error: 'Error fetching nutrition data: ' + err.message })
  }
})

// Helper function to normalize units
function normalizeUnit(unit) {
  const unitMap = {
    'grams': 'g',
    'gram': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'milliliters': 'ml',
    'l': 'l',
    'liter': 'l',
    'liters': 'l',
    'cup': 'cup',
    'cups': 'cup',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tbsp': 'tbsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'tsp': 'tsp',
    'piece': 'piece',
    'pieces': 'piece',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz'
  }
  return unitMap[unit.toLowerCase()] || unit
}

// POST /api/nutrition/save - Save nutrition entry to database
router.post('/save', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const { food_name, quantity, unit, calories, protein, fat, carbs, spoonacular_id } = req.body

  if (!food_name || !quantity || !unit) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO nutrition_entries (user_id, food_name, quantity, unit, calories, protein, fat, carbs, spoonacular_id, date_consumed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
       RETURNING *`,
      [userId, food_name, quantity, unit, calories || 0, protein || 0, fat || 0, carbs || 0, spoonacular_id || null]
    )

    res.json({
      ok: true,
      entry: result.rows[0]
    })
  } catch (err) {
    console.error('POST /api/nutrition/save error', err)
    res.status(500).json({ error: 'Failed to save nutrition entry' })
  }
})

// GET /api/nutrition/daily-summary - Get today's nutrition summary
router.get('/daily-summary', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(fat), 0) as total_fat,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COUNT(*) as total_items
       FROM nutrition_entries 
       WHERE user_id=$1 AND date_consumed=CURRENT_DATE`,
      [userId]
    )

    const summary = result.rows[0] || {
      total_calories: 0,
      total_protein: 0,
      total_fat: 0,
      total_carbs: 0,
      total_items: 0
    }

    res.json(summary)
  } catch (err) {
    console.error('GET /api/nutrition/daily-summary error', err)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

// GET /api/nutrition/entries - Get all entries for current user
router.get('/entries', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    const result = await pool.query(
      `SELECT * FROM nutrition_entries WHERE user_id=$1 ORDER BY date_consumed DESC, created_at DESC LIMIT 100`,
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/nutrition/entries error', err)
    res.status(500).json({ error: 'Failed to fetch entries' })
  }
})

// GET /api/nutrition/daily-entries - Get today's entries
router.get('/daily-entries', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    const result = await pool.query(
      `SELECT * FROM nutrition_entries 
       WHERE user_id=$1 AND date_consumed=CURRENT_DATE
       ORDER BY created_at DESC`,
      [userId]
    )

    res.json(result.rows)
  } catch (err) {
    console.error('GET /api/nutrition/daily-entries error', err)
    res.status(500).json({ error: 'Failed to fetch daily entries' })
  }
})

// PUT /api/nutrition/entries/:id - Update nutrition entry
router.put('/entries/:id', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const entryId = req.params.id
  const { quantity, unit } = req.body

  if (!quantity || !unit) {
    return res.status(400).json({ error: 'Missing quantity or unit' })
  }

  try {
    const result = await pool.query(
      `UPDATE nutrition_entries 
       SET quantity=$1, unit=$2
       WHERE id=$3 AND user_id=$4
       RETURNING *`,
      [quantity, unit, entryId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found or unauthorized' })
    }

    res.json({ ok: true, entry: result.rows[0] })
  } catch (err) {
    console.error('PUT /api/nutrition/entries/:id error', err)
    res.status(500).json({ error: 'Failed to update entry' })
  }
})

// DELETE /api/nutrition/entries/:id - Delete nutrition entry
router.delete('/entries/:id', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const entryId = req.params.id

  try {
    const result = await pool.query(
      `DELETE FROM nutrition_entries WHERE id=$1 AND user_id=$2`,
      [entryId, userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found or unauthorized' })
    }

    res.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/nutrition/entries/:id error', err)
    res.status(500).json({ error: 'Failed to delete entry' })
  }
})

// GET /api/nutrition/stats/:date - Get nutrition stats for a specific date
router.get('/stats/:date', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const targetDate = req.params.date

  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(calories), 0) as total_calories,
        COALESCE(SUM(protein), 0) as total_protein,
        COALESCE(SUM(carbs), 0) as total_carbs,
        COALESCE(SUM(fat), 0) as total_fat
       FROM nutrition_entries
       WHERE user_id=$1 AND DATE(date_consumed)=DATE($2)`,
      [userId, targetDate]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('GET /api/nutrition/stats/:date error', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// GET /api/nutrition/recommendations - Get personalized recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    // Get last 7 days of data
    const result = await pool.query(
      `SELECT 
        AVG(daily_calories) as avg_calories,
        AVG(daily_protein) as avg_protein,
        AVG(daily_carbs) as avg_carbs,
        AVG(daily_fat) as avg_fat
       FROM (
         SELECT 
           DATE(date_consumed) as day,
           SUM(calories) as daily_calories,
           SUM(protein) as daily_protein,
           SUM(carbs) as daily_carbs,
           SUM(fat) as daily_fat
         FROM nutrition_entries
         WHERE user_id=$1 AND date_consumed >= NOW() - INTERVAL '7 days'
         GROUP BY DATE(date_consumed)
       ) daily_stats`,
      [userId]
    )

    const stats = result.rows[0]
    const recommendations = []

    if (stats.avg_calories) {
      const avgCalories = parseFloat(stats.avg_calories)
      const avgProtein = parseFloat(stats.avg_protein)
      const avgCarbs = parseFloat(stats.avg_carbs)
      const avgFat = parseFloat(stats.avg_fat)

      // Calorie recommendations
      if (avgCalories < 1500) {
        recommendations.push({
          type: 'warning',
          message: 'Your average calorie intake is quite low. Consider increasing portion sizes or adding healthy snacks.',
          priority: 'high'
        })
      } else if (avgCalories > 3000) {
        recommendations.push({
          type: 'warning',
          message: 'Your calorie intake is higher than recommended. Try smaller portions or choosing lower-calorie options.',
          priority: 'high'
        })
      }

      // Protein recommendations
      const proteinPercent = (avgProtein * 4 / avgCalories) * 100
      if (proteinPercent < 15) {
        recommendations.push({
          type: 'tip',
          message: 'Increase your protein intake. Add lean meats, fish, eggs, or legumes to your meals.',
          priority: 'medium'
        })
      } else if (proteinPercent > 30) {
        recommendations.push({
          type: 'tip',
          message: 'Your protein intake is high. Balance it with more vegetables and whole grains.',
          priority: 'low'
        })
      }

      // Carbs recommendations
      const carbsPercent = (avgCarbs * 4 / avgCalories) * 100
      if (carbsPercent < 40) {
        recommendations.push({
          type: 'tip',
          message: 'Consider adding more complex carbohydrates like whole grains, fruits, and vegetables.',
          priority: 'medium'
        })
      } else if (carbsPercent > 65) {
        recommendations.push({
          type: 'warning',
          message: 'Your carbohydrate intake is high. Try incorporating more protein and healthy fats.',
          priority: 'medium'
        })
      }

      // Fat recommendations
      const fatPercent = (avgFat * 9 / avgCalories) * 100
      if (fatPercent < 20) {
        recommendations.push({
          type: 'tip',
          message: 'Add healthy fats like avocados, nuts, olive oil, and fatty fish to your diet.',
          priority: 'medium'
        })
      } else if (fatPercent > 40) {
        recommendations.push({
          type: 'warning',
          message: 'Your fat intake is quite high. Focus on healthier fat sources and reduce fried foods.',
          priority: 'medium'
        })
      }

      // Balance recommendation
      if (recommendations.length === 0) {
        recommendations.push({
          type: 'success',
          message: 'Great job! Your nutrition is well-balanced. Keep up the good work!',
          priority: 'low'
        })
      }
    } else {
      recommendations.push({
        type: 'info',
        message: 'Start logging your meals to get personalized recommendations!',
        priority: 'low'
      })
    }

    res.json({ recommendations })
  } catch (err) {
    console.error('GET /api/nutrition/recommendations error', err)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

// POST /api/nutrition/ai-analysis - Get AI-powered nutrition analysis
router.post('/ai-analysis', authenticateToken, async (req, res) => {
  const userId = req.user.user_id
  const { period } = req.body // 'today', '1day', '3days', '7days', '30days', or custom { start, end }

  try {
    let startDate, endDate = new Date()
    
    if (period === 'today') {
      startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
    } else if (period === '1day') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 1)
    } else if (period === '3days') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 3)
    } else if (period === '7days') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
    } else if (period === '30days') {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
    } else if (period.start && period.end) {
      startDate = new Date(period.start)
      endDate = new Date(period.end)
    } else {
      startDate = new Date()
      startDate.setDate(startDate.getDate() - 7)
    }

    // Get nutrition data for the period
    const result = await pool.query(
      `SELECT 
        food_name, quantity, unit, calories, protein, carbs, fat, date_consumed
       FROM nutrition_entries
       WHERE user_id=$1 AND date_consumed >= $2 AND date_consumed <= $3
       ORDER BY date_consumed DESC`,
      [userId, startDate, endDate]
    )

    const entries = result.rows

    // Calculate stats
    const stats = {
      total_entries: entries.length,
      total_calories: entries.reduce((sum, e) => sum + parseFloat(e.calories), 0),
      total_protein: entries.reduce((sum, e) => sum + parseFloat(e.protein), 0),
      total_carbs: entries.reduce((sum, e) => sum + parseFloat(e.carbs), 0),
      total_fat: entries.reduce((sum, e) => sum + parseFloat(e.fat), 0)
    }

    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1
    stats.avg_daily_calories = Math.round(stats.total_calories / days)

    // Prepare data for AI analysis
    const foodList = entries.map(e => `${e.food_name} (${e.quantity} ${e.unit})`).join(', ')
    
    // Call Groq API for AI analysis
    const GROQ_API_KEY = process.env.GROQ_API_KEY
    console.log('🔑 GROQ_API_KEY loaded:', GROQ_API_KEY ? 'YES' : 'NO')
    
    let analysis = ''
    
    if (GROQ_API_KEY && GROQ_API_KEY !== 'invalid') {
      const prompt = `You are a professional nutritionist and fitness coach analyzing someone's eating patterns over ${days} days. 

Here are their nutrition stats:
- Total Entries: ${stats.total_entries}
- Total Calories: ${Math.round(stats.total_calories)}
- Average Daily Calories: ${stats.avg_daily_calories}
- Total Protein: ${Math.round(stats.total_protein)}g
- Total Carbs: ${Math.round(stats.total_carbs)}g
- Total Fat: ${Math.round(stats.total_fat)}g

Foods consumed: ${foodList}

Provide a comprehensive nutrition coaching analysis including:

1. Overall Assessment - Evaluate their current diet quality and consistency

2. What's Working Well - Highlight strengths in their eating habits

3. Areas for Improvement - Identify specific nutrition gaps

4. Meal Suggestions - Provide 3-4 specific meal ideas (breakfast, lunch, dinner, snack) that match their needs with approximate calories

5. Daily Habits - Recommend specific daily practices like:
   - Optimal meal timing
   - Hydration goals
   - Snack strategies
   - Portion sizes

6. Actionable Recommendations - Give 5-6 specific, implementable steps they can take TODAY

Important: Do NOT use any markdown formatting (no **, #, or special characters). Write in clear, conversational paragraphs. Be encouraging, specific, and practical.`

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
          })
        })

        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          analysis = groqData.choices[0].message.content
          console.log('✅ AI Analysis generated successfully')
        } else {
          const errorText = await groqResponse.text()
          console.error('❌ GROQ API Error:', groqResponse.status, errorText)
        }
      } catch (apiErr) {
        console.error('❌ GROQ API Exception:', apiErr.message)
      }
    }
    
    // Generate rule-based analysis if AI fails
    if (!analysis) {
      console.log('📝 Using rule-based analysis')
      const avgCalories = stats.avg_daily_calories
      const proteinPercent = (stats.total_protein * 4 / stats.total_calories) * 100 || 0
      const carbsPercent = (stats.total_carbs * 4 / stats.total_calories) * 100 || 0
      const fatPercent = (stats.total_fat * 9 / stats.total_calories) * 100 || 0
      
      analysis = ``
      
      if (stats.total_entries < 3) {
        analysis += `OVERALL ASSESSMENT\n\nYou've logged ${stats.total_entries} ${stats.total_entries === 1 ? 'entry' : 'entries'} over ${days} ${days === 1 ? 'day' : 'days'}. Great start on your nutrition journey! Consistent tracking is the foundation of understanding your eating habits. Keep logging every meal and snack to get accurate insights.\n\n`
      } else {
        analysis += `OVERALL ASSESSMENT\n\nYou've logged ${stats.total_entries} entries over ${days} ${days === 1 ? 'day' : 'days'}. Your average daily intake is ${avgCalories} calories with ${Math.round(stats.total_protein / days)}g protein, ${Math.round(stats.total_carbs / days)}g carbs, and ${Math.round(stats.total_fat / days)}g fat per day. Your consistency with tracking is excellent.\n\n`
      }
      
      analysis += `MACRONUTRIENT BREAKDOWN\n\nYour current macronutrient distribution is:\nProtein: ${proteinPercent.toFixed(1)}% (Healthy range: 15-30%)\nCarbohydrates: ${carbsPercent.toFixed(1)}% (Healthy range: 45-65%)\nFat: ${fatPercent.toFixed(1)}% (Healthy range: 20-35%)\n\n`
      
      let recommendations = []
      let mealSuggestions = []
      
      if (avgCalories < 1200) {
        analysis += `CALORIE OBSERVATION\n\nYour daily intake is lower than recommended. Most adults need 1200-2500+ calories depending on activity level and goals. Undereating can lead to low energy, nutrient deficiencies, and metabolic slowdown.\n\n`
        recommendations.push(`Increase portion sizes and add 2-3 snacks daily`)
        recommendations.push(`Include calorie-dense foods like nuts, seeds, and healthy oils`)
        recommendations.push(`Add a protein shake or smoothie daily`)
        mealSuggestions.push(`Breakfast: Scrambled eggs (2) with whole grain toast, avocado, and orange juice (500 cal)`)
        mealSuggestions.push(`Lunch: Grilled chicken (150g) with brown rice, roasted vegetables, and olive oil (650 cal)`)
        mealSuggestions.push(`Snack: Protein shake with banana, peanut butter, and milk (350 cal)`)
        mealSuggestions.push(`Dinner: Baked salmon (150g) with sweet potato and broccoli drizzled with coconut oil (600 cal)`)
      } else if (avgCalories > 3000) {
        analysis += `CALORIE OBSERVATION\n\nYour daily intake is on the higher side. While not necessarily problematic if you're very active, being mindful of portions can help maintain a healthy weight. Focus on nutrient-dense options and portion awareness.\n\n`
        recommendations.push(`Practice portion control using smaller plates`)
        recommendations.push(`Choose water or unsweetened drinks instead of calorie-heavy beverages`)
        recommendations.push(`Include more low-calorie, high-volume foods like vegetables`)
        mealSuggestions.push(`Breakfast: Oatmeal (40g) with berries, honey, and almonds (350 cal)`)
        mealSuggestions.push(`Lunch: Grilled fish (120g) with mixed green salad, brown rice, and vinaigrette (500 cal)`)
        mealSuggestions.push(`Snack: Apple with 2 tbsp almond butter (200 cal)`)
        mealSuggestions.push(`Dinner: Lean turkey breast (120g) with quinoa and roasted vegetables (500 cal)`)
      } else {
        analysis += `CALORIE OBSERVATION\n\nYour calorie intake appears balanced. Maintain this level while focusing on food quality and consistency.\n\n`
      }
      
      if (proteinPercent < 15) {
        analysis += `PROTEIN BOOST NEEDED\n\nYour protein intake is low, which can affect muscle maintenance, satiety, and recovery. Aim for 20-30% of calories from protein sources.\n\n`
        recommendations.push(`Add protein to every meal and snack`)
        recommendations.push(`Include chicken, fish, eggs, Greek yogurt, or legumes daily`)
        recommendations.push(`Consider a protein shake between meals`)
        mealSuggestions.push(`Breakfast: Greek yogurt (200g) with granola and mixed berries (400 cal)`)
        mealSuggestions.push(`Lunch: Grilled chicken breast (150g) with lentil soup and whole grain bread (600 cal)`)
        mealSuggestions.push(`Snack: Protein shake with banana and almond butter (300 cal)`)
        mealSuggestions.push(`Dinner: Baked salmon (150g) with sweet potato and roasted broccoli (550 cal)`)
      } else if (proteinPercent > 30) {
        analysis += `PROTEIN BALANCE\n\nYour protein intake is high. While protein is important, balance it with more complex carbs and vegetables for fiber and micronutrients.\n\n`
        recommendations.push(`Add more whole grains to your meals`)
        recommendations.push(`Include 2-3 servings of vegetables with lunch and dinner`)
        recommendations.push(`Explore plant-based proteins like lentils and chickpeas`)
        mealSuggestions.push(`Breakfast: Whole grain toast with peanut butter, banana, and berries (400 cal)`)
        mealSuggestions.push(`Lunch: Buddha bowl with quinoa, roasted vegetables, and chickpeas (600 cal)`)
        mealSuggestions.push(`Snack: Fresh fruit with handful of mixed nuts (200 cal)`)
        mealSuggestions.push(`Dinner: Stir-fry with tofu, brown rice, and plenty of vegetables (550 cal)`)
      }
      
      if (carbsPercent < 40) {
        analysis += `CARBOHYDRATE BOOST NEEDED\n\nYour carbs are lower than ideal. Complex carbohydrates provide sustained energy and important micronutrients. Include whole grains, fruits, and starchy vegetables.\n\n`
        recommendations.push(`Add a serving of whole grains to breakfast`)
        recommendations.push(`Include fruit with 2-3 meals daily`)
        recommendations.push(`Choose sweet potatoes, brown rice, or oats regularly`)
        mealSuggestions.push(`Breakfast: Overnight oats with banana, berries, and almond milk (450 cal)`)
        mealSuggestions.push(`Lunch: Whole wheat pasta with marinara, grilled vegetables, and lean meat (650 cal)`)
        mealSuggestions.push(`Snack: Apple with almond butter or whole grain crackers with hummus (250 cal)`)
        mealSuggestions.push(`Dinner: Brown rice bowl with beans, corn, roasted vegetables, and grilled chicken (600 cal)`)
      } else if (carbsPercent > 65) {
        analysis += `CARBOHYDRATE BALANCE\n\nYour carb intake is high. While carbs are important, balance them with more protein and healthy fats for stable blood sugar and sustained energy.\n\n`
        recommendations.push(`Add a palm-sized portion of protein to each meal`)
        recommendations.push(`Include healthy fats like olive oil, avocado, and nuts`)
        recommendations.push(`Choose fiber-rich carbs and limit refined sugars`)
        mealSuggestions.push(`Breakfast: Vegetable omelet with 1 slice whole grain toast and avocado (400 cal)`)
        mealSuggestions.push(`Lunch: Grilled fish with mixed green salad, olive oil dressing, and quinoa (600 cal)`)
        mealSuggestions.push(`Snack: Handful of nuts with cheese and cherry tomatoes (200 cal)`)
        mealSuggestions.push(`Dinner: Grilled chicken breast with cauliflower rice and sautéed spinach in olive oil (500 cal)`)
      }
      
      if (fatPercent < 20) {
        analysis += `HEALTHY FAT BOOST\n\nYour fat intake is lower than recommended. Healthy fats are crucial for hormone production, nutrient absorption, and brain health. Include avocados, nuts, seeds, and quality oils.\n\n`
        recommendations.push(`Add avocado or nuts to breakfast`)
        recommendations.push(`Use olive oil on salads and vegetables`)
        recommendations.push(`Include fatty fish like salmon 2-3 times weekly`)
        mealSuggestions.push(`Breakfast: Avocado toast with poached eggs and whole grain bread (450 cal)`)
        mealSuggestions.push(`Lunch: Salmon salad with olive oil dressing, walnuts, and mixed greens (650 cal)`)
        mealSuggestions.push(`Snack: Trail mix with almonds, cashews, and dried fruit (300 cal)`)
        mealSuggestions.push(`Dinner: Mackerel with roasted vegetables drizzled with olive oil (550 cal)`)
      } else if (fatPercent > 35) {
        analysis += `FAT INTAKE MODERATION\n\nYour fat intake is elevated. Focus on quality fat sources and reduce fried foods and excessive oils to maintain cardiovascular health.\n\n`
        recommendations.push(`Limit fried foods to once a week or less`)
        recommendations.push(`Choose lean protein sources like chicken breast and fish`)
        recommendations.push(`Use herbs and spices instead of oils for flavoring`)
        mealSuggestions.push(`Breakfast: Fruit smoothie with low-fat yogurt and spinach (300 cal)`)
        mealSuggestions.push(`Lunch: Grilled turkey breast with steamed vegetables and brown rice (550 cal)`)
        mealSuggestions.push(`Snack: Fresh fruit or air-popped popcorn with herbs (150 cal)`)
        mealSuggestions.push(`Dinner: Baked cod with quinoa and roasted Brussels sprouts (500 cal)`)
      }
      
      analysis += `MEAL SUGGESTIONS FOR TODAY\n\n`
      mealSuggestions.slice(0, 4).forEach((meal, i) => {
        analysis += `${i + 1}. ${meal}\n`
      })
      analysis += `\n`
      
      analysis += `DAILY COACHING TIPS\n\nHydration: Drink 8-10 glasses of water daily. Start with a glass of water upon waking and before each meal.\n\nMeal Timing: Eat 3 main meals and 1-2 snacks. Leave 3-4 hours between meals for optimal digestion.\n\nMindful Eating: Slow down, chew thoroughly, and avoid distractions during meals. This improves satisfaction and digestion.\n\nNutrient Variety: Eat different colored foods daily - each color provides different micronutrients.\n\nConsistency Over Perfection: One healthy meal doesn't define your diet, nor does one indulgent meal. Focus on your weekly average.\n\n`
      
      analysis += `ACTION ITEMS YOU CAN START TODAY\n\n`
      recommendations.slice(0, 6).forEach((rec, i) => {
        analysis += `${i + 1}. ${rec}\n`
      })
      analysis += `\nSmall, sustainable changes lead to lasting results. You're doing great by tracking your nutrition. Keep going!`
    }

    res.json({ stats, analysis, period: { start: startDate, end: endDate } })
  } catch (err) {
    console.error('POST /api/nutrition/ai-analysis error', err)
    res.status(500).json({ error: 'Failed to generate AI analysis' })
  }
})

// GET /api/nutrition/quick-tip - Get AI-generated quick nutrition tip
router.get('/quick-tip', authenticateToken, async (req, res) => {
  const userId = req.user.user_id

  try {
    // Get last 3 days of data for personalized tips
    const result = await pool.query(
      `SELECT food_name, calories, protein, carbs, fat
       FROM nutrition_entries
       WHERE user_id=$1 AND date_consumed >= NOW() - INTERVAL '3 days'
       ORDER BY date_consumed DESC
       LIMIT 20`,
      [userId]
    )

    const recentFoods = result.rows

    let tip = ''
    let badge = 'general'

    const GROQ_API_KEY = process.env.GROQ_API_KEY

    if (recentFoods.length > 0 && GROQ_API_KEY) {
      const foodList = recentFoods.map(f => f.food_name).join(', ')
      
      const prompt = `Based on someone recently eating: ${foodList}

Generate ONE short, actionable nutrition tip (maximum 20 words) that's specific to their recent food choices. Be encouraging and practical.`

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.8,
            max_tokens: 50
          })
        })

        if (groqResponse.ok) {
          const groqData = await groqResponse.json()
          tip = groqData.choices[0].message.content.trim().replace(/^["']|["']$/g, '')
          badge = 'personalized'
        }
      } catch (aiErr) {
        console.log('AI tip generation failed, using fallback')
      }
    }

    // Fallback tips if AI fails or no data
    if (!tip) {
      const fallbackTips = [
        'Drink a glass of water before each meal to aid digestion.',
        'Add a serving of vegetables to your next meal.',
        'Choose whole grain options when possible.',
        'Protein at breakfast helps maintain energy throughout the day.',
        'Colorful plates mean diverse nutrients!',
        'Healthy snacks prevent overeating at main meals.',
        'Meal prep on weekends saves time and improves diet quality.',
        'Mindful eating enhances satisfaction and reduces overeating.'
      ]
      tip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)]
      badge = recentFoods.length > 0 ? 'general' : 'fallback'
    }

    res.json({ tip, badge })
  } catch (err) {
    console.error('GET /api/nutrition/quick-tip error', err)
    res.json({
      tip: 'Stay hydrated and eat a balanced diet with plenty of fruits and vegetables.',
      badge: 'fallback'
    })
  }
})

// POST /api/nutrition/substitute - Get ingredient substitutions
router.post('/substitute', authenticateToken, async (req, res) => {
  try {
    const { ingredient, condition, topN = 3, elderId, allergies } = req.body

    if (!ingredient) {
      return res.status(400).json({ error: 'Missing ingredient' })
    }

    // Optional elder context (conditions/allergies)
    let elder = null
    let elderConditions = []
    let elderAllergies = []
    if (elderId) {
      try {
        const e = await pool.query(
          'SELECT elder_id, name, conditions, allergies FROM "Elder" WHERE elder_id = $1 AND user_id = $2 LIMIT 1',
          [elderId, req.user.user_id]
        )
        if (e.rows[0]) {
          elder = { elder_id: e.rows[0].elder_id, name: e.rows[0].name }
          elderConditions = parseListField(e.rows[0].conditions)
          elderAllergies = parseListField(e.rows[0].allergies)
        }
      } catch (err) {
        console.warn('Elder lookup failed, continuing without elder context', err.message)
      }
    }

    const allergiesFromBody = parseListField(allergies)
    const combinedAllergies = [...elderAllergies, ...allergiesFromBody].filter(Boolean)

    const effectiveCondition = condition || (elderConditions.length ? elderConditions.join(', ') : null)

    // Fetch current user's pantry items to prioritize in recommendations
    let pantryItems = []
    try {
      const pantryRes = await pool.query(
        'SELECT item_name FROM pantry_items WHERE user_id = $1 LIMIT 200',
        [req.user.user_id]
      )
      pantryItems = pantryRes.rows.map((r) => r.item_name)
    } catch (err) {
      console.warn('Pantry lookup failed, continuing without pantry prioritization', err.message)
    }

    const result = await getSubstitutions(ingredient, effectiveCondition, topN, pantryItems, combinedAllergies)
    
    if (result.error) {
      return res.status(404).json(result)
    }

    res.json({
      ok: true,
      data: result,
      elder: elder ? { ...elder, conditions: elderConditions, allergies: elderAllergies } : null,
      allergies: combinedAllergies
    })
  } catch (err) {
    console.error('POST /api/nutrition/substitute error', err)
    res.status(500).json({ error: 'Failed to get substitutions' })
  }
})

// POST /api/nutrition/substitute-batch - Get substitutions for multiple ingredients
router.post('/substitute-batch', authenticateToken, async (req, res) => {
  try {
    const { ingredients, condition, elderId, allergies } = req.body

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Missing or invalid ingredients array' })
    }

    let elder = null
    let elderConditions = []
    let elderAllergies = []
    if (elderId) {
      try {
        const e = await pool.query(
          'SELECT elder_id, name, conditions, allergies FROM "Elder" WHERE elder_id = $1 AND user_id = $2 LIMIT 1',
          [elderId, req.user.user_id]
        )
        if (e.rows[0]) {
          elder = { elder_id: e.rows[0].elder_id, name: e.rows[0].name }
          elderConditions = parseListField(e.rows[0].conditions)
          elderAllergies = parseListField(e.rows[0].allergies)
        }
      } catch (err) {
        console.warn('Elder lookup failed (batch), continuing without elder context', err.message)
      }
    }

    const allergiesFromBody = parseListField(allergies)
    const combinedAllergies = [...elderAllergies, ...allergiesFromBody].filter(Boolean)

    const effectiveCondition = condition || (elderConditions.length ? elderConditions.join(', ') : null)

    let pantryItems = []
    try {
      const pantryRes = await pool.query(
        'SELECT item_name FROM pantry_items WHERE user_id = $1 LIMIT 200',
        [req.user.user_id]
      )
      pantryItems = pantryRes.rows.map((r) => r.item_name)
    } catch (err) {
      console.warn('Pantry lookup failed (batch), continuing without pantry prioritization', err.message)
    }

    const results = await getBatchSubstitutions(ingredients, effectiveCondition, pantryItems, combinedAllergies)
    
    res.json({
      ok: true,
      data: results,
      elder: elder ? { ...elder, conditions: elderConditions, allergies: elderAllergies } : null,
      allergies: combinedAllergies
    })
  } catch (err) {
    console.error('POST /api/nutrition/substitute-batch error', err)
    res.status(500).json({ error: 'Failed to get batch substitutions' })
  }
})

module.exports = router
