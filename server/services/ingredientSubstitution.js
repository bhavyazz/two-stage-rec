/**
 * Smart Ingredient Substitution Service
 * Uses Content-Based Filtering with Cosine Similarity to recommend healthier alternatives
 */

const axios = require('axios')

// Comprehensive ingredient database with nutrition data (per 100g)
const INGREDIENT_DATABASE = {
  'white rice': { 
    calories: 130, protein: 2.7, fat: 0.3, carbs: 28, fiber: 0.4,
    category: 'grain', glycemic_index: 73, healthScore: 3,
    description: 'Refined white rice'
  },
  'brown rice': { 
    calories: 111, protein: 2.6, fat: 0.9, carbs: 23, fiber: 1.8,
    category: 'grain', glycemic_index: 68, healthScore: 7,
    description: 'Whole grain brown rice'
  },
  'millet': { 
    calories: 378, protein: 11, fat: 4, carbs: 71, fiber: 8.5,
    category: 'grain', glycemic_index: 71, healthScore: 8,
    description: 'Ancient grain, high in fiber'
  },
  'quinoa': { 
    calories: 120, protein: 4.4, fat: 1.9, carbs: 21, fiber: 2.8,
    category: 'grain', glycemic_index: 53, healthScore: 9,
    description: 'Complete protein grain'
  },
  'wild rice': { 
    calories: 101, protein: 3.9, fat: 0.3, carbs: 21, fiber: 1.7,
    category: 'grain', glycemic_index: 45, healthScore: 8,
    description: 'Low GI whole grain'
  },
  'white bread': { 
    calories: 265, protein: 9, fat: 3.3, carbs: 49, fiber: 2.7,
    category: 'grain', glycemic_index: 75, healthScore: 2,
    description: 'Refined wheat bread'
  },
  'whole wheat bread': { 
    calories: 247, protein: 13, fat: 3.3, carbs: 43, fiber: 6.8,
    category: 'grain', glycemic_index: 51, healthScore: 8,
    description: 'Whole grain bread'
  },
  'rye bread': { 
    calories: 259, protein: 9, fat: 3.3, carbs: 48, fiber: 5.8,
    category: 'grain', glycemic_index: 41, healthScore: 8,
    description: 'Rye grain bread'
  },
  'regular pasta': { 
    calories: 131, protein: 5, fat: 1.1, carbs: 25, fiber: 1.8,
    category: 'grain', glycemic_index: 46, healthScore: 3,
    description: 'Refined wheat pasta'
  },
  'whole wheat pasta': { 
    calories: 124, protein: 7, fat: 1.1, carbs: 21, fiber: 3.7,
    category: 'grain', glycemic_index: 32, healthScore: 8,
    description: 'Whole grain pasta'
  },
  'lentil pasta': { 
    calories: 122, protein: 25, fat: 2, carbs: 20, fiber: 5,
    category: 'grain', glycemic_index: 21, healthScore: 9,
    description: 'High protein legume pasta'
  },
  'white sugar': { 
    calories: 387, protein: 0, fat: 0, carbs: 100, fiber: 0,
    category: 'sweetener', glycemic_index: 100, healthScore: 0,
    description: 'Refined sugar'
  },
  'honey': { 
    calories: 304, protein: 0.3, fat: 0, carbs: 82, fiber: 0,
    category: 'sweetener', glycemic_index: 55, healthScore: 4,
    description: 'Natural sweetener'
  },
  'maple syrup': { 
    calories: 260, protein: 0, fat: 0, carbs: 67, fiber: 0,
    category: 'sweetener', glycemic_index: 54, healthScore: 4,
    description: 'Natural sweetener'
  },
  'stevia': { 
    calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0,
    category: 'sweetener', glycemic_index: 0, healthScore: 10,
    description: 'Zero calorie sweetener'
  },
  'whole milk': { 
    calories: 61, protein: 3.2, fat: 3.3, carbs: 4.8, fiber: 0,
    category: 'dairy', glycemic_index: 27, healthScore: 6,
    description: 'Full fat milk'
  },
  'skimmed milk': { 
    calories: 35, protein: 3.6, fat: 0.1, carbs: 5, fiber: 0,
    category: 'dairy', glycemic_index: 32, healthScore: 7,
    description: 'Low fat milk'
  },
  'almond milk': { 
    calories: 30, protein: 1, fat: 2.5, carbs: 1.3, fiber: 0.3,
    category: 'dairy', glycemic_index: 30, healthScore: 8,
    description: 'Plant-based alternative'
  },
  'oat milk': { 
    calories: 47, protein: 2, fat: 1.5, carbs: 4, fiber: 0.6,
    category: 'dairy', glycemic_index: 40, healthScore: 8,
    description: 'Plant-based alternative'
  },
  'chicken breast': {
    calories: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0,
    category: 'protein', glycemic_index: 0, healthScore: 8,
    description: 'Lean poultry protein'
  },
  'turkey breast': {
    calories: 135, protein: 30, fat: 1, carbs: 0, fiber: 0,
    category: 'protein', glycemic_index: 0, healthScore: 9,
    description: 'Very lean poultry protein'
  },
  'tofu': {
    calories: 76, protein: 8, fat: 4.8, carbs: 1.9, fiber: 0.3,
    category: 'protein', glycemic_index: 15, healthScore: 8,
    description: 'Soy-based plant protein'
  },
  'salmon': {
    calories: 208, protein: 20, fat: 13, carbs: 0, fiber: 0,
    category: 'protein', glycemic_index: 0, healthScore: 8,
    description: 'Fatty fish rich in omega-3'
  },
  'potato': { 
    calories: 77, protein: 2, fat: 0.1, carbs: 17, fiber: 2.1,
    category: 'vegetable', glycemic_index: 78, healthScore: 5,
    description: 'Starchy vegetable'
  },
  'sweet potato': { 
    calories: 86, protein: 1.6, fat: 0.1, carbs: 20, fiber: 3,
    category: 'vegetable', glycemic_index: 63, healthScore: 8,
    description: 'Rich in beta-carotene'
  },
  'cauliflower': { 
    calories: 25, protein: 1.9, fat: 0.3, carbs: 5, fiber: 2.4,
    category: 'vegetable', glycemic_index: 15, healthScore: 9,
    description: 'Low carb substitute'
  },
  'broccoli': { 
    calories: 34, protein: 2.8, fat: 0.4, carbs: 7, fiber: 2.4,
    category: 'vegetable', glycemic_index: 15, healthScore: 9,
    description: 'Nutrient dense vegetable'
  },
  'butter': { 
    calories: 717, protein: 0.9, fat: 81, carbs: 0.1, fiber: 0,
    category: 'fat', glycemic_index: 0, healthScore: 3,
    description: 'Saturated fat'
  },
  'olive oil': { 
    calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0,
    category: 'fat', glycemic_index: 0, healthScore: 8,
    description: 'Unsaturated fat'
  },
  'coconut oil': { 
    calories: 892, protein: 0, fat: 99, carbs: 0, fiber: 0,
    category: 'fat', glycemic_index: 0, healthScore: 4,
    description: 'Saturated fat'
  },
  'avocado oil': { 
    calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0,
    category: 'fat', glycemic_index: 0, healthScore: 9,
    description: 'Unsaturated fat'
  }
};

// Condition-specific nutrition constraints (base templates)
const CONDITION_CONSTRAINTS = {
  'diabetes': {
    maxGlycemicIndex: 55,
    maxCarbs: 30,
    minFiber: 5,
    reduceFat: false
  },
  'hypertension': {
    maxSodium: 500,
    maxFat: 20,
    preferFiber: true
  },
  'heart disease': {
    maxSaturatedFat: 10,
    preferUnsaturatedFat: true,
    maxCholesterol: 100,
    minFiber: 5
  },
  'kidney disease': {
    maxProtein: 20,
    maxSodium: 300
  },
  'celiac': {
    gluten_free: true
  },
  'cholesterol': {
    maxCholesterol: 100,
    maxSaturatedFat: 10,
    minFiber: 5
  },
  'weight loss': {
    maxCalories: 200,
    maxCarbs: 40,
    preferFiber: true
  },
  'pcos': {
    maxGlycemicIndex: 55,
    maxCarbs: 35,
    minFiber: 5,
    minProtein: 15,
    preferUnsaturatedFat: true
  }
};

// Basic cache for API lookups
const DYNAMIC_INGREDIENT_CACHE = {};

function inferCategory(name = '', aisle = '') {
  const text = `${name} ${aisle}`.toLowerCase()
  if (text.match(/grain|bread|rice|pasta|flour|cereal/)) return 'grain'
  if (text.match(/oil|butter|fat|shortening/)) return 'fat'
  if (text.match(/milk|cheese|yogurt|cream|dairy/)) return 'dairy'
  if (text.match(/chicken|turkey|beef|pork|ham|sausage|fish|salmon|tuna|shrimp|meat/)) return 'protein'
  if (text.match(/tofu|tempeh|bean|legume|lentil/)) return 'protein'
  if (text.match(/vegetable|veg|broccoli|cauliflower|potato|greens|lettuce|spinach|kale/)) return 'vegetable'
  if (text.match(/fruit|apple|banana|berry|citrus|orange|lemon/)) return 'fruit'
  if (text.match(/sugar|sweetener|honey|maple|syrup/)) return 'sweetener'
  return 'general'
}

function levenshtein(a, b) {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[m][n]
}

function closestSuggestions(name, count = 10) {
  const entries = Object.keys(INGREDIENT_DATABASE).map((k) => ({
    name: k,
    distance: levenshtein(name, k)
  }))
  return entries.sort((a, b) => a.distance - b.distance).slice(0, count).map(e => e.name)
}

function normalizeConditionName(condition = '') {
  const text = condition.toLowerCase().trim()
  if (!text) return null
  if (text.includes('diab')) return 'diabetes'
  if (text.includes('hypert') || text.includes('bp') || text.includes('blood pressure')) return 'hypertension'
  if (text.includes('heart')) return 'heart disease'
  if (text.includes('cardio')) return 'heart disease'
  if (text.includes('kidney') || text.includes('renal')) return 'kidney disease'
  if (text.includes('celiac') || text.includes('gluten')) return 'celiac'
  if (text.includes('cholest')) return 'cholesterol'
  if (text.includes('weight') || text.includes('obesity')) return 'weight loss'
  if (text.includes('keto') || text.includes('low carb')) return 'weight loss'
  if (text.includes('pcos')) return 'pcos'
  return 'custom'
}

function buildConstraints(conditionText) {
  const key = normalizeConditionName(conditionText)
  if (!key) return null
  if (CONDITION_CONSTRAINTS[key]) return CONDITION_CONSTRAINTS[key]

  // Lightweight keyword-based constraints for unknown conditions or free text
  const text = conditionText.toLowerCase()
  const constraints = {}

  if (text.includes('low carb') || text.includes('keto')) constraints.maxCarbs = 25
  if (text.includes('high protein') || text.includes('lean mass')) constraints.minProtein = 20
  if (text.includes('low fat') || text.includes('low sat')) constraints.maxFat = 15
  if (text.includes('fiber') || text.includes('constipation')) constraints.minFiber = 5
  if (text.includes('glycemic') || text.includes('gi') || text.includes('sugar')) constraints.maxGlycemicIndex = 55
  if (text.includes('low sodium') || text.includes('low salt') || text.includes('bp')) constraints.maxSodium = 500
  if (text.includes('cholesterol')) constraints.maxCholesterol = 100
  if (text.includes('gluten')) constraints.gluten_free = true
  if (text.includes('dairy') || text.includes('lactose')) constraints.dairy_free = true
  if (text.includes('vegan') || text.includes('vegetarian') || text.includes('plant')) constraints.plant_based = true
  if (text.includes('low calorie') || text.includes('calorie deficit') || text.includes('weight')) constraints.maxCalories = 200

  return Object.keys(constraints).length ? constraints : null
}

/**
 * Calculate Cosine Similarity between two nutrition vectors
 * Normalized to 0-1 scale
 */
function cosineSimilarity(vec1, vec2) {
  const keys = Object.keys(vec1).filter(k => typeof vec1[k] === 'number');
  
  if (keys.length === 0) return 0;
  
  // Normalize vectors (0-1 scale)
  const normalize = (obj) => {
    const normalized = {};
    const maxValues = {
      calories: 400,
      protein: 30,
      fat: 100,
      carbs: 100,
      fiber: 20,
      glycemic_index: 100
    };
    
    keys.forEach(key => {
      normalized[key] = obj[key] / (maxValues[key] || 1);
    });
    return normalized;
  };
  
  const n1 = normalize(vec1);
  const n2 = normalize(vec2);
  
  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  keys.forEach(key => {
    dotProduct += (n1[key] || 0) * (n2[key] || 0);
    mag1 += (n1[key] || 0) ** 2;
    mag2 += (n2[key] || 0) ** 2;
  });
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  return dotProduct / (mag1 * mag2);
}

/**
 * Score based on condition constraints
 */
function scoreByCondition(ingredient, conditionText) {
  if (!conditionText) return 1
  const constraints = buildConstraints(conditionText)
  if (!constraints) return 1
  
  let score = 1;
  
  if (constraints.maxGlycemicIndex && ingredient.glycemic_index > constraints.maxGlycemicIndex) {
    score *= 0.5;
  }
  if (constraints.maxCarbs && ingredient.carbs > constraints.maxCarbs) {
    score *= 0.6;
  }
  if (constraints.minFiber && ingredient.fiber < constraints.minFiber) {
    score *= 0.7;
  }
  if (constraints.minProtein && ingredient.protein < constraints.minProtein) {
    score *= 0.8;
  }
  if (constraints.maxFat && ingredient.fat > constraints.maxFat) {
    score *= 0.6;
  }
  if (constraints.preferUnsaturatedFat && ingredient.category === 'fat') {
    score *= 1.2; // Boost score for unsaturated fats
  }
  if (constraints.maxCalories && ingredient.calories > constraints.maxCalories) {
    score *= 0.75
  }
  
  return Math.min(score, 1);
}

async function fetchNutritionById(id, labelName) {
  const key = process.env.SPOONACULAR_API_KEY
  if (!key) return null
  const cacheKey = `id:${id}`
  if (DYNAMIC_INGREDIENT_CACHE[cacheKey]) return DYNAMIC_INGREDIENT_CACHE[cacheKey]

  const info = await axios.get(`https://api.spoonacular.com/food/ingredients/${id}/information`, {
    params: { amount: 100, unit: 'g', apiKey: key, includeNutrition: true }
  })

  const nutrients = info.data?.nutrition?.nutrients || []
  const pick = (label) => nutrients.find((n) => n.name.toLowerCase() === label.toLowerCase())?.amount || 0

  const calories = pick('Calories') || pick('Energy') || 0
  const protein = pick('Protein') || 0
  const fat = pick('Fat') || 0
  const carbs = pick('Carbohydrates') || 0
  const fiber = pick('Fiber') || 0

  // No GI in API; assume moderate 55 if carbs present else 20
  const glycemic_index = carbs > 0 ? 55 : 20

  const healthScore = Math.max(0, Math.min(10, Math.round((fiber * 0.8 + protein * 0.2 - fat * 0.05 + (200 - calories) * 0.01))))
  const aisle = info.data?.aisle || ''
  const name = labelName || info.data?.name || info.data?.original || `ingredient-${id}`

  const dynamicIngredient = {
    calories: Math.round(calories),
    protein: parseFloat(protein.toFixed(1)),
    fat: parseFloat(fat.toFixed(1)),
    carbs: parseFloat(carbs.toFixed(1)),
    fiber: parseFloat(fiber.toFixed(1)),
    glycemic_index,
    category: inferCategory(name, aisle),
    healthScore,
    description: info.data?.original || name
  }

  DYNAMIC_INGREDIENT_CACHE[cacheKey] = dynamicIngredient
  return dynamicIngredient
}

async function fetchNutritionFromAPI(name) {
  const key = process.env.SPOONACULAR_API_KEY
  if (!key) return null
  const cacheKey = name.toLowerCase()
  if (DYNAMIC_INGREDIENT_CACHE[cacheKey]) return DYNAMIC_INGREDIENT_CACHE[cacheKey]

  try {
    const res = await axios.get('https://api.spoonacular.com/food/ingredients/search', {
      params: { query: name, number: 1, apiKey: key }
    })
    const first = res.data?.results?.[0]
    if (!first?.id) return null

    const dynamicIngredient = await fetchNutritionById(first.id, name)
    if (!dynamicIngredient) return null

    DYNAMIC_INGREDIENT_CACHE[cacheKey] = dynamicIngredient
    return dynamicIngredient
  } catch (err) {
    console.error('Spoonacular nutrition fetch failed', err?.response?.data || err.message)
    return null
  }
}

async function fetchRelatedIngredients(name, limit = 5) {
  const key = process.env.SPOONACULAR_API_KEY
  if (!key) return []
  try {
    const res = await axios.get('https://api.spoonacular.com/food/ingredients/search', {
      params: { query: name, number: limit, apiKey: key }
    })
    const results = res.data?.results || []
    const added = []
    for (const item of results) {
      if (!item?.id || !item?.name) continue
      const ingName = item.name.toLowerCase()
      if (INGREDIENT_DATABASE[ingName]) continue
      const nutrition = await fetchNutritionById(item.id, item.name)
      if (nutrition) {
        INGREDIENT_DATABASE[ingName] = nutrition
        added.push(ingName)
      }
    }
    return added
  } catch (err) {
    console.error('Spoonacular related fetch failed', err?.response?.data || err.message)
    return []
  }
}

/**
 * Get ingredient substitutions
 * @param {string} ingredient - Original ingredient
 * @param {string} condition - Elder's health condition
 * @param {number} topN - Number of recommendations (default: 3)
 * @returns {Array} Sorted list of substitutions
 */
async function getSubstitutions(ingredient, condition = null, topN = 3, pantryItems = [], allergies = []) {
  const normalizedIngredient = ingredient.toLowerCase();
  const pantrySet = new Set((pantryItems || []).map((p) => p.toLowerCase()))
  const allergyList = Array.from(new Set((allergies || []).map((a) => String(a || '').toLowerCase().trim()).filter(Boolean)))
  
  let addedFromAPI = false
  if (!INGREDIENT_DATABASE[normalizedIngredient]) {
    const fetched = await fetchNutritionFromAPI(normalizedIngredient)
    if (fetched) {
      INGREDIENT_DATABASE[normalizedIngredient] = fetched
      addedFromAPI = true
    } else {
      return {
        error: `Ingredient "${ingredient}" not found in database`,
        suggestions: closestSuggestions(normalizedIngredient, 10)
      };
    }
  }
  
  const original = INGREDIENT_DATABASE[normalizedIngredient];
  const recommendations = [];

  const considerCandidate = (name, data) => {
    // Skip known allergens
    if (allergyList.some((a) => name.includes(a))) return

    // Calculate similarity
    const similarity = cosineSimilarity(original, data)

    // Score based on condition
    let conditionScore = 1
    if (condition) {
      conditionScore = scoreByCondition(data, condition)
    }

    // Overall score: balance similarity and health improvement
    const healthImprovement = (data.healthScore - original.healthScore) / 10
    const overallScore = similarity * 0.5 + healthImprovement * 0.3 + conditionScore * 0.2

    const inPantry = pantrySet.has(name)

    recommendations.push({
      name,
      ...data,
      similarity: parseFloat(similarity.toFixed(3)),
      healthImprovement: parseFloat(healthImprovement.toFixed(2)),
      conditionScore: parseFloat(conditionScore.toFixed(3)),
      overallScore: parseFloat(overallScore.toFixed(3)),
      inPantry,
      reason: generateReason(original, data, condition)
    })
  }
  
  // If we have very few in-category options or this ingredient is brand new, fetch a few related items dynamically
  const categoryCount = Object.values(INGREDIENT_DATABASE).filter((d) => d.category === original.category).length
  if (addedFromAPI || categoryCount <= topN) {
    await fetchRelatedIngredients(normalizedIngredient, 6)
  }

  // Calculate similarity scores
  for (const [name, data] of Object.entries(INGREDIENT_DATABASE)) {
    if (name === normalizedIngredient) continue; // Skip original
    
    // Only recommend from the same category to avoid unrelated suggestions
    if (data.category !== original.category) continue;
    considerCandidate(name, data)
  }

  // Fallback: if nothing matched category (e.g., dynamically fetched ingredient), relax category filter
  if (recommendations.length === 0) {
    for (const [name, data] of Object.entries(INGREDIENT_DATABASE)) {
      if (name === normalizedIngredient) continue
      considerCandidate(name, data)
    }
  }
  
  // Sort: pantry items first, then by overall score
  recommendations.sort((a, b) => {
    if (a.inPantry && !b.inPantry) return -1
    if (!a.inPantry && b.inPantry) return 1
    return b.overallScore - a.overallScore
  });
  
  return {
    original: { name: normalizedIngredient, ...original },
    condition: condition || 'none',
    recommendations: recommendations.slice(0, topN),
    totalAlternatives: recommendations.length
  };
}

/**
 * Generate human-readable recommendation reason
 */
function generateReason(original, substitute, condition) {
  const reasons = [];
  
  // Health score improvement
  if (substitute.healthScore > original.healthScore) {
    reasons.push(`healthier (+${substitute.healthScore - original.healthScore} points)`);
  }
  
  // Glycemic index
  if (substitute.glycemic_index < original.glycemic_index) {
    reasons.push(`lower GI (${substitute.glycemic_index} vs ${original.glycemic_index})`);
  }
  
  // Fiber
  if (substitute.fiber > original.fiber) {
    reasons.push(`more fiber (+${(substitute.fiber - original.fiber).toFixed(1)}g)`);
  }
  
  // Protein
  if (substitute.protein > original.protein) {
    reasons.push(`more protein (+${(substitute.protein - original.protein).toFixed(1)}g)`);
  }
  
  // For diabetes
  if (condition && condition.toLowerCase() === 'diabetes') {
    if (substitute.carbs < original.carbs) {
      reasons.push(`lower carbs (-${(original.carbs - substitute.carbs).toFixed(1)}g)`);
    }
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'good alternative';
}

/**
 * Batch substitute multiple ingredients
 */
async function getBatchSubstitutions(ingredients, condition = null, pantryItems = [], allergies = []) {
  return Promise.all(
    ingredients.map((ing) => getSubstitutions(ing, condition, 3, pantryItems, allergies))
  )
}

module.exports = {
  getSubstitutions,
  getBatchSubstitutions,
  INGREDIENT_DATABASE,
  CONDITION_CONSTRAINTS,
  cosineSimilarity,
  scoreByCondition
};
