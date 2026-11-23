#!/usr/bin/env python3
"""
game_score: 試合の点数を ESPN の公開スコアボード（キー不要の JSON）から読み、JSON で出す。

使い方:
  python3 main.py '<JSON>'

  JSON: {"query": "49ers vs vikings", "team": "", "league": "nfl"}
    query   必須。「チーム vs チーム」。片方だけでもよい（そのチームの今週の試合）
    team    点数を見張るチーム。空なら query の最初のチーム
    league  nfl | nba | mlb | nhl | wnba | ncaaf | ncaab（既定 nfl）

点数が増えたかどうかはエンジンが見る（timings の scored: onIncrease team_score）。
ここは今の点数を正しく返すだけ。

出力 (JSON):
{
  "team_name": "49ers", "team_score": 28,
  "opponent_name": "Vikings", "opponent_score": 10,
  "game_state": "pre|in|post", "game_status": "0:35 - 2nd",
  "game_final": false, "game_start": "2026-11-23T01:20Z",
  "summary": "49ers 28 - 10 Vikings（0:35 - 2nd）",
  "last_updated": "...", "last_error": ""
}
"""
import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

TIMEOUT_SECONDS = 20

SPORTS = {
    "nfl": "football/nfl",
    "ncaaf": "football/college-football",
    "nba": "basketball/nba",
    "wnba": "basketball/wnba",
    "ncaab": "basketball/mens-college-basketball",
    "mlb": "baseball/mlb",
    "nhl": "hockey/nhl",
}


def emit(payload: dict) -> None:
    payload.setdefault("last_updated", datetime.now(timezone.utc).isoformat(timespec="seconds"))
    payload.setdefault("last_error", "")
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def fail(message: str) -> None:
    emit({"last_error": message, "summary": message})
    sys.exit(0)


def sides(query: str) -> list[str]:
    """「A vs B」の A と B（小文字）。区切りがなければ一つだけ。"""
    parts = re.split(r"\s+(?:vs\.?|v\.?|対|@|at)\s+|\s*[-–]\s*", query.strip(), flags=re.IGNORECASE)
    return [p.strip().lower() for p in parts if p.strip()]


def names(team: dict) -> set[str]:
    keys = ("displayName", "shortDisplayName", "name", "abbreviation", "location", "nickname")
    return {str(team.get(k, "")).lower() for k in keys if team.get(k)}


def matches(team: dict, side: str) -> bool:
    """A name, a word of one ("san francisco 49ers" → "49ers"), or — four
    letters or more — part of one ("viking")."""
    return any(side == n or side in n.split() or (len(side) >= 4 and side in n) for n in names(team))


def scoreboard(league: str) -> dict:
    url = f"https://site.api.espn.com/apis/site/v2/sports/{SPORTS[league]}/scoreboard"
    req = urllib.request.Request(url, headers={"User-Agent": "mywant-game-score-plugin"})
    with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
        return json.load(resp)


def main() -> None:
    try:
        args = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {}
    except json.JSONDecodeError as exc:
        fail(f"引数がJSONではありません: {exc}")
    query = str(args.get("query", "")).strip()
    league = (str(args.get("league", "")).strip().lower() or "nfl")
    if not query:
        fail("query（例: 49ers vs vikings）が要ります")
    if league not in SPORTS:
        fail(f"league は {', '.join(SPORTS)} のどれかです")
    wanted = sides(query)
    team_side = str(args.get("team", "")).strip().lower() or wanted[0]

    try:
        board = scoreboard(league)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        fail(f"スコアボードが読めませんでした: {exc}")

    for event in board.get("events", []):
        comp = (event.get("competitions") or [{}])[0]
        teams = comp.get("competitors") or []
        if not all(any(matches(c.get("team", {}), s) for c in teams) for s in wanted):
            continue
        mine = next((c for c in teams if matches(c.get("team", {}), team_side)), None)
        other = next((c for c in teams if c is not mine), None)
        if mine is None or other is None:
            continue
        status = (event.get("status") or {}).get("type") or {}
        state = status.get("state", "")
        detail = status.get("shortDetail") or status.get("detail") or ""
        me, them = mine["team"], other["team"]
        my_score = int(mine.get("score") or 0)
        their_score = int(other.get("score") or 0)
        my_name = me.get("shortDisplayName") or me.get("displayName", "")
        their_name = them.get("shortDisplayName") or them.get("displayName", "")
        summary = (f"{my_name} {my_score} - {their_score} {their_name}（{detail}）"
                   if state != "pre" else f"{my_name} vs {their_name}（{detail}）")
        emit({
            "team_name": my_name, "team_score": my_score,
            "opponent_name": their_name, "opponent_score": their_score,
            "game_state": state, "game_status": detail,
            "game_final": state == "post",
            "game_start": event.get("date", ""),
            "summary": summary,
        })
        return
    fail(f"今週の {league.upper()} に「{query}」の試合が見つかりませんでした")


if __name__ == "__main__":
    main()
