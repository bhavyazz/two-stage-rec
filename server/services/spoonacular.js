const axios = require("axios");

exports.getNutrition = async (food) => {
  const res = await axios.get(
    "https://api.spoonacular.com/food/ingredients/search",
    {
      params: {
        query: food,
        apiKey: process.env.SPOONACULAR_API_KEY
      }
    }
  );

  // (simplified)
  return {
    calories: 250,
    protein: 12,
    carbs: 30,
    fat: 10
  };
};

exports.findRecipesByIngredients = async (ingredients = []) => {
  if (!process.env.SPOONACULAR_API_KEY) throw new Error('Missing SPOONACULAR_API_KEY')
  const ing = ingredients.join(',')
  const res = await axios.get('https://api.spoonacular.com/recipes/findByIngredients', {
    params: {
      ingredients: ing,
      number: 20,
      ranking: 1,
      apiKey: process.env.SPOONACULAR_API_KEY
    }
  })
  // normalize images: spoonacular sometimes returns filenames instead of full URLs
  const data = Array.isArray(res.data) ? res.data : []
  const IMG_BASE = 'https://spoonacular.com/recipeImages/'
  return data.map(r => {
    const out = { ...r }
    try {
      if (out.image && typeof out.image === 'string') {
        const s = out.image.trim()
        if (s.startsWith('http://') || s.startsWith('https://')) {
          out.image = s
        } else if (s.match(/\.(jpg|jpeg|png)$/i)) {
          // simple filename like "12345-312x231.jpg"
          out.image = IMG_BASE + s.replace(/^\/+/, '')
        } else if (s.includes('recipeImages')) {
          // path like '/recipeImages/...' or 'recipeImages/...'
          out.image = 'https://spoonacular.com/' + s.replace(/^\/+/, '')
        } else {
          // leave as-is; caller will fallback if necessary
          out.image = s
        }
      }
    } catch (e) {
      // ignore
    }
    return out
  })
}

exports.getRecipeInformation = async (id) => {
  if (!process.env.SPOONACULAR_API_KEY) throw new Error('Missing SPOONACULAR_API_KEY')
  const res = await axios.get(`https://api.spoonacular.com/recipes/${id}/information`, {
    params: { includeNutrition: false, apiKey: process.env.SPOONACULAR_API_KEY },
    timeout: 5000
  })
  return res.data
}

exports.getRecipeNutrition = async (id) => {
  if (!process.env.SPOONACULAR_API_KEY) throw new Error('Missing SPOONACULAR_API_KEY')
  try {
    const res = await axios.get(`https://api.spoonacular.com/recipes/${id}/information`, {
      params: { includeNutrition: true, apiKey: process.env.SPOONACULAR_API_KEY }
    })
    const data = res.data || {}
    const nutrients = (data.nutrition && Array.isArray(data.nutrition.nutrients)) ? data.nutrition.nutrients : []
    const find = (name) => {
      const n = nutrients.find(x => String(x.name || '').toLowerCase().includes(name))
      return n ? n.amount : null
    }
    const calories = find('calories') || (data.nutrition && data.nutrition.calories) || null
    const protein = find('protein') || null
    const fat = find('fat') || null
    const carbs = find('carbo') || null
    const sodium = find('sodium') || null
    return { calories, protein, fat, carbs, sodium }
  } catch (e) {
    return null
  }
}
