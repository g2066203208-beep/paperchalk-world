import {defineConfig} from "vite";
import {resolve} from "node:path";
export default defineConfig({
 base:"/paperchalk-world/",
 build:{target:"es2022",outDir:"dist",rollupOptions:{input:{
   main:resolve(import.meta.dirname,"index.html"),
   styleStudy:resolve(import.meta.dirname,"style-study.html")
 }}}
});
