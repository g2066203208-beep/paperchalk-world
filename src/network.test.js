import test from "node:test";
import assert from "node:assert/strict";
import {InputMailbox,RoomNetwork} from "./network.js";
import {EventEmitter} from "node:events";

test("a hundred fast taps from one peer remain in exact input order",()=>{
 const mailbox=new InputMailbox();
 for(let seq=1;seq<=100;seq++){
   assert.equal(mailbox.push("peerA",{seq,action:{type:"station",station:seq%2?"counter":"window"}}),true);
 }
 const events=mailbox.drain();
 assert.equal(events.length,100);
 assert.deepEqual(events.map(e=>e.input.seq),Array.from({length:100},(_,i)=>i+1));
 assert.equal(events.at(-1).input.action.station,"window");
 assert.equal(mailbox.drain().length,0);
});
test("replayed, malformed, and forged actions never enter the authoritative queue",()=>{
 const mailbox=new InputMailbox();
 assert.equal(mailbox.push("peerA",{seq:1,action:{type:"inspect",station:"window"}}),true);
 assert.equal(mailbox.push("peerA",{seq:1,action:{type:"vote",choice:"welcome"}}),false);
 assert.equal(mailbox.push("peerA",{seq:0,action:{type:"vote",choice:"refuse"}}),false);
 assert.equal(mailbox.push("peerA",{seq:2,action:{type:"exec"}}),false);
 assert.equal(mailbox.push("peerA",{seq:2,action:{type:"pin",station:"window"}}),true);
 assert.equal(mailbox.push("peerB",{seq:1,action:{type:"inspect",station:"ledger"}}),true);
 assert.deepEqual(mailbox.drain().map(e=>[e.peerId,e.input.seq]),[["peerA",1],["peerA",2],["peerB",1]]);
});
test("bounded queue cannot be exhausted by a single misbehaving connection",()=>{
 const mailbox=new InputMailbox(10,4);
 for(let i=1;i<=4;i++)assert.equal(mailbox.push("A",{seq:i,action:{type:"ask"}}),true);
 assert.equal(mailbox.push("A",{seq:5,action:{type:"ask"}}),false);
 for(let i=1;i<=4;i++)assert.equal(mailbox.push("B",{seq:i,action:{type:"ask"}}),true);
 assert.equal(mailbox.drain().length,8);
 // A rejected event does not advance the replay guard, allowing a resubmit.
 assert.equal(mailbox.push("A",{seq:5,action:{type:"ask"}}),true);
 mailbox.forget("A");
 assert.equal(mailbox.drain().length,0);
 assert.equal(mailbox.push("A",{seq:1,action:{type:"ask"}}),true);
 mailbox.reset();
 assert.equal(mailbox.drain().length,0);
});

test("host accepts a join packet even if data arrives before its open callback",()=>{
 class FakeConn extends EventEmitter {
   constructor(peer){super();this.peer=peer;this.open=true;this.sent=[];}
   send(message){this.sent.push(structuredClone(message));}
   close(){this.emit("close");}
 }
 const state={players:{host:{role:"manager"}},revision:1};
 let leaves=0;
 const net=new RoomNetwork({
   join:(id,name)=>{state.players[id]={name,role:"clerk"};state.revision++;net.broadcast(state);return true;},
   leave:()=>{leaves++;}
 });
 net.host=true;net.room="ABCDEFGH";net.broadcast(state);
 const conn=new FakeConn("peer-one");
 net.accept(conn);
 // Deliberately do not emit "open": the first data packet must still work.
 conn.emit("data",{t:"join",name:"店员"});
 assert.equal(state.players["peer-one"].name,"店员");
 assert.ok(conn.sent.some(m=>m.t==="welcome"));
 const welcomeAt=conn.sent.findIndex(m=>m.t==="welcome");
 assert.equal(conn.sent[welcomeAt+1].t,"state","latest state follows welcome in-order");
 assert.equal(conn.sent[welcomeAt+1].state.players["peer-one"].role,"clerk");
 conn.emit("data",{t:"input",input:{seq:1,action:{type:"kiosk",operation:"window"}}});
 assert.equal(net.takeInputs()[0].input.action.operation,"window");
 conn.close();
 assert.equal(leaves,1);
});
test("rejected guest cannot cause a phantom leave or state replay",()=>{
 class FakeConn extends EventEmitter{
   constructor(){super();this.peer="bad";this.open=true;this.sent=[];}
   send(m){this.sent.push(m);}
   close(){this.emit("close");}
 }
 let leaves=0;
 const net=new RoomNetwork({join:()=>false,leave:()=>leaves++});
 net.host=true;net.room="ABCDEFGH";
 const conn=new FakeConn();net.accept(conn);
 conn.emit("data",{t:"join",name:"too-many"});
 assert.equal(conn.sent.at(-1).t,"reject");
 assert.equal(leaves,0);
});
