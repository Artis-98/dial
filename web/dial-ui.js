// DIAL web page. Served from DIAL's flash as /0.js (web_server js_include), so it
// works with no internet. Talks to ESPHome's own API: /events (live states and
// log), POST /<domain>/<name>/<action>, and /history.json (dial_history).
(() => {
  const d = document;
  const $ = (s, r = d) => r.querySelector(s);
  const h = (tag, attrs = {}, html = '') => {
    const e = d.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    e.innerHTML = html;
    return e;
  };

  // ---------------------------------------------------------------- marks
  // DIAL: 270 degree ring open at the bottom, dot in the middle (same as the PCB)
  const MARK = (cls = '') =>
    `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="M18.89 81.11A44 44 0 1 1 81.11 81.11" fill="none" stroke="currentColor" stroke-width="12"/><circle cx="50" cy="50" r="14" fill="currentColor"/></svg>`;
  // IITEG wordmark from iiteg-brand/make_logo.py: cap 1, stroke 0.18
  const IITEG =
    `<svg class="iiteg" viewBox="-0.02 -0.04 3.42 1.08" aria-label="IITEG" role="img"><g fill="currentColor">` +
    `<rect x="0" y="0" width=".18" height="1"/><rect x=".42" y="0" width=".18" height="1"/>` +
    `<rect x=".8" y="0" width=".64" height=".18"/><rect x="1.03" y="0" width=".18" height="1"/>` +
    `<rect x="1.61" y="0" width=".18" height="1"/><rect x="1.61" y="0" width=".5" height=".18"/>` +
    `<rect x="1.61" y=".82" width=".5" height=".18"/><rect x="1.61" y=".41" width=".46" height=".18"/>` +
    `<rect x="2.865" y=".43" width=".495" height=".18"/></g>` +
    `<path d="M3.1608 .2156A.425 .425 0 1 0 3.2697 .5148" fill="none" stroke="currentColor" stroke-width=".18"/></svg>`;
  const ICON = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    batt: '<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4"/>',
    grid: '<path d="M8 21l4-18 4 18"/><path d="M6 8h12M5 13h14M9.5 16h5"/>',
  };
  const icon = (k) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

  // ---------------------------------------------------------------- page
  d.title = 'DIAL';
  d.head.append(
    h('meta', { name: 'viewport', content: 'width=device-width,initial-scale=1' }),
    h('meta', { name: 'theme-color', content: '#f6f6f3' }),
  );
  const fav = $('link[rel=icon]') || d.head.appendChild(h('link', { rel: 'icon' }));
  fav.href = 'data:image/svg+xml,' + encodeURIComponent(MARK().replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" style="color:#0b0b0c" '));

  d.head.append(h('style', {}, `
:root{--bg:#f6f6f3;--card:#fff;--card2:#f6f6f3;--line:#dcdcd6;--text:#0b0b0c;--muted:#5f6064;--on:#f6f6f3;
--accent:#0b0b0c;--good:#2f7d52;--warn:#a86a12;--bad:#b8392f;--solar:#0b0b0c;--home:#9a9b97;--grid:#0b0b0c;--batt:#0b0b0c;
--r:10px;--mono:"Aptos Mono",ui-monospace,Consolas,monospace;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0b0b0c;--card:#141416;--card2:#1b1b1e;--line:#2c2d30;--text:#f2f2ef;--muted:#9a9b9f;--on:#0b0b0c;
--accent:#f2f2ef;--good:#5fb784;--warn:#d9a24a;--bad:#e0675c;--solar:#f2f2ef;--home:#6d6e72;--grid:#f2f2ef;--batt:#f2f2ef;color-scheme:dark}}
*{box-sizing:border-box}[hidden]{display:none!important}html,body{margin:0;background:var(--bg);color:var(--text)}
select.btn{width:100%;margin-top:8px}a.btn{text-decoration:none;display:inline-block}
body{font:15px/1.5 Aptos,"Segoe UI Variable Text","Segoe UI",system-ui,-apple-system,Roboto,sans-serif;-webkit-font-smoothing:antialiased}
esp-app{display:none}
.wrap{max-width:1040px;margin:0 auto;padding:16px}
header.top{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px 12px;padding:6px 0 14px}
.brand{display:flex;align-items:center;gap:12px}.brand .mark{width:40px;height:40px;color:var(--accent)}
.brand b{display:block;font-size:22px;letter-spacing:.14em;line-height:1}.brand span{color:var(--muted);font-size:13px}
.pills{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
.pill{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:99px;background:var(--card);border:1px solid var(--line);font-size:13px;white-space:nowrap}
.pill i{width:8px;height:8px;border-radius:50%;background:var(--muted)}.pill.ok i{background:var(--good)}.pill.warn i{background:var(--warn)}.pill.bad i{background:var(--bad)}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:18px;margin-bottom:16px}
.card h2{font:400 11px/1.4 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
.hero{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:18px;align-items:center}
.gauge{position:relative;max-width:300px;width:100%;margin:0 auto}.gauge svg{display:block;width:100%}
.gauge .mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding-top:6px}
.gauge .soc{font-size:54px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums}.gauge .soc small{font-size:22px;color:var(--muted);font-weight:600}
.gauge .st{margin-top:6px;font-weight:600}.gauge .sub{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
.tiles{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.tile{background:var(--card2);border:1px solid var(--line);border-radius:8px;padding:14px;min-width:0}
.tile .lab{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px}.ic{width:18px;height:18px;flex:none}
.tile .v{font-size:26px;font-weight:700;margin-top:4px;font-variant-numeric:tabular-nums;white-space:nowrap}.tile .v small{font-size:14px;color:var(--muted);font-weight:600;margin-left:3px}
.tile .s{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums}
.t-solar .ic{color:var(--solar)}.t-home .ic{color:var(--home)}.t-batt .ic{color:var(--batt)}.t-grid .ic{color:var(--grid)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cols .card{margin-bottom:16px}
.chart{position:relative;margin-bottom:6px}.chart svg{display:block;width:100%;overflow:visible}
.chart .ttl{display:flex;gap:14px;align-items:baseline;font-size:13px;color:var(--muted);margin:2px 0 4px}.chart .ttl b{color:var(--text);font-weight:600}
.key{display:inline-flex;align-items:center;gap:6px}.key i{width:10px;height:3px;border-radius:2px;display:inline-block}
.tip{position:absolute;pointer-events:none;background:var(--card2);border:1px solid var(--line);border-radius:8px;padding:6px 9px;font-size:12px;white-space:nowrap;display:none;z-index:2;font-variant-numeric:tabular-nums;box-shadow:0 6px 18px rgba(0,0,0,.25)}
.axis{fill:var(--muted);font-size:10px}.gl{stroke:var(--line);stroke-width:1}
.empty{color:var(--muted);font-size:13px;padding:22px 0;text-align:center}
.row{padding:12px 0;border-top:1px solid var(--line)}.row:first-of-type{border-top:0;padding-top:0}
.row .hd{display:flex;justify-content:space-between;align-items:baseline;gap:12px}.row .hd b{font-weight:600}.row .val{font-weight:700;font-variant-numeric:tabular-nums}
.row p{margin:2px 0 8px;color:var(--muted);font-size:13px}
input[type=range]{width:100%;accent-color:var(--accent);height:26px;margin:0}
.seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}
.seg button,.btn{font:inherit;font-size:14px;padding:9px 10px;border-radius:6px;border:1px solid var(--line);background:var(--card);color:var(--text);cursor:pointer}
.seg button.on{background:var(--accent);border-color:var(--accent);color:var(--on);font-weight:600}
.btn:hover,.seg button:hover{border-color:var(--muted)}.btn.pri{background:var(--accent);border-color:var(--accent);color:var(--on);font-weight:600}
.sw{display:flex;align-items:center;justify-content:space-between;gap:12px}
.tg{position:relative;width:46px;height:26px;flex:none;border-radius:99px;background:var(--line);border:0;cursor:pointer;transition:background .15s}
.tg::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:var(--card);transition:left .15s}
.tg.on{background:var(--accent)}.tg.on::after{background:var(--on)}.tg.on::after{left:23px}
dl.kv{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;margin:0;font-size:14px}dl.kv dt{color:var(--muted)}dl.kv dd{margin:0;text-align:right;font-variant-numeric:tabular-nums}
.note{font-size:12px;color:var(--muted);margin-top:10px}
.btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
details{margin-top:14px;border-top:1px solid var(--line);padding-top:12px}summary{cursor:pointer;color:var(--muted);font-size:13px}
pre#log{max-height:300px;overflow:auto;font:12px/1.4 ui-monospace,Consolas,monospace;background:var(--card2);border:1px solid var(--line);border-radius:10px;padding:10px;margin:10px 0 0;white-space:pre-wrap}
footer{display:flex;align-items:center;justify-content:center;gap:9px;color:var(--muted);font-size:13px;padding:10px 0 26px}
footer .mark{width:16px;height:16px;color:var(--accent)}footer .iiteg{height:11px;width:auto;color:var(--text)}footer a{color:var(--muted);text-decoration:none}footer a:hover{color:var(--text)}
#toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%) translateY(20px);background:var(--card2);border:1px solid var(--line);padding:10px 16px;border-radius:12px;opacity:0;transition:.2s;pointer-events:none;font-size:14px;z-index:9}
#toast.show{opacity:1;transform:translateX(-50%)}
@media (max-width:760px){.hero,.cols{grid-template-columns:1fr}.gauge{max-width:260px}}
@media (max-width:520px){.pills{justify-content:flex-start;width:100%}.wrap{padding:12px}.card{padding:14px}.hero{gap:14px}}
@media (max-width:420px){.tile .v{font-size:22px}.pill{font-size:12px;padding:5px 9px}.tiles{gap:8px}.tile{padding:11px}}
`));

  const slider = (name, label, help) => `
<div class="row" data-num="${name}" hidden><div class="hd"><b>${label}</b><span class="val">—</span></div>
<p>${help}</p><input type="range" min="0" max="100" step="1"></div>`;
  const toggle = (dom, name, label, help) => `
<div class="row sw" data-tg="${dom}/${name}" hidden><div><b>${label}</b>${help ? `<p>${help}</p>` : ''}</div><button class="tg" aria-label="${label}"></button></div>`;

  d.body.prepend(h('div', { class: 'wrap' }, `
<header class="top">
  <div class="brand">${MARK('mark')}<div><b>DIAL</b><span>Inverter controller</span></div></div>
  <div class="pills"><span class="pill" id="p-inv"><i></i><span>Connecting</span></span><span class="pill" id="p-ha"><i></i><span>Home Assistant</span></span></div>
</header>
<section class="card hero">
  <div class="gauge"><svg viewBox="0 0 200 200">
    <path d="M43.4 156.6A80 80 0 1 1 156.6 156.6" fill="none" stroke="var(--line)" stroke-width="14" stroke-linecap="round"/>
    <path id="g-arc" d="M43.4 156.6A80 80 0 1 1 156.6 156.6" fill="none" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" pathLength="100" stroke-dasharray="0 100"/>
    <circle id="g-dot" cx="43.4" cy="156.6" r="9" fill="var(--card)" stroke="var(--accent)" stroke-width="5"/>
  </svg><div class="mid"><div class="soc"><span id="g-soc">—</span><small>%</small></div><div class="st" id="g-st">—</div><div class="sub" id="g-sub">—</div></div></div>
  <div class="tiles">
    <div class="tile t-solar"><div class="lab">${icon('sun')}Solar</div><div class="v"><span data-v="sensor/PV Power" data-d="0">—</span><small>W</small></div><div class="s"><span data-v="sensor/PV Voltage" data-d="1">—</span> V</div></div>
    <div class="tile t-home"><div class="lab">${icon('home')}Home</div><div class="v"><span data-v="sensor/Load Power" data-d="0">—</span><small>W</small></div><div class="s">house load</div></div>
    <div class="tile t-batt"><div class="lab">${icon('batt')}Battery</div><div class="v"><span id="t-bp">—</span><small>W</small></div><div class="s"><span data-v="sensor/Battery Current Estimated" data-d="1">—</span> A estimated</div></div>
    <div class="tile t-grid"><div class="lab">${icon('grid')}Grid</div><div class="v"><span data-v="sensor/Grid Voltage" data-d="0">—</span><small>V</small></div><div class="s"><span data-v="sensor/Grid Frequency" data-d="2">—</span> Hz</div></div>
  </div>
</section>
<section class="card"><h2>Last 24 hours</h2><div id="charts"><div class="empty">Loading history…</div></div></section>
<div class="cols">
  <section class="card"><h2>Inverter settings</h2>
    <div class="row" id="src" hidden><div class="hd"><b>Charger source</b></div><p>Where the battery may be charged from.</p><div class="seg"></div></div>
    ${slider('Charge Current Limit', 'Charge current limit', 'Most current the charger may push into the battery.')}
    ${slider('Min SOC To Start Grid Charge', 'Grid charge starts below', 'The grid starts charging when the battery falls under this level.')}
    ${slider('Back To Battery SOC', 'Back to battery at', 'Runs from the battery again once charged to this level.')}
    <div class="note" id="ha-note" hidden>Home Assistant is connected and may change these settings automatically.</div>
  </section>
  <section class="card"><h2>Inverter</h2><dl class="kv">
    <dt>Battery voltage</dt><dd><span data-v="sensor/Battery Voltage" data-d="2">—</span> V</dd>
    <dt>Output</dt><dd><span data-v="sensor/Output Voltage" data-d="1">—</span> V · <span data-v="sensor/Output Frequency" data-d="2">—</span> Hz</dd>
    <dt>Grid</dt><dd><span data-v="sensor/Grid Voltage" data-d="1">—</span> V · <span data-v="sensor/Grid Frequency" data-d="2">—</span> Hz</dd>
    <dt>Solar input</dt><dd><span data-v="sensor/PV Voltage" data-d="1">—</span> V · <span data-v="sensor/PV Power" data-d="0">—</span> W</dd>
    <dt>Temperatures</dt><dd><span data-v="sensor/Inverter Temperature 1" data-d="1">—</span> · <span data-v="sensor/Inverter Temperature 2" data-d="1">—</span> °C</dd>
    <dt>Link</dt><dd><span data-t="text_sensor/Inverter Link">—</span></dd>
  </dl></section>
</div>
<section class="card" id="more" hidden><h2>More settings</h2><div id="more-rows"></div></section>
<section class="card"><h2>DIAL</h2>
  ${toggle('switch', 'Dry Contact', 'Dry contact', 'Potential free switch on the terminal, for a generator start or a relay.')}
  ${toggle('light', 'Status LED', 'Status LED', 'Breathes slowly while the inverter answers, quicker while it does not.')}
  ${toggle('switch', 'Fallback When HA Lost', 'Safety net when Home Assistant is lost', 'If Home Assistant disappears for 15 minutes, put "grid charge starts below" back to the level below.')}
  ${slider('Fallback Min SOC', 'Safety net level', 'Grid charge start level DIAL falls back to.')}
  <dl class="kv" style="margin-top:12px">
    <dt>Board</dt><dd data-t="text_sensor/Board Variant">—</dd>
    <dt>Firmware</dt><dd data-t="text_sensor/Firmware">—</dd>
    <dt>IP address</dt><dd data-t="text_sensor/IP Address">—</dd>
    <dt>Wi-Fi signal</dt><dd><span data-v="sensor/Wi-Fi Signal" data-d="0">—</span> dBm</dd>
    <dt>Uptime</dt><dd id="uptime">—</dd>
    <dt>Chip temperature</dt><dd><span data-v="sensor/Chip Temperature" data-d="1">—</span> °C</dd>
  </dl>
  <div class="row" id="upd" hidden style="margin-top:14px"><div class="hd"><b>Firmware</b><span class="val" id="upd-v">—</span></div><p id="upd-p"></p>
    <div class="btns" style="margin-top:4px"><button class="btn pri" id="upd-go" hidden>Install update</button><a class="btn" id="upd-notes" target="_blank" rel="noopener" hidden>What is new</a></div></div>
  <div class="btns"><button class="btn" id="b-restart">Restart DIAL</button><label class="btn">Update firmware<input type="file" id="fw" accept=".bin" hidden></label></div>
  <details id="logbox"><summary>Log</summary><pre id="log"></pre></details>
</section>
<footer>${MARK('mark')}<span>DIAL by</span>${IITEG}<span>·</span><a href="https://iiteg.com" target="_blank" rel="noopener">iiteg.com</a></footer>
<div id="toast"></div>`));

  // ---------------------------------------------------------------- state
  const S = {};
  const val = (id) => (S[id] ? S[id].value : undefined);
  const num = (id) => { const v = parseFloat(val(id)); return isFinite(v) ? v : null; };  // numbers arrive as text
  const fmt = (v, dp = 0) => (v === null || v === undefined || !isFinite(v) ? '—' : Number(v).toFixed(dp));
  const busy = {};  // controls the user is touching: ignore incoming states for a moment
  const toast = (msg) => { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); };
  const post = (path) => fetch(path, { method: 'POST' }).then((r) => { if (!r.ok) throw new Error(r.status); return r; });
  const enc = encodeURIComponent;

  const SRC_LABEL = { 'CSO Solar first': 'Solar first', 'SNU Solar + Utility': 'Solar + grid', 'OSO Solar only': 'Solar only' };

  let raf = 0;
  const render = () => { if (!raf) raf = requestAnimationFrame(draw); };
  function draw() {
    raf = 0;
    d.querySelectorAll('[data-v]').forEach((e) => { e.textContent = fmt(num(e.dataset.v), +e.dataset.d); });
    d.querySelectorAll('[data-t]').forEach((e) => { const v = val(e.dataset.t); e.textContent = v === undefined || v === '' ? '—' : v; });

    // gauge
    const soc = num('sensor/Battery SOC');
    const st = val('text_sensor/Battery State') || '—';
    const col = st === 'Charging' ? 'var(--good)' : st === 'Discharging' ? 'var(--accent)' : 'var(--muted)';
    const f = soc === null ? 0 : Math.max(0, Math.min(100, soc)) / 100;
    $('#g-soc').textContent = fmt(soc);
    $('#g-st').textContent = st;
    $('#g-st').style.color = col;
    $('#g-sub').textContent = `${fmt(num('sensor/Battery Voltage'), 2)} V`;
    const arc = $('#g-arc'), dot = $('#g-dot');
    arc.setAttribute('stroke-dasharray', `${(f * 100).toFixed(2)} 100`);
    arc.setAttribute('stroke', col);
    const a = ((135 + f * 270) * Math.PI) / 180;
    dot.setAttribute('cx', (100 + 80 * Math.cos(a)).toFixed(1));
    dot.setAttribute('cy', (100 + 80 * Math.sin(a)).toFixed(1));
    dot.setAttribute('stroke', col);
    const bp = num('sensor/Battery Power Estimated');
    $('#t-bp').textContent = bp === null ? '—' : (bp > 0 ? '+' : '') + bp.toFixed(0);

    // link pills
    const inv = $('#p-inv'), ha = $('#p-ha');
    if (!online) { inv.className = 'pill bad'; inv.lastChild.textContent = 'DIAL offline'; }
    else if (val('binary_sensor/Inverter Connected') === true) { inv.className = 'pill ok'; inv.lastChild.textContent = 'Inverter connected'; }
    else if (val('binary_sensor/Inverter Connected') === false) { inv.className = 'pill warn'; inv.lastChild.textContent = 'No answer from inverter'; }
    const haOn = val('binary_sensor/Home Assistant Connected') === true;
    ha.className = 'pill' + (haOn ? ' ok' : '');
    ha.title = haOn ? 'Home Assistant is connected' : 'Home Assistant is not connected';
    $('#ha-note').hidden = !haOn;

    // charger source
    const sel = S['select/Charger Source'];
    $('#src').hidden = !sel;
    if (sel) {
      const seg = $('#src .seg');
      const opts = sel.option || seg._opts || [];
      if (opts.length && seg.childElementCount !== opts.length) {
        seg._opts = opts;
        seg.innerHTML = '';
        opts.forEach((o) => {
          const b = h('button', { type: 'button' }, SRC_LABEL[o] || o);
          b.onclick = () => post(`/select/${enc('Charger Source')}/set?option=${enc(o)}`)
            .then(() => toast(`Charger source: ${SRC_LABEL[o] || o}`)).catch(() => toast('Not saved, try again'));
          b._o = o;
          seg.append(b);
        });
      }
      [...seg.children].forEach((b) => b.classList.toggle('on', b._o === sel.value));
    }

    // sliders
    d.querySelectorAll('[data-num]').forEach((row) => {
      const id = 'number/' + row.dataset.num, s = S[id], inp = $('input', row);
      row.hidden = !s;
      if (!s) return;
      if (s.min_value !== undefined) { inp.min = s.min_value; inp.max = s.max_value; inp.step = s.step; }
      if (busy[id] && Date.now() < busy[id]) return;
      const v = num(id);
      $('.val', row).textContent = v === null ? '—' : `${fmt(v)} ${s.uom || ''}`.trim();
      if (v !== null) inp.value = v;
      row._uom = s.uom || '';
    });

    // toggles
    d.querySelectorAll('[data-tg]').forEach((row) => {
      const id = row.dataset.tg, s = S[id];
      row.hidden = !s;
      if (!s || (busy[id] && Date.now() < busy[id])) return;
      const on = id.startsWith('light/') ? s.state === 'ON' : s.value === true;
      $('.tg', row).classList.toggle('on', on);
    });

    // generic selects added for a profile's own settings
    d.querySelectorAll('[data-sel]').forEach((row) => {
      const s = S[row.dataset.sel], box = $('select', row);
      if (!s || (busy[row.dataset.sel] && Date.now() < busy[row.dataset.sel])) return;
      if (s.option && box.options.length !== s.option.length) box.innerHTML = s.option.map((o) => `<option>${o}</option>`).join('');
      box.value = s.value;
    });

    // firmware update from GitHub
    const u = S['update/Firmware Update'];
    $('#upd').hidden = !u;
    if (u) {
      const cur = u.current_version || '', st = u.state;
      $('#upd-v').textContent = cur ? 'DIAL ' + cur : '—';
      $('#upd-p').textContent = st === 'UPDATE AVAILABLE' ? `Version ${u.value} is out.${u.summary ? ' ' + u.summary : ''}`
        : st === 'INSTALLING' ? 'Installing, DIAL restarts when done.'
        : st === 'NO UPDATE' ? 'Up to date.' : 'Checks for updates every 6 hours when DIAL is online.';
      $('#upd-go').hidden = st !== 'UPDATE AVAILABLE';
      const notes = $('#upd-notes');
      notes.hidden = !(u.release_url && st === 'UPDATE AVAILABLE');
      if (u.release_url) notes.href = u.release_url;
    }

    const up = num('sensor/Uptime');
    if (up !== null) {
      const dd = Math.floor(up / 86400), hh = Math.floor((up % 86400) / 3600), mm = Math.floor((up % 3600) / 60);
      $('#uptime').textContent = dd ? `${dd} d ${hh} h` : hh ? `${hh} h ${mm} min` : `${mm} min`;
    }
  }

  // ---------------------------------------------------------------- controls
  const wireNum = (row) => {
    const id = 'number/' + row.dataset.num, inp = $('input', row);
    inp.addEventListener('input', () => { busy[id] = Date.now() + 4000; $('.val', row).textContent = `${inp.value} ${row._uom || ''}`.trim(); });
    inp.addEventListener('change', () => {
      busy[id] = Date.now() + 4000;
      post(`/number/${enc(row.dataset.num)}/set?value=${inp.value}`)
        .then(() => toast(`${$('b', row).textContent}: ${inp.value} ${row._uom || ''}`)).catch(() => toast('Not saved, try again'));
    });
  };
  const wireTg = (row) => {
    const id = row.dataset.tg, btn = $('.tg', row);
    btn.onclick = () => {
      const [dom, name] = [id.slice(0, id.indexOf('/')), id.slice(id.indexOf('/') + 1)];
      const on = !btn.classList.contains('on');
      btn.classList.toggle('on', on);
      busy[id] = Date.now() + 3000;
      const act = dom === 'light' ? (on ? 'turn_on?effect=Breathe' : 'turn_off') : on ? 'turn_on' : 'turn_off';
      post(`/${dom}/${enc(name)}/${act}`).catch(() => { btn.classList.toggle('on', !on); toast('Not changed, try again'); });
    };
  };
  d.querySelectorAll('[data-num]').forEach(wireNum);
  d.querySelectorAll('[data-tg]').forEach(wireTg);

  // A profile's settings the page does not know get a plain row of their own,
  // so a new inverter needs no change here.
  const KNOWN = new Set(['select/Charger Source', 'light/Status LED',
    ...[...d.querySelectorAll('[data-num]')].map((r) => 'number/' + r.dataset.num),
    ...[...d.querySelectorAll('[data-tg]')].map((r) => r.dataset.tg)]);
  function addGeneric(id) {
    const dom = id.slice(0, id.indexOf('/')), name = id.slice(id.indexOf('/') + 1);
    if (KNOWN.has(id) || !['number', 'select', 'switch'].includes(dom)) return;
    KNOWN.add(id);
    const box = $('#more-rows'), tmp = h('div');
    if (dom === 'number') { tmp.innerHTML = slider(name, name, ''); wireNum(tmp.firstElementChild); }
    else if (dom === 'switch') { tmp.innerHTML = toggle('switch', name, name, ''); wireTg(tmp.firstElementChild); }
    else {
      tmp.innerHTML = `<div class="row" data-sel="${id}"><div class="hd"><b>${name}</b></div><select class="btn"></select></div>`;
      const sel = $('select', tmp);
      sel.onchange = () => { busy[id] = Date.now() + 4000; post(`/select/${enc(name)}/set?option=${enc(sel.value)}`).then(() => toast(`${name}: ${sel.value}`)).catch(() => toast('Not saved, try again')); };
    }
    tmp.querySelectorAll('p').forEach((e) => { if (!e.textContent) e.remove(); });
    box.append(tmp.firstElementChild);
    $('#more').hidden = false;
  }
  $('#upd-go').onclick = () => {
    if (!confirm('Install the new firmware? DIAL restarts and is back in about a minute.')) return;
    post(`/update/${enc('Firmware Update')}/install`).then(() => toast('Installing…')).catch(() => toast('Could not start the update'));
  };
  $('#b-restart').onclick = () => {
    if (!confirm('Restart DIAL? It is back in about 10 seconds.')) return;
    post(`/button/${enc('Restart')}/press`).then(() => toast('Restarting…')).catch(() => toast('Restart failed'));
  };
  $('#fw').onchange = (e) => {
    const file = e.target.files[0];
    if (!file || !confirm(`Install ${file.name} on DIAL?`)) return;
    const fd = new FormData();
    fd.append('update', file);
    const x = new XMLHttpRequest();
    x.upload.onprogress = (ev) => ev.lengthComputable && toast(`Uploading ${Math.round((ev.loaded / ev.total) * 100)} %`);
    x.onload = () => { toast(x.status === 200 ? 'Installed, DIAL restarts' : 'Update failed'); if (x.status === 200) setTimeout(() => location.reload(), 15000); };
    x.onerror = () => toast('Update failed');
    x.open('POST', '/update');
    x.send(fd);
  };

  // ---------------------------------------------------------------- live
  let online = false, lastMsg = 0;
  const logEl = $('#log');
  const es = new EventSource('/events');
  const alive = () => { lastMsg = Date.now(); if (!online) { online = true; render(); } };
  es.addEventListener('state', (e) => {
    alive();
    try { const j = JSON.parse(e.data); if (!S[j.id]) addGeneric(j.id); S[j.id] = Object.assign(S[j.id] || {}, j); render(); } catch (_) { /* partial frame */ }
  });
  es.addEventListener('ping', alive);
  es.addEventListener('log', (e) => {
    alive();
    const line = e.data.replace(/\x1b\[[0-9;]*m/g, '');
    logEl.append(line + '\n');
    while (logEl.childNodes.length > 300) logEl.removeChild(logEl.firstChild);
    if ($('#logbox').open && logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight < 60) logEl.scrollTop = logEl.scrollHeight;
  });
  setInterval(() => { if (online && Date.now() - lastMsg > 20000) { online = false; render(); } }, 5000);

  // ---------------------------------------------------------------- 24 h charts
  let H = null;
  const css = (v) => getComputedStyle(d.documentElement).getPropertyValue(v).trim();
  const hm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const CHARTS = [
    { key: 'batt', title: 'Battery', height: 120, min: 0, max: 100, unit: '%',
      lines: [{ k: 'soc', label: 'Charge', color: '--batt', fill: true, unit: '%', dp: 0 }],
      extra: [{ k: 'bv', label: 'Voltage', unit: 'V', dp: 2, div: 100 }] },
    { key: 'power', title: 'Power', height: 140, min: 0, unit: 'W',
      lines: [{ k: 'pv', label: 'Solar', color: '--solar', fill: true, unit: 'W', dp: 0 },
              { k: 'load', label: 'Home', color: '--home', unit: 'W', dp: 0 }] },
    { key: 'grid', title: 'Grid', height: 80, min: 0, max: 260, unit: 'V',
      lines: [{ k: 'grid', label: 'Grid', color: '--grid', unit: 'V', dp: 0 }] },
  ];

  function loadHistory() {
    fetch('/history.json', { cache: 'no-store' }).then((r) => r.json()).then((j) => {
      const now = Date.now(), n = j.n || 0;
      const t = Array.from({ length: n }, (_, i) => now - (j.age + (n - 1 - i) * j.step) * 1000);
      H = { t, s: j.s, n, step: j.step };
      drawCharts();
    }).catch(() => { if (!H) $('#charts').innerHTML = '<div class="empty">History not available.</div>'; });
  }

  function drawCharts() {
    const box = $('#charts');
    if (!H || H.n < 2) { box.innerHTML = '<div class="empty">DIAL records one point a minute. The charts fill in from here.</div>'; return; }
    box.innerHTML = '';
    CHARTS.forEach((c) => box.append(chart(c)));
  }

  function chart(c) {
    const wrap = h('div', { class: 'chart' });
    const keys = c.lines.map((l) => `<span class="key"><i style="background:${css(l.color)}"></i>${l.label}</span>`).join('');
    wrap.append(h('div', { class: 'ttl' }, `<b>${c.title}</b>${c.lines.length > 1 ? keys : ''}`));
    const W = Math.max(280, $('#charts').clientWidth), HH = c.height, L = 34, R = 6, T = 6, B = 18;
    const t1 = Date.now(), t0 = t1 - 24 * 3600e3;
    const X = (t) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
    let max = c.max;
    if (max === undefined) {
      max = 0;
      c.lines.forEach((l) => (H.s[l.k] || []).forEach((v) => { if (v !== null && v > max) max = v; }));
      const stepW = max > 2000 ? 1000 : max > 500 ? 250 : 100;
      max = Math.max(stepW, Math.ceil((max * 1.1) / stepW) * stepW);
    }
    const Y = (v) => T + (1 - (v - c.min) / (max - c.min)) * (HH - T - B);
    let g = '';
    [c.min, (c.min + max) / 2, max].forEach((v) => {
      g += `<line class="gl" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axis" x="${L - 6}" y="${Y(v) + 3}" text-anchor="end">${Math.round(v)}</text>`;
    });
    const first = new Date(t0); first.setMinutes(0, 0, 0);
    for (let t = first.getTime() + 3600e3; t < t1; t += 3600e3) {
      const hr = new Date(t).getHours();
      if (hr % 6) continue;
      g += `<line class="gl" x1="${X(t)}" x2="${X(t)}" y1="${T}" y2="${HH - B}" stroke-dasharray="2 3"/><text class="axis" x="${X(t)}" y="${HH - 4}" text-anchor="middle">${String(hr).padStart(2, '0')}:00</text>`;
    }
    c.lines.forEach((l) => {
      const data = H.s[l.k] || [], col = css(l.color);
      let dPath = '', area = '', run = [];
      const flush = () => {
        if (run.length > 1) {
          const p = run.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
          dPath += p;
          if (l.fill) area += `${p}L${run[run.length - 1][0].toFixed(1)} ${Y(c.min)}L${run[0][0].toFixed(1)} ${Y(c.min)}Z`;
        }
        run = [];
      };
      data.forEach((v, i) => { if (v === null) flush(); else run.push([X(H.t[i]), Y(Math.min(max, Math.max(c.min, v)))]); });
      flush();
      if (area) g += `<path d="${area}" fill="${col}" opacity=".08"/>`;
      g += `<path d="${dPath}" fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round"/>`;
    });
    g += `<line id="cur" class="gl" y1="${T}" y2="${HH - B}" stroke="var(--muted)" visibility="hidden"/>`;
    const svg = h('div', {}, `<svg viewBox="0 0 ${W} ${HH}" height="${HH}">${g}<rect x="${L}" y="0" width="${W - L - R}" height="${HH}" fill="transparent"/></svg>`).firstChild;
    const tip = h('div', { class: 'tip' });
    wrap.append(svg, tip);
    const move = (ev) => {
      const r = svg.getBoundingClientRect(), x = ((ev.clientX - r.left) / r.width) * W;
      const t = t0 + ((x - L) / (W - L - R)) * (t1 - t0);
      let i = 0, best = Infinity;
      H.t.forEach((tt, k) => { const dd = Math.abs(tt - t); if (dd < best) { best = dd; i = k; } });
      if (best > H.step * 2000 || x < L) { tip.style.display = 'none'; $('#cur', svg).setAttribute('visibility', 'hidden'); return; }
      const cx = X(H.t[i]);
      const cur = $('#cur', svg); cur.setAttribute('x1', cx); cur.setAttribute('x2', cx); cur.setAttribute('visibility', 'visible');
      const rows = c.lines.concat(c.extra || []).map((l) => {
        const v = (H.s[l.k] || [])[i];
        return `${l.label} <b>${v === null || v === undefined ? '—' : (v / (l.div || 1)).toFixed(l.dp)} ${l.unit}</b>`;
      });
      tip.innerHTML = `${hm(H.t[i])}<br>${rows.join('<br>')}`;
      tip.style.display = 'block';
      const px = (cx / W) * r.width;
      tip.style.left = Math.min(r.width - tip.offsetWidth, Math.max(0, px - tip.offsetWidth / 2)) + 'px';
      tip.style.top = '-6px';
    };
    svg.addEventListener('pointermove', move);
    svg.addEventListener('pointerdown', move);
    svg.addEventListener('pointerleave', () => { tip.style.display = 'none'; $('#cur', svg).setAttribute('visibility', 'hidden'); });
    return wrap;
  }

  loadHistory();
  setInterval(loadHistory, 60000);
  let rs = 0;
  addEventListener('resize', () => { clearTimeout(rs); rs = setTimeout(drawCharts, 150); });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', drawCharts);
})();
