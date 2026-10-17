import { createHash } from 'node:crypto';
const files={'一線三星':'10','一線四星':'09','二線一星':'08','二線二星':'07','二線三星':'06','二線四星':'05','三線一星':'04','三線二星':'03','三線三星':'02','三線四星':'01'};
export function insigniaURL(badge){
  const no=files[badge];if(!no)return null;
  const filename=`TW-Police-Rank_${no}.svg`,hash=createHash('md5').update(filename).digest('hex');
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${hash[0]}/${hash.slice(0,2)}/${filename}/250px-${filename}.png`;
}
export function withInsignia(embed,role){const url=insigniaURL(role.badge);return url?embed.setThumbnail(url):embed;}
