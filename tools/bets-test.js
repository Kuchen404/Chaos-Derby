// Prüft die Wettlogik ohne Browser: Kasse, Einsätze, Abrechnung. Aufruf: node tools/bets-test.js
const B=require('../js/bets.js'),assert=require('assert');
const Q={win:[2.7,4.4,7,14.9,4.9,6.1],place:[1.3,1.9,3.2,4.4,2.8,5.6],ex:new Array(36).fill(10)};
const bk=B.newBook();
assert.equal(B.addPlayer(bk,'Anna'),'');assert.ok(B.addPlayer(bk,' anna '),'doppelter Name');assert.ok(B.addPlayer(bk,'  '),'leerer Name');
assert.equal(B.placeBet(bk,Q,{p:0,type:'win',a:1,stake:'20'}),'');
assert.equal(B.placeBet(bk,Q,{p:0,type:'place',a:4,stake:30}),'');
assert.equal(B.placeBet(bk,Q,{p:0,type:'exacta',a:1,b:4,stake:10}),'');
assert.ok(B.placeBet(bk,Q,{p:0,type:'exacta',a:2,b:2,stake:1}),'Zweierwette mit gleichem Starter');
assert.ok(B.placeBet(bk,Q,{p:0,type:'win',a:0,stake:41}),'Einsatz über Kasse');
assert.ok(B.placeBet(bk,Q,{p:0,type:'win',a:0,stake:0}),'Einsatz 0');
assert.equal(bk.players[0].cash,40);
const r=B.settle(bk,[1,4,0,2,3,5]);
assert.deepEqual(r.map(x=>x.win),[88,84,100]);assert.equal(bk.players[0].cash,312);assert.equal(bk.slips.length,0);
B.placeBet(bk,Q,{p:0,type:'win',a:0,stake:12});B.cancelBet(bk,0);assert.equal(bk.players[0].cash,312);
assert.equal(B.settle(bk,[0,1,2,3,4,5]).length,0);
console.log('Wettlogik ok');
