// node maximcap.test.js
// 판돈 맥심 = 내는 사람의 첫 충전 금액 (없으면 g.limit). 고박은 몫을 합친 뒤 그 한도.
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
var a = html.indexOf('<script id="logic">'), b = html.indexOf('</script>', a);
var L = new Function(html.slice(a + '<script id="logic">'.length, b) + '\nreturn L;')();
function assert(c, m){ if (!c) throw new Error(m); }
function won(n){ return (n<0?'-':'')+Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')+'원'; }

// 첫 충전 amt. 잔액은 따로 올려 한도와 잔액 한도를 구분한다.
function game(cap, bals){
  var g = L.newGame(['준석','수현','세훈'], cap, 2000);
  g.players.forEach(function(p, i){
    L.charge(g, i, i+1, cap);
    if (bals) p.bal = bals[i];
  });
  return g;
}
function gobak(g){
  return L.calcRound(g, 0, {score:14, go:0, bomb:1, losers:[{idx:1, pi:true, gobak:true},{idx:2, gwang:true}]});
}

var g100 = game(100000, [400000, 400000, 400000]);
var r100 = gobak(g100);
var payer = r100.lines.filter(function(x){ return x.idx===1; })[0];
var other = r100.lines.filter(function(x){ return x.idx===2; })[0];
assert(payer.share===112000 && other.share===112000, 'shares '+payer.share+'+'+other.share);
assert(payer.gobakSum===224000, 'sum '+payer.gobakSum);
assert(payer.maxim===true && payer.maximCap===100000 && payer.raw===100000 && payer.pay===100000, '100k cap '+payer.raw+'/'+payer.pay);
assert(other.raw===0 && other.pay===0, 'other pays 0');
assert(r100.total===100000, 'winner '+r100.total);
var before = g100.players.reduce(function(s,p){ return s+p.bal; }, 0);
var applied = JSON.parse(JSON.stringify(g100));
L.applyRound(applied, r100);
assert(applied.players.reduce(function(s,p){ return s+p.bal; }, 0)===before, 'sum conserved');
assert(applied.players.map(function(p){ return p.bal; }).join()==='500000,300000,400000', 'bals '+applied.players.map(function(p){ return p.bal; }).join());

var g50 = game(50000, [400000, 400000, 400000]);
var r50 = gobak(g50);
var p50 = r50.lines.filter(function(x){ return x.idx===1; })[0];
assert(p50.gobakSum===224000 && p50.maximCap===50000 && p50.raw===50000 && p50.pay===50000, '50k gobak '+p50.raw+'/'+p50.pay);
assert(r50.total===50000, '50k winner '+r50.total);

// 잔액이 맥심보다 적으면 잔액까지만
var glow = game(100000, [400000, 60000, 400000]);
var rlow = gobak(glow);
var plow = rlow.lines.filter(function(x){ return x.idx===1; })[0];
assert(plow.raw===100000 && plow.pay===60000 && plow.capped===true, 'balance cap '+plow.pay);

// 고박이 아니어도 한 사람 판돈은 자기 첫 충전까지만
var gEach = L.newGame(['준석','수현','세훈'], 100000, 2000);
L.charge(gEach, 0, 1, 100000);
L.charge(gEach, 1, 2, 50000);
L.charge(gEach, 2, 3, 100000);
gEach.players.forEach(function(p){ p.bal = 400000; });
var rEach = L.calcRound(gEach, 0, {score:14, go:0, bomb:1, losers:[{idx:1, pi:true},{idx:2, gwang:true}]});
var e1 = rEach.lines.filter(function(x){ return x.idx===1; })[0];
var e2 = rEach.lines.filter(function(x){ return x.idx===2; })[0];
assert(e1.raw===50000 && e1.pay===50000 && e1.maximCap===50000, 'first charge 5만 '+e1.raw);
assert(e2.raw===100000 && e2.pay===100000 && e2.maximCap===100000, 'first charge 10만 '+e2.raw);

// 첫 충전만. 나중에 더 넣어도 한도는 첫 금액
var gFirst = L.newGame(['준석','수현'], 100000, 2000);
L.charge(gFirst, 1, 1, 50000);
L.charge(gFirst, 1, 2, 50000);
gFirst.players.forEach(function(p){ p.bal = 400000; });
var rFirst = L.calcRound(gFirst, 0, {score:14, go:0, bomb:1, losers:[{idx:1, pi:true, gwang:true}]});
assert(rFirst.lines[0].maximCap===50000 && rFirst.lines[0].raw===50000, 'later charge ignored '+rFirst.lines[0].raw+' formula '+rFirst.lines[0].formula);

// 충전 기록 없으면 g.limit
var gLim = L.newGame(['준석','수현'], 50000, 2000);
gLim.players.forEach(function(p){ p.bal = 400000; p.invested = 50000; });
var rLim = L.calcRound(gLim, 0, {score:14, go:0, bomb:1, losers:[{idx:1, pi:true}]});
assert(rLim.lines[0].maximCap===50000 && rLim.lines[0].pay===50000, 'limit fallback '+rLim.lines[0].pay);

// 뻑은 맥심 밖, 그리고 판돈보다 먼저
var gPk = game(50000, [400000, 400000, 400000]);
var rPk = L.calcRound(gPk, 0, {score:14, go:0, bomb:1, losers:[{idx:1, pi:true, gobak:true},{idx:2, gwang:true}], ppeoks:[{idx:0, level:1, n:1, pts:60}], seated:[0,1,2]});
assert(rPk.ppeok.length===2 && rPk.ppeok.every(function(x){ return x.each===120000 && x.pay===120000; }), 'ppeok over cap '+rPk.ppeok.map(function(x){ return x.pay; }).join());
var pkPayer = rPk.lines.filter(function(x){ return x.idx===1; })[0];
assert(pkPayer.raw===50000 && pkPayer.pay===50000, 'score still charge cap after ppeok '+pkPayer.pay);

// 확인 문구에 쓰는 숫자
assert(won(payer.gobakSum)+' → 맥심 '+won(payer.raw)==='224,000원 → 맥심 100,000원', 'label 100k');
assert(won(p50.gobakSum)+' → 맥심 '+won(p50.raw)==='224,000원 → 맥심 50,000원', 'label 50k');

console.log('ok 10만 고박', payer.share+'+'+other.share+'='+payer.gobakSum+' → '+payer.pay, '잔액 6만이면', plow.pay);
console.log('ok 5만 고박', p50.gobakSum+' → '+p50.pay, '첫충전 다르면', e1.pay+'/'+e2.pay, '뻑', rPk.ppeok[0].pay);
