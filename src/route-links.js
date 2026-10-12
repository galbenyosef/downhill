import {COURSES} from './game.js';

const normalize=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={bangalore:'bengaluru',dharavi:'mumbai',pacificcoast:'california',redwood:'redwoods',redwoodtrail:'redwoods',rockymountains:'rockies',deadair:'skyline',amazonafterdark:'amazon',hallowsdescent:'halloween'};

// Named route parameters take precedence; otherwise accept a bare ?course-name.
// Resolve only known courses, never arbitrary query values or array indices.
export function courseIndexFromSearch(search){
  const params=new URLSearchParams(search);
  const explicit=params.get('route')??params.get('course');
  const candidates=explicit!==null?[explicit]:[...params].filter(([,value])=>value==='').map(([key])=>key);
  for(const candidate of candidates){
    const key=normalize(candidate),id=aliases[key]||key;
    const index=COURSES.findIndex(c=>normalize(c.id)===id||normalize(c.name)===key);
    if(index!==-1)return index;
  }
  return 0;
}

export const ROUTE_SLUGS=[...new Set([...COURSES.map(c=>c.id),...Object.keys(aliases),'valparaiso','dead-air','pacific-coast','redwood-forest','rocky-mountains','amazon-after-dark','bengaluru-traffic','hallows-descent'])];
export function courseIndexFromLocation(pathname,search=''){
  let slug;
  try{slug=decodeURIComponent(pathname).replace(/^\/+|\/+$/g,'').toLowerCase();}catch{return courseIndexFromSearch(search);}
  if(ROUTE_SLUGS.includes(slug))return courseIndexFromSearch('?'+encodeURIComponent(slug));
  return courseIndexFromSearch(search);
}

export function courseSelectionUrl(href,course){
  const url=new URL(href);
  const known=new Set([...COURSES.flatMap(c=>[normalize(c.id),normalize(c.name)]),...Object.keys(aliases)]);
  for(const [key,value] of [...url.searchParams]){
    if(key==='route'||key==='course'||(value===''&&known.has(normalize(key))))url.searchParams.delete(key);
  }
  const slug={valpo:'valparaiso',mumbai:'dharavi',skyline:'dead-air'}[course.id]||course.id;
  const remaining=url.searchParams.toString();
  // Clear an old course path so it cannot override the newly selected query.
  return '/?'+slug+(remaining?'&'+remaining:'')+url.hash;
}
