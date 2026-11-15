/* Original hunter action-card artwork; no external image dependencies. */
(function(root){'use strict';
const palettes={
 quick:['#8d5555','#272f43','#fdd2a0'],silver:['#547d89','#23364c','#e4fff3'],
 focus:['#6a7390','#31374e','#f1dac4'],burst:['#8b5148','#342840','#ffce83'],
 guard:['#688479','#2d4451','#f2e0ae'],reload:['#947751','#3c4650','#ffe3b9'],
 critical:['#9b4e65','#37283e','#fff1bf'],roll:['#648a7c','#2c4651','#d8f6df'],
 mark:['#825c8d','#30374c','#f1ddff']
};
const vector={
quick:'<g transform="rotate(-19 72 61)" stroke="#252636" stroke-linejoin="round" stroke-width="3"><path d="M14 59h105v15H14z" fill="url(#steel)"/><path d="M32 74v20h24l8-20" fill="#704936"/><path d="M23 57h77" stroke="#fce3ac" stroke-width="2"/></g><path d="M106 45l12-21 1 19 22 7-23 6 7 22-18-18-15 16 4-24-18-9z" fill="#f4c47b" stroke="#c96b57" stroke-width="2"/>',
silver:'<circle cx="73" cy="57" r="46" fill="#d3faf2" opacity=".25"/><g transform="rotate(26 73 57)" stroke="#384151" stroke-width="3"><path d="M56 20h34v76H56z" fill="url(#steel)"/><path d="M56 20q17-19 34 0" fill="#edf7f0"/><path d="M56 73h34v23H56z" fill="url(#brass)"/><path d="M73 31v36M60 49h26" stroke="#f1fff2" stroke-width="3"/></g><path d="M26 56l6-14 5 14-5 14zm84 17l5-12 5 12-5 12" fill="#f5ffef"/>',
focus:'<circle cx="72" cy="56" r="43" fill="#deebec" opacity=".12" stroke="#eddec9" stroke-width="2"/><circle cx="72" cy="56" r="31" fill="none" stroke="#e8d6b3" stroke-width="2"/><path d="M72 10v28m0 36v28M25 56h27m39 0h28" stroke="#ffe2b0" stroke-width="3"/><path d="M45 56q26-28 54 0-26 28-54 0" fill="#ddcdbf" stroke="#382f41" stroke-width="3"/><circle cx="72" cy="56" r="11" fill="#476b8a" stroke="#242738" stroke-width="3"/><circle cx="76" cy="52" r="5" fill="#faf2d7"/>',
burst:'<g transform="rotate(-25 72 57)" stroke="#312b36" stroke-width="3"><path d="M17 55h110v13H17z" fill="url(#steel)"/><path d="M30 68l4 20h20l9-20" fill="#7d533c"/></g><g transform="rotate(24 72 57)" stroke="#312b36" stroke-width="3"><path d="M17 50h110v13H17z" fill="url(#steel)"/><path d="M28 63l4 20h20l9-20" fill="#7d533c"/></g><path d="M72 27l6 18 19-6-9 17 18 11-21 1-8 18-7-20-18 4 10-17-13-12 18 4z" fill="#fce3a7" stroke="#bb7c52" stroke-width="2"/>',
guard:'<path d="M72 12l46 23-8 41q-12 26-38 35-26-9-38-35l-8-41z" fill="#d6b98b" stroke="#322c34" stroke-width="5"/><path d="M72 22l34 17-7 31Q88 88 72 96Q56 88 45 70l-7-31z" fill="#627d70" stroke="#e6d8ad" stroke-width="3"/><path d="M72 22v74M39 57h66" stroke="#eee0b8" stroke-width="3"/><path d="M72 38l7 13 14 2-11 9 4 15-14-8-14 8 4-15-11-9 14-2z" fill="#e4d5ae" stroke="#383b41" stroke-width="2"/>',
reload:'<circle cx="72" cy="57" r="43" fill="#d3ae7a" stroke="#332b31" stroke-width="5"/><circle cx="72" cy="57" r="33" fill="#474b4c" stroke="#e7d4ae" stroke-width="3"/><g stroke="#4f392d" stroke-width="2" fill="url(#brass)"><circle cx="72" cy="35" r="11"/><circle cx="91" cy="45" r="11"/><circle cx="91" cy="69" r="11"/><circle cx="72" cy="79" r="11"/><circle cx="53" cy="69" r="11"/><circle cx="53" cy="45" r="11"/></g><circle cx="72" cy="57" r="6" fill="#e9d6b5"/>',
critical:'<circle cx="72" cy="56" r="44" fill="#fbe0ab" opacity=".14" stroke="#fceac8" stroke-width="3"/><path d="M72 92Q25 64 39 39Q51 19 72 42Q94 19 106 39Q121 64 72 92Z" fill="#b63f59" stroke="#f6c0ba" stroke-width="3"/><path d="M72 12v27m0 36v29M27 56h28m35 0h27" stroke="#f7e6c4" stroke-width="3"/><circle cx="72" cy="56" r="22" fill="none" stroke="#ffdeb2" stroke-width="3"/><circle cx="72" cy="56" r="8" fill="#f3e5c8"/><path d="M70 52l18-18-4 21 11 9-24-2" fill="#fff3bc" stroke="#673b40" stroke-width="2"/>',
roll:'<path d="M16 85Q69 27 131 61" fill="none" stroke="#d1ebd7" stroke-width="5" stroke-dasharray="14 8"/><path d="M19 99Q64 57 123 91" fill="none" stroke="#b6d8cf" stroke-width="4"/><g transform="rotate(-25 72 58)" stroke="#29363f" stroke-width="3"><path d="M53 17h35v50H53z" fill="#65544c"/><path d="M46 58h51l19 27-9 12H40L29 82z" fill="#3b4855"/><path d="M47 75h58" stroke="#d9c5a4" stroke-width="3"/></g>',
mark:'<circle cx="72" cy="55" r="44" fill="#e5c7f3" opacity=".17"/><path d="M26 55q46-41 92 0Q72 99 26 55Z" fill="#ecdde7" stroke="#4a344f" stroke-width="4"/><circle cx="72" cy="55" r="24" fill="#866e9d" stroke="#34283d" stroke-width="4"/><circle cx="72" cy="55" r="14" fill="#252437"/><circle cx="77" cy="49" r="6" fill="#f8edff"/><path d="M72 7v21m0 55v21M23 55h22m54 0h22" stroke="#eddcec" stroke-width="3"/>'
};
function render(card){
const id=card.id||'quick',p=palettes[id]||palettes.quick,shape=vector[id]||vector.quick;
return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 118" aria-hidden="true" focusable="false">'
+'<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="'+p[0]+'"/><stop offset="1" stop-color="'+p[1]+'"/></linearGradient>'
+'<linearGradient id="steel" x2="1" y2=".7"><stop stop-color="#f0f0df"/><stop offset=".4" stop-color="#8b9b9e"/><stop offset=".62" stop-color="#d6d0c7"/><stop offset="1" stop-color="#384656"/></linearGradient>'
+'<linearGradient id="brass" x2="1" y2="1"><stop stop-color="#fff0bf"/><stop offset=".5" stop-color="#cc9d56"/><stop offset="1" stop-color="#614935"/></linearGradient>'
+'<radialGradient id="haze"><stop stop-color="'+p[2]+'" stop-opacity=".50"/><stop offset="1" stop-color="'+p[2]+'" stop-opacity="0"/></radialGradient></defs>'
+'<rect width="144" height="118" fill="url(#bg)"/><circle cx="72" cy="53" r="62" fill="url(#haze)"/>'
+'<path d="M0 106L20 78l13 20 19-25 15 20 20-29 17 31 19-28 21 39z" fill="#121b2e" opacity=".45"/>'
+'<path d="M0 116l20-15 17 9 24-12 25 14 23-13 35 17" fill="#131b28" opacity=".67"/>'
+'<g>'+shape+'</g><rect x="1" y="1" width="142" height="116" rx="3" fill="none" stroke="'+p[2]+'" stroke-width="1.5" opacity=".6"/>'
+'<path d="M5 5h16M5 5v15m134-15h-16m16 0v15M5 113h16m-16 0V97m134 16h-16m16 0V97" fill="none" stroke="#f4e4c4" stroke-width="2" opacity=".65"/></svg>';
}
root.PaperchalkDuelCardArt=Object.freeze({version:'1.0.0',render,types:Object.keys(vector)});
})(window);