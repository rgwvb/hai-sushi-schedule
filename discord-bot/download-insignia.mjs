// Download Wikimedia's original PNG previews without redrawing or modifying pixels.
// Akira123, CC BY-SA 4.0. Runtime uses the committed bundle, never this downloader.
import {writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const assets={},files=[];
for(let i=1;i<=10;i++){
  const no=String(i).padStart(2,'0'),name=`TW-Police-Rank_${no}.svg`;
  const url=`https://commons.wikimedia.org/wiki/Special:Redirect/file/${name}?width=960`;
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(`Download ${no} failed: ${response.status}`);
  const png=Buffer.from(await response.arrayBuffer());
  if(png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error(`Expected PNG for ${no}`);
  const file=`rank-${no}.png`;assets[file]=png.toString('base64');
  files.push({file,source:`https://commons.wikimedia.org/wiki/File:${name}`,download:response.url,sha256:createHash('sha256').update(png).digest('hex'),bytes:png.length});
}
writeFileSync(new URL('insignia-assets.json',import.meta.url),JSON.stringify(assets));
writeFileSync(new URL('insignia-sources.json',import.meta.url),JSON.stringify({author:'Akira123',license:'CC BY-SA 4.0',licenseURL:'https://creativecommons.org/licenses/by-sa/4.0/',changes:'Unmodified Wikimedia-rendered PNG previews; no redrawing or retouching.',files},null,2));
