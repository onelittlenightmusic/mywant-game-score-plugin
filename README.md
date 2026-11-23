# mywant-game-score-plugin

A MyWant want type that follows a game's score — "49ers vs vikings" — and tells
you the moment the team you follow scores, and when the game is over.

The score comes from ESPN's public scoreboard (JSON, no key), read once a
minute. Whether the points went up is the engine's to see: the want type's
timing `scored` watches `team_score` (`onIncrease`), so the script only
reports the score as it is.

## Install

```sh
mywant custom install onelittlenightmusic/mywant-game-score-plugin
```

Then restart the server so the agent is registered: agents are loaded at startup.

## Use

```yaml
wants:
  - metadata:
      name: 49ers-vs-vikings
      type: game_score
    spec:
      params:
        query: 49ers vs vikings   # the game, as you would search it
        team: ""                  # whose points to follow; empty = the first in query
        league: nfl               # nfl, ncaaf, nba, wnba, ncaab, mlb, nhl
```

One team alone (`query: bills`) is that team's game this week.

## Card

A scoreboard: the league and the clock on top, both teams' logos with the
score between them, their names and season records, and — while the game is
on — each side's timeouts left, the ball beside whoever has it, and where play
stands. The logos are shown from the URLs the scoreboard gives; none are kept
in this repository.

## Timings

| Timing | When | Default |
| :--- | :--- | :--- |
| `scored` | the followed team's points went up | murmur + notify |
| `final` | the game is over | murmur + notify |
| `answer` | every read (once a minute) | off |

## Requirements

- Python 3.10+ (standard library only)

## Files

| File | Purpose |
| :--- | :--- |
| `game_score.yaml` | want type: parameters, state, timings, poll interval |
| `main.py` | reads the scoreboard and finds the game |
| `view/plugin.jsx` | the card: a scoreboard with both logos, the score, the period and clock, timeouts and who has the ball |
