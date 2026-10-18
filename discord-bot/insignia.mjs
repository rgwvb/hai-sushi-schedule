import { readFileSync } from 'node:fs';
const assets=JSON.parse(readFileSync(new URL('insignia-assets.json',import.meta.url),'utf8'));
const files={'一線三星':'10','一線四星':'09','二線一星':'08','二線二星':'07','二線三星':'06','二線四星':'05','三線一星':'04','三線二星':'03','三線三星':'02','三線四星':'01'};
export function insigniaURL(badge){const no=files[badge];return no?`attachment://rank-${no}.png`:null;}
export function withInsignia(embed,role){const url=insigniaURL(role.badge);if(!url)return embed;
  const no=files[role.badge],source=`https://commons.wikimedia.org/wiki/File:TW-Police-Rank_${no}.svg`;
  const text=embed.data.description||'';
  return embed.setThumbnail(url).setImage(url).setDescription(text+'\n\n[階級原圖：Akira123／Wikimedia Commons]('+source+') · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)');}
// Each send/edit uploads its own PNG. No remote host, SVG proxy or expired CDN URL.
export function preparePayload(payload){
  const names=new Set();
  for(const embed of payload.embeds||[]){
    const data=typeof embed.toJSON==='function'?embed.toJSON():embed;
    for(const image of [data.thumbnail,data.image]){
      const name=image?.url?.replace(/^attachment:\/\//,'');if(name&&assets[name])names.add(name);
    }
  }
  const first=payload.embeds?.[0],data=first?(typeof first.toJSON==='function'?first.toJSON():first):null;
  return {...payload,content:payload.content??(data?.title?'## '+data.title:''),attachments:[],
    files:[...names].map(name=>({attachment:Buffer.from(assets[name],'base64'),name,description:'警察職務配階識別圖'}))};
}
