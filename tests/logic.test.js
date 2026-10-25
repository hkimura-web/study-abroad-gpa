// node tests/logic.test.js
const assert = require('assert');
const L = require('../js/logic.js');
const C = require('../js/calendar-default.js');
const { TYPES } = require('../js/rules.js');
const cals = C.build();

const cases = [
  // [説明, 出発, 帰国, 期待する型]
  ['長期A 8月下旬→翌6月下旬', '2026-08-25', '2027-06-28', 'L-A'],
  ['長期A 8月中旬→翌7月上旬', '2026-08-15', '2027-07-05', 'L-A'],
  ['長期B 1月中旬→12月上旬', '2027-01-12', '2027-12-05', 'L-B'],
  ['長期B 冬休み中の出発(1/4)', '2027-01-04', '2027-11-28', 'L-B'],
  ['短期A 4月下旬→7月上旬', '2026-04-25', '2026-07-08', 'S-A'],
  ['短期B 8月下旬→翌1月下旬', '2026-08-22', '2027-01-25', 'S-B'],
  ['短期C-1 7月上旬(試験中)→9月上旬', '2026-07-03', '2026-09-05', 'S-C1'],
  ['短期C-2 7月下旬(休業中)→9月下旬', '2026-07-25', '2026-09-22', 'S-C2'],
  ['短期C-2 7月中旬(試験後)→9月中旬', '2026-07-15', '2026-09-15', 'S-C2'],
  ['短期D 1月中旬→翌4月中旬', '2027-01-12', '2027-04-15', 'S-D'],
];
let fail = 0;
for (const [name, dep, ret, exp] of cases) {
  const r = L.judge({ dep, ret, cals });
  const got = r.status === 'ok' ? r.option.typeId : r.status;
  const ok = got === exp;
  if (!ok) fail++;
  console.log(ok ? 'OK ' : 'NG ', name, '=>', got, ok ? '' : `(期待 ${exp})`);
}
// どれにも当てはまらない例 → E
let r = L.judge({ dep: '2026-05-01', ret: '2026-11-01', cals });
assert.strictEqual(r.status, 'E'); console.log('OK  E型 (5月→11月)');
// 帰国<=出発 → error
r = L.judge({ dep: '2026-09-10', ret: '2026-09-01', cals });
assert.strictEqual(r.status, 'error'); console.log('OK  日付の前後エラー');
// C 手動指定
r = L.judge({ dep: '2026-07-25', ret: '2026-09-22', cals, exam: 'some' });
assert.strictEqual(r.option.typeId, 'S-C1'); console.log('OK  C 手動指定');
// 全型の行が学校暦に当てはまる
for (const t of Object.values(TYPES)) for (const row of t.rows) assert.ok(row.cells.length === 7, t.id);
console.log('OK  rules 形式');
if (fail) { console.error(fail + ' 件失敗'); process.exit(1); }
console.log('すべて成功');
