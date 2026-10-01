import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||4173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.glb':'model/gltf-binary','.woff2':'font/woff2','.ico':'image/x-icon'};
const server=http.createServer((req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);res.end('Bad URL');return;}
  // The project-prefixed alias also exercises the path layout used by GitHub Pages.
  if(pathname.startsWith('/paperchalk-world/'))pathname=pathname.slice('/paperchalk-world'.length);
  if(pathname==='/')pathname='/studio/';
  let file=path.resolve(root,'.'+pathname);
  const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(p=>p.startsWith('.'))){res.writeHead(403);res.end('Forbidden');return;}
  try{
    let stat=fs.statSync(file);
    if(stat.isDirectory()){
      if(!pathname.endsWith('/')){res.writeHead(308,{Location:req.url.split('?')[0]+'/'});res.end();return;}
      file=path.join(file,'index.html');stat=fs.statSync(file);
    }
    if(!stat.isFile())throw Error('Not a file');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Not found');}
});
server.listen(port,'127.0.0.1',()=>{
  const actualPort=server.address().port;
  console.log(`Paperchalk Studio: http://127.0.0.1:${actualPort}/studio/\nPages-path preview: http://127.0.0.1:${actualPort}/paperchalk-world/studio/`);
});
server.on('error',err=>{console.error(err.message);process.exitCode=1;});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
