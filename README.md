# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/FSerlyta/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/FSerlyta/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the 198 pre-token protocols in a sealed DefiLlama snapshot by expected launch value — the launch value times the token odds. Each value is priced from the live-token market's own median market-cap-to-TVL multiple in its category — shrunk toward the global median in proportion to how many live protocols set it, so a thin category cannot be priced by a single outlier — and multiplied by the token odds, a logistic regression fitted on the snapshot's own 442 eligible protocols (log TVL, 7-day growth, the category's token share, age band) and tested held-out twice. Every protocol gets a concrete farm plan with costs and times, a FARM / MARGINAL / SKIP verdict by its rank, and a break-even allocation (the gas divided by the odds). Each detail view shows why the protocol holds its rank, the live-token peers it is priced against, and what could be wrong with the rank. The ledger tab accounts for all 758 protocols in the snapshot — ranked, live or excluded, each with its reason.

## Run it

```sh
mkdir -p out && node main.ts --input snapshot.json --output out
```

`snapshot.json` is the competition kit's sealed input (`input/snapshot.json` in the unpacked kit). The program writes the ranked board to `out/board.json`, the dashboard's data to `out/data.js`, and copies `dashboard/` and `screenshots/` to `out/`, then writes `out/dossier.json`. Open `out/dashboard/index.html` in a browser to use the radar: the board, a detail view for each protocol, and filters for search, category, chain and watchlist membership.

## How the value is priced

```
gross    = round( tvl_usd x multiple x growth x maturity x breadth )
expected = round( gross x token_odds )   <- the board ranks by this
multiple = (n x median_capped + 5 x global_median) / (n + 5)
           n = live-token protocols in the category (none: the global median)
median_capped = clamp(median(mcap_usd / tvl_usd), 0.005, 1.50)
multiple is clamped to [0.03, 1.00]
growth   = 1 + clamp(change_7d, -60, 120) / 100 x 0.5
maturity = 0.6 + min(age_days, 1095) / 1095 x 0.4
breadth  = 1 + min(chains - 1, 5) x 0.02
token_odds = logistic(log TVL, 7-day growth, category token share, age band)
             fitted on the snapshot's eligible protocols, tested held-out twice
```

The board covers all 40 watchlist protocols plus every other pre-token protocol that passes the launch screen (no token on record, not a wrapped, staked or bridged product, not a versioned pool, not an exchange). Live-token protocols are set aside with their market caps shown — they are the pricing reference, never mixed into the ranking. The ledger accounts for all 758 protocols: 198 ranked, 244 live, 316 excluded with reasons.

Held-out validation (computed at build time, shown on the dashboard): token odds beat the base rate on both folds (Brier ~0.19 vs ~0.25, log-loss ~0.57 vs ~0.69); category multiples predict live market caps about as well as the global median held-out (mean |log| error ~1.7–1.9, a typical miss by a factor of five) and beat the v1 rule (category median if n ≥ 5, else global) on both folds. The growth, maturity and breadth weights are judgement, not fitted terms — no outcome exists in the snapshot to fit them against.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7eqkb9pj&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
