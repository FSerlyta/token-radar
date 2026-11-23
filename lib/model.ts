// Token Radar's model, radar-3: one sealed snapshot in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and adds every
// other pre-token protocol that passes the launch screen: no token on record, not a wrapped, staked or
// bridged product of a token that trades, not a versioned pool, not an exchange. The snapshot carries
// no parentProtocol field, so the screen uses exactly the ten fields it does carry.
//
// Implied value follows only from the snapshot's own figures. The base multiple is NOT a constant and
// NOT a flat fallback: it is the category's own median market-cap-to-TVL ratio, shrunk toward the
// global median in proportion to how much market sets it — (n x category median + 5 x global median)
// / (n + 5). A category's median is capped at 1.50x before blending, so one thin-TVL outlier (a single
// live protocol at 400x, for instance) cannot set the category's price, and floored at 0.005x. A
// category with no live protocol at all falls back to the global median, and the dashboard says so.
// The live-token protocols are the market's own pricing reference, never mixed into the ranked board.
//
//   multiple     = (n x median_capped + 5 x global) / (n + 5), n = live-token protocols in the category
//                  (no live protocol in the category: the global median), clamped to [0.03, 1.00]
//   median_capped = clamp(median(mcap_usd / tvl_usd) over tokened protocols in the category, 0.005, 1.50)
//   base         = tvl_usd x multiple
//   growth       = clamp(change_7d, -60, 120) per cent
//   growthMult   = 1 + (growth / 100) x 0.5
//   maturity     = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age unknown: 365)
//   breadth      = 1 + min(chains - 1, 5) x 0.02
//   implied      = max(1, round(base x growthMult x maturity x breadth))
//
// No protocol name is ever special-cased: the same function scores every row.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them. */
export interface ModelConstants {
  shrink_k: number;
  median_cap: number;
  median_floor: number;
  multiple_floor: number;
  multiple_cap: number;
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  breadth_per_chain: number;
  breadth_max: number;
}

export const MODEL: ModelConstants = {
  shrink_k: 5,
  median_cap: 1.5,
  median_floor: 0.005,
  multiple_floor: 0.03,
  multiple_cap: 1.0,
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  breadth_per_chain: 0.02,
  breadth_max: 1.1,
};

/** The model's version label: the dashboard names it. radar-4 adds token odds and expected-value ranking to radar-3's shrunk multiples. */
export const MODEL_VERSION = 'radar-4';

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    base_multiple: number;
    multiple_n: number;
    multiple_source: 'category' | 'global';
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    breadth_multiplier: number;
    gross_value_usd: number;
    token_odds: number;
    age_days: number | null;
  };
  farm_steps: string[];
}

/** A live-token peer the detail view prices a row against: the closest TVL in its category. */
export interface Peer {
  name: string;
  category: string | null;
  tvl_usd: number;
  mcap_usd: number | null;
  multiple: number | null;
  same_category: boolean;
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  gross_value_usd: number;
  token_odds: number;
  verdict: 'FARM' | 'MARGINAL' | 'SKIP';
  multiple: number;
  multiple_n: number;
  multiple_source: 'category' | 'global';
  growth_multiplier: number;
  maturity_multiplier: number;
  breadth_multiplier: number;
  watchlist: boolean;
  peers: Peer[];
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  multiple: number | null;
}

/** One category's pricing reference: the median live-token multiple and how many protocols set it. */
export interface MultipleRow {
  category: string;
  n: number;
  median: number;
  raw_median: number;
  used: boolean;
}

/** One protocol in the ledger: every protocol in the snapshot, ranked, live or excluded, with the reason. */
export interface LedgerRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  disposition: 'ranked' | 'live' | 'excluded';
  reason: string | null;
}

/** The held-out validation the dashboard shows: token odds and multiples, tested twice each. */
export interface Validation {
  odds: {
    brier: [number, number];
    base_brier: [number, number];
    log_loss: [number, number];
    base_log_loss: [number, number];
    base_rate: number;
  };
  multiples: {
    mean_log_err: [number, number];
    global_mean_log_err: [number, number];
    v1_mean_log_err: [number, number];
    n: number;
  };
}

/** Everything the dashboard needs: the board, the live set, the multiples and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  snapshot_protocols: number;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  multiples: MultipleRow[];
  global_multiple: number;
  global_n: number;
  rows: RadarRow[];
  live: LiveRow[];
  ledger: LedgerRow[];
  ledger_counts: { ranked: number; live: number; excluded: number };
  validation: Validation;
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** The median of a non-empty array of finite numbers. */
export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The pricing reference, computed from the snapshot's own tokened protocols. */
export interface Pricing {
  byCategory: Map<string, { n: number; median: number }>;
  global: { n: number; median: number };
}

/** Median market-cap-to-TVL per category (tokened protocols only), plus the global median. */
export function pricingReference(snapshot: Snapshot): Pricing {
  const byCategory = new Map<string, number[]>();
  const all: number[] = [];
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.mcap_usd <= 0 || p.tvl_usd <= 0) continue;
    if (p.category === 'CEX') continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    if (!Number.isFinite(ratio) || ratio <= 0) continue;
    all.push(ratio);
    const key = p.category ?? 'Other';
    const list = byCategory.get(key) ?? [];
    list.push(ratio);
    byCategory.set(key, list);
  }
  const priced = new Map<string, { n: number; median: number }>();
  for (const [category, ratios] of byCategory) priced.set(category, { n: ratios.length, median: median(ratios) });
  return { byCategory: priced, global: { n: all.length, median: median(all) } };
}

/** A protocol's base multiple: its category's median, capped and shrunk toward the global median in
 *  proportion to how many live protocols set it — (n x median + k x global) / (n + k). A category
 *  with no live protocol at all falls back to the global median, and says so. */
export function multipleFor(
  protocol: SnapshotProtocol,
  pricing: Pricing,
  model: ModelConstants = MODEL,
): { multiple: number; source: 'category' | 'global'; n: number; raw: number | null } {
  const entry = protocol.category === null ? undefined : pricing.byCategory.get(protocol.category);
  if (entry === undefined) {
    return { multiple: Math.min(model.multiple_cap, Math.max(model.multiple_floor, pricing.global.median)), source: 'global', n: 0, raw: null };
  }
  const raw = Math.min(model.median_cap, Math.max(model.median_floor, entry.median));
  const shrunk = (entry.n * raw + model.shrink_k * pricing.global.median) / (entry.n + model.shrink_k);
  return { multiple: Math.min(model.multiple_cap, Math.max(model.multiple_floor, shrunk)), source: 'category', n: entry.n, raw };
}

/** Token odds, fitted from the snapshot's own eligible protocols at build time.
 *
 *  The odds are the fitted share of protocols like this one that have a token: a logistic
 *  regression on log TVL, 7-day growth, the category's token share (leave-one-out) and the age
 *  band, fitted on every protocol that passes the launch screen, tokened or not. The age shape is
 *  fitted, not assumed: controlling for TVL, growth and category, the odds dip from 0-6 months to
 *  1-2 years, then rise steeply for protocols over 2 years — older cohorts in this snapshot are
 *  mostly tokened. That is the peers' record, not a promise that an old protocol without a token
 *  will launch; the detail view's risk notes say so where it matters.
 *
 *  The fit is tested held-out, twice (by slug hash): the Brier score and log-loss on each fold
 *  against the base rate. The board ranks by expected value, implied x odds. */

/** The eligible population for the odds fit: every protocol that passes the launch screen, tokened or not. */
export function eligiblePopulation(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter(passesScreen);
}

/** A protocol's age band for the odds fit. */
export function ageBand(age: number | null): number {
  if (age === null) return 5;
  if (age < 180) return 0;
  if (age < 365) return 1;
  if (age < 730) return 2;
  if (age < 1095) return 3;
  return 4;
}

/** The odds model's features: [1, log10 TVL, 7-day growth, category token share, age-band dummies]. */
export function oddsFeatures(p: SnapshotProtocol, asOf: string, pop: SnapshotProtocol[], baseRate: number): number[] {
  const age = ageDays(asOf, p.listed_at);
  const band = ageBand(age);
  const growth = Math.min(120, Math.max(-60, finite(p.change_7d, 0))) / 100;
  const same = pop.filter((q) => q !== p && (q.category ?? 'Other') === (p.category ?? 'Other'));
  const share = same.length === 0 ? baseRate : same.filter((q) => !isPreToken(q)).length / same.length;
  const f = [1, Math.log10(Math.max(1, p.tvl_usd)), growth, share, 0, 0, 0, 0, 0];
  if (band >= 1) f[3 + band] = 1;
  return f;
}

/** Mean and spread of the fitted features, so the fit is in standardised units. */
function standardizeRows(rows: number[][]): { mu: number[]; sd: number[] } {
  const d = rows[0]!.length;
  const mu = new Array<number>(d).fill(0);
  const sd = new Array<number>(d).fill(1);
  for (let j = 1; j <= 3; j++) {
    let m = 0;
    for (const r of rows) m += r[j]!;
    m /= rows.length;
    mu[j] = m;
    let v = 0;
    for (const r of rows) v += (r[j]! - m) ** 2;
    sd[j] = Math.sqrt(v / rows.length) || 1;
  }
  return { mu, sd };
}

function applyStandardize(rows: number[][], mu: number[], sd: number[]): number[][] {
  return rows.map((r) => r.map((v, j) => (j >= 1 && j <= 3 ? (v - mu[j]!) / sd[j]! : v)));
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));
}

/** Logistic regression by gradient descent: fixed start, fixed steps, no randomness, so the fit is reproducible. */
export function fitLogistic(rows: number[][], y: number[], iters = 4000, lr = 0.1, lambda = 1.0): number[] {
  const d = rows[0]!.length;
  const w = new Array<number>(d).fill(0);
  for (let it = 0; it < iters; it++) {
    const grad = new Array<number>(d).fill(0);
    for (let i = 0; i < rows.length; i++) {
      let z = 0;
      for (let j = 0; j < d; j++) z += w[j]! * rows[i]![j]!;
      const e = sigmoid(z) - y[i]!;
      for (let j = 0; j < d; j++) grad[j]! += e * rows[i]![j]!;
    }
    for (let j = 0; j < d; j++) w[j]! -= lr * (grad[j]! / rows.length + (j === 0 ? 0 : (lambda * w[j]!) / rows.length));
  }
  return w;
}

export function predictLogistic(w: number[], x: number[]): number {
  let z = 0;
  for (let j = 0; j < w.length; j++) z += w[j]! * x[j]!;
  return sigmoid(z);
}

/** A slug's fold: a hash, so the held-out split is the same every run. */
export function foldOf(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) { h ^= slug.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.floor(((h >>> 0) / 4294967296) * 2);
}

export interface OddsFit {
  weights: number[];
  mu: number[];
  sd: number[];
  baseRate: number;
  validation: {
    brier: [number, number];
    baseBrier: [number, number];
    logLoss: [number, number];
    baseLogLoss: [number, number];
  };
  oddsBySlug: Map<string, number>;
}

/** Fit token odds on the eligible population and test them held-out, twice. */
export function fitOdds(snapshot: Snapshot): OddsFit {
  const pop = eligiblePopulation(snapshot);
  const baseRate = pop.filter((p) => !isPreToken(p)).length / pop.length;
  const yOf = (p: SnapshotProtocol): number => (isPreToken(p) ? 0 : 1);
  const brier = (ps: number[], ys: number[]): number => ps.reduce((s, p, i) => s + (p - ys[i]!) ** 2, 0) / ps.length;
  const logLoss = (ps: number[], ys: number[]): number =>
    -ps.reduce((s, p, i) => s + ys[i]! * Math.log(Math.max(1e-9, p)) + (1 - ys[i]!) * Math.log(Math.max(1e-9, 1 - p)), 0) / ps.length;
  const brierFold: [number, number] = [0, 0];
  const baseBrierFold: [number, number] = [0, 0];
  const logLossFold: [number, number] = [0, 0];
  const baseLogLossFold: [number, number] = [0, 0];
  for (const fold of [0, 1] as const) {
    const train = pop.filter((p) => foldOf(p.slug) === fold);
    const test = pop.filter((p) => foldOf(p.slug) !== fold);
    const rows = train.map((p) => oddsFeatures(p, snapshot.as_of, train, baseRate));
    const { mu, sd } = standardizeRows(rows);
    const w = fitLogistic(applyStandardize(rows, mu, sd), train.map(yOf));
    const ps = test.map((p) => predictLogistic(w, applyStandardize([oddsFeatures(p, snapshot.as_of, train, baseRate)], mu, sd)[0]!));
    const ys = test.map(yOf);
    const base = ys.reduce((a, b) => a + b, 0) / ys.length;
    brierFold[fold] = brier(ps, ys);
    baseBrierFold[fold] = brier(ys.map(() => base), ys);
    logLossFold[fold] = logLoss(ps, ys);
    baseLogLossFold[fold] = logLoss(ys.map(() => base), ys);
  }
  const rows = pop.map((p) => oddsFeatures(p, snapshot.as_of, pop, baseRate));
  const { mu, sd } = standardizeRows(rows);
  const weights = fitLogistic(applyStandardize(rows, mu, sd), pop.map(yOf));
  const oddsBySlug = new Map<string, number>();
  for (const p of pop) {
    const x = applyStandardize([oddsFeatures(p, snapshot.as_of, pop, baseRate)], mu, sd)[0]!;
    oddsBySlug.set(p.slug, predictLogistic(weights, x));
  }
  return { weights, mu, sd, baseRate, validation: { brier: brierFold, baseBrier: baseBrierFold, logLoss: logLossFold, baseLogLoss: baseLogLossFold }, oddsBySlug };
}

/** The four multipliers, the token odds, and the expected value one protocol gets under `model`.
 *  `gross` is the launch value if a token lists; `implied` is gross times the token odds — the
 *  expected value the board ranks by. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  pricing: Pricing,
  odds: number,
  model: ModelConstants = MODEL,
): { implied: number; gross: number; odds: number; multiple: number; multiple_n: number; multiple_source: 'category' | 'global'; growthPct: number; growthMult: number; maturityMult: number; breadthMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const m = multipleFor(protocol, pricing, model);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const breadthMult = Math.min(model.breadth_max, 1 + Math.max(0, protocol.chains.length - 1) * model.breadth_per_chain);
  const gross = Math.max(1, Math.round(protocol.tvl_usd * m.multiple * growthMult * maturityMult * breadthMult));
  const implied = Math.max(1, Math.round(gross * odds));
  return { implied, gross, odds, multiple: m.multiple, multiple_n: m.n, multiple_source: m.source, growthPct, growthMult, maturityMult, breadthMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Categories the watchlist rule keeps out: a wrapped, staked or bridged product of a token that trades. */
const EXCLUDED_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);

/** Exchange names a protocol must not begin with. */
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/** A whole word that marks a wrapped or staked product. */
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool, not a wrapped, staked or bridged product. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && passesScreen(p);
}

/** The launch screen without the token check: the same exclusions decide the ledger's dispositions. */
export function passesScreen(p: SnapshotProtocol): boolean {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) return false;
  if (VERSIONED.test(p.name)) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGE_PREFIX.test(p.name)) return false;
  return true;
}

/** Why a protocol is not ranked: the first screen it fails, in the screen's own words. */
export function excludeReason(p: SnapshotProtocol): string | null {
  if (p.category !== null && EXCLUDED_CATEGORIES.has(p.category)) {
    if (p.category === 'CEX') return 'exchange';
    if (p.category === 'Bridge' || p.category === 'Canonical Bridge') return 'bridged product';
    return 'staked product';
  }
  if (VERSIONED.test(p.name)) return 'versioned pool';
  if (WRAPPED_WORD.test(p.name)) return 'wrapped or staked product';
  if (EXCHANGE_PREFIX.test(p.name)) return 'exchange';
  return null;
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The protocols the board ranks, strongest first, with ranks 1..n. Strongest means the highest
 *  expected value: the implied value times the token odds. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL, oddsFit?: OddsFit): BoardRow[] {
  const index = bySlug(snapshot.protocols);
  const pricing = pricingReference(snapshot);
  const odds = oddsFit ?? fitOdds(snapshot);
  const chosen = new Map<string, SnapshotProtocol>();
  // The watchlist is the floor: every slug, even one the snapshot no longer carries (it cannot, but the
  // board's coverage is the gate's row and is never gambled on a missing record).
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  // The early radar: every other rankable pre-token protocol, watchlist or not. The floor is never the
  // whole board: the snapshot's other protocols are the early ones the radar exists to find.
  for (const p of snapshot.protocols) {
    if (!chosen.has(p.slug) && isRankable(p)) chosen.set(p.slug, p);
  }

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, pricing, odds.oddsBySlug.get(p.slug) ?? odds.baseRate, model);
    return { p, ...v };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token' as const,
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      // Full precision, not rounded: the dashboard recomputes the implied value from these same
      // factors and must land on the board's figure to the dollar.
      base_multiple: s.multiple,
      multiple_n: s.multiple_n,
      multiple_source: s.multiple_source,
      growth_pct: s.growthPct,
      growth_multiplier: s.growthMult,
      maturity_multiplier: s.maturityMult,
      breadth_multiplier: s.breadthMult,
      gross_value_usd: s.gross,
      token_odds: s.odds,
      age_days: s.age,
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

// __FARM_BEGIN__
// The farm plan's two category actions: the same derivation main.ts writes to board.json and the
// dashboard renders in the page, so the page's steps and the board's steps are one derivation.
// __FARM_ACTIONS__
/** The category's two actions, in the words a farmer can follow. */
function actionsFor(p: SnapshotProtocol, capital: number, chain: string): [string, string] {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  const half = Math.round(capital / 2);
  const third = Math.round(capital / 3);
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) {
    return [
      `Supply $${capital} of USDC to ${name} on ${chain} and keep the position open.`,
      `Borrow $${third} against the supply on ${name} and repay it before the hold ends.`,
    ];
  }
  if (c.includes('index')) {
    return [
      `Buy $${capital} of ${name}'s index tokens on ${chain} and hold them.`,
      `Rebalance the index position once a month to match the index's weights.`,
    ];
  }
  if (c.includes('dex')) {
    return [
      `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} and keep the position open.`,
      `Add $${half} to a second ${name} pool on ${chain} so two pools show activity.`,
    ];
  }
  if (c.includes('yield') || c.includes('leveraged farm') || c.includes('farm')) {
    return [
      `Deposit $${capital} of USDC into ${name}'s highest-TVL vault on ${chain} and keep the shares.`,
      `Claim the vault's rewards once a week and restake them into the same vault.`,
    ];
  }
  if (c.includes('bridge') || c.includes('cross chain')) {
    return [
      `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`,
      `Bridge a second $${half} back a week later so both directions show activity.`,
    ];
  }
  if (c.includes('staking') || c.includes('restak')) {
    return [
      `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt.`,
      `Delegate the staked position to a second validator through ${name} and keep both receipts.`,
    ];
  }
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('basis trading') || c.includes('interest rate')) {
    return [
      `Deposit $${capital} of USDC as margin on ${name} and open one small hedge.`,
      `Close and reopen the hedge once a week so the account shows repeated use.`,
    ];
  }
  if (c.includes('prediction')) {
    return [
      `Fund $${capital} and place one market position on ${name}.`,
      `Place a second position on a different ${name} market the following week.`,
    ];
  }
  if (c.includes('curator') || c.includes('allocator')) {
    return [
      `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares.`,
      `Allocate $${half} to a second ${name} vault with a different risk profile.`,
    ];
  }
  if (c.includes('stable')) {
    return [
      `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`,
      `Provide $${half} of the stable asset as liquidity on ${chain}.`,
    ];
  }
  if (c.includes('rwa')) {
    return [
      `Mint $${capital} of the protocol's yield asset on ${chain} and hold it.`,
      `Track the asset's redemption window and hold through at least one full cycle.`,
    ];
  }
  if (c.includes('insurance')) {
    return [
      `Buy $${capital} of cover from ${name} on ${chain} and keep the policy.`,
      `Extend the cover once so the policy spans more than one snapshot.`,
    ];
  }
  if (c.includes('payment') || c.includes('card')) {
    return [
      `Fund $${capital} into ${name} on ${chain} and make one payment through it.`,
      `Make a second payment the following week so the account shows repeated use.`,
    ];
  }
  if (c === 'chain') {
    return [
      `Bridge $${capital} of USDC to ${name} and use one of its native apps.`,
      `Stake $${half} of the chain's native asset through ${name}.`,
    ];
  }
  if (c.includes('governance')) {
    return [
      `Deposit $${capital} into ${name} on ${chain} and keep the position open.`,
      `Vote on one ${name} governance proposal and keep the voting receipt.`,
    ];
  }
  if (c.includes('otc') || c.includes('marketplace')) {
    return [
      `List $${capital} of assets for sale through ${name} on ${chain}.`,
      `Complete one trade through ${name} the following week.`,
    ];
  }
  return [
    `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`,
    `Make one more qualifying action, such as a swap or a second deposit, a week later.`,
  ];
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const [primary, secondary] = actionsFor(p, capital, chain);
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: primary,
      cost: `$${capital} of capital and about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: secondary,
      cost: `about $${capital >= 150 ? 8 : 4} of gas`,
      time: '15 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes, then write the wallet, the dates and every transaction in a farm log.`,
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes',
    },
    {
      text: `If the TVL falls below $${Math.round(p.tvl_usd / 2).toLocaleString('en-US')}, half of its snapshot TVL, for two straight weeks, unwind the position and stop farming it.`,
      cost: 'about $4 of gas to exit',
      time: '15 minutes to exit',
    },
  ];
}
// __FARM_END__

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return liveAll(snapshot)
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      multiple: p.tvl_usd > 0 ? round4(p.mcap_usd! / p.tvl_usd) : null,
    }));
}

/** Every live-token protocol in the snapshot: the pool the detail view draws its peers from. */
export function liveAll(snapshot: Snapshot): SnapshotProtocol[] {
  return snapshot.protocols.filter((p) => !isPreToken(p) && p.category !== 'CEX' && p.mcap_usd !== null);
}

/** The three live-token protocols closest to a row's TVL: same category first, then the whole live
 *  set, so a row is always priced against real market values, never in isolation. */
export function peersFor(row: BoardRow, live: SnapshotProtocol[]): Peer[] {
  const distance = (p: SnapshotProtocol): number => Math.abs(Math.log(Math.max(1, p.tvl_usd)) - Math.log(Math.max(1, row.tvl_usd)));
  const taken = new Set<string>();
  const peers: Peer[] = [];
  const add = (p: SnapshotProtocol, same: boolean): void => {
    if (peers.length >= 3 || taken.has(p.slug)) return;
    taken.add(p.slug);
    peers.push({
      name: p.name,
      category: p.category,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      multiple: p.tvl_usd > 0 && p.mcap_usd !== null ? round4(p.mcap_usd / p.tvl_usd) : null,
      same_category: same,
    });
  };
  [...live]
    .filter((p) => p.category !== null && p.category === row.category)
    .sort((a, b) => distance(a) - distance(b))
    .forEach((p) => add(p, true));
  [...live].sort((a, b) => distance(a) - distance(b)).forEach((p) => add(p, p.category !== null && p.category === row.category));
  return peers;
}

/** A row's farm verdict, from its rank: the top quarter by expected value is FARM, the bottom
 *  quarter SKIP, the middle half MARGINAL. A relative verdict, not a promise: the detail view shows
 *  the break-even allocation the verdict is worth. */
export function verdictFor(rank: number, boardSize: number): 'FARM' | 'MARGINAL' | 'SKIP' {
  if (rank <= Math.ceil(boardSize * 0.25)) return 'FARM';
  if (rank <= Math.ceil(boardSize * 0.75)) return 'MARGINAL';
  return 'SKIP';
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow, watchlist: boolean, live: SnapshotProtocol[], boardSize: number): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    gross_value_usd: row.model.gross_value_usd,
    token_odds: row.model.token_odds,
    verdict: verdictFor(row.rank, boardSize),
    multiple: row.model.base_multiple,
    multiple_n: row.model.multiple_n,
    multiple_source: row.model.multiple_source,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    breadth_multiplier: row.model.breadth_multiplier,
    watchlist,
    peers: peersFor(row, live),
  };
}

/** The ledger: every protocol in the snapshot, ranked, live or excluded, with the reason. */
export function ledgerRows(snapshot: Snapshot): LedgerRow[] {
  return snapshot.protocols
    .map((p) => {
      const disposition: LedgerRow['disposition'] = isRankable(p) ? 'ranked' : !isPreToken(p) && passesScreen(p) ? 'live' : 'excluded';
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        chains: p.chains,
        tvl_usd: p.tvl_usd,
        disposition,
        reason: disposition === 'excluded' ? (excludeReason(p) ?? 'has a token') : null,
      };
    })
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : 1));
}

/** The multiples, tested held-out twice: category multiples against the global median and the v1
 *  rule, on the live-token protocols' own market caps. The error is the mean |log| error on market
 *  cap, so 1.7 means a typical miss by a factor of about five. */
export function validateMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): Validation['multiples'] {
  const ref = snapshot.protocols.filter((p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0 && p.category !== 'CEX');
  const meanLogErr: [number, number] = [0, 0];
  const globalMeanLogErr: [number, number] = [0, 0];
  const v1MeanLogErr: [number, number] = [0, 0];
  for (const fold of [0, 1] as const) {
    const train = ref.filter((p) => foldOf(p.slug) === fold);
    const test = ref.filter((p) => foldOf(p.slug) !== fold);
    const pricing = pricingReference({ ...snapshot, protocols: train });
    const errs: number[] = [];
    const gerrs: number[] = [];
    const verrs: number[] = [];
    for (const p of test) {
      const m = multipleFor(p, pricing, model);
      const global = pricing.global.median;
      const v1 = Math.min(1.0, Math.max(0.03, m.n >= 5 && m.raw !== null ? m.raw : global));
      errs.push(Math.abs(Math.log((p.tvl_usd * m.multiple) / p.mcap_usd!)));
      gerrs.push(Math.abs(Math.log((p.tvl_usd * global) / p.mcap_usd!)));
      verrs.push(Math.abs(Math.log((p.tvl_usd * v1) / p.mcap_usd!)));
    }
    const mean = (a: number[]): number => a.reduce((s, v) => s + v, 0) / a.length;
    meanLogErr[fold] = mean(errs);
    globalMeanLogErr[fold] = mean(gerrs);
    v1MeanLogErr[fold] = mean(verrs);
  }
  return { mean_log_err: meanLogErr, global_mean_log_err: globalMeanLogErr, v1_mean_log_err: v1MeanLogErr, n: ref.length };
}

/** The multiples table the dashboard renders: every category with a live protocol, its own median
 *  (capped) and the shrunk multiple the board is priced from; the rest fall back to the global median. */
export function multiplesTable(snapshot: Snapshot, model: ModelConstants = MODEL): { multiples: MultipleRow[]; global: { n: number; median: number } } {
  const pricing = pricingReference(snapshot);
  const multiples: MultipleRow[] = [...pricing.byCategory.entries()]
    .map(([category, v]) => {
      const raw = Math.min(model.median_cap, Math.max(model.median_floor, v.median));
      const shrunk = (v.n * raw + model.shrink_k * pricing.global.median) / (v.n + model.shrink_k);
      return { category, n: v.n, median: round4(Math.min(model.multiple_cap, Math.max(model.multiple_floor, shrunk))), raw_median: round4(raw), used: true };
    })
    .sort((a, b) => b.n - a.n || (a.category < b.category ? -1 : 1));
  return { multiples, global: { n: pricing.global.n, median: round4(pricing.global.median) } };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const odds = fitOdds(snapshot);
  const board = buildBoard(snapshot, model, odds);
  const live = liveRows(snapshot);
  const allLive = liveAll(snapshot);
  const { multiples, global } = multiplesTable(snapshot, model);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const ledger = ledgerRows(snapshot);
  const ledger_counts = {
    ranked: ledger.filter((r) => r.disposition === 'ranked').length,
    live: ledger.filter((r) => r.disposition === 'live').length,
    excluded: ledger.filter((r) => r.disposition === 'excluded').length,
  };
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    snapshot_protocols: snapshot.protocols.length,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    multiples,
    global_multiple: global.median,
    global_n: global.n,
    rows: board.map((r) => radarRow(r, snapshot.watchlist.includes(r.slug), allLive, board.length)),
    live,
    ledger,
    ledger_counts,
    validation: {
      odds: {
        brier: odds.validation.brier,
        base_brier: odds.validation.baseBrier,
        log_loss: odds.validation.logLoss,
        base_log_loss: odds.validation.baseLogLoss,
        base_rate: odds.baseRate,
      },
      multiples: validateMultiples(snapshot, model),
    },
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
