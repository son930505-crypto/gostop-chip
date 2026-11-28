// node cheot-ppeok.test.js
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
var a = html.indexOf('<script id="logic">'), b = html.indexOf('</script>', a);
var L = new Function(html.slice(a + '<script id="logic">'.length, b) + '\nreturn L;')();
function assert(c, m){ if (!c) throw new Error(m || 'fail'); }
function names(ch){ return ch.map(function(c){ return c.name+':'+c.pts+'점/단계'+c.level; }).join(' + '); }

var g = L.newGame(['준석','수현','세훈'], 100000, 2000);
g.players.forEach(function(p){ p.bal = 200000; p.invested = 100000; });

var a1 = L.pkMark(g, 0, 1);
assert(names(a1.chains)==='첫뻑:3점/단계1', '첫 + '+names(a1.chains));
var noYeon = L.pkYeon(g, 1, 1);
assert(!noYeon.ok, '첫뻑 전 연뻑은 거절 '+(noYeon.msg||''));

var a2 = L.pkMark(g, 0, 1);
assert(a2.chains.every(function(c){ return c.level===1; }), '두번째 +도 연뻑 아님 '+names(a2.chains));
assert(names(a2.chains)==='첫뻑:3점/단계1 + 1번째:3점/단계1', names(a2.chains));

var a3 = L.pkMark(g, 0, 1);
assert(a3.chains.every(function(c){ return c.level===1; }), '+만으로는 2연뻑이 안 됨 '+names(a3.chains));
assert(a3.chains[2].name==='2번째' && a3.chains[2].pts===0, '2번째는 배수 없음');

// 연뻑이 아닌 두 뻑 정산: 각 6,000원, 2연뻑 없음
L.pkMark(g, 0, -1);
var plain = L.pkChains(g, 0);
var resP = L.calcRound(g, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:plain.map(function(c){ return {idx:0, level:c.level, n:c.n, pts:c.pts, cheot:!!c.cheot}; }), seated:[0,1,2]});
assert(resP.ppeok.every(function(x){ return x.pay===6000 && x.level===1; }), '일반 뻑 6000');
assert(!resP.ppeok.some(function(x){ return x.level>1; }), '배수 없음');

// 첫뻑부터 연뻑: 버튼으로 2연뻑이면 6점 = 12,000원 한 번
var gy = L.newGame(['준석','수현','세훈'], 100000, 2000);
gy.players.forEach(function(p){ p.bal = 200000; p.invested = 100000; });
L.pkMark(gy, 0, 1);
var y2 = L.pkYeon(gy, 0, 1);
assert(y2.chains.length===1 && y2.chains[0].name==='2연뻑' && y2.chains[0].level===2 && y2.chains[0].pts===6, '2연뻑 '+names(y2.chains));
var resY = L.calcRound(gy, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:y2.chains.map(function(c){ return {idx:0, level:c.level, n:c.n, pts:c.pts}; }), seated:[0,1,2]});
assert(resY.ppeok.length===2 && resY.ppeok.every(function(x){ return x.pay===12000 && x.level===2; }), '연뻑 12000 '+resY.ppeok.map(function(x){ return x.pay; }));
var y3 = L.pkYeon(gy, 0, 1);
assert(y3.chains[0].name==='3연뻑' && y3.chains[0].pts===12, '3연뻑 '+names(y3.chains));
L.pkYeon(gy, 0, -1);
assert(L.pkChains(gy, 0)[0].name==='2연뻑', '연뻑 -');
L.pkYeon(gy, 0, -1);
assert(L.pkChains(gy, 0).every(function(c){ return c.level===1; }), '연뻑 끄면 일반 횟수');

console.log('ok plain', names(a2.chains), 'yeon', names(y2.chains), 'pay', resY.ppeok[0].pay);
