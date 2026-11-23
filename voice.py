#!/usr/bin/env python3
"""What a game score says — for the team it follows, as a fan beside you would.

- Before the game: when it starts.
- During it: by how the followed team stands — well ahead, ahead, level,
  behind, well behind — with the score.
- After it: won, lost, or drawn.

Its news (a new answer — the team scored, the game ended) is said the same
way, from where the game stands now. Lines are written here in Japanese; the
server translates them for a character reading in another language, as it does
every line. See engine/core/want_voice.go for how a voice script is run.
"""
import json
import sys
from datetime import datetime

# A lead this big is comfortable (two scores in football).
BIG = 14


def flat(state: dict) -> dict:
    """The want's state, its labels (current, goal, …) folded away."""
    out = dict(state)
    for label in ("current", "goal", "plan", "internal"):
        if isinstance(state.get(label), dict):
            out.update(state[label])
    return out


def start_text(iso: str) -> str:
    try:
        t = datetime.fromisoformat(iso.replace("Z", "+00:00")).astimezone()
    except (ValueError, AttributeError):
        return ""
    return t.strftime("%-m/%-d %H:%M")


def lines(s: dict) -> tuple[list[str], str]:
    team = s.get("team_name") or ""
    opp = s.get("opponent_name") or ""
    if not team:
        return [], ""
    me = int(s.get("team_score") or 0)
    them = int(s.get("opponent_score") or 0)
    score = f"{me}-{them}"
    diff = me - them
    state = s.get("game_state") or ""
    clock = s.get("status_label") or s.get("game_status") or ""

    if state == "pre":
        when = start_text(s.get("game_start") or "")
        at = f"{when}に" if when else "もうすぐ"
        return [f"{team} vs {opp}、{at}キックオフ", f"{opp}戦、{at}始まるよ。楽しみ"], "eager"

    if state == "post":
        if diff > 0:
            return [f"{team}の勝ち！ {score}", f"やった、{opp}に勝った！ {score}"], "joy"
        if diff < 0:
            return [f"{team}、負けちゃった… {score}", f"{opp}に{-diff}点差で負け。次こそ"], "sad"
        return [f"{opp}と引き分け {score}"], "calm"

    # Being played.
    at = f"（{clock}）" if clock else ""
    if diff >= BIG:
        return [f"{team}が{diff}点リード！ {score}{at}", f"いい流れ、このまま行こう！ {score}"], "joy"
    if diff > 0:
        return [f"{team}リード中、{score}{at}", f"{diff}点リード、気を抜かずに！"], "eager"
    if diff == 0:
        return [f"同点！ {score}{at}", "互角の勝負、ここからだ"], "eager"
    if -diff >= BIG:
        return [f"{-diff}点ビハインド… {score}{at}", f"苦しいけど、頑張れ{team}"], "sad"
    return [f"{-diff}点差で追いかけてる、{score}{at}", f"まだいける、{team}！"], "worried"


def main() -> None:
    data = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    say, mood = lines(flat(data.get("state") or {}))
    out = {"say": say or None}
    if mood:
        out["mood"] = mood
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
