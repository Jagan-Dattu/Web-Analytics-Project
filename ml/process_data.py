# Upgraded process_data.py that trains on both Flop and Turn data

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import numpy as np

print("Starting ADVANCED data processing pipeline (v2)...")

# --- DATA CLEANING AND FEATURE EXTRACTION (No changes here) ---
RESULT_MAP = {
    'NOTHING': 0, 'PAIR': 1, 'TWO PAIR': 2, 'THREE OF A KIND': 3,
    'STRAIGHT': 4, 'FLUSH': 5, 'FULL HOUSE': 6, 'FOUR OF A KIND': 7,
    'STRAIGHT FLUSH': 8, 'ROYAL FLUSH': 9
}
RANK_MAP = {'2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, 'T':10, 'J':11, 'Q':12, 'K':13, 'A':14}

def parse_hand_features(hand_str):
    if not isinstance(hand_str, str): return pd.Series([0, 0, 0, 15], index=['is_pair', 'is_suited', 'high_card_rank', 'connector_gap'])
    cleaned = hand_str.replace('ä™^', 's').replace('ä¸^', 'h').replace('ä»^', 'd').replace('ä¹^', 'c')
    cards = cleaned.split('|')[0].split()
    if len(cards) < 2: return pd.Series([0, 0, 0, 15], index=['is_pair', 'is_suited', 'high_card_rank', 'connector_gap'])
    card1_rank, card1_suit = cards[0][0], cards[0][1]
    card2_rank, card2_suit = cards[1][0], cards[1][1]
    is_pair = 1 if card1_rank == card2_rank else 0
    is_suited = 1 if card1_suit == card2_suit else 0
    rank1_val = RANK_MAP.get(card1_rank, 0); rank2_val = RANK_MAP.get(card2_rank, 0)
    high_card_rank = max(rank1_val, rank2_val)
    connector_gap = abs(rank1_val - rank2_val) - 1
    if connector_gap < 0: connector_gap = 0
    if connector_gap > 4: connector_gap = 5
    return pd.Series([is_pair, is_suited, high_card_rank, connector_gap], index=['is_pair', 'is_suited', 'high_card_rank', 'connector_gap'])

def get_hand_strength_from_result(result_str):
    if not isinstance(result_str, str): return 0
    for key, value in RESULT_MAP.items():
        if key in result_str: return value
    return 0

# 1. --- EXTRACT ---
try:
    df = pd.read_csv('poker_dataset.csv', nrows=50000)
    print(f"Successfully loaded {len(df)} rows.")
except FileNotFoundError:
    print("Error: 'poker_dataset.csv' not found."); exit()

# 2. --- TRANSFORM ---
print("Performing advanced feature engineering...")
df[['is_pair', 'is_suited', 'high_card_rank', 'connector_gap']] = df['hand'].apply(parse_hand_features)
df['result1_encoded'] = df['result1'].apply(get_hand_strength_from_result)
df['result2_encoded'] = df['result2'].apply(get_hand_strength_from_result) # <-- NEW
df['result3_encoded'] = df['result3'].apply(get_hand_strength_from_result)

# --- NEW: Create a larger training set for both flop and turn ---
print("Creating training examples for both flop and turn streets...")
features_to_use = ['is_pair', 'is_suited', 'high_card_rank', 'connector_gap']

# Data from the flop
df_flop = df.copy()
df_flop['current_strength_encoded'] = df_flop['result1_encoded']
X_flop = df_flop[['current_strength_encoded'] + features_to_use]
y_flop = df_flop['result3_encoded']

# Data from the turn
df_turn = df.copy()
df_turn['current_strength_encoded'] = df_turn['result2_encoded']
X_turn = df_turn[['current_strength_encoded'] + features_to_use]
y_turn = df_turn['result3_encoded']

# Combine them into one big dataset
X = pd.concat([X_flop, X_turn], ignore_index=True)
y = pd.concat([y_flop, y_turn], ignore_index=True)

print(f"Feature engineering complete. Created {len(X)} total training examples.")

# 3. --- MODEL & EVALUATION ---
print("Training the Random Forest model...")
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, oob_score=True)
model.fit(X_train, y_train)

print(f"Model Out-of-Bag Score: {model.oob_score_:.3f}")
y_pred = model.predict(X_test)
print(f"Model Test Accuracy: {accuracy_score(y_test, y_pred):.3f}")

# 4. --- LOAD (Save the artifacts) ---
print("Saving the new trained model...")
joblib.dump(model, 'poker_model.pkl')
joblib.dump(RESULT_MAP, 'result_map.pkl')
joblib.dump(RANK_MAP, 'rank_map.pkl')

print("--- Data processing and model training complete! ---")