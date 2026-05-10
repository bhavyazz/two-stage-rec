from typing import List, Dict
import numpy as np
import pandas as pd
import json


def nutrient_score(row: Dict) -> float:
    # simple normalized nutrient score: prefer ~500 calories and more protein
    calories = row.get('calories') or 500
    protein = row.get('protein') or 0
    try:
        calories = float(calories)
    except Exception:
        calories = 500.0
    try:
        protein = float(protein)
    except Exception:
        protein = 0.0
    score = (1 - abs(calories - 500) / 800) + (protein / 50)
    return float(score)


def risky_nutrients(row: Dict) -> int:
    # count of risky conditions
    c = 0
    sodium = row.get('sodium') or 0
    fat = row.get('fat') or 0
    calories = row.get('calories') or 0
    try:
        sodium = float(sodium)
    except Exception:
        sodium = 0.0
    try:
        fat = float(fat)
    except Exception:
        fat = 0.0
    try:
        calories = float(calories)
    except Exception:
        calories = 0.0
    if sodium > 800:
        c += 1
    if fat > 40:
        c += 1
    if calories > 1000:
        c += 1
    return c


def featurize_candidates(candidates: List[Dict], selected_ingredients: List[str]) -> pd.DataFrame:
    # Candidates: list of dicts containing fields similar to synthetic data
    rows = []
    sel_set = set([s.lower() for s in selected_ingredients])
    for c in candidates:
        ingredients = c.get('ingredients') or []
        ing_set = set([i.lower() for i in ingredients])
        used_count = len(sel_set.intersection(ing_set))
        num_selected = max(1, len(sel_set))
        used_frac = used_count / num_selected
        missing_count = num_selected - used_count
        r = {
            'used_frac': used_frac,
            'missing_count': missing_count,
            'calories': c.get('calories', 500),
            'protein': c.get('protein', 0),
            'fat': c.get('fat', 0),
            'carbs': c.get('carbs', 0),
            'sodium': c.get('sodium', 0),
            'cook_time': c.get('cook_time', 30),
            'popularity': c.get('popularity', 0),
            'user_sim': c.get('user_sim', 0.0),
            'nutrient_score': nutrient_score(c),
            'risky_count': risky_nutrients(c)
        }
        rows.append(r)
    df = pd.DataFrame(rows)
    # ensure order and fill na
    df = df.fillna(0.0)
    # keep only features used by model
    X = pd.DataFrame()
    X['used_frac'] = df['used_frac']
    X['missing_count'] = df['missing_count']
    X['calories'] = df['calories']
    X['protein'] = df['protein']
    X['fat'] = df['fat']
    X['carbs'] = df['carbs']
    X['sodium'] = df['sodium']
    X['cook_time'] = df['cook_time']
    X['popularity'] = df['popularity']
    X['user_sim'] = df['user_sim']
    return X
