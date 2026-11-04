/* Bounded scene-image decode cache.
 * One in-flight request per URL; failed decodes are evicted for retry.
 * A small LRU prevents a gallery of backgrounds staying decoded forever.
 */
(function(root,factory){
  'use strict';
  const api=factory();
  if(root)root.PaperWorldScenePreloader=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window==='object'?window:null,function(){
  'use strict';
  function create({ImageCtor,maxEntries=3,timeoutMs=6500}={}){
    if(typeof ImageCtor!=='function')throw new TypeError('ImageCtor required');
    if(!Number.isSafeInteger(maxEntries)||maxEntries<1||maxEntries>64)
      throw new RangeError('maxEntries must be 1..64');
    if(!Number.isFinite(timeoutMs)||timeoutMs<=0)
      throw new RangeError('timeoutMs must be positive');
    const entries=new Map();
    let requests=0,reuses=0,failures=0;
    function ensure(url){
      if(typeof url!=='string'||!url.trim())
        return Promise.reject(new TypeError('scene URL required'));
      if(entries.has(url)){
        const cached=entries.get(url);
        entries.delete(url);entries.set(url,cached);
        reuses++;
        return cached.promise;
      }
      requests++;
      const image=new ImageCtor();
      image.decoding='async';
      const entry={image,promise:null};
      let timer=null,finished=false;
      entry.promise=new Promise((resolve,reject)=>{
        function complete(error){
          if(finished)return;
          finished=true;clearTimeout(timer);
          image.onload=null;image.onerror=null;
          if(error){failures++;if(entries.get(url)===entry)entries.delete(url);reject(error)}
          else resolve(image);
        }
        image.onload=()=>complete();
        image.onerror=()=>complete(new Error('scene image load failed: '+url));
        timer=setTimeout(()=>complete(new Error('scene image timeout: '+url)),timeoutMs);
        try{
          image.src=url;
          if(typeof image.decode==='function'){
            Promise.resolve(image.decode()).then(()=>complete(),error=>
              complete(error instanceof Error?error:new Error('scene image decode failed: '+url)));
          }
        }catch(error){complete(error)}
      });
      entries.set(url,entry);
      while(entries.size>maxEntries)entries.delete(entries.keys().next().value);
      return entry.promise;
    }
    return Object.freeze({
      ensure,
      prefetch(url){return ensure(url).catch(()=>null)},
      inspect(){return {cached:entries.size,urls:[...entries.keys()],requests,reuses,failures}}
    });
  }
  return Object.freeze({create});
});
