import lightgbm as lgb
import pandas as pd
from feature_utils import featurize_candidates
from typing import List, Dict


class Ranker:
    def __init__(self, model_path: str):
        self.model = lgb.Booster(model_file=model_path)

    def rank(self, candidates: List[Dict], selected_ingredients: List[str]):
        X = featurize_candidates(candidates, selected_ingredients)
        preds = self.model.predict(X.values)
        # attach scores and sort
        out = []
        for c, s in zip(candidates, preds):
            entry = c.copy()
            entry['score'] = float(s)
            out.append(entry)
        out_sorted = sorted(out, key=lambda x: x['score'], reverse=True)
        return out_sorted


# convenience loader
_ranker = None

def load_ranker(model_path: str = 'model_output/lgbm_model.txt'):
    global _ranker
    if _ranker is None:
        _ranker = Ranker(model_path)
    return _ranker


def predict_sample(candidates: List[Dict], selected_ingredients: List[str], model_path: str = 'model_output/lgbm_model.txt'):
    r = load_ranker(model_path)
    return r.rank(candidates, selected_ingredients)
