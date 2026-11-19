"""Split rated categories into balanced trial lists for the exemplar-generation experiment.

Constraints:
  - each list contains at most one category per word group (group_id)
  - list lengths differ by at most 1
  - model vs. human categories spread as evenly as possible across lists
"""
import os
import numpy as np
import pandas as pd

INPUT_FILE = 'comprehensive_categories_with_metrics.csv'
OUTPUT_DIR = 'trial_lists'
N_LISTS = 21
RANDOM_SEED = 22

KEEP_COLUMNS = ['category_id', 'group_id', 'subject_type', 'word1', 'word2', 'word3', 'word4',
                'category_response']


def main():
    rng = np.random.default_rng(RANDOM_SEED)
    df = pd.read_csv(INPUT_FILE)
    df['category_id'] = df.index + 1  # stable key back to the metrics file

    # drop case/whitespace duplicates within a group, keeping the more-rated copy
    df['cat_norm'] = df['category_response'].str.strip().str.lower()
    n_before = len(df)
    df = (df.sort_values('n_ratings', ascending=False)
            .drop_duplicates(subset=['group_id', 'cat_norm'])
            .sort_values('category_id'))
    print(f'Dropped {n_before - len(df)} within-group duplicates; {len(df)} categories remain')

    max_k = df.groupby('group_id').size().max()
    assert N_LISTS >= max_k, f'Need at least {max_k} lists (largest group has {max_k} categories)'

    sizes = np.zeros(N_LISTS, dtype=int)
    n_model = np.zeros(N_LISTS, dtype=int)
    assignment = {}

    # place the largest groups first so they have the most freedom
    groups = df.groupby('group_id')
    order = sorted(groups.groups, key=lambda g: (-len(groups.get_group(g)), rng.random()))
    for g in order:
        rows = groups.get_group(g)
        rows = rows.iloc[rng.permutation(len(rows))]
        rows = pd.concat([rows[rows.subject_type == 'model'], rows[rows.subject_type != 'model']])
        used = set()
        for idx, row in rows.iterrows():
            is_model = row.subject_type == 'model'
            cands = [i for i in range(N_LISTS) if i not in used]
            # smallest list first; for model items, break ties by fewest model items; then random
            cands.sort(key=lambda i: (sizes[i], n_model[i] if is_model else 0, rng.random()))
            i = cands[0]
            assignment[idx] = i
            used.add(i)
            sizes[i] += 1
            n_model[i] += is_model

    df['list'] = pd.Series(assignment) + 1

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for i in range(1, N_LISTS + 1):
        out = df[df['list'] == i][KEEP_COLUMNS].sample(frac=1, random_state=RANDOM_SEED + i)
        assert out['group_id'].is_unique
        out.to_csv(os.path.join(OUTPUT_DIR, f'file{i}.csv'), index=False)
        print(f'file{i}.csv: {len(out)} trials ({(out.subject_type == "model").sum()} model, '
              f'{(out.subject_type == "human").sum()} human)')

    print(f'\nDone: {N_LISTS} lists, {sizes.min()}-{sizes.max()} trials each, '
          f'{len(df)} categories total')


if __name__ == '__main__':
    main()
