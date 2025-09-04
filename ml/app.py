# Final, synchronized app.py

import os
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from treys import Card, Evaluator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    model = joblib.load(os.path.join(BASE_DIR, 'poker_model.pkl'))
    result_map = joblib.load(os.path.join(BASE_DIR, 'result_map.pkl'))
    rank_map = joblib.load(os.path.join(BASE_DIR, 'rank_map.pkl'))
    inv_result_map = {v: k for k, v in result_map.items()}
    print("--- ML models and maps loaded successfully. ---")
except FileNotFoundError as e:
    print(f"\n--- FATAL ERROR: {e.filename} not found. Please run 'process_data.py'. ---")
    exit()

app = FastAPI(title="Poker Advisor v5", version="5.0")
evaluator = Evaluator()

class ActionRequest(BaseModel):
    hero: List[str]
    board: List[str] = []
    pot: float
    to_call: float
    street: str

def get_current_strength(hero_hand: List[str], board: List[str]) -> str:
    if len(board) < 3: return "NOTHING"
    try:
        rank = evaluator.evaluate([Card.new(c) for c in hero_hand], [Card.new(c) for c in board])
        rank_class = evaluator.get_rank_class(rank)
        # Simplified mapping from treys class to our text
        class_map = {1:"STRAIGHT FLUSH", 2:"FOUR OF A KIND", 3:"FULL HOUSE", 4:"FLUSH", 5:"STRAIGHT", 6:"THREE OF A KIND", 7:"TWO PAIR", 8:"PAIR", 9:"NOTHING"}
        return class_map.get(rank_class, "NOTHING")
    except:
        return "NOTHING"

def parse_hand_features(hand_str_list: List[str]):
    if not hand_str_list or len(hand_str_list) < 2: return [0, 0, 0, 15]
    card1_rank, card1_suit = hand_str_list[0][:-1], hand_str_list[0][-1]
    card2_rank, card2_suit = hand_str_list[1][:-1], hand_str_list[1][-1]
    is_pair = 1 if card1_rank == card2_rank else 0
    is_suited = 1 if card1_suit == card2_suit else 0
    rank1_val = rank_map.get(card1_rank, 0); rank2_val = rank_map.get(card2_rank, 0)
    high_card_rank = max(rank1_val, rank2_val)
    connector_gap = abs(rank1_val - rank2_val) - 1
    if connector_gap < 0: connector_gap = 0
    if connector_gap > 4: connector_gap = 5
    return [is_pair, is_suited, high_card_rank, connector_gap]

def get_action_advice(current_rank: int, predicted_rank: int, pot: float, to_call: float) -> str:
    if to_call == 0:
        if current_rank >= result_map['TWO PAIR']: return "Bet for value. You have a strong hand."
        if current_rank >= result_map['PAIR']: return "Check or Bet small. Good hand with potential."
        if predicted_rank >= result_map['STRAIGHT']: return "Check. You have a powerful draw."
        return "Check. Your hand is weak."
    else:
        pot_odds = to_call / (pot + to_call)
        confidence = ((current_rank * 0.5) + (predicted_rank * 0.5)) / 9.0
        if current_rank >= result_map['THREE OF A KIND']: return "Raise. You likely have the best hand."
        if confidence > pot_odds + 0.1: return "Call. The pot odds are very favorable for your hand/draw."
        if confidence > pot_odds: return "Call. The decision is marginal, but the odds are acceptable."
        return "Fold. The pot odds are not good enough to continue."

@app.post("/suggest")
def suggest(req: ActionRequest) -> Dict[str, Any]:
    current_strength_text = get_current_strength(req.hero, req.board)
    current_strength_encoded = result_map.get(current_strength_text, 0)
    hand_features = parse_hand_features(req.hero)
    
    feature_vector = [[current_strength_encoded] + hand_features]
    prediction_encoded = model.predict(feature_vector)[0]
    predicted_hand_text = inv_result_map.get(prediction_encoded, "UNKNOWN")
    
    action_advice = get_action_advice(current_strength_encoded, prediction_encoded, req.pot, req.to_call)
    
    prediction_probabilities = model.predict_proba(feature_vector)[0]
    insights = {}
    for i, prob in enumerate(prediction_probabilities):
        if prob > 0.05:
            insights[inv_result_map.get(i, "UNKNOWN")] = f"{(prob * 100):.1f}%"
            
    return {"advice": action_advice, "prediction": predicted_hand_text, "detailed_chances": insights}

# This is needed for the bots to function
@app.post("/action")
def action(req: ActionRequest) -> Dict[str, Any]:
    advice = suggest(req)['advice'] # Get the same advice a human would
    action = "check"
    if "Raise" in advice: action = "raise"
    elif "Call" in advice: action = "call"
    elif "Fold" in advice: action = "fold"
    elif "Bet" in advice: action = "raise" # Bots will bet when told
    
    amount = 0
    if action == 'raise': amount = int(req.pot * 0.75)
    elif action == 'call': amount = req.to_call
    return {"action": action, "amount": amount}