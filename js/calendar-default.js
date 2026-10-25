/* 学校暦の初期値（仮の例です）。実際の日程は画面の「学校暦設定」で直してください。
 * 学校全体で共有したいときは、ここの日付を書き換えて GitHub に反映します。
 * 年は「学年度」（2026 = 2026年4月〜2027年3月）。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CalendarDefault = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  function make(y) {
    const n = y + 1;
    return {
      t1: { start: `${y}-04-08`, end: `${y}-07-20`, midStart: `${y}-05-19`, midEnd: `${y}-05-22`, finStart: `${y}-07-01`, finEnd: `${y}-07-07` },
      t2: { start: `${y}-09-01`, end: `${y}-12-22`, midStart: `${y}-10-13`, midEnd: `${y}-10-16`, finStart: `${y}-12-07`, finEnd: `${y}-12-11` },
      t3: { start: `${n}-01-08`, end: `${n}-03-20`, finStart: `${n}-02-24`, finEnd: `${n}-03-03` },
    };
  }
  function build() {
    const o = {};
    for (let y = 2025; y <= 2029; y++) o[y] = make(y);
    return o;
  }
  return { build, make };
});
