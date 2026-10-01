export class InputManager{
  constructor(target=window){
    this.keys=new Set();
    this._down=e=>{
      if(['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))e.preventDefault();
      this.keys.add(e.code);
    };
    this._up=e=>this.keys.delete(e.code);
    this._blur=()=>this.keys.clear();
    target.addEventListener('keydown',this._down,{passive:false});
    target.addEventListener('keyup',this._up);
    target.addEventListener('blur',this._blur);
  }
  horizontal(){
    const left=this.keys.has('ArrowLeft')||this.keys.has('KeyA');
    const right=this.keys.has('ArrowRight')||this.keys.has('KeyD');
    return (right?1:0)-(left?1:0);
  }
  snapshot(){return{horizontal:this.horizontal(),keys:[...this.keys]}}
}
