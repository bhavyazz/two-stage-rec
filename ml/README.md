Recipe Ranking ML pipeline

This folder contains scripts to generate a synthetic recipe dataset, compute features, train a linear baseline and a LightGBM LambdaRank model, and evaluate ranking metrics (NDCG@k, Precision@k).

Quickstart

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
.venv\Scripts\activate    # Windows
pip install -r requirements.txt
```

2. Generate synthetic data:

```bash
python generate_synthetic_data.py --output data/synthetic_dataset.csv --queries 1000
```

3. Train models and evaluate:

```bash
python train_ltr.py --data data/synthetic_dataset.csv --outdir model_output
```

Files
- `generate_synthetic_data.py`: creates synthetic recipes, users, queries, and relevance labels.
- `train_ltr.py`: trains a linear baseline and LightGBM lambdarank, evaluates NDCG@10.
- `requirements.txt`: Python dependencies.

Notes
- This pipeline uses synthetic data for quick iteration. Replace `generate_synthetic_data.py` with a data-fetch step (Spoonacular or Recipe1M) when you have API access or dataset downloads.
