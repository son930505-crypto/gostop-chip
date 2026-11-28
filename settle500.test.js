// node settle500.test.js
var fs = require('fs');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
var a = html.indexOf('<script id="logic">'), b = html.indexOf('</script>', a);
var L = new Function(html.slice(a + '<script id="logic">'.length, b) + '\nreturn L;')();
function assert(c, m){ if (!c) throw new Error(m); }
function game(bals, owe){
  var g = L.newGame(['준석','수현','세훈','미경'], 100000, 2000);
  g.players.forEach(function(p, i){ p.bal = bals[i]; p.invested = 100000; p.charges = 1; });
  if (owe) g.owe = owe;
  return g;
}
var eq = L.settle(game([279000, -3500, 18000, 106500], {1:{0:2000, 2:2000, 3:2000}}));
assert(eq.rows[1].short === 3500, 'short '+eq.rows[1].short);
var cuts = {}; (eq.rows[1].cutTo||[]).forEach(function(c){ cuts[c.i] = (cuts[c.i]||0)+c.amt; });
assert(cuts[0]===1500 && cuts[2]===1000 && cuts[3]===1000, '3500 cuts '+JSON.stringify(cuts));
assert(eq.rows.map(function(r){ return r.net; }).join() === '177500,-100000,-83000,5500', 'nets '+eq.rows.map(function(r){ return r.net; }));
assert(eq.sumNet === 0, 'sum '+eq.sumNet);
eq.transfers.forEach(function(t){ assert(t.amt % 500 === 0, 'transfer '+t.amt); });
var prev = L.settle(game([200000, -3000, 50000, 153000], {1:{0:1000, 2:1000, 3:1000}}));
var pc = {}; (prev.rows[1].cutTo||[]).forEach(function(c){ pc[c.i]=(pc[c.i]||0)+c.amt; });
assert(pc[0]===1000 && pc[2]===1000 && pc[3]===1000, '3000 cuts '+JSON.stringify(pc));
assert(prev.sumNet === 0, 'prev sum');
console.log('ok', JSON.stringify(cuts), eq.rows.map(function(r){ return r.name+' '+r.net; }).join(' / '), 'transfers', eq.transfers.map(function(t){ return eq.rows[t.from].name+'→'+eq.rows[t.to].name+' '+t.amt; }).join(', '));
