// node unit500.test.js
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
var a = html.indexOf('<script id="logic">'), b = html.indexOf('</script>', a);
var L = new Function(html.slice(a + '<script id="logic">'.length, b) + '\nreturn L;')();
function assert(c, m){ if (!c) throw new Error(m || 'fail'); }
function sum(g){ return g.players.reduce(function(s,p){ return s+p.bal; }, 0); }
function multiples(arr){ return arr.every(function(n){ return n%500===0; }); }

// JB: 잔액 1,000원, 벌금 500원×3. 장부는 1원(167)이 아니라 500원 단위.
// 가진 1,000원으로 앞 두 명을 내고, 0원 아래로 나간 500원은 마지막 사람 장부에만 500원.
var g = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
g.players.forEach(function(p,i){ L.charge(g, i, i+1, 100000); });
g.players[0].bal -= 99000; g.players[1].bal += 99000; // 준석 1,000. 합계 그대로
assert(g.players[0].bal===1000, 'start '+g.players[0].bal);
var before = sum(g);
var fine = L.fine(g, 0, 'fine');
assert(fine.to.map(function(x){ return x.pay; }).join()==='500,500,500', 'pays '+fine.to.map(function(x){ return x.pay; }));
assert(g.players[0].bal===-500, 'bal '+g.players[0].bal);
var owe = g.owe[0];
assert(owe[3]===500 && !owe[1] && !owe[2], 'ledger '+JSON.stringify(owe));
assert(sum(g)===before, 'fine sum');
var s = L.settle(g);
assert(s.sumNet===0, 'sumNet '+s.sumNet);
var cuts = {}; (s.rows[0].cutTo||[]).forEach(function(c){ cuts[c.i]=(cuts[c.i]||0)+c.amt; });
assert(cuts[3]===500 && !cuts[1] && !cuts[2], 'settle cut '+JSON.stringify(cuts));
assert(s.rows.every(function(r){ return r.net%500===0; }) && s.transfers.every(function(t){ return t.amt%500===0; }), 'settle units');

// 잔액 0이면 세 명 모두 장부 500원 (각 지급액 그대로)
var z = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
z.players.forEach(function(p,i){ p.bal = i===0 ? 0 : 100000; p.invested = 100000; });
z.neg = {0:true};
L.fine(z, 0, 'fine');
assert(JSON.stringify(z.owe[0])==='{"1":500,"2":500,"3":500}', 'zero ledger '+JSON.stringify(z.owe[0]));

// 부족분이 500으로 안 떨어지면 500원으로 맞춘 뒤에도 손익 합은 0
var odd = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
odd.players.forEach(function(p,i){ p.bal = [279001,-3501,18000,106500][i]; p.invested = 100000; });
odd.owe = {1:{0:2000,2:2000,3:2000}};
var so = L.settle(odd);
assert(so.rows[1].short===3500, 'short rounded '+so.rows[1].short);
var oc = {}; (so.rows[1].cutTo||[]).forEach(function(c){ oc[c.i]=(oc[c.i]||0)+c.amt; });
assert(oc[0]===1500 && oc[2]===1000 && oc[3]===1000, '3501 cuts '+JSON.stringify(oc));
assert(so.sumNet===0, 'odd sum '+so.sumNet);
assert(so.rows.every(function(r){ return r.net%500===0 && r.bal%500===0; }), 'aligned');

// 잔액이 500 단위가 아니면 판돈·뻑은 500원까지만
var cap = L.newGame(['준석','수현'], 100000, 2000);
cap.players.forEach(function(p){ p.bal = 400000; p.invested = 100000; });
cap.players[1].bal = 2300;
var rs = L.calcRound(cap, 0, {score:7, go:0, losers:[{idx:1}]});
assert(rs.lines[0].pay===2000, 'score cap '+rs.lines[0].pay);
cap.players[1].bal = 1200;
var rp = L.calcRound(cap, 0, {score:3, go:0, losers:[{idx:1}], ppeoks:[{idx:0, level:1, n:1, pts:3}]});
assert(rp.ppeok[0].pay===1000 && rp.ppeok[0].each===6000, 'ppeok cap '+rp.ppeok[0].pay);
assert(rp.lines[0].pay % 500 === 0, 'score after ppeok '+rp.lines[0].pay);

// 이벤트·점당: 1,500원 게임의 2배는 3,000원. 잔액 1,400원이면 1,000원만
var evg = L.newGame(['준석','수현'], 100000, 1500);
evg.players.forEach(function(p){ p.bal = 100000; });
evg.players[1].bal = 1400;
var ev = L.eventApply(evg, 0, L.EVENTS.filter(function(e){ return e.id==='must2'; })[0], 1, {});
assert(ev.each===3000 && ev.to[0].pay===1000, 'event '+ev.each+'/'+ev.to[0].pay);
assert(L.tiersOf(evg).every(function(t){ return t.ppp%500===0; }), 'tiers '+JSON.stringify(L.tiersOf(evg)));
var oddTier = L.newGame(['준석'], 100000, 2000); oddTier.tiers = [{min:30, ppp:1300},{min:90, ppp:1700},{min:null, ppp:2200}];
assert(L.tiersOf(oddTier).map(function(t){ return t.ppp; }).join()==='1500,1500,2000', JSON.stringify(L.tiersOf(oddTier)));

// 관리자 충전 일부 취소는 500원만
var cg = L.newGame(['준석','수현'], 100000, 2000);
var ch = L.charge(cg, 0, 1, 10000);
cg.players[0].bal = 2300; cg.admin = true;
assert(L.undoCharge(cg, ch.id)===true, 'undo');
assert(cg.players[0].bal===300 && cg.players[0].invested===8000, 'left '+cg.players[0].bal+' inv '+cg.players[0].invested);
assert((10000-cg.chg[0].amt)%500===0, 'taken '+cg.chg[0].amt);

// 고박·맥심은 그대로
var gb = L.newGame(['1번','2번','3번'], 100000, 2000);
gb.players.forEach(function(p,i){ L.charge(gb, i, i+1, 100000); p.bal = 400000; });
var rg = L.calcRound(gb, 0, {score:3, go:0, losers:[{idx:1, pi:true},{idx:2, gobak:true}]});
assert(rg.total===18000, 'gobak '+rg.total);
var big = L.calcRound(gb, 0, {score:14, go:0, bomb:1, losers:[{idx:1, pi:true, gobak:true},{idx:2, gwang:true}]});
assert(big.total===100000, 'maxim '+big.total);

console.log('ok ledger', JSON.stringify(owe), 'cut', JSON.stringify(cuts), '3501', JSON.stringify(oc), 'gobak', rg.total, 'event', ev.to[0].pay);
