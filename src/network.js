// WebRTC rooms. GitHub Pages serves the client; PeerJS cloud only signals peers.
// The room creator simulates the authoritative world and sends snapshots.
const PREFIX="cryptbound-";
export class RoomNetwork{
  constructor(callbacks={}){
    this.cb=callbacks;this.peer=null;this.host=false;this.room="";this.id="";this.conn=null;this.connections=new Map();this.inputs=new Map();this.ready=false;
  }
  status(text){this.cb.status?.(text);}
  clean(){this.ready=false;this.connections.forEach(c=>{try{c.close();}catch{}});this.connections.clear();this.inputs.clear();try{this.conn?.close();}catch{}try{this.peer?.destroy();}catch{}this.peer=null;this.conn=null;}
  ensurePeer(){if(typeof window.Peer!=="function")throw Error("联机组件未加载，请检查网络或刷新页面");}
  async create(){
    this.clean();this.ensurePeer();this.host=true;
    const alphabet="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let room="";const bytes=crypto.getRandomValues(new Uint8Array(8));
    for(const v of bytes)room+=alphabet[v%alphabet.length];
    this.room=room;this.status("正在创建 WebRTC 房间…");
    return new Promise((resolve,reject)=>{
      const peer=this.peer=new window.Peer(PREFIX+room,{debug:0});
      let settled=false;
      peer.on("open",id=>{if(settled)return;settled=true;this.id=id;this.ready=true;this.status("房间已创建，等待队友加入");peer.on("connection",c=>this.accept(c));resolve(room);});
      peer.on("error",e=>{this.status("联机异常："+e.type);if(!settled){settled=true;this.clean();reject(e);}});
      peer.on("disconnected",()=>this.status("信令连接暂断；已连接队友可能仍能游玩"));
      peer.on("close",()=>{this.ready=false;this.status("房间已关闭");});
    });
  }
  accept(conn){
    if(!this.host||this.connections.size>=3){conn.on("open",()=>{conn.send({t:"reject",reason:"房间已满（最多4人）"});setTimeout(()=>conn.close(),300);});return;}
    conn.on("open",()=>{
      let joined=false;
      this.connections.set(conn.peer,conn);
      conn.on("data",data=>{
        if(!data||typeof data!=="object")return;
        if(data.t==="join"&&!joined){
          joined=true;const name=String(data.name||"旅人").slice(0,14);
          const permitted=this.cb.join?.(conn.peer,name);
          if(permitted===false){conn.send({t:"reject",reason:"房间已满"});conn.close();return;}
          this.inputs.set(conn.peer,{});
          conn.send({t:"welcome",id:conn.peer,room:this.room});
          this.cb.roster?.();
        } else if(data.t==="input"&&joined){this.inputs.set(conn.peer,data.input);}
      });
      conn.on("close",()=>{this.connections.delete(conn.peer);this.inputs.delete(conn.peer);if(joined)this.cb.leave?.(conn.peer);this.cb.roster?.();});
      conn.on("error",()=>{});
    });
  }
  async join(code,name){
    this.clean();this.ensurePeer();this.host=false;
    this.room=String(code).trim().toUpperCase().replace(/[^A-Z2-9]/g,"");
    if(this.room.length!==8)throw Error("请输入8位房间码");
    this.status("正在连接房主…");
    return new Promise((resolve,reject)=>{
      let settled=false;
      const fail=e=>{if(!settled){settled=true;this.clean();reject(e instanceof Error?e:new Error(String(e)));}};
      const peer=this.peer=new window.Peer(undefined,{debug:0});
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
        });
        conn.on("close",()=>{this.ready=false;this.status("与房主断开连接");this.cb.disconnected?.();if(!settled)fail(Error("房间不存在或连接失败"));});
        conn.on("error",e=>{this.status("连接失败："+e.type);if(!settled)fail(e);});
      });
      peer.on("error",e=>{this.status("信令连接失败："+e.type);if(!settled)fail(e);});
      peer.on("disconnected",()=>this.status("信令暂时断开"));
    });
  }
  sendInput(input){if(this.conn?.open&&this.ready)this.conn.send({t:"input",input});}
  broadcast(game){
    if(!this.host)return;
    const packet={t:"state",state:game};
    for(const conn of this.connections.values())if(conn.open)conn.send(packet);
  }
}
