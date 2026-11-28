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
assert(L.totalCounts(g4, 0).pk===1, '카드 뻑 횟수 '+L.totalCounts(g4, 0).pk);
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

function bals(x){ return x.players.map(function(p){ return p.bal; }).join(); }
function chipSum(x){ return x.players.reduce(function(s,p){ return s+p.bal; }, 0); }
function table(ppp){
  var x = L.newGame(['준석','수현','세훈','미경'], 100000, ppp||2000);
  x.players.forEach(function(p,i){ L.charge(x, i, i+1, 100000); });
  x.deadPick = {3:true};
  return x;
}
// 화면 curRes와 같음: 이미 실시간 정산된 뻑은 점수 계산에 다시 넣지 않음
function uiPpeoks(x, winner, losers){
  var who = [winner].concat(losers);
  return [].concat.apply([], who.filter(function(i){
    return L.pkChains(x, i).length && !L.pkFind(x, (x.pkRec||{})[i]);
  }).map(function(i){ return L.pkChains(x, i).map(function(c){ return {idx:i, level:c.level, n:c.n, pts:c.pts}; }); }));
}

// 1) 점수 반영 때 뻑은 한 번 더 안 빠짐. 화면이 넘기는 뻑 목록은 비어 있음
var once = table();
var snapOnce = bals(once);
L.pkMark(once, 0, 1);
assert(uiPpeoks(once, 1, [0, 2]).length===0, '화면 뻑 목록 비음');
var score = L.calcRound(once, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:uiPpeoks(once, 1, [0, 2]), seated:[0,1,2]});
assert(!score.ppeok.length && score.lines.every(function(x){ return x.pay===6000; }) && score.total===12000, '점수만 6000');
var once2 = JSON.parse(JSON.stringify(once));
L.applyRound(once2, score);
assert(bals(once2)==='106000,106000,88000,100000', '이중없음 '+bals(once2));
assert(chipSum(once2)===400000, '합계');
assert(once2.players[0].bal===112000-6000, '준석 뻑 12,000은 유지되고 점수 6,000만');

// 2) 무효·−·스냅샷(헤더 되돌리기)은 실시간 이체를 전부 되돌림
var back = table();
var before = JSON.parse(JSON.stringify(back));
L.pkMark(back, 0, 1);
assert(bals(back)!==snapOnce);
var restored = JSON.parse(JSON.stringify(before));
assert(bals(restored)==='100000,100000,100000,100000' && !(restored.pks||[]).length, '스냅샷 되돌리기');
L.pkMark(back, 0, -1);
assert(bals(back)==='100000,100000,100000,100000' && !(back.pks||[]).some(function(r){ return r.src==='live'; }), '− 되돌리기');
L.pkMark(back, 0, 1);
L.pkYeon(back, 0, 1);
assert(bals(back)==='124000,88000,88000,100000', '2연뻑 '+bals(back));
L.voidRound(back, false);
assert(bals(back)==='100000,100000,100000,100000' && !(back.pks||[]).length, '무효 '+bals(back));

// 받은 돈을 이미 쓰면 −와 무효 모두 막고, 잔액은 0원 아래로 내려가지 않음. 칩 합계도 그대로
var spent = table();
L.pkMark(spent, 0, 1);
spent.players[0].bal = 0;
var sumSpent = chipSum(spent), roundSpent = spent.round, balSpent = bals(spent);
var minusSpent = L.pkMark(spent, 0, -1);
assert(!minusSpent.ok, '쓴 돈 − 거절');
var voidSpent = L.voidRound(spent, false);
assert(voidSpent && voidSpent.ok===false && voidSpent.msg.indexOf('이미 써서')>=0, voidSpent && voidSpent.msg);
assert(bals(spent)===balSpent && chipSum(spent)===sumSpent && spent.round===roundSpent, '무효 거부 '+bals(spent));
assert(spent.players.every(function(p){ return p.bal>=0; }), '마이너스 없음');
assert((spent.pks||[]).some(function(r){ return r.src==='live'; }), '뻑 기록 유지');
// 받은 돈이 잔액에 있으면 무효는 전부 되돌리고 합계는 같음
var whole = table();
L.pkMark(whole, 0, 1);
var sumWhole = chipSum(whole);
var voidOk = L.voidRound(whole, false);
assert(voidOk.ok && bals(whole)==='100000,100000,100000,100000' && chipSum(whole)===sumWhole, '전액 환불 '+bals(whole));
assert(whole.players.every(function(p){ return p.bal>=0; }), '환불 후 마이너스 없음');

var ui = html.split('function pkMarkUI')[1].split('function ppeokBox')[0];
assert(ui.indexOf('snap()')>=0 && ui.indexOf('snap()')<ui.indexOf('L.pkMark'), '뻑 체크 전에 스냅샷');
assert(ui.indexOf('prev=oldPrev')>=0, '실패한 체크는 되돌리기 대상을 안 바꿈');
var yeonUi = html.split('function pkYeonUI')[1].split('function renderChg')[0];
assert(yeonUi.indexOf('snap()')>=0 && yeonUi.indexOf('snap()')<yeonUi.indexOf('L.pkYeon'), '연뻑도 스냅샷');
var voidUi = html.split('function renderVoid')[1].split('function voidGo')[0];
assert(voidUi.indexOf('이미 보유머니에서 빠진 뻑 돈은 무효하면 돌려줘요')>=0, '무효 문구');
assert(voidUi.indexOf('id="voidppeok"')>=0, '무효 문구 위치');

// 3) 올인·500원·빚 장부. 뻑은 0원에서 멈추고 장부를 새로 만들지 않음
var unit = L.newGame(['준석','수현','세훈','미경'], 100000, 1500);
unit.players.forEach(function(p,i){ L.charge(unit, i, i+1, 100000); });
unit.deadPick = {3:true};
L.pkMark(unit, 0, 1);
assert(bals(unit)==='109000,95500,95500,100000', '1500원 '+bals(unit));
assert([109000,95500,95500,100000].every(function(n){ return n%500===0; }), '500 단위');
L.pkMark(unit, 0, -1);
unit.players[1].bal = 2300;
L.pkMark(unit, 0, 1);
assert(bals(unit)==='106500,300,95500,100000', '2300은 2000만, 300 남음 '+bals(unit));
assert(!unit.owe, '올인도 장부 없음');

var debt = table();
debt.players[2].bal = 1000;
var fineRec = L.fine(debt, 2);
assert(fineRec && debt.owe && debt.players[2].bal===-500, '벌금 장부');
var oweBefore = JSON.stringify(debt.owe);
debt.deadPick = {3:true};
var debtBefore = debt.players.map(function(p){ return p.bal; });
L.pkMark(debt, 0, 1);
assert(JSON.stringify(debt.owe)===oweBefore, '뻑이 벌금 장부를 안 바꿈');
assert(debt.players[2].bal===debtBefore[2] && debt.players[1].bal===debtBefore[1]-6000 && debt.players[0].bal===debtBefore[0]+6000, '0원 이하는 뻑을 더 안 냄 '+bals(debt));
L.pkMark(debt, 0, -1);
assert(JSON.stringify(debt.owe)===oweBefore && bals(debt)===debtBefore.join(), '− 후에도 장부·잔액 유지 '+bals(debt));

// 4) 충전 한도(맥심)는 점수에만. 뻑은 한도 밖이라 한도를 깎지 않음
var capg = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
[0,1,2,3].forEach(function(i){ L.charge(capg, i, i+1, 50000); L.charge(capg, i, 10+i, 10000); });
capg.deadPick = {3:true};
L.pkMark(capg, 0, 1);
assert(bals(capg)==='72000,54000,54000,60000', '뻑 후 '+bals(capg));
var big = L.calcRound(capg, 1, {score:40, go:0, losers:[{idx:0},{idx:2}], ppeoks:[], seated:[0,1,2]});
assert(big.lines[1].raw===50000 && big.lines[1].maxim && big.lines[1].maximCap===50000 && big.lines[1].pay===50000, '한도는 5만, 뻑 6천을 빼지 않음 '+big.lines[1].pay);
var cap2 = JSON.parse(JSON.stringify(capg));
L.applyRound(cap2, big);
assert(bals(cap2)==='22000,154000,4000,60000', '한도 반영 '+bals(cap2));
assert(chipSum(cap2)===chipSum(capg), '한도 합계');

// 5) 최종3뻑 5점: 체크 때 각 10,000. 판 반영은 그 돈을 다시 안 움직임
var fin = table();
L.pkMark(fin, 0, 1); L.pkMark(fin, 0, 1);
assert(bals(fin)==='112000,94000,94000,100000', '2뻑은 돈 그대로');
L.pkMark(fin, 0, 1);
assert(bals(fin)==='120000,90000,90000,100000', '최종3 '+bals(fin));
var finRes = L.calcRound(fin, 0, {chongtong:true, ppeokNWin:true, losers:[{idx:1},{idx:2}]});
assert(finRes.total===20000 && finRes.lines.every(function(x){ return x.pay===10000 && x.score===5; }), '화면 숫자 20000');
var finBal = bals(fin);
var finCopy = JSON.parse(JSON.stringify(fin));
L.applyRound(finCopy, finRes);
assert(bals(finCopy)===finBal, '반영 이동 0');
var finHand = L.finishHand(finCopy, {before:fin.players.map(function(p){ return p.bal; })});
assert(finHand.nets.map(function(x){ return x.amt; }).join()==='20000,-10000,-10000,0', '전판 최종3 '+finHand.nets.map(function(x){ return x.amt; }).join());

// 6) 전판: 손 시작 스냅샷이 있으면 뻑+점수가 한 번씩. 무효면 뻑은 0
var hand = table();
hand.handMark = {bal:hand.players.map(function(p){ return p.bal; }), chg:(hand.chg||[]).reduce(function(m,c){ return Math.max(m, c.id||0); }, 0)};
L.pkMark(hand, 0, 1);
var handRes = L.calcRound(hand, 1, {score:3, go:0, losers:[{idx:0},{idx:2}], ppeoks:[], seated:[0,1,2]});
L.applyRound(hand, handRes);
var shown = L.finishHand(hand, {});
assert(shown.nets.map(function(x){ return x.amt; }).join()==='6000,6000,-12000,0', '전판 '+shown.nets.map(function(x){ return x.amt; }).join());
var mid = table();
var prevHand = L.finishHand(mid, {});
L.pkMark(mid, 0, 1);
assert(L.lastHandNets(mid).map(function(x){ return x.amt; }).join()===prevHand.nets.map(function(x){ return x.amt; }).join(), '체크 직후 전판은 아직 이전 판');
L.voidRound(mid, false);
var voidHand = L.finishHand(mid, {});
assert(voidHand.nets.every(function(x){ return x.amt===0; }), '무효 전판 0 '+voidHand.nets.map(function(x){ return x.amt; }).join());

console.log('ok', names(s1.chains), '→', names(s2.chains), '→', names(s3.chains), 'win', win.total, 'live', live1.rec && live1.rec.total);
console.log('settle', bals(once2), 'cap', bals(cap2), 'final3', bals(fin), 'jeonpan', shown.nets.map(function(x){ return x.amt; }).join());
