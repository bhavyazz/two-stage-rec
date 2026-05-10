"""Generate a synthetic recipe ranking dataset.
Output CSV with rows for query-candidate pairs and relevance scores.
"""
import argparse
import random
import json
from pathlib import Path
import numpy as np
import pandas as pd

random.seed(42)
np.random.seed(42)

ING_VOCAB = [
    'egg','milk','flour','sugar','butter','salt','pepper','tomato','onion','garlic',
    'chicken','beef','pork','rice','pasta','cheese','olive oil','lemon','potato','carrot',
    'beans','spinach','mushroom','banana','apple','oats','yogurt','cinnamon','vanilla','vinegar'
]

def make_recipe(i):
    n_ing = random.randint(3,7)
    ingredients = random.sample(ING_VOCAB, n_ing)
    calories = int(np.clip(np.random.normal(400,150), 50, 1500))
    protein = float(np.clip(np.random.normal(20,10), 0, 200))
    fat = float(np.clip(np.random.normal(20,10), 0, 200))
    carbs = float(np.clip(np.random.normal(40,20), 0, 400))
    sodium = float(np.clip(np.random.normal(400,300), 0, 5000))
    cook_time = int(max(5, np.random.exponential(30)))
    popularity = int(np.clip(np.random.poisson(50), 0, 10000))
    return {
        'recipe_id': f'rec_{i}',
        'title': f'Recipe {i}',
        'ingredients': ingredients,
        'calories': calories,
        'protein': protein,
        'fat': fat,
        'carbs': carbs,
        'sodium': sodium,
        'cook_time': cook_time,
        'popularity': popularity
    }


def simulate_user_prefs(num_users, recipes):
    users = {}
    recipe_ids = [r['recipe_id'] for r in recipes]
    for u in range(num_users):
        liked = set(random.sample(recipe_ids, k=max(1, int(len(recipe_ids)*0.05))))
        users[f'user_{u}'] = {'liked': liked}
    return users


def make_queries(num_queries, recipes, users, candidates_per_query=20):
    rows = []
    for q in range(num_queries):
        user = random.choice(list(users.keys()))
        # simulate selected pantry ingredients
        selected = random.sample(ING_VOCAB, k=random.randint(1,5))
        # sample candidate recipes
        candidates = random.sample(recipes, k=min(candidates_per_query, len(recipes)))
        for r in candidates:
            used = len(set(r['ingredients']).intersection(selected))
            missing = len(set(selected)) - used
            # nutrient score: prefer moderate calories and more protein
            nutrient_score = (1 - abs(r['calories']-500)/800) + (r['protein']/50)
            risky = int((r['sodium'] > 800) + (r['fat'] > 40) + (r['calories'] > 1000))
            # user similarity: fraction of liked recipes that share ingredients
            user_liked = users[user]['liked']
            sim = 0
            if user_liked:
                liked_recipes = [rec for rec in recipes if rec['recipe_id'] in user_liked]
                sims = []
                for lr in liked_recipes:
                    sims.append(len(set(lr['ingredients']).intersection(r['ingredients'])) / max(1, len(set(lr['ingredients']).union(r['ingredients']))))
                sim = float(np.mean(sims)) if sims else 0.0
            # base relevance: combination (used ingredients fraction, nutrient_score, user_sim) + noise
            used_frac = used / max(1, len(selected))
            relevance = 0.6*used_frac + 0.2*(np.tanh(nutrient_score/3)) + 0.2*sim
            # penalize risky nutrients
            relevance = relevance - 0.05 * risky
            relevance = max(0.0, min(1.0, relevance + np.random.normal(0, 0.05)))

            row = {
                'query_id': f'q_{q}',
                'user_id': user,
                'selected_ingredients': json.dumps(selected),
                'recipe_id': r['recipe_id'],
                'title': r['title'],
                'num_selected': len(selected),
                'used_count': used,
                'missing_count': missing,
                'calories': r['calories'],
                'protein': r['protein'],
                'fat': r['fat'],
                'carbs': r['carbs'],
                'sodium': r['sodium'],
                'cook_time': r['cook_time'],
                'popularity': r['popularity'],
                'user_sim': sim,
                'relevance': relevance
            }
            rows.append(row)
    return pd.DataFrame(rows)


def main(args):
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    # generate recipes
    recipes = [make_recipe(i) for i in range(args.recipes)]
    users = simulate_user_prefs(args.users, recipes)
    df = make_queries(args.queries, recipes, users, candidates_per_query=args.candidates)
    df.to_csv(args.output, index=False)
    print('Wrote', args.output, 'rows=', len(df))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--recipes', type=int, default=2000)
    p.add_argument('--users', type=int, default=200)
    p.add_argument('--queries', type=int, default=1000)
    p.add_argument('--candidates', type=int, default=20)
    p.add_argument('--output', type=str, default='data/synthetic_dataset.csv')
    args = p.parse_args()
    main(args)
