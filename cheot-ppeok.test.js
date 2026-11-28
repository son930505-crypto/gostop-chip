// node cheot-ppeok.test.js
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
var a = html.indexOf('<script id="logic">'), b = html.indexOf('</script>', a);
var L = new Function(html.slice(a + '<script id="logic">'.length, b) + '\nreturn L;')();
function assert(c, m){ if (!c) throw new Error(m || 'fail'); }
function names(ch){ return ch.map(function(c){ return c.name+':'+c.pts+'점/단계'+c.level; }).join(' + '); }
function fresh(){
  var g = L.newGame(['준석','수현','세훈'], 100000, 2000);
  g.players.forEach(function(p){ p.bal = 200000; p.invested = 100000; });
  return g;
}

var g = fresh();
var s1 = L.pkMark(g, 0, 1);
assert(names(s1.chains)==='1뻑:3점/단계1', '1뻑 '+names(s1.chains));
var s2 = L.pkMark(g, 0, 1);
assert(s2.chains.every(function(c){ return c.level===1; }) && names(s2.chains)==='1뻑:3점/단계1 + 2뻑:0점/단계1', '2뻑 '+names(s2.chains));
assert(!(g.pkYeon||{})[0], '2뻑에서 연뻑 꺼짐');
var s3 = L.pkMark(g, 0, 1);
assert(s3.chains.length===1 && s3.chains[0].final && s3.chains[0].name==='최종3뻑' && s3.chains[0].pts===5 && s3.chains[0].level===1, '3번째 '+names(s3.chains));
assert(!(g.pkYeon||{})[0], '최종3뻑은 연뻑 아님');
var blocked = L.pkYeon(g, 0, 1);
assert(!blocked.ok, '최종3뻑에서 연뻑 버튼 거절');

var win = L.calcRound(g, 0, {chongtong:true, ppeokNWin:true, losers:[{idx:1},{idx:2}]});
assert(win.ppeokNWin && (!win.ppeok || !win.ppeok.length), '최종3뻑은 곁가지 뻑 없음');
assert(win.lines.length===2 && win.lines.every(function(x){ return x.score===5 && x.pay===10000 && x.level!==2; }), '각 10000 '+win.lines.map(function(x){ return x.pay; }).join());
assert(win.total===20000, '승자 '+win.total);
var sum0 = g.players.reduce(function(s,p){ return s+p.bal; }, 0);
var copy = JSON.parse(JSON.stringify(g));
L.applyRound(copy, win);
assert(copy.players.map(function(p){ return p.bal; }).join()==='220000,190000,190000', '반영 '+copy.players.map(function(p){ return p.bal; }).join());
assert(copy.players.reduce(function(s,p){ return s+p.bal; }, 0)===sum0, '합계');

var gy = fresh();
L.pkMark(gy, 0, 1);
var y = L.pkYeon(gy, 0, 1);
assert(y.chains.length===1 && y.chains[0].name==='2연뻑' && y.chains[0].level===2 && y.chains[0].pts===6, '연뻑 '+names(y.chains));
var resY = L.calcRound(gy, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:y.chains.map(function(c){ return {idx:0, level:c.level, n:c.n, pts:c.pts}; }), seated:[0,1,2]});
assert(resY.ppeok.length===2 && resY.ppeok.every(function(x){ return x.pay===12000 && x.level===2; }), '2연뻑 12000');

console.log('ok', names(s1.chains), '→', names(s2.chains), '→', names(s3.chains), 'win', win.total);
