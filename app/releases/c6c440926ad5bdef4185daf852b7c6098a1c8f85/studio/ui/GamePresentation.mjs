/** Native shells and handheld browsers share the same game presentation. */
export function wantsGamePresentation({userAgent='',search='',coarse=false,width=0,height=0}={}) {
  const native=/PaperchalkShell\//i.test(userAgent);
  const override=new URLSearchParams(search).get('play');
  if(native||override==='1')return true;
  if(override==='0')return false;
  return /Android|iPhone|iPad|iPod/i.test(userAgent)
    || (coarse&&Math.min(width,height)<=820&&Math.max(width,height)<=1600);
}

/** Closing a temporary menu must not erase a separate, user-requested pause. */
export class PauseReasons {
  constructor(){this.user=false;this.menu=false;}
  get active(){return this.user||this.menu;}
  toggleUser(){this.user=!this.user;}
  openMenu(){this.menu=true;}
  closeMenu(){this.menu=false;}
  resume(){this.user=false;this.menu=false;}
}
