'use strict';
/* Token Radar's dashboard: a static page that renders window.RADAR (data.js, written by main.ts) with
   no network, no framework and no fetch. The board, the detail view and the filters all read the same
   data the board.json the gate checks was built from. */

const DATA = window.RADAR;
if (!DATA || !Array.isArray(DATA.rows)) throw new Error('Token Radar: data.js did not load');
const MODEL = DATA.model || {};
const WATCHLIST = new Set(DATA.rows.filter((r) => r.watchlist).map((r) => r.slug));

const DAY_MS = 86400000;

/* ---------- formatting ---------- */

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function fmtFull(n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
function fmtUsd(n) {
  const abs = Math.abs(n);
  if (abs >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}
function fmtPct(v) {
  if (v === null || v === undefined) return '<span class="muted">—</span>';
  const cls = v > 0 ? 'up' : v < 0 ? 'down' : 'muted';
  return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
}
function fmtAge(days) {
  if (days === null || days === undefined) return '<span class="muted">—</span>';
  if (days >= 365) {
    const y = Math.floor(days / 365);
    const m = Math.floor((days % 365) / 30);
    return y + 'y' + (m > 0 ? ' ' + m + 'm' : '');
  }
  if (days >= 60) return Math.floor(days / 30) + 'm';
  return days + 'd';
}
function fmtMult(m) { return m.toFixed(2) + '×'; }
function fmtDate(iso) {
  if (!iso) return '—';
  return iso.slice(0, 10);
}
function ageOf(listedAt) {
  if (!listedAt) return null;
  const a = Date.parse(DATA.as_of + 'T00:00:00Z');
  const b = Date.parse(listedAt.slice(0, 10) + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/* ---------- the model, recomputed in the page ---------- */

/** A row's implied value, recomputed from its own fields: the detail view checks it against the board. */
function recompute(row) {
  const growth = 1 + clamp(row.change_7d ?? 0, -60, 120) / 100 * 0.5;
  const age = row.age_days ?? 365;
  const maturity = 0.6 + Math.min(Math.max(age, 0), 1095) / 1095 * 0.4;
  const breadth = Math.min(1.10, 1 + Math.max(0, row.chains.length - 1) * 0.02);
  const implied = Math.max(1, Math.round(row.tvl_usd * row.multiple * growth * maturity * breadth));
  return { implied, multiple: row.multiple, growth, maturity, breadth };
}

// __FARM_BEGIN__
// The farm plan's two category actions: the same derivation main.ts writes to board.json and the
// dashboard renders in the page, so the page's steps and the board's steps are one derivation.
// __FARM_ACTIONS__
function chainOf(p) {
  return p.chains.length > 0 ? p.chains[0] : 'its main chain';
}
function capitalFor(p) {
  if (p.tvl_usd >= 5000000000) return 250;
  if (p.tvl_usd >= 1000000000) return 150;
  if (p.tvl_usd >= 100000000) return 100;
  return 50;
}
function holdDaysFor(age) {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}
function actionsFor(p, capital, chain) {
  const c = (p.category || '').toLowerCase();
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
function farmSteps(p, age) {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const [primary, secondary] = actionsFor(p, capital, chain);
  const gas = capital >= 150 ? 8 : 4;
  const steps = [
    {
      text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    { text: primary, cost: `$${capital} of capital and about $${gas} of gas`, time: '15 minutes to set up' },
    { text: secondary, cost: `about $${gas} of gas`, time: '15 minutes' },
    {
      text: 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.',
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes, then write the wallet, the dates and every transaction in a farm log.",
      cost: 'no fee to check, and never pay to claim',
      time: '15 minutes',
    },
  ];
  return steps.map((s) => {
    let t = `${s.text} Cost: ${s.cost}. Time: ${s.time}.`;
    if (t.length > 600) t = t.slice(0, 596) + '...';
    if (t.length < 20) t += ' Hold the position and check the protocol\'s own page.';
    return t;
  });
}
// __FARM_END__

/* ---------- state and the address bar ---------- */

const state = { q: '', category: '', chain: '', watchlistOnly: false, tab: 'pre', sort: 'rank', dir: 1, selected: null };

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  state.q = params.get('q') || '';
  state.category = params.get('category') || '';
  state.chain = params.get('chain') || '';
  state.watchlistOnly = params.get('watchlist') === '1';
  state.tab = params.get('tab') === 'live' ? 'live' : 'pre';
  state.selected = params.get('p') || null;
}
function writeHash() {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.chain) params.set('chain', state.chain);
  if (state.watchlistOnly) params.set('watchlist', '1');
  if (state.tab === 'live') params.set('tab', 'live');
  if (state.selected) params.set('p', state.selected);
  const hash = params.toString();
  history.replaceState(null, '', hash ? '#' + hash : location.pathname + location.search);
}

/* ---------- lists ---------- */

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
const CATEGORIES = uniqueSorted([...DATA.rows.map((r) => r.category), ...DATA.live.map((r) => r.category)]);
const CHAINS = uniqueSorted([...DATA.rows.flatMap((r) => r.chains), ...DATA.live.flatMap((r) => r.chains)]);

function filteredRows() {
  const q = state.q.trim().toLowerCase();
  return DATA.rows.filter((r) => {
    if (state.watchlistOnly && !WATCHLIST.has(r.slug)) return false;
    if (state.category && r.category !== state.category) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
function filteredLive() {
  const q = state.q.trim().toLowerCase();
  return DATA.live.filter((r) => {
    if (state.category && r.category !== state.category) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (q && !(r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q) || (r.category || '').toLowerCase().includes(q))) return false;
    return true;
  });
}
function sortedRows(rows) {
  const dir = state.dir;
  const key = state.sort;
  const val = (r) => {
    if (key === 'name') return r.name.toLowerCase();
    if (key === 'tvl') return r.tvl_usd;
    if (key === 'change') return r.change_7d === null ? -Infinity : r.change_7d;
    if (key === 'age') return r.age_days === null ? -Infinity : r.age_days;
    if (key === 'multiple') return r.multiple;
    return r.rank;
  };
  return [...rows].sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (typeof va === 'string') return va.localeCompare(vb) * dir;
    return (va - vb) * dir || (a.rank - b.rank);
  });
}

/* ---------- rendering ---------- */

const main = document.querySelector('main');

function sortHead(label, key) {
  const arrow = state.sort === key ? (state.dir === 1 ? ' ▲' : ' ▼') : '';
  return `<button type="button" data-sort="${key}" aria-sort="${state.sort === key ? (state.dir === 1 ? 'ascending' : 'descending') : 'none'}">${label}<span class="arrow">${arrow}</span></button>`;
}

function render() {
  const isPre = state.tab === 'pre';
  const rows = isPre ? sortedRows(filteredRows()) : filteredLive();
  const maxImplied = DATA.rows[0] ? DATA.rows[0].implied_value_usd : 1;
  const stats = [
    { n: `${WATCHLIST.size}<small>/${DATA.watchlist_size}</small>`, l: 'watchlist covered' },
    { n: String(DATA.board_size), l: 'protocols ranked' },
    { n: String(DATA.early_size), l: 'early finds beyond the watchlist' },
    { n: String(DATA.live_size), l: 'live tokens set aside' },
    { n: fmtMult(DATA.global_multiple), l: 'global median multiple' },
    { n: DATA.as_of, l: 'sealed snapshot date' },
  ];

  main.innerHTML = `
<header class="topbar">
  <div class="brand">
    <span class="mark" aria-hidden="true">◉</span>
    <h1>Token Radar</h1>
    <p class="tagline">The next token launch, ranked before it happens.</p>
  </div>
  <div class="meta" aria-label="Snapshot facts">
    <span>Snapshot <b>${esc(DATA.as_of)}</b></span>
    <span>Source <b>${esc(DATA.source)}</b></span>
    <span>Model <b>${esc(DATA.model_version)}</b></span>
    <span>Floor <b>${fmtUsd(DATA.floor_usd)}</b></span>
  </div>
</header>

<section class="hero" aria-label="What this board is">
  <h2>The next launch is already on the balance sheet — <em>price it like the market would.</em></h2>
  <p>Token Radar reads a sealed DefiLlama snapshot of <b>${DATA.snapshot_protocols} protocols</b> and ranks every pre-token one by what its launch would be worth. Each value is priced from the live-token market's own median market-cap-to-TVL multiple in its category — never a hardcoded number — then weighted for 7-day growth, age and chain breadth. The <b>${DATA.watchlist_size}-protocol watchlist</b> is fully covered; the <b>${DATA.early_size} early finds</b> are the protocols the watchlist missed.</p>
  <ul class="stats">
    ${stats.map((s) => `<li class="stat"><span class="n">${s.n}</span><span class="l">${s.l}</span></li>`).join('')}
  </ul>
</section>

<div class="controls" role="search">
  <div class="tabs" role="tablist" aria-label="Board or live tokens">
    <button type="button" role="tab" data-tab="pre" aria-selected="${isPre}">Pre-token board</button>
    <button type="button" role="tab" data-tab="live" aria-selected="${!isPre}">Live tokens</button>
  </div>
  <input type="search" id="q" placeholder="Search a protocol, slug or category…" value="${esc(state.q)}" aria-label="Search protocols">
  <select id="category" aria-label="Filter by category">
    <option value="">All categories</option>
    ${CATEGORIES.map((c) => `<option value="${esc(c)}"${c === state.category ? ' selected' : ''}>${esc(c)}</option>`).join('')}
  </select>
  <select id="chain" aria-label="Filter by chain">
    <option value="">All chains</option>
    ${CHAINS.map((c) => `<option value="${esc(c)}"${c === state.chain ? ' selected' : ''}>${esc(c)}</option>`).join('')}
  </select>
  <label class="check"><input type="checkbox" id="watchlist" ${state.watchlistOnly ? 'checked' : ''}> Watchlist only</label>
  <span class="count" aria-live="polite"><b>${rows.length}</b> of ${isPre ? DATA.board_size : DATA.live_size} ${isPre ? 'ranked' : 'live'} shown</span>
</div>

${isPre ? `
<section class="panel" aria-label="Pre-token board">
  <div class="scroll">
  <table>
    <caption>The board — pre-token protocols by implied launch value<span class="sub">Click a protocol for its value breakdown and farm plan. Sort by any column.</span></caption>
    <thead><tr>
      <th scope="col" class="num">${sortHead('Rank', 'rank')}</th>
      <th scope="col">${sortHead('Protocol', 'name')}</th>
      <th scope="col" class="num">${sortHead('TVL', 'tvl')}</th>
      <th scope="col" class="num">${sortHead('7d', 'change')}</th>
      <th scope="col" class="num">${sortHead('Age', 'age')}</th>
      <th scope="col" class="num">${sortHead('Multiple', 'multiple')}</th>
      <th scope="col" class="num">Implied value</th>
    </tr></thead>
    <tbody>
    ${rows.length === 0 ? `<tr><td colspan="7"><div class="empty">No protocol matches these filters.<br><button type="button" data-clear>Clear all filters</button></div></td></tr>` : rows.map((r) => `
      <tr>
        <td class="num rank${r.rank <= 3 ? ' top' : ''}">${r.rank}</td>
        <td class="proto">
          <button type="button" class="name" data-slug="${esc(r.slug)}">${esc(r.name)}</button>
          <span class="sub">${esc(r.category || 'Uncategorized')} · ${esc(r.chains.slice(0, 3).join(', ') || 'no chain listed')}${r.chains.length > 3 ? ` +${r.chains.length - 3}` : ''}${WATCHLIST.has(r.slug) ? '<span class="pill watch">watchlist</span>' : ''}</span>
        </td>
        <td class="num">${fmtUsd(r.tvl_usd)}</td>
        <td class="num">${fmtPct(r.change_7d)}</td>
        <td class="num">${fmtAge(r.age_days)}</td>
        <td class="num">${fmtMult(r.multiple)}</td>
        <td class="num">
          <span class="value">${fmtUsd(r.implied_value_usd)}</span>
          <span class="bar" aria-hidden="true"><i style="width:${Math.max(2, Math.round((r.implied_value_usd / maxImplied) * 100))}%"></i></span>
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>
</section>
` : `
<section class="panel" aria-label="Live tokens">
  <div class="scroll">
  <table>
    <caption>Live tokens — the market's own pricing reference<span class="sub">These protocols already trade, so they set the multiples the board is priced from. They are never ranked as pre-token.</span></caption>
    <thead><tr>
      <th scope="col">Protocol</th>
      <th scope="col" class="num">TVL</th>
      <th scope="col" class="num">7d</th>
      <th scope="col" class="num">Market cap</th>
      <th scope="col" class="num">mcap / TVL</th>
    </tr></thead>
    <tbody>
    ${rows.length === 0 ? `<tr><td colspan="5"><div class="empty">No live token matches these filters.<br><button type="button" data-clear>Clear all filters</button></div></td></tr>` : rows.map((r) => `
      <tr>
        <td class="proto">
          <span class="name">${esc(r.name)}</span>
          <span class="sub">${esc(r.category || 'Uncategorized')} · ${esc(r.chains.slice(0, 3).join(', ') || 'no chain listed')}<span class="pill live">live</span></span>
        </td>
        <td class="num">${fmtUsd(r.tvl_usd)}</td>
        <td class="num">${fmtPct(r.change_7d)}</td>
        <td class="num">${fmtUsd(r.mcap_usd)}</td>
        <td class="num">${r.multiple === null ? '<span class="muted">—</span>' : fmtMult(r.multiple)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  </div>
</section>
`}

<section class="method" aria-label="How the value is priced">
  <h2>How the value is priced</h2>
  <p>The starter the competition ships prices every protocol at the same flat multiple. Token Radar prices each one from <b>its own category's live market</b>: the median market-cap-to-TVL ratio of the tokened protocols in that category, computed from this snapshot. A category with fewer than five tokened protocols falls back to the global median of <b>${fmtMult(DATA.global_multiple)}</b> (${DATA.global_n} protocols).</p>
  <pre class="formula"><span class="com"># model ${esc(DATA.model_version)} — every figure comes from the sealed snapshot</span>
implied = round( tvl_usd × multiple × growth × maturity × breadth )
multiple  = median( mcap_usd / tvl_usd ) over tokened protocols in the category
            (5 or more set it, else the global median), clamped to [0.03, 1.00]
growth    = 1 + clamp( change_7d, -60, 120 ) / 100 × 0.5
maturity  = 0.6 + min( age_days, 1095 ) / 1095 × 0.4
breadth   = 1 + min( chains - 1, 5 ) × 0.02</pre>
  <div class="multiples">
    <div>
      <h3>Multiples by category</h3>
      <table>
        <thead><tr><th scope="col">Category</th><th scope="col" class="num">Protocols</th><th scope="col" class="num">Median mcap / TVL</th></tr></thead>
        <tbody>
          ${DATA.multiples.map((m) => `<tr><td>${esc(m.category)}</td><td class="num">${m.n}</td><td class="num">${fmtMult(m.median)}</td></tr>`).join('')}
          <tr class="total"><td>Global fallback</td><td class="num">${DATA.global_n}</td><td class="num">${fmtMult(DATA.global_multiple)}</td></tr>
        </tbody>
      </table>
    </div>
    <div>
      <h3>What the screen keeps out</h3>
      <p style="color:var(--muted);font-size:14px;margin:0">A protocol is ranked only when the snapshot records <b style="color:var(--ink)">no token at all</b> — no market cap, no CoinGecko id, no symbol — and it is not a wrapped, staked or bridged product of a token that trades, not a versioned pool and not an exchange. That is why the board holds ${DATA.board_size} rows, not the ${DATA.snapshot_protocols} the snapshot lists: the live ones are the pricing reference, not the ranking.</p>
      <p class="note"><b>Records no token ≠ has no token.</b> The snapshot is the sealed record of 14 November 2026; a protocol may have launched since. Check the protocol's own page before farming it.</p>
    </div>
  </div>
</section>

<footer>
  <p><span class="warn">Implied value is a model, not a price.</span> It says what the market has paid for comparable protocols, not what a launch will be worth. A launch can be worth far less — or nothing.</p>
  <p>Source: a sealed DefiLlama snapshot of ${esc(DATA.as_of)}, ${DATA.floor_usd.toLocaleString('en-US')} USD floor, ${DATA.snapshot_protocols} protocols. Built for make.fun's “Build the best token launch radar” bounty. No network is used to render this page.</p>
</footer>
`;

  bind();
  main.removeAttribute('aria-busy');
}

/* ---------- detail dialog ---------- */

let dialog = null;
function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.className = 'detail';
  dialog.setAttribute('aria-label', 'Protocol detail');
  document.body.appendChild(dialog);
  dialog.addEventListener('close', () => {
    state.selected = null;
    writeHash();
  });
  return dialog;
}
function openDetail(slug) {
  const row = DATA.rows.find((r) => r.slug === slug);
  if (!row) return;
  state.selected = slug;
  writeHash();
  const v = recompute(row);
  const matches = v.implied === row.implied_value_usd;
  const steps = farmSteps(row, row.age_days);
  const d = ensureDialog();
  d.innerHTML = `
    <div class="head">
      <div>
        <span class="muted">#${row.rank} · ${fmtUsd(row.implied_value_usd)} implied</span>
        <h2>${esc(row.name)}${WATCHLIST.has(row.slug) ? '<span class="pill watch">watchlist</span>' : ''}</h2>
        <div class="sub">${esc(row.category || 'Uncategorized')} · ${esc(row.chains.join(', ') || 'no chain listed')}</div>
      </div>
      <button type="button" class="close" aria-label="Close detail" data-close>✕</button>
    </div>
    <div class="body">
      <h3>Value breakdown</h3>
      <table>
        <tbody>
          <tr><td>TVL</td><td class="num">${fmtFull(row.tvl_usd)}</td></tr>
          <tr><td>× Category multiple</td><td class="num">${fmtMult(v.multiple)}</td></tr>
          <tr><td>× Growth (7d ${row.change_7d === null ? '—' : (row.change_7d > 0 ? '+' : '') + row.change_7d.toFixed(1) + '%'})</td><td class="num">${v.growth.toFixed(3)}×</td></tr>
          <tr><td>× Maturity (${fmtAge(row.age_days)})</td><td class="num">${v.maturity.toFixed(3)}×</td></tr>
          <tr><td>× Breadth (${row.chains.length} chain${row.chains.length === 1 ? '' : 's'})</td><td class="num">${v.breadth.toFixed(3)}×</td></tr>
          <tr class="total"><td>= Implied value</td><td class="num">${fmtFull(row.implied_value_usd)}</td></tr>
        </tbody>
      </table>
      <p class="check-line">${matches
        ? `<b>✓ Recomputed in this page, it matches the board exactly.</b> The board and the detail view run the same model.`
        : `Recomputed in this page it comes to <b>${fmtFull(v.implied)}</b> — a ${fmtFull(Math.abs(v.implied - row.implied_value_usd))} difference from the board. The board's figure stands.`}</p>
      <h3>Farm plan</h3>
      <ol class="steps">
        ${steps.map((s) => {
          const [text, rest] = s.split(/ Cost: /);
          return `<li>${esc(text)}<span class="meta-line">Cost: ${esc(rest || '')}</span></li>`;
        }).join('')}
      </ol>
      <h3>Snapshot facts</h3>
      <div class="facts">
        <div><span class="k">Listed</span><span class="v">${fmtDate(row.listed_at)}</span></div>
        <div><span class="k">Age</span><span class="v">${fmtAge(row.age_days)}</span></div>
        <div><span class="k">TVL</span><span class="v">${fmtUsd(row.tvl_usd)}</span></div>
      </div>
    </div>
  `;
  d.querySelector('[data-close]').addEventListener('click', () => d.close());
  if (!d.open) d.showModal();
}

/* ---------- events ---------- */

function bind() {
  main.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    state.tab = b.dataset.tab;
    state.selected = null;
    writeHash();
    render();
  }));
  const q = main.querySelector('#q');
  q.addEventListener('input', () => { state.q = q.value; writeHash(); render(); q.focus(); q.setSelectionRange(q.value.length, q.value.length); });
  const category = main.querySelector('#category');
  category.addEventListener('change', () => { state.category = category.value; writeHash(); render(); });
  const chain = main.querySelector('#chain');
  chain.addEventListener('change', () => { state.chain = chain.value; writeHash(); render(); });
  const watchlist = main.querySelector('#watchlist');
  watchlist.addEventListener('change', () => { state.watchlistOnly = watchlist.checked; writeHash(); render(); });
  main.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => {
    const key = b.dataset.sort;
    if (state.sort === key) state.dir = -state.dir;
    else { state.sort = key; state.dir = key === 'name' ? 1 : -1; }
    render();
  }));
  main.querySelectorAll('[data-slug]').forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.slug)));
  const clear = main.querySelector('[data-clear]');
  if (clear) clear.addEventListener('click', () => {
    state.q = ''; state.category = ''; state.chain = ''; state.watchlistOnly = false;
    writeHash();
    render();
  });
}

window.addEventListener('hashchange', () => {
  readHash();
  render();
  if (state.selected) openDetail(state.selected);
});

readHash();
render();
if (state.selected) openDetail(state.selected);
