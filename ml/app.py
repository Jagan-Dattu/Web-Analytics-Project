# app.py  (ML advisor)
import os
import joblib
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Any
from treys import Card, Evaluator

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load model & maps (these must exist: poker_model.pkl, result_map.pkl, rank_map.pkl)
try:
    model = joblib.load(os.path.join(BASE_DIR, "poker_model.pkl"))
    result_map = joblib.load(os.path.join(BASE_DIR, "result_map.pkl"))
    rank_map = joblib.load(os.path.join(BASE_DIR, "rank_map.pkl"))
    inv_result_map = {v: k for k, v in result_map.items()}
    print("Loaded model and maps.")
except Exception as e:
    print("Model or maps not found/failed to load:", e)
    raise

app = FastAPI(title="Poker Advisor")
evaluator = Evaluator()


class ActionRequest(BaseModel):
    hero: List[str]
    board: List[str] = []
    pot: float
    to_call: float
    street: str
    position: str = ""


def parse_hand_features(hand_str_list: List[str]):
    if not hand_str_list or len(hand_str_list) < 2:
        return [0, 0, 0, 15]
    c1, c2 = hand_str_list[0], hand_str_list[1]
    r1, s1 = c1[:-1], c1[-1]
    r2, s2 = c2[:-1], c2[-1]
    is_pair = 1 if r1 == r2 else 0
    is_suited = 1 if s1 == s2 else 0
    rank1_val = rank_map.get(r1, 0)
    rank2_val = rank_map.get(r2, 0)
    high_card_rank = max(rank1_val, rank2_val)
    connector_gap = abs(rank1_val - rank2_val) - 1
    if connector_gap < 0:
        connector_gap = 0
    if connector_gap > 4:
        connector_gap = 5
    return [is_pair, is_suited, high_card_rank, connector_gap]


def get_current_strength(hero_hand: List[str], board: List[str]) -> str:
    # Preflop heuristics (helpful for the model & readable advice)
    if len(board) < 3:
        is_pair, is_suited, high_rank, connector_gap = parse_hand_features(hero_hand)
        if is_pair and high_rank >= rank_map.get("T", 10):
            return "PREMIUM PAIR"
        if is_pair:
            return "PAIR"
        if high_rank >= rank_map.get("A", 14) and is_suited:
            return "SUITED ACE"
        if high_rank >= rank_map.get("K", 13) and connector_gap <= 1:
            return "BIG CONNECTORS"
        if is_suited and connector_gap <= 2 and high_rank >= rank_map.get("8", 8):
            return "SUITED CONNECTORS"
        return "WEAK HAND"

    # Postflop: use treys Evaluator
    try:
        rank_val = evaluator.evaluate([Card.new(c) for c in hero_hand], [Card.new(c) for c in board])
        rank_class = evaluator.get_rank_class(rank_val)
        class_map = {
            1: "STRAIGHT FLUSH",
            2: "FOUR OF A KIND",
            3: "FULL HOUSE",
            4: "FLUSH",
            5: "STRAIGHT",
            6: "THREE OF A KIND",
            7: "TWO PAIR",
            8: "PAIR",
            9: "NOTHING"
        }
        if rank_class == 1:
            # check royal flush possibility (not necessary but informative)
            ranks_ints = [Card.get_rank_int(Card.new(c)) for c in hero_hand + board]
            if set([10, 11, 12, 13, 14]).issubset(ranks_ints):
                return "ROYAL FLUSH"
        return class_map.get(rank_class, "NOTHING")
    except Exception:
        return "NOTHING"


def get_action_advice_text(current_text: str, current_rank_enc: int, predicted_enc: int,
                           pot: float, to_call: float, street: str) -> Dict[str, str]:
    # Return human-friendly advice & reason. This is used for UI and also to form actions.
    # Preflop special-cases
    if current_text in ["PREMIUM PAIR", "SUITED ACE", "BIG CONNECTORS"]:
        if to_call == 0:
            return {"advice": "Raise. Strong starting hand — apply pressure.", "reason": f"Preflop: {current_text}"}
        else:
            return {"advice": "Call or Raise. Premium starting hand; continue vs single raiser.", "reason": f"Preflop: {current_text}"}
    if current_text == "SUITED CONNECTORS":
        if to_call <= pot * 0.2:
            return {"advice": "Call. Cheap speculative hand with good equity.", "reason": f"Preflop: {current_text}"}
        else:
            return {"advice": "Fold. Don't pay big money with marginal draw.", "reason": f"Preflop: {current_text}"}
    if current_text == "WEAK HAND":
        return {"advice": "Fold. Weak preflop.", "reason": f"Preflop: {current_text}"}

    # Postflop & generic recommendations
    if to_call == 0:
        if current_rank_enc >= result_map.get("TWO PAIR", 2):
            return {"advice": "Bet for value. You have a strong hand.", "reason": f"Current {current_rank_enc}"}
        if current_rank_enc >= result_map.get("PAIR", 1):
            return {"advice": "Check or Bet small. Good hand with potential.", "reason": f"Current {current_rank_enc}"}
        if predicted_enc >= result_map.get("STRAIGHT", 4):
            return {"advice": "Check. You have a strong draw.", "reason": f"Predicted {predicted_enc}"}
        return {"advice": "Check. Your hand is weak.", "reason": "Weak hand"}
    else:
        pot_odds = to_call / (pot + to_call) if (pot + to_call) > 0 else 1
        confidence = ((current_rank_enc * 0.5) + (predicted_enc * 0.5)) / 9.0
        if current_rank_enc >= result_map.get("THREE OF A KIND", 3):
            return {"advice": "Raise. You likely have the best hand.", "reason": f"Conf {confidence:.2f}"}
        if confidence > pot_odds + 0.1:
            return {"advice": "Call. Pot odds are favorable.", "reason": f"Conf {confidence:.2f}, pot_odds {pot_odds:.2f}"}
        if confidence > pot_odds:
            return {"advice": "Call. Marginal decision; fold to heavy pressure.", "reason": f"Conf {confidence:.2f}, pot_odds {pot_odds:.2f}"}
        return {"advice": "Fold. Pot odds unfavorable.", "reason": f"Conf {confidence:.2f}, pot_odds {pot_odds:.2f}"}


def action_from_advice(advice: str, pot: float, to_call: float, street: str) -> (str, int):
    advice_l = advice.lower()
    if "fold" in advice_l and to_call > 0:
        return "fold", 0
    if "raise" in advice_l or "bet" in advice_l:
        # sizing heuristics
        if pot <= 0:
            # preflop open: target ~ 3 * BB equivalent (we approximate)
            amt = int(max(3 * 20, to_call + 40))
        else:
            if street == "preflop":
                amt = int(max(pot * 0.6, to_call + 40))
            elif street == "flop":
                amt = int(max(pot * 0.6, to_call + 20))
            elif street == "turn":
                amt = int(max(pot * 0.8, to_call + 20))
            else:
                amt = int(max(pot * 0.9, to_call + 10))
        if amt < to_call:
            amt = int(to_call)
        return "raise", int(amt)
    if "call" in advice_l:
        return "call", int(to_call)
    # default fallback
    if to_call > 0:
        return "call", int(to_call)
    return "check", 0


@app.post("/suggest")
def suggest(req: ActionRequest) -> Dict[str, Any]:
    current_text = get_current_strength(req.hero, req.board)
    current_enc = result_map.get(current_text, 0)
    features = parse_hand_features(req.hero)
    vector = [[current_enc] + features]

    try:
        pred = int(model.predict(vector)[0])
    except Exception:
        pred = 0
    pred_text = inv_result_map.get(pred, "UNKNOWN")

    # compute probabilities & a single "strong_chance" metric (probability of >= PAIR)
    probs = {}
    strong_sum = 0.0
    try:
        prob_vec = model.predict_proba(vector)[0]
        for i, p in enumerate(prob_vec):
            label = inv_result_map.get(i, str(i))
            if p > 0.01:
                probs[label] = f"{p*100:.1f}%"
            if i >= result_map.get("PAIR", 1):
                strong_sum += p
    except Exception:
        prob_vec = []

    advice_struct = get_action_advice_text(current_text, current_enc, pred, float(req.pot), float(req.to_call), req.street)
    strong_chance = round(strong_sum, 4)  # 0..1

    return {
        "advice": advice_struct["advice"],
        "reason": advice_struct["reason"],
        "prediction": pred_text,
        "detailed_chances": probs,
        "current_strength": current_text,
        "strong_chance": strong_chance
    }


@app.post("/action")
def action(req: ActionRequest) -> Dict[str, Any]:
    suggestion = suggest(req)
    advice = suggestion.get("advice", "")
    act, amt = action_from_advice(advice, float(req.pot), float(req.to_call), req.street)
    return {"action": act, "amount": amt, "explain": suggestion}
