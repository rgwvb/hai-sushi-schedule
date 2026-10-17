// Export existing website cases; no browser or player save is involved.
import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
function extract(name, end) {
  const text = html.slice(html.indexOf('const '+name+'='), html.indexOf(end, html.indexOf('const '+name+'=')));
  return vm.runInNewContext(text+'\nJSON.stringify('+name+')', {}, {timeout:1000});
}
const decks=JSON.parse(extract('roleCaseDecks','const roleCaseBags='));
const duties=JSON.parse(extract('unitDuties','// Expanded scenario deck:'));
const data={version:1,source:'../index.html: roleCaseDecks and unitDuties',decks:{}};
for(const [id,deck] of Object.entries(decks)) data.decks[id]=deck.events.map((e,i)=>({
  id:id+'-'+i,title:e[0],story:e[1],choices:e[2],analysis:e[4]
}));
data.decks.patrol=duties.station.map((e,i)=>({id:'patrol-'+i,title:e[0],story:e[1],choices:e[2].map(x=>x[0]),
  analysis:'建議處置：'+e[2][0][0]+'。先查明事實、保護安全與當事人權益，並依程序留存紀錄。'}));
writeFileSync(new URL('cases.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log('Exported',Object.values(data.decks).flat().length,'website scenarios.');
