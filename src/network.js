// WebRTC rooms. GitHub Pages serves the client; PeerJS cloud only signals peers.
// The room creator simulates the authoritative world and sends snapshots.
const PREFIX="lampkeep-";

/**
 * Host-authoritative ordered input mailbox. Using a latest-value Map silently
 * discarded rapid taps when several messages arrived between simulation ticks.
 * We retain each action in arrival order, reject replayed sequence numbers, and
 * place hard bounds on malicious peers to protect the mobile host.
 */
export class InputMailbox {
  constructor(limit=512, perPeer=128) {
    this.limit=limit;
    this.perPeer=perPeer;
    this.events=[];
    this.lastSeq=new Map();
  }
  push(peerId, input) {
    const seq=input?.seq;
    const type=input?.action?.type;
    if(typeof peerId!=="string"||!peerId||
       !Number.isSafeInteger(seq)||seq<=0||
       typeof type!=="string"||!["station","inspect","pin","ask","vote","take","return","scan","kiosk"].includes(type)) return false;
    if(seq<=(this.lastSeq.get(peerId)||0)) return false;
    if(this.events.length>=this.limit) return false;
    if(this.events.filter(e=>e.peerId===peerId).length>=this.perPeer) return false;
    this.events.push({peerId,input:{seq,action:{
      type,
      ...(typeof input.action.station==="string"?{station:input.action.station.slice(0,20)}:{}),
      ...(typeof input.action.choice==="string"?{choice:input.action.choice.slice(0,20)}:{}),
      ...(typeof input.action.sku==="string"?{sku:input.action.sku.slice(0,20)}:{}),
      ...(typeof input.action.operation==="string"?{operation:input.action.operation.slice(0,20)}:{}),
      ...(typeof input.action.key==="string"?{key:input.action.key.slice(0,24)}:{})
    }}});
    this.lastSeq.set(peerId,seq);
    return true;
  }
  drain(){
    const actions=this.events;
    this.events=[];
    return actions;
  }
  forget(peerId){
    this.events=this.events.filter(e=>e.peerId!==peerId);
    this.lastSeq.delete(peerId);
  }
  reset(){this.events=[];this.lastSeq.clear();}
}
export class RoomNetwork{
  constructor(callbacks={}){
    this.cb=callbacks;this.peer=null;this.host=false;this.room="";this.id="";this.conn=null;this.connections=new Map();this.inbox=new InputMailbox();this.ready=false;this.lastState=null;
  }
  status(text){this.cb.status?.(text);}
  clean(){this.ready=false;this.connections.forEach(c=>{try{c.close();}catch{}});this.connections.clear();this.inbox.reset();this.lastState=null;try{this.conn?.close();}catch{}try{this.peer?.destroy();}catch{}this.peer=null;this.conn=null;}
  ensurePeer(){if(typeof window.Peer!=="function")throw Error("联机组件未加载，请检查网络或刷新页面");}
  async create(){
    this.clean();this.ensurePeer();this.host=true;
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let room="";const bytes=crypto.getRandomValues(new Uint8Array(8));
    for(const v of bytes)room+=alphabet[v%alphabet.length];
    this.room=room;this.status("正在创建 WebRTC 房间…");
    return new Promise((resolve,reject)=>{
      const peer=this.peer=new window.Peer(PREFIX+room,{debug:0,...(window.CRYPTBOUND_PEER_OPTIONS||{})});
      let settled=false;
      peer.on("open",id=>{if(settled)return;settled=true;this.id=id;this.ready=true;this.status("房间已创建，等待队友加入");peer.on("connection",c=>this.accept(c));resolve(room);});
      peer.on("error",e=>{this.status("联机异常："+e.type);if(!settled){settled=true;this.clean();reject(e);}});
      peer.on("disconnected",()=>this.status("信令连接暂断；已连接队友可能仍能游玩"));
      peer.on("close",()=>{this.ready=false;this.status("房间已关闭");});
    });
  }
  accept(conn){
    if(!this.host||this.connections.size>=3){
      conn.on("open",()=>{conn.send({t:"reject",reason:"房间已满（最多4人）"});setTimeout(()=>conn.close(),300);});
      return;
    }
    this.connections.set(conn.peer,conn);
    let joined=false;
    // Install the data listener immediately, not inside conn.on("open").
    // The remote side can send its first "join" packet before our open
    // callback fires; that race previously stranded a connected clerk.
    conn.on("data",data=>{
      if(!data||typeof data!=="object")return;
      if(data.t==="join"&&!joined){
        joined=true;const name=String(data.name||"旅人").slice(0,14);
        const permitted=this.cb.join?.(conn.peer,name);
        if(permitted===false){conn.send({t:"reject",reason:"房间已满"});conn.close();return;}
        // The host callback has already applied the join and broadcast a
        // snapshot. Send welcome *before* an explicit latest-state replay:
        // guest ignores state packets until welcome sets ready=true.
        conn.send({t:"welcome",id:conn.peer,room:this.room});
        if(this.lastState)conn.send({t:"state",state:this.lastState});
        this.cb.roster?.();
      }else if(data.t==="input"&&joined){
        if(!this.inbox.push(conn.peer,data.input))
          conn.send({t:"input-rejected",reason:"操作过快或操作序号无效"});
      }
    });
    conn.on("close",()=>{
      this.connections.delete(conn.peer);this.inbox.forget(conn.peer);
      if(joined)this.cb.leave?.(conn.peer);this.cb.roster?.();
    });
    conn.on("error",()=>{});
  }
  async join(code,name){
    this.clean();this.ensurePeer();this.host=false;
    this.room=String(code).trim().toUpperCase().replace(/[^A-Z2-9]/g,"");
    if(this.room.length!==8)throw Error("请输入8位房间码");
    this.status("正在连接房主…");
    return new Promise((resolve,reject)=>{
      let settled=false;
      const fail=e=>{if(!settled){settled=true;this.clean();reject(e instanceof Error?e:new Error(String(e)));}};
      const peer=this.peer=new window.Peer(undefined,{debug:0,...(window.CRYPTBOUND_PEER_OPTIONS||{})});
      peer.on("open",id=>{
        this.id=id;
        const conn=this.conn=peer.connect(PREFIX+this.room,{reliable:true});
        conn.on("open",()=>conn.send({t:"join",name:String(name||"旅人").slice(0,14)}));
        conn.on("data",data=>{
          if(!data||typeof data!=="object")return;
          if(data.t==="reject"){fail(Error(data.reason||"房间拒绝加入"));return;}
          if(data.t==="welcome"){
            this.ready=true;this.status("已联机 · 房主负责模拟");if(!settled){settled=true;resolve(data);}
          }else if(data.t==="state"&&this.ready){this.cb.state?.(data.state);}
          else if(data.t==="input-rejected"){this.cb.rejected?.(data.reason||"输入没有被接受");}
        });
        conn.on("close",()=>{this.ready=false;this.status("与房主断开连接");this.cb.disconnected?.();if(!settled)fail(Error("房间不存在或连接失败"));});
        conn.on("error",e=>{this.status("连接失败："+e.type);if(!settled)fail(e);});
      });
      peer.on("error",e=>{this.status("信令连接失败："+e.type);if(!settled)fail(e);});
      peer.on("disconnected",()=>this.status("信令暂时断开"));
    });
  }
  sendInput(input){if(this.conn?.open&&this.ready){this.conn.send({t:"input",input});return true;}return false;}
  takeInputs(){return this.inbox.drain();}
  broadcast(game){
    if(!this.host)return;
    this.lastState=game;
    const packet={t:"state",state:game};
    for(const conn of this.connections.values())if(conn.open)conn.send(packet);
  }
}
