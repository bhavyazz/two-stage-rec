"""Train a linear baseline and a LightGBM LambdaRank model on the synthetic dataset.
"""
import argparse
import os
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import lightgbm as lgb


def ndcg_at_k(rels, k=10):
    # rels: list of relevance scores sorted by predicted order
    def dcg(rs):
        return sum((2**r - 1) / np.log2(i+2) for i, r in enumerate(rs[:k]))
    ideal = sorted(rels, reverse=True)
    idcg = dcg(ideal)
    return dcg(rels) / idcg if idcg > 0 else 0.0


def evaluate(preds, df, k=10):
    df2 = df.copy()
    df2['pred'] = preds
    ndcgs = []
    p_at_1 = []
    for q, g in df2.groupby('query_id'):
        sub = g.sort_values('pred', ascending=False)
        ndcgs.append(ndcg_at_k(sub['relevance'].values, k=k))
        top1rel = sub['relevance'].values[0]
        p_at_1.append(1.0 if top1rel > 0.5 else 0.0)
    return {'ndcg@'+str(k): np.mean(ndcgs), 'P@1': np.mean(p_at_1)}


def featurize(df):
    X = pd.DataFrame()
    X['used_frac'] = df['used_count'] / df['num_selected']
    X['missing_count'] = df['missing_count']
    X['calories'] = df['calories']
    X['protein'] = df['protein']
    X['fat'] = df['fat']
    X['carbs'] = df['carbs']
    X['sodium'] = df['sodium']
    X['cook_time'] = df['cook_time']
    X['popularity'] = df['popularity']
    X['user_sim'] = df['user_sim']
    return X.fillna(0.0)


def main(args):
    df = pd.read_csv(args.data)
    # simple split by query id
    qids = df['query_id'].unique()
    np.random.seed(42)
    np.random.shuffle(qids)
    n = len(qids)
    train_q = set(qids[:int(n*0.7)])
    val_q = set(qids[int(n*0.7):int(n*0.85)])
    test_q = set(qids[int(n*0.85):])

    df_train = df[df['query_id'].isin(train_q)]
    df_val = df[df['query_id'].isin(val_q)]
    df_test = df[df['query_id'].isin(test_q)]

    X_train = featurize(df_train)
    X_val = featurize(df_val)
    X_test = featurize(df_test)

    y_train = df_train['relevance'].values
    y_val = df_val['relevance'].values
    y_test = df_test['relevance'].values
    # convert continuous relevance [0,1] to integer grades for lambdarank
    y_train_int = np.clip(np.rint(y_train * 4), 0, 4).astype(int)
    y_val_int = np.clip(np.rint(y_val * 4), 0, 4).astype(int)

    # Linear baseline
    lr = LinearRegression()
    lr.fit(X_train, y_train)
    preds_lr = lr.predict(X_test)
    # compute RMSE (mean_squared_error may not accept 'squared' in some versions)
    print('Linear RMSE', np.sqrt(mean_squared_error(y_test, preds_lr)))
    print('Linear eval', evaluate(preds_lr, df_test, k=10))

    # LightGBM lambdarank
    # prepare groups
    def groups_from(df_split):
        return df_split.groupby('query_id').size().tolist()

    lgb_train = lgb.Dataset(X_train, label=y_train_int, group=groups_from(df_train))
    lgb_val = lgb.Dataset(X_val, label=y_val_int, group=groups_from(df_val), reference=lgb_train)

    params = {
        'objective': 'lambdarank',
        'metric': 'ndcg',
        'ndcg_eval_at': [10],
        'learning_rate': 0.05,
        'num_leaves': 63,
        'min_data_in_leaf': 20
    }
    gbm = lgb.train(params, lgb_train, num_boost_round=500)
    preds_gbm = gbm.predict(X_test)
    print('GBM eval', evaluate(preds_gbm, df_test, k=10))

    os.makedirs(args.outdir, exist_ok=True)
    gbm.save_model(os.path.join(args.outdir, 'lgbm_model.txt'))
    print('Saved model to', args.outdir)


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--data', type=str, default='data/synthetic_dataset.csv')
    p.add_argument('--outdir', type=str, default='model_output')
    args = p.parse_args()
    main(args)
