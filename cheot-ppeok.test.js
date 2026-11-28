// node cheot-ppeok.test.js
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
var a = html.indexOf('<script id="logic">'), b = html.indexOf('</script>', a);
var L = new Function(html.slice(a + '<script id="logic">'.length, b) + '\nreturn L;')();
function assert(c, m){ if (!c) throw new Error(m || 'fail'); }

var g = L.newGame(['준석','수현','세훈'], 100000, 2000);
g.players.forEach(function(p){ p.bal = 200000; p.invested = 100000; });

var a1 = L.pkMark(g, 0, 1);
assert(a1.chains.length===1 && a1.chains[0].cheot && a1.chains[0].name==='첫뻑' && a1.chains[0].level===1 && a1.chains[0].pts===3, '첫 + '+JSON.stringify(a1.chains));
assert(!g.pkPick[0], '첫뻑은 연뻑 칸에 없음');

var a2 = L.pkMark(g, 0, 1);
assert(a2.chains.length===2, '두 개 '+a2.chains.length);
assert(a2.chains[0].cheot && a2.chains[0].name==='첫뻑', '첫뻑 유지');
assert(a2.chains[1].level===1 && a2.chains[1].name==='1번째', '다음은 1번째이지 2연뻑 아님 '+JSON.stringify(a2.chains[1]));
assert(g.pkPick[0]===1, '일반 뻑 단계 '+g.pkPick[0]);

var a3 = L.pkMark(g, 0, 1);
assert(a3.chains[0].cheot && a3.chains[1].level===2 && a3.chains[1].name==='2연뻑', '1번째에서 +는 2연뻑 '+JSON.stringify(a3.chains));

L.pkMark(g, 0, -1);
assert(L.pkChains(g, 0)[1].level===1 && L.pkChains(g, 0)[0].cheot, '되돌리면 1번째');
L.pkMark(g, 0, -1);
assert(L.pkChains(g, 0).length===1 && L.pkChains(g, 0)[0].cheot, '첫뻑만 남음');
L.pkMark(g, 0, -1);
assert(!L.pkChains(g, 0).length, '전부 지움');

// 다시 첫뻑 + 1번째, 판돈보다 먼저 정산. 점당 2,000이면 각 3점 = 6,000원
L.pkMark(g, 0, 1);
L.pkMark(g, 0, 1);
var chains = L.pkChains(g, 0);
var ppeoks = chains.map(function(c){ return {idx:0, level:c.level, n:c.n, pts:c.pts, cheot:!!c.cheot}; });
var res = L.calcRound(g, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:ppeoks, seated:[0,1,2]});
var cheotPay = res.ppeok.filter(function(x){ return x.cheot; });
var firstPay = res.ppeok.filter(function(x){ return !x.cheot && x.level===1; });
assert(cheotPay.length===2 && cheotPay.every(function(x){ return x.pay===6000 && x.points===3; }), '첫뻑 6000 '+JSON.stringify(cheotPay));
assert(firstPay.length===2 && firstPay.every(function(x){ return x.pay===6000 && x.level===1; }), '1번째 6000');
assert(!res.ppeok.some(function(x){ return x.level===2; }), '2연뻑 없음');
var sum0 = g.players.reduce(function(s,p){ return s+p.bal; }, 0);
var copy = JSON.parse(JSON.stringify(g));
L.applyRound(copy, res);
assert(copy.players.reduce(function(s,p){ return s+p.bal; }, 0)===sum0, '합계 유지');
assert(copy.players.map(function(p){ return p.bal; }).join()==='218000,200000,182000', '반영 '+copy.players.map(function(p){ return p.bal; }).join());

console.log('ok', a2.chains.map(function(c){ return c.name+c.level; }).join(' → '), 'pays', cheotPay[0].pay, firstPay[0].pay);
