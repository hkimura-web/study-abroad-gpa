/* 出発日・帰国日 → 型の判定ロジック（画面に依存しない）
 * node tests/logic.test.js で動作確認できます。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Logic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const TERM = { 1: '1学期', 2: '2学期', 3: '3学期' };
  const SEG = { mid: '中間試験まで', fin: '期末試験まで' };

  function addDay(iso, n) {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + (n === undefined ? 1 : n));
    return d.toISOString().slice(0, 10);
  }
  function normDate(s) {
    if (!s) return null;
    const m = String(s).trim().match(/^(\d{4})[-\/.年](\d{1,2})[-\/.月](\d{1,2})日?$/);
    if (!m) return null;
    const iso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
    const d = new Date(iso + 'T00:00:00Z');
    return isNaN(d) || d.toISOString().slice(0, 10) !== iso ? null : iso;
  }
  function fmt(iso) { const [, m, d] = iso.split('-'); return `${+m}/${+d}`; }
  function fmtFull(iso) { const [y, m, d] = iso.split('-'); return `${y}/${+m}/${+d}`; }
  function diffDays(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }

  /** 学校暦 → 並んだ区間（学年度×学期×中間/期末）のリスト */
  function buildSegments(cals) {
    const segs = [];
    Object.keys(cals).map(Number).sort((a, b) => a - b).forEach((y) => {
      [1, 2, 3].forEach((t) => {
        const T = cals[y]['t' + t];
        if (!T || !T.start || !T.end) return;
        if (t < 3) {
          segs.push({ y, t, s: 'mid', start: T.start, end: T.midEnd });
          segs.push({ y, t, s: 'fin', start: addDay(T.midEnd), end: T.end });
        } else {
          segs.push({ y, t, s: 'fin', start: T.start, end: T.end });
        }
      });
    });
    return segs.sort((a, b) => (a.start < b.start ? -1 : 1));
  }

  /** 日付が属する区間。休業期間なら「直前の区間」「直後の区間」の両方を候補にする */
  function locate(segs, date) {
    const hit = segs.find((s) => s.start <= date && date <= s.end);
    if (hit) return { cands: [{ seg: hit, gap: false }] };
    const prev = [...segs].reverse().find((s) => s.end < date);
    const next = segs.find((s) => s.start > date);
    if (!prev || !next) return { error: '学校暦に含まれない日付です（学校暦設定で年度を追加してください）' };
    return { cands: [{ seg: prev, gap: true }, { seg: next, gap: true }] };
  }

  /** 出発区間×帰国区間 → 型ID（該当なしは null） */
  function classify(d, r) {
    const dk = `${d.t}${d.s}`, rk = `${r.t}${r.s}`, yd = r.y - d.y;
    if (yd === 0) {
      if (dk === '1mid' && rk === '1fin') return 'S-A';
      if (dk === '2mid' && rk === '3fin') return 'S-B';
      if (dk === '1fin' && rk === '2mid') return 'S-C';
    } else if (yd === 1) {
      if (dk === '2mid' && rk === '1fin') return 'L-A';
      if (dk === '3fin' && rk === '2fin') return 'L-B';
      if (dk === '3fin' && rk === '1mid') return 'S-D';
    }
    return null;
  }

  function segName(seg) {
    return `${seg.y}年度 ${TERM[seg.t]}${seg.t === 3 ? '' : ' ' + SEG[seg.s]}`;
  }

  /**
   * 判定
   * @param {{dep:string, ret:string, cals:object, exam?:'auto'|'all'|'some'}} p
   * @returns {{status:'ok'|'ambiguous'|'E'|'error', message?:string, options?:Array, notes?:string[]}}
   */
  function judge(p) {
    const dep = normDate(p.dep), ret = normDate(p.ret);
    if (!dep || !ret) return { status: 'error', message: '出発日と帰国日を入力してください' };
    if (ret <= dep) return { status: 'error', message: '帰国日は出発日より後の日付にしてください' };
    const segs = buildSegments(p.cals);
    const L1 = locate(segs, dep), L2 = locate(segs, ret);
    if (L1.error || L2.error) return { status: 'error', message: L1.error || L2.error };

    const found = new Map();
    L1.cands.forEach((dc) => L2.cands.forEach((rc) => {
      const id = classify(dc.seg, rc.seg);
      if (id && !found.has(id)) found.set(id, { typeId: id, dep: dc, ret: rc });
    }));

    const notes = [];
    const days = diffDays(dep, ret);
    const base = { dep, ret, days, depCands: L1.cands, retCands: L2.cands, notes };

    const options = [...found.values()].map((o) => {
      let typeId = o.typeId;
      if (typeId === 'S-C') {
        const c = p.cals[o.dep.seg.y].t1;
        let all = dep > c.finEnd;                       // 期末試験が終わってから出発 → 全科目受験
        if (p.exam === 'all') all = true;
        if (p.exam === 'some') all = false;
        typeId = all ? 'S-C2' : 'S-C1';
        o.examAuto = !p.exam || p.exam === 'auto';
        if (o.examAuto && dep >= c.finStart && dep <= c.finEnd)
          o.examWarn = '期末試験期間中の出発です。受験できなかった科目があるか確認してください（未受験があればC-1型）。';
      }
      return { ...o, typeId };
    });

    if (options.length === 0) {
      return { status: 'E', ...base, message: '早見表のどのパターンにも当てはまりません（短期E型）' };
    }
    if (options.length === 1) {
      const o = options[0];
      if (o.dep.gap) notes.push(`出発日は休業期間中のため「${segName(o.dep.seg)}」の出発として扱います。`);
      if (o.ret.gap) notes.push(`帰国日は休業期間中のため「${segName(o.ret.seg)}」の帰国として扱います。`);
      if (o.examWarn) notes.push(o.examWarn);
      return { status: 'ok', ...base, option: o };
    }
    return { status: 'ambiguous', ...base, options };
  }

  return { judge, buildSegments, locate, classify, segName, normDate, fmt, fmtFull, addDay, diffDays, TERM, SEG };
});
