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

// 4명이고 죽음이 없으면 뻑은 안 되고 돈도 안 움직임
var g4 = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
g4.players.forEach(function(p,i){ L.charge(g4, i, i+1, 100000); });
var blocked4 = L.pkMark(g4, 0, 1);
assert(!blocked4.ok && blocked4.msg==='죽음을 선택 후 체크해주세요', blocked4.msg);
assert(g4.players.every(function(p){ return p.bal===100000; }), '돈 그대로');
g4.deadPick = {3:true};
var live1 = L.pkMark(g4, 0, 1);
assert(live1.ok && names(live1.chains)==='1뻑:3점/단계1', names(live1.chains));
assert(g4.players.map(function(p){ return p.bal; }).join()==='112000,94000,94000,100000', '실시간 '+g4.players.map(function(p){ return p.bal; }).join());
assert(g4.pkRec && g4.pkRec[0], '이미 정산 표시');
var again = L.calcRound(g4, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:[], seated:[0,1,2]});
var c4 = JSON.parse(JSON.stringify(g4));
L.applyRound(c4, again);
assert(c4.players.map(function(p){ return p.bal; }).join()==='106000,106000,88000,100000', '점수만 '+c4.players.map(function(p){ return p.bal; }).join());

// 잔액 1,000원이면 500원 단위로 1,000원만 (올인)
var poor = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
poor.players.forEach(function(p,i){ p.bal=100000; p.invested=100000; });
poor.players[1].bal = 1000;
poor.deadPick = {3:true};
L.pkMark(poor, 0, 1);
assert(poor.players[1].bal===0 && poor.players[2].bal===94000 && poor.players[0].bal===107000, '올인 '+poor.players.map(function(p){ return p.bal; }).join());
assert(!poor.owe, '0원에서 멈추면 장부 없음');

// - 와 무효는 돈을 되돌림
L.pkMark(g4, 0, -1);
assert(g4.players.map(function(p){ return p.bal; }).join()==='100000,100000,100000,100000', '취소 '+g4.players.map(function(p){ return p.bal; }).join());
L.pkMark(g4, 0, 1);
var beforeVoid = g4.players.map(function(p){ return p.bal; }).join();
assert(beforeVoid==='112000,94000,94000,100000', beforeVoid);
L.voidRound(g4, false);
assert(g4.players.map(function(p){ return p.bal; }).join()==='100000,100000,100000,100000', '무효 '+g4.players.map(function(p){ return p.bal; }).join());

// 광팔이만 있어도 쉬는 사람 1명 → 나머지 2명이 바로 냄
var gp = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
gp.players.forEach(function(p){ p.bal=100000; p.invested=100000; });
gp.gpPick = 3;
var gp1 = L.pkMark(gp, 0, 1);
assert(gp1.ok && gp.players.map(function(p){ return p.bal; }).join()==='112000,94000,94000,100000', '광팔이 '+gp.players.map(function(p){ return p.bal; }).join());

// 뻑이 있는 동안 유일한 죽음을 풀면 돈이 그대로고, 거절 문구가 남음
var keep = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
keep.players.forEach(function(p){ p.bal=100000; p.invested=100000; });
keep.deadPick = {3:true};
L.pkMark(keep, 0, 1);
var off = L.setDead(keep, 3, false);
assert(!off.ok && off.msg.indexOf('뻑을 먼저')>=0, off.msg);
assert(keep.players.map(function(p){ return p.bal; }).join()==='112000,94000,94000,100000', '유지');

console.log('ok', names(s1.chains), '→', names(s2.chains), '→', names(s3.chains), 'win', win.total, 'live', live1.rec && live1.rec.total);
