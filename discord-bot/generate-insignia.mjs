// Vector diagrams of duty insignia: gold stripes and faceted five-point stars.
// Reference: NPA, The Police of the Republic of China, p.13. Not personal rank.
// Run manually with sharp installed; production uses the committed PNG bundle.
import { writeFileSync } from 'node:fs';
const sharp=(await import(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/sharp/dist/index.mjs':'sharp')).default;
const specs={'10':[1,3],'09':[1,4],'08':[2,1],'07':[2,2],'06':[2,3],'05':[2,4],'04':[3,1],'03':[3,2],'02':[3,3],'01':[3,4]};
function star(cx,cy){
  const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?17:43;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];});
  return `<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="#ffe55a" stroke="#cda42b" stroke-width="1.2"/>`+points.map((p,i)=>`<polygon points="${cx},${cy} ${p.join(',')} ${points[(i+1)%10].join(',')}" fill="${i%2?'#dbac22':'#fff6a0'}"/>`).join('');
}
const data={};
for(const [no,[lines,stars]] of Object.entries(specs)){
  const bars=Array.from({length:lines},(_,i)=>`<rect x="12" y="${95+(i-(lines-1)/2)*48-11}" width="616" height="22" fill="#ffdf00"/>`).join('');
  const symbols=Array.from({length:stars},(_,i)=>star(320+(i-(stars-1)/2)*128,95)).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="190" viewBox="0 0 640 190"><rect width="640" height="190" rx="5" fill="#090b0e"/>${bars}${symbols}</svg>`;
  const png=await sharp(Buffer.from(svg)).png().toBuffer();data[`rank-${no}.png`]=png.toString('base64');
}
writeFileSync(new URL('insignia-assets.json',import.meta.url),JSON.stringify(data));
console.log('Generated 10 bundled PNG insignia diagrams.');
