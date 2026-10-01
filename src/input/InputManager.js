export class InputManager{
  constructor(target=window){
    this.keys=new Set();
    this.virtualHorizontal=0;
    this._down=e=>{
      if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);
    };
    this._up=e=>this.keys.delete(e.code);
    this._blur=()=>{this.keys.clear();this.virtualHorizontal=0};
    target.addEventListener('keydown',this._down,{passive:false});
    target.addEventListener('keyup',this._up);
    target.addEventListener('blur',this._blur);
  }
  setVirtualHorizontal(value){
    this.virtualHorizontal=Math.max(-1,Math.min(1,Number(value)||0));
  }
  horizontal(){
    const left=this.keys.has('ArrowLeft')||this.keys.has('KeyA');
    const right=this.keys.has('ArrowRight')||this.keys.has('KeyD');
    const keyboard=(right?1:0)-(left?1:0);
    return keyboard||this.virtualHorizontal;
  }
  snapshot(){return{horizontal:this.horizontal(),virtualHorizontal:this.virtualHorizontal,keys:[...this.keys]}}
}
