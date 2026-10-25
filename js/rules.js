/* 早見表「長期・短期留学参加生徒の成績処理について」をデータ化したもの
 * 表の内容を変えたいときは、このファイルだけを編集します。
 *
 * 行: r(yo, term, seg, role, cells, group)
 *   yo    : 出発した学年度から数えて何年後か (0=出発した年度 / 1=翌年度)
 *   term  : 1,2,3 (学期)
 *   seg   : 'mid'=中間試験まで / 'fin'=期末試験まで
 *   role  : 'dep'=出発 / 'ret'=帰国 / null
 *   cells : [授業, 平常点, 定期試験, 素点, 出欠, 評定, 備考]
 *   group : 学年成績の扱い(groups)のキー
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const O = '〇', X = '×';
  const XK = '×\n(欠を入力)';
  const XK1 = '×(欠を入力)';
  const RYU = '「留学」を入力';
  const DEPK = '出発前〇\n出発後「公欠」';
  const DEPR = '出発前〇\n出発後「留学」';
  const RETK = '帰国前「公欠」\n帰国後〇';
  const RETR = '帰国前「留学」\n帰国後〇';
  const NS = '(成績入れず)';
  const ALL = [O, O, O, O, O, O, ''];
  const AWAY = [X, X, X, XK, RYU, X, ''];

  const r = (yo, term, seg, role, cells, group) => ({ yo, term, seg, role, cells, group: group || null });

  const TYPES = {
    'L-A': {
      id: 'L-A', label: '長期A型', kind: '長期', title: '8月出発 北米一年留学',
      period: '留学期間の目安 [8月中・下旬〜6月下旬・7月上旬]',
      groups: {
        y: { color: 'yellow', text: '学年単位は包括認定' },
        g: { color: 'green', text: '学年成績は2学期・3学期の積算' },
      },
      rows: [
        r(0, 1, 'mid', null, ALL, 'y'),
        r(0, 1, 'fin', null, ALL, 'y'),
        r(0, 2, 'mid', 'dep', AWAY, 'y'),
        r(0, 2, 'fin', null, AWAY, 'y'),
        r(0, 3, 'fin', null, AWAY, 'y'),
        r(1, 1, 'mid', null, AWAY, 'g'),
        r(1, 1, 'fin', 'ret', ['帰国後〇', '〇\n' + NS, '帰国後〇\n' + NS, XK, RETR, X, ''], 'g'),
        r(1, 2, 'mid', null, ALL, 'g'),
        r(1, 2, 'fin', null, ALL, 'g'),
        r(1, 3, 'fin', null, ALL, 'g'),
      ],
    },
    'L-B': {
      id: 'L-B', label: '長期B型', kind: '長期', title: '1月出発 オセアニア一年留学',
      period: '留学期間の目安 [1月上・中旬〜11月下旬・12月上旬]',
      groups: {
        b: { color: 'blue', text: '学年成績は1学期・2学期・出発までの3学期の積算' },
        y: { color: 'yellow', text: '学年単位は包括認定' },
      },
      rows: [
        r(0, 1, 'mid', null, ALL, 'b'),
        r(0, 1, 'fin', null, ALL, 'b'),
        r(0, 2, 'mid', null, ALL, 'b'),
        r(0, 2, 'fin', null, ALL, 'b'),
        r(0, 3, 'fin', 'dep', ['出発まで〇', '出発まで〇', X, XK, DEPR, O, ''], 'b'),
        r(1, 1, 'mid', null, AWAY, 'y'),
        r(1, 1, 'fin', null, AWAY, 'y'),
        r(1, 2, 'mid', null, AWAY, 'y'),
        r(1, 2, 'fin', 'ret', ['帰国後〇', '〇\n' + NS, '帰国後〇\n' + NS, XK, RETR, X, ''], 'y'),
        r(1, 3, 'fin', null, ['〇', '〇\n' + NS, '〇\n' + NS, XK, O, X,
          '著しく成績や取組みが芳しくない場合は、生活を立て直す支援をする'], 'y'),
      ],
    },
    'S-A': {
      id: 'S-A', label: '短期A型', kind: '短期', title: '4月出発 オセアニア3か月ターム留学',
      period: '留学期間の目安 [4月中・下旬〜7月上・中旬]',
      groups: {
        n: { color: null, text: '学年成績は1学期の出発までと帰国後・2学期・3学期の積算（2学期と3学期が中心だが、1学期の登校している期間の取組みも含めて成績をつける）' },
      },
      rows: [
        r(0, 1, 'mid', 'dep', ['出発まで〇', '出発まで〇', X, XK1, DEPK, O, ''], 'n'),
        r(0, 1, 'fin', 'ret', ['帰国後〇', X, '帰国後〇\n' + NS, XK1, RETK, O, ''], 'n'),
      ],
    },
    'S-B': {
      id: 'S-B', label: '短期B型', kind: '短期', title: '8月出発 北米5か月セメスター留学',
      period: '留学期間の目安 [8月中・下旬〜1月中・下旬]',
      groups: {
        n: { color: null, text: '学年成績は1学期・2学期出発まで・3学期帰国後の積算（1学期と3学期が中心だが、2学期の登校している期間の取組みも含めて成績をつける）' },
      },
      rows: [
        r(0, 2, 'mid', 'dep', ['出発まで〇', '出発まで〇\n※①', X, XK1, DEPK, O, '※①夏季課題等も成績に入れる'], 'n'),
        r(0, 2, 'fin', null, [X, X, X, XK1, '「公欠」を入力', O, ''], 'n'),
        r(0, 3, 'fin', 'ret', ['帰国後〇', '帰国後〇', O, O, RETK, O, ''], 'n'),
      ],
    },
    'S-C1': {
      id: 'S-C1', label: '短期C-1型', kind: '短期', title: '7月出発 オセアニア2か月ターム留学（1学期期末試験 未受験科目あり）',
      period: '留学期間の目安 [7月上旬〜9月上旬]',
      groups: { n: { color: null, text: '学年成績は1学期出発まで・2学期帰国後・3学期の積算' } },
      rows: [
        r(0, 1, 'mid', null, ALL, 'n'),
        r(0, 1, 'fin', 'dep', ['出発まで〇', '出発まで〇', '〇or×', '※②', DEPK, O,
          '※②受験した期末試験の科目は素点入力（成績に入れる）\n留学のために受験できなかった科目は「欠」を入力'], 'n'),
        r(0, 2, 'mid', 'ret', ['帰国後〇', '帰国後〇', O, '〇\n※③', RETK, O,
          '※③1学期期末試験で未受験科目が出るくらい早くに渡航していると、帰国も9月上旬になるので、2学期中間試験は通常の扱いで成績に入れる'], 'n'),
        r(0, 2, 'fin', null, ALL, 'n'),
      ],
    },
    'S-C2': {
      id: 'S-C2', label: '短期C-2型', kind: '短期', title: '7月出発 オセアニア2か月ターム留学（1学期期末試験 全科目受験）',
      period: '留学期間の目安 [7月中・下旬〜9月中・下旬]',
      groups: { n: { color: null, text: '学年成績は1学期出発まで・2学期帰国後・3学期の積算' } },
      rows: [
        r(0, 1, 'mid', null, ALL, 'n'),
        r(0, 1, 'fin', 'dep', ['出発まで〇', '出発まで〇', '〇or×', O, DEPK, O, ''], 'n'),
        r(0, 2, 'mid', 'ret', ['帰国後〇', '帰国後〇', O, XK1 + '\n※④', RETK, O,
          '※④1学期期末試験で全科目受験できたということはそれだけ渡航の時期が遅いので、帰国の時期も遅くなり、試験直前に復帰するため、2学期中間試験は成績に入れない'], 'n'),
        r(0, 2, 'fin', null, ALL, 'n'),
      ],
    },
    'S-D': {
      id: 'S-D', label: '短期D型', kind: '短期', title: '1月出発 オセアニア3か月ターム留学',
      period: '留学期間の目安 [1月上・中旬〜4月上・中旬]',
      groups: {
        o: { color: 'orange', text: '学年成績は1学期・2学期・3学期出発までの積算（1学期と2学期が中心だが、3学期の登校している期間の取組みも含めて成績をつける）' },
        c: { color: 'cyan', text: '学年成績は1学期帰国後・2学期・3学期の積算（2学期と3学期が中心だが、1学期の登校している期間の取組みも含めて成績をつける）' },
      },
      rows: [
        r(0, 3, 'fin', 'dep', ['出発まで〇', '出発まで〇', X, XK1, DEPK, O, ''], 'o'),
        r(1, 1, 'mid', 'ret', ['帰国後〇', '帰国後〇', O, O, RETK, O, ''], 'c'),
        r(1, 1, 'fin', null, ALL, 'c'),
      ],
    },
    'S-E': {
      id: 'S-E', label: '短期E型', kind: '短期', title: '上記パターンに当てはまらない短期留学',
      period: '',
      groups: {},
      rows: [],
      note: '執行部・教務部・国際部で別途協議する。',
    },
  };

  const ORDER = ['L-A', 'L-B', 'S-A', 'S-B', 'S-C1', 'S-C2', 'S-D', 'S-E'];

  return { TYPES, ORDER };
});
