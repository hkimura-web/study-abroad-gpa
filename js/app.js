(function () {
  const { TYPES, ORDER } = Rules;
  const { judge, buildSegments, segName, normDate, fmt, fmtFull, TERM, SEG } = Logic;
  const $ = (id) => document.getElementById(id);
  const KEY = 'ryugaku-seiseki.calendar.v1';

  /* ---------- 学校暦の保存 ---------- */
  let cals = loadCals();
  function loadCals() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) { const o = JSON.parse(s); if (o && typeof o === 'object') return o; }
    } catch (e) { /* 保存できない環境でも動く */ }
    return CalendarDefault.build();
  }
  function saveCals() { try { localStorage.setItem(KEY, JSON.stringify(cals)); } catch (e) { /* ignore */ } }
  const isDefault = () => JSON.stringify(cals) === JSON.stringify(CalendarDefault.build());

  /* ---------- 共通の表示部品 ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function cellHtml(s) {
    return esc(s).replace(/〇/g, '<span class="o">〇</span>').replace(/×/g, '<span class="x">×</span>')
      .replace(/「(公欠|留学)」/g, '<span class="k">「$1」</span>');
  }
  const flat = (s) => s.replace(/\s*\n\s*/g, ' ');
  function blendSoten(s) {
    const t = flat(s);
    if (/欠を入力/.test(t)) {
      const extra = t.replace(/×\s*\(欠を入力\)/, '').trim();
      return '「欠」を入力' + (extra ? ' ' + extra : '');
    }
    if (t.startsWith('〇')) return '通常どおり入力' + t.slice(1);
    return t + (/^※/.test(t) ? '（備考を参照）' : '');
  }
  const blendDeketsu = (s) => (s === '〇' ? '通常どおり' : s.split('\n').join('／'));
  const blendHyotei = (s) => (s === '〇' ? '通常どおり入力' : s === '×' ? '入力しない' : s);

  function rowRange(baseY, row, segs) {
    const g = segs.find((s) => s.y === baseY + row.yo && s.t === row.term && s.s === row.seg);
    return g ? `${fmt(g.start)}〜${fmt(g.end)}` : '';
  }
  const termLabel = (row, baseY) =>
    (baseY !== null ? `${baseY + row.yo}年度\n` : '') + TERM[row.term];

  /* ---------- 原表（該当行を強調） ---------- */
  function tableHtml(type, ctx) {
    ctx = ctx || {};
    const withDates = ctx.baseY !== undefined && ctx.baseY !== null;
    const segs = withDates ? buildSegments(cals) : [];
    const hasY2 = type.rows.some((r) => r.yo === 1);
    let h = '<div class="scroll"><table class="orig"><thead><tr><th rowspan="2">学期</th><th rowspan="2">項目</th>';
    if (withDates) h += '<th rowspan="2">期間</th>';
    h += '<th rowspan="2">留学</th><th rowspan="2">授業</th><th rowspan="2">平常点</th><th rowspan="2">定期試験</th><th colspan="3">Blend入力</th><th rowspan="2">備考</th></tr>';
    h += '<tr><th>素点</th><th>出欠</th><th>評定</th></tr></thead><tbody>';
    type.rows.forEach((row, i) => {
      const prev = type.rows[i - 1];
      const g = type.groups[row.group] || {};
      const hit = ctx.highlight && row.role;
      h += `<tr class="${hit ? 'hit' : ''}">`;
      if (!prev || prev.yo !== row.yo || prev.term !== row.term) {
        let span = 1;
        while (type.rows[i + span] && type.rows[i + span].yo === row.yo && type.rows[i + span].term === row.term) span++;
        const lbl = withDates ? termLabel(row, ctx.baseY) : (hasY2 ? (row.yo ? '翌年度\n' : '出発年度\n') : '') + TERM[row.term];
        h += `<td class="term c-${g.color || 'none'}" rowspan="${span}" style="white-space:pre-line">${esc(lbl)}</td>`;
      }
      h += `<td>${SEG[row.seg]}</td>`;
      if (withDates) {
        let d = rowRange(ctx.baseY, row, segs);
        if (row.role === 'dep' && ctx.dep) d += `\n出発 ${fmt(ctx.dep)}`;
        if (row.role === 'ret' && ctx.ret) d += `\n帰国 ${fmt(ctx.ret)}`;
        h += `<td class="dates cell">${esc(d)}</td>`;
      }
      h += `<td class="role">${row.role === 'dep' ? '出発' : row.role === 'ret' ? '帰国' : ''}</td>`;
      row.cells.forEach((c, k) => { h += `<td class="cell"${k === 6 ? ' style="min-width:140px;font-size:12px"' : ''}>${cellHtml(c)}</td>`; });
      h += '</tr>';
    });
    h += '</tbody></table></div>';
    const gs = Object.values(type.groups);
    if (gs.length) {
      h += '<div class="legend">' + gs.map((g) =>
        `<div class="grade"><span class="sw c-${g.color || 'none'}"></span><span>${esc(g.text)}</span></div>`).join('') + '</div>';
    }
    return h;
  }

  /* ---------- 入力の指示（Blend） ---------- */
  function stepsHtml(type, baseY, dep, ret) {
    const segs = buildSegments(cals);
    return '<div class="steps">' + type.rows.map((row) => {
      const [kyo, hei, tei, so, de, hy, memo] = row.cells;
      const plain = !row.role && row.cells.slice(0, 6).every((c) => c === '〇') && !memo;
      const range = rowRange(baseY, row, segs);
      const name = `${baseY + row.yo}年度 ${TERM[row.term]} ${SEG[row.seg]}`;
      const gcls = type.groups[row.group] && type.groups[row.group].color ? ' g-' + type.groups[row.group].color[0] : '';
      if (plain) {
        return `<div class="step plain${gcls}">${esc(name)}　${esc(range)}　— 通常どおり</div>`;
      }
      const tag = row.role ? `<span class="tag">${row.role === 'dep' ? '出発 ' + fmt(dep) : '帰国 ' + fmt(ret)}</span>` : '';
      return `<div class="step ${row.role || ''}${gcls}">
        <div class="hd"><span class="nm">${esc(name)}</span><span class="dt">${esc(range)}</span>${tag}</div>
        <div class="blend">
          <div><span>素点</span>${esc(blendSoten(so))}</div>
          <div><span>出欠</span>${esc(blendDeketsu(de))}</div>
          <div><span>評定</span>${esc(blendHyotei(hy))}</div>
        </div>
        <div class="minor">成績に入れるもの　授業：${esc(flat(kyo))}　平常点：${esc(flat(hei))}　定期試験：${esc(flat(tei))}</div>
        ${memo ? `<div class="note">${esc(memo)}</div>` : ''}
      </div>`;
    }).join('') + '</div>';
  }

  /* ---------- 個別判定 ---------- */
  const state = { pick: null };
  function inputs() { return { dep: $('f-dep').value, ret: $('f-ret').value, exam: $('f-exam').value, name: $('f-name').value }; }

  function posText(c, fallbackGap) {
    return segName(c.seg) + (c.gap ? '（休業中）' : '');
  }

  function detailHtml(typeId, res, o) {
    const type = TYPES[typeId];
    const baseY = o.dep.seg.y;
    const depTxt = `${fmtFull(res.dep)}　${segName(o.dep.seg)}${o.dep.gap ? '（休業中）' : ''}`;
    const retTxt = `${fmtFull(res.ret)}　${segName(o.ret.seg)}${o.ret.gap ? '（休業中）' : ''}`;
    const months = (res.days / 30.4).toFixed(1).replace(/\.0$/, '');
    let h = `<div class="panel"><div class="verdict"><div class="badge">${esc(type.label)}</div>
      <div><div class="ttl">${esc(type.title)}</div><div class="small" style="margin:0">${esc(type.period)}</div></div></div>
      <div class="flow"><div><b>出発</b>${esc(depTxt)}</div><div><b>帰国</b>${esc(retTxt)}</div><div><b>留学期間</b>${res.days}日（約${months}か月）</div></div>`;
    (res.notes || []).forEach((n) => { h += `<div class="notice" style="margin:10px 0 0">${esc(n)}</div>`; });
    h += '</div>';
    h += '<h2>Blend入力の指示</h2>' + stepsHtml(type, baseY, res.dep, res.ret);
    h += '<h2>学年成績の扱い</h2>' + Object.values(type.groups).map((g) =>
      `<div class="grade"><span class="sw c-${g.color || 'none'}"></span><span>${esc(g.text)}</span></div>`).join('');
    h += '<h2>早見表（該当行を強調）</h2>' + tableHtml(type, { baseY, highlight: true, dep: res.dep, ret: res.ret });
    return h;
  }

  function renderSingle() {
    const v = inputs();
    $('calwarn').hidden = !isDefault();
    const box = $('result');
    if (!v.dep || !v.ret) {
      box.innerHTML = '<div class="empty">出発日と帰国日を入れると、成績処理のしかたが表示されます。</div>';
      $('f-exam-wrap').hidden = true; return;
    }
    const res = judge({ dep: v.dep, ret: v.ret, cals, exam: v.exam });
    const head = `<div class="printhead"><b>${esc(v.name || '')}</b>　出発 ${esc(v.dep)} / 帰国 ${esc(v.ret)}</div>`;
    $('f-exam-wrap').hidden = !((res.option && res.option.typeId.startsWith('S-C')) ||
      (res.options && res.options.some((o) => o.typeId.startsWith('S-C'))));
    if (res.status === 'error') { box.innerHTML = `<div class="notice">${esc(res.message)}</div>`; return; }
    if (res.status === 'E') {
      box.innerHTML = head + `<div class="panel"><div class="verdict"><div class="badge e">${esc(TYPES['S-E'].label)}</div>
        <div><div class="ttl">${esc(res.message)}</div><div>${esc(TYPES['S-E'].note)}</div></div></div>
        <div class="flow"><div><b>出発</b>${esc(res.depCands.map((c) => posText(c)).join(' ／ '))}</div>
        <div><b>帰国</b>${esc(res.retCands.map((c) => posText(c)).join(' ／ '))}</div></div></div>`;
      return;
    }
    if (res.status === 'ok') { box.innerHTML = head + detailHtml(res.option.typeId, res, res.option); return; }
    // ambiguous
    if (!res.options.some((o) => o.typeId === state.pick)) state.pick = null;
    let h = `<div class="panel"><div class="ttl">休業期間にかかる日付のため、${res.options.length}通りに読めます。どちらで扱うか選んでください。</div><div class="pick">` +
      res.options.map((o) => `<button class="${state.pick === o.typeId ? '' : 'ghost'}" data-pick="${o.typeId}">${esc(TYPES[o.typeId].label)}　${esc(TYPES[o.typeId].title)}</button>`).join('') + '</div></div>';
    if (state.pick) { const o = res.options.find((x) => x.typeId === state.pick); h += detailHtml(o.typeId, res, o); }
    box.innerHTML = head + h;
  }

  /* ---------- 早見表 ---------- */
  let refId = 'L-A';
  function renderRef() {
    $('ref-chips').innerHTML = ORDER.map((id) => `<button data-ref="${id}" class="${id === refId ? 'on' : ''}">${TYPES[id].label}</button>`).join('');
    const t = TYPES[refId];
    $('ref-view').innerHTML = `<div class="panel"><div class="verdict"><div class="badge">${esc(t.label)}</div><div><div class="ttl">${esc(t.title)}</div><div class="small" style="margin:0">${esc(t.period)}</div></div></div></div>` +
      (t.rows.length ? tableHtml(t) : `<div class="panel">${esc(t.note)}</div>`);
  }

  /* ---------- CSV一括 ---------- */
  let batchRows = [];
  function parseCsv(text) {
    const rows = []; let row = [], cur = '', q = false;
    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',' || c === '\t') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim() !== ''));
  }
  function decode(buf) {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(buf); }
    catch (e) { return new TextDecoder('shift_jis').decode(buf); }
  }
  function runBatch(text) {
    const rows = parseCsv(text);
    if (!rows.length) { $('batch-result').innerHTML = '<div class="notice">読み込める行がありません</div>'; return; }
    let ni = 0, di = 1, ri = 2, ei = 3, start = 0;
    if (/出発|帰国|氏名|名前/.test(rows[0].join(','))) {
      const f = (re, d) => { const i = rows[0].findIndex((x) => re.test(x)); return i < 0 ? d : i; };
      ni = f(/氏名|名前/, 0); di = f(/出発/, 1); ri = f(/帰国/, 2); ei = f(/受験|期末/, -1); start = 1;
    }
    batchRows = rows.slice(start).map((r) => {
      const ex = ei >= 0 && r[ei] ? (/全|all|C-?2/i.test(r[ei]) ? 'all' : /未|some|C-?1/i.test(r[ei]) ? 'some' : 'auto') : 'auto';
      const dep = normDate(r[di]), ret = normDate(r[ri]);
      const res = judge({ dep: r[di], ret: r[ri], cals, exam: ex });
      return { name: (r[ni] || '').trim(), depRaw: r[di] || '', retRaw: r[ri] || '', dep, ret, ex, res };
    });
    renderBatch();
  }
  function batchCells(b) {
    const { res } = b;
    if (res.status === 'error') return { type: '日付エラー', dep: '', ret: '', note: res.message, bad: true };
    if (res.status === 'E') return { type: '短期E型（要協議）', dep: res.depCands.map((c) => segName(c.seg)).join(' / '), ret: res.retCands.map((c) => segName(c.seg)).join(' / '), note: '執行部・教務部・国際部で協議', bad: true };
    if (res.status === 'ambiguous') return { type: '要確認：' + res.options.map((o) => TYPES[o.typeId].label).join(' / '), dep: res.depCands.map((c) => segName(c.seg)).join(' / '), ret: res.retCands.map((c) => segName(c.seg)).join(' / '), note: '休業期間にかかる日付。個別判定で確認', bad: true };
    const o = res.option;
    return { type: TYPES[o.typeId].label, dep: segName(o.dep.seg) + (o.dep.gap ? '（休業中）' : ''), ret: segName(o.ret.seg) + (o.ret.gap ? '（休業中）' : ''), note: (res.notes || []).filter((n) => /試験期間中/.test(n)).join(' '), bad: false };
  }
  function renderBatch() {
    if (!batchRows.length) { $('batch-result').innerHTML = ''; return; }
    let h = '<div class="row"><button id="csv-out">結果をCSVで保存</button></div><div class="scroll"><table class="res"><thead><tr><th>氏名</th><th>出発日</th><th>帰国日</th><th>判定</th><th>出発区間</th><th>帰国区間</th><th>注意</th><th></th></tr></thead><tbody>';
    batchRows.forEach((b, i) => {
      const c = batchCells(b);
      h += `<tr><td>${esc(b.name)}</td><td>${esc(b.depRaw)}</td><td>${esc(b.retRaw)}</td><td class="${c.bad ? 'bad' : 't'}">${esc(c.type)}</td><td>${esc(c.dep)}</td><td>${esc(c.ret)}</td><td>${esc(c.note)}</td>
        <td>${b.dep && b.ret ? `<button class="ghost" data-detail="${i}">詳細</button>` : ''}</td></tr>`;
    });
    $('batch-result').innerHTML = h + '</tbody></table></div>';
  }
  function download(name, text, mime) {
    const blob = new Blob(['﻿' + text], { type: mime || 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;

  /* ---------- 学校暦設定 ---------- */
  let calYear = null;
  const FIELDS = [['start', '開始日'], ['end', '終了日'], ['midStart', '中間試験 開始'], ['midEnd', '中間試験 終了'], ['finStart', '期末試験 開始'], ['finEnd', '期末試験 終了']];
  function validate() {
    const errs = [], ys = Object.keys(cals).map(Number).sort((a, b) => a - b);
    ys.forEach((y) => {
      const c = cals[y];
      [1, 2, 3].forEach((t) => {
        const T = c['t' + t]; if (!T) { errs.push(`${y}年度 ${t}学期が未設定`); return; }
        if (!T.start || !T.end || T.start >= T.end) errs.push(`${y}年度 ${t}学期：開始日・終了日を確認`);
        if (t < 3 && (!T.midEnd || T.midEnd < T.start || T.midEnd >= T.end)) errs.push(`${y}年度 ${t}学期：中間試験の終了日は学期の途中にしてください`);
        if (T.finEnd && T.end && T.finEnd > T.end) errs.push(`${y}年度 ${t}学期：期末試験が学期終了日より後です`);
      });
      if (c.t1 && c.t2 && c.t1.end >= c.t2.start) errs.push(`${y}年度：1学期と2学期が重なっています`);
      if (c.t2 && c.t3 && c.t2.end >= c.t3.start) errs.push(`${y}年度：2学期と3学期が重なっています`);
      if (cals[y + 1] && c.t3 && cals[y + 1].t1 && c.t3.end >= cals[y + 1].t1.start) errs.push(`${y}年度の3学期と翌年度の1学期が重なっています`);
    });
    return errs;
  }
  function renderCal() {
    const ys = Object.keys(cals).map(Number).sort((a, b) => a - b);
    if (!calYear || !cals[calYear]) calYear = ys.includes(new Date().getFullYear()) ? new Date().getFullYear() : ys[0];
    $('cal-year').innerHTML = ys.map((y) => `<option value="${y}" ${y === calYear ? 'selected' : ''}>${y}年度</option>`).join('');
    const c = cals[calYear];
    $('cal-form').innerHTML = '<div class="calgrid">' + [1, 2, 3].map((t) => {
      const list = t === 3 ? FIELDS.filter((f) => !/^mid/.test(f[0])) : FIELDS;
      return `<div class="calcol"><h3>${t}学期</h3>` + list.map(([k, l]) =>
        `<label>${l}<input type="date" data-t="${t}" data-k="${k}" value="${(c['t' + t] || {})[k] || ''}"></label>`).join('') + '</div>';
    }).join('') + '</div><div class="errs" id="cal-errs"></div>';
    showErrs();
  }
  function showErrs() { const e = validate(); const el = $('cal-errs'); if (el) el.innerHTML = e.map(esc).join('<br>'); }

  /* ---------- イベント ---------- */
  function setTab(name) {
    document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('on', s.id === 'tab-' + name));
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
  }
  $('tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); });
  ['f-name', 'f-dep', 'f-ret', 'f-exam'].forEach((id) => $(id).addEventListener('input', () => { if (id !== 'f-name') state.pick = null; renderSingle(); }));
  $('result').addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) { state.pick = b.dataset.pick; renderSingle(); } });
  $('ref-chips').addEventListener('click', (e) => { const b = e.target.closest('[data-ref]'); if (b) { refId = b.dataset.ref; renderRef(); } });

  $('csv-file').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => runBatch(decode(rd.result)); rd.readAsArrayBuffer(f);
  });
  $('csv-tpl').addEventListener('click', () => download('留学生_日付テンプレート.csv', '氏名,出発日,帰国日\n山田 花子,2026-08-25,2027-06-28\n鈴木 太郎,2026-07-25,2026-09-22\n'));
  $('batch-result').addEventListener('click', (e) => {
    const d = e.target.closest('[data-detail]');
    if (d) {
      const b = batchRows[+d.dataset.detail];
      $('f-name').value = b.name; $('f-dep').value = b.dep; $('f-ret').value = b.ret; $('f-exam').value = b.ex; state.pick = null;
      renderSingle(); setTab('single'); window.scrollTo(0, 0); return;
    }
    if (e.target.id === 'csv-out') {
      const lines = ['氏名,出発日,帰国日,判定,出発区間,帰国区間,注意'].concat(batchRows.map((b) => {
        const c = batchCells(b); return [b.name, b.depRaw, b.retRaw, c.type, c.dep, c.ret, c.note].map(q).join(',');
      }));
      download('留学生_判定結果.csv', lines.join('\n') + '\n');
    }
  });

  $('cal-year').addEventListener('change', (e) => { calYear = +e.target.value; renderCal(); });
  $('cal-form').addEventListener('input', (e) => {
    const t = e.target.dataset.t; if (!t) return;
    cals[calYear]['t' + t][e.target.dataset.k] = e.target.value;
    saveCals(); showErrs(); renderSingle(); $('cal-msg').textContent = '保存しました';
  });
  $('cal-add').addEventListener('click', () => {
    const next = Math.max(...Object.keys(cals).map(Number)) + 1;
    const prev = cals[next - 1], shift = (s) => (s ? s.replace(/^\d{4}/, (y) => +y + 1) : s);
    cals[next] = prev ? JSON.parse(JSON.stringify(prev), (k, v) => (typeof v === 'string' ? shift(v) : v)) : CalendarDefault.make(next);
    calYear = next; saveCals(); renderCal(); renderSingle(); $('cal-msg').textContent = `${next}年度を追加しました（前年度の日付を1年ずらしています。実際の日程に直してください）`;
  });
  $('cal-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(cals, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '学校暦.json';
    document.body.appendChild(a); a.click(); a.remove();
  });
  $('cal-import').addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const rd = new FileReader(); rd.onload = () => {
      try {
        const o = JSON.parse(rd.result);
        const ok = Object.values(o).every((c) => c.t1 && c.t2 && c.t3);
        if (!ok) throw new Error();
        cals = o; saveCals(); calYear = null; renderCal(); renderSingle(); $('cal-msg').textContent = '読み込みました';
      } catch (err) { $('cal-msg').textContent = '読み込めませんでした（形式が違います）'; }
    }; rd.readAsText(f);
  });
  $('cal-reset').addEventListener('click', () => {
    if (!confirm('学校暦を初期値（仮の例）に戻します。よろしいですか？')) return;
    cals = CalendarDefault.build(); saveCals(); calYear = null; renderCal(); renderSingle();
  });

  renderSingle(); renderRef(); renderCal();
})();
