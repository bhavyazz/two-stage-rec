from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from infer_service import load_ranker

app = FastAPI(title='Recipe Ranker')

# CORS
from fastapi.middleware.cors import CORSMiddleware
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*"
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RankRequest(BaseModel):
    selected_ingredients: List[str]
    # accept flexible candidate shapes (dicts) to avoid validation errors
    candidates: List[Dict[str, Any]]

@app.on_event('startup')
def startup_event():
    # load model (path relative to ml/ working dir)
    load_ranker('model_output/lgbm_model.txt')

@app.post('/rank')
def rank(req: RankRequest):
    ranker = load_ranker()
    # convert pydantic models to dicts
    cand_dicts = [c.dict() if hasattr(c, 'dict') else c for c in req.candidates]
    ranked = ranker.rank(cand_dicts, req.selected_ingredients)
    # return minimal fields
    return {'ok': True, 'ranked': [{'recipe_id': r.get('recipe_id'), 'title': r.get('title'), 'score': r.get('score')} for r in ranked]}
