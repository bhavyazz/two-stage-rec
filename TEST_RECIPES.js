/**
 * Simple test script to test recipe ranking
 * Run: node TEST_RECIPES.js
 */

import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

// Sample test data
const testRecipes = [
  {
    recipe_id: 'rec_1',
    title: 'Grilled Chicken with Rice',
    ingredients: ['chicken', 'rice', 'salt', 'pepper'],
    calories: 450,
    protein: 35,
    fat: 12,
    carbs: 45,
    sodium: 600,
    cook_time: 25,
    popularity: 500
  },
  {
    recipe_id: 'rec_2',
    title: 'Vegetable Stir Fry',
    ingredients: ['broccoli', 'carrot', 'soy sauce', 'oil'],
    calories: 280,
    protein: 8,
    fat: 10,
    carbs: 35,
    sodium: 800,
    cook_time: 15,
    popularity: 600
  },
  {
    recipe_id: 'rec_3',
    title: 'Salmon with Potatoes',
    ingredients: ['salmon', 'potato', 'lemon', 'oil'],
    calories: 520,
    protein: 40,
    fat: 22,
    carbs: 38,
    sodium: 400,
    cook_time: 30,
    popularity: 700
  },
  {
    recipe_id: 'rec_4',
    title: 'Pasta Primavera',
    ingredients: ['pasta', 'tomato', 'garlic', 'olive oil'],
    calories: 380,
    protein: 12,
    fat: 14,
    carbs: 52,
    sodium: 700,
    cook_time: 20,
    popularity: 800
  },
  {
    recipe_id: 'rec_5',
    title: 'Tofu Curry',
    ingredients: ['tofu', 'coconut milk', 'curry', 'spinach'],
    calories: 320,
    protein: 16,
    fat: 18,
    carbs: 28,
    sodium: 500,
    cook_time: 35,
    popularity: 400
  }
];

async function testRanking() {
  console.log('🧪 Testing Recipe Ranking API...\n');

  try {
    // Test 1: Rank recipes with chicken and rice
    console.log('Test 1: User has [chicken, rice] - which recipes rank highest?');
    console.log('─'.repeat(60));

    const response1 = await axios.post(`${API_BASE}/recipes/rank`, {
      ingredients: ['chicken', 'rice'],
      candidates: testRecipes
    });

    console.log(`Status: ${response1.status} ✅\n`);
    console.log('Ranked Recipes:');
    
    if (response1.data.ranked && Array.isArray(response1.data.ranked)) {
      response1.data.ranked.forEach((recipe, idx) => {
        console.log(
          `${idx + 1}. ${recipe.title} (Score: ${recipe.score?.toFixed(4) || 'N/A'})`
        );
      });
    } else {
      console.log(response1.data);
    }

    console.log('\n' + '═'.repeat(60) + '\n');

    // Test 2: Different pantry items
    console.log('Test 2: User has [salmon, potato] - which recipes rank highest?');
    console.log('─'.repeat(60));

    const response2 = await axios.post(`${API_BASE}/recipes/rank`, {
      ingredients: ['salmon', 'potato'],
      candidates: testRecipes
    });

    console.log(`Status: ${response2.status} ✅\n`);
    console.log('Ranked Recipes:');
    
    if (response2.data.ranked && Array.isArray(response2.data.ranked)) {
      response2.data.ranked.forEach((recipe, idx) => {
        console.log(
          `${idx + 1}. ${recipe.title} (Score: ${recipe.score?.toFixed(4) || 'N/A'})`
        );
      });
    } else {
      console.log(response2.data);
    }

    console.log('\n' + '═'.repeat(60) + '\n');

    // Test 3: Many ingredients
    console.log('Test 3: User has [chicken, rice, tomato, garlic] - which recipes rank highest?');
    console.log('─'.repeat(60));

    const response3 = await axios.post(`${API_BASE}/recipes/rank`, {
      ingredients: ['chicken', 'rice', 'tomato', 'garlic'],
      candidates: testRecipes
    });

    console.log(`Status: ${response3.status} ✅\n`);
    console.log('Ranked Recipes:');
    
    if (response3.data.ranked && Array.isArray(response3.data.ranked)) {
      response3.data.ranked.forEach((recipe, idx) => {
        console.log(
          `${idx + 1}. ${recipe.title} (Score: ${recipe.score?.toFixed(4) || 'N/A'})`
        );
      });
    } else {
      console.log(response3.data);
    }

    console.log('\n✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('\n⚠️  Authentication error - Make sure you commented out the authenticateToken middleware');
    }
  }
}

// Run the test
testRanking();
