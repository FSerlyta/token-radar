# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/FSerlyta/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/FSerlyta/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the 198 pre-token protocols in a sealed DefiLlama snapshot by implied launch value. Each value is priced from the live-token market's own median market-cap-to-TVL multiple in its category — never a hardcoded number — and every protocol gets a concrete farm plan with costs and times.

## Run it

```sh
mkdir -p out && node main.ts --input snapshot.json --output out
```

`snapshot.json` is the competition kit's sealed input (`input/snapshot.json` in the unpacked kit). The program writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, and copies `dashboard/` and `screenshots/` to `out/`, then writes `out/dossier.json`. Open `out/dashboard/index.html` in a browser to use the radar: the board, a detail view for each protocol, and filters for search, category, chain and watchlist membership.

## How the value is priced

```
implied = round( tvl_usd x multiple x growth x maturity x breadth )
multiple = median(mcap_usd / tvl_usd) over tokened protocols in the same category
           (5 or more set it, else the global median), clamped to [0.03, 1.00]
growth   = 1 + clamp(change_7d, -60, 120) / 100 x 0.5
maturity = 0.6 + min(age_days, 1095) / 1095 x 0.4
breadth  = 1 + min(chains - 1, 5) x 0.02
```

The board covers all 40 watchlist protocols plus every other pre-token protocol that passes the launch screen (no token on record, not a wrapped, staked or bridged product, not a versioned pool, not an exchange). Live-token protocols are set aside with their market caps shown — they are the pricing reference, never mixed into the ranking.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7eqkb9pj&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
