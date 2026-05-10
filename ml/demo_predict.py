from infer_service import predict_sample
import sys
sys.path.insert(0, '.')
import json

# load a small sample from data/synthetic_dataset.csv
import pandas as pd

df = pd.read_csv('data/synthetic_dataset.csv')
# pick one query
q = df['query_id'].unique()[0]
sub = df[df['query_id']==q].head(5)
selected = json.loads(sub.iloc[0]['selected_ingredients'])
# build candidate dicts using available columns
cands = []
for _, row in sub.iterrows():
    cands.append({
        'recipe_id': row['recipe_id'],
        'title': row['title'],
        'ingredients': [],
        'calories': row['calories'],
        'protein': row['protein'],
        'fat': row['fat'],
        'carbs': row['carbs'],
        'sodium': row['sodium'],
        'cook_time': row['cook_time'],
        'popularity': row['popularity'],
        'user_sim': row.get('user_sim', 0.0)
    })

ranked = predict_sample(cands, selected, model_path='model_output/lgbm_model.txt')
print('Selected:', selected)
for r in ranked:
    print(r['recipe_id'], r['title'], r['score'])
