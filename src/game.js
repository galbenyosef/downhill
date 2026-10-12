import {impactBody,impactPose} from './impacts.js';
export const COURSES = [
  { id: 'valpo', name: 'Valparaíso', country: 'Chile', type: 'Urban descent', tag: 'THE ORIGINAL', difficulty: 'Intermediate', level: 2, length: 1050, drop: 184, width: 5.5, slope: .175, seed: 14, sky: 0xadd8db, fog: 0xb6d3d0, road: 0x8e8d80, ground: 0xa39a72, colors: [0xd68565, 0xe6b96b, 0x639d93, 0xc8c4a9, 0xb76555, 0x97b6af, 0xdfcfac], description: 'Steep streets. Tight corners. An ocean at the finish line.', features: ['Narrow streets', 'Stair drops', 'Coastal views'], par: 95 },
  { id: 'aizawl', name: 'Aizawl', country: 'India', type: 'Stairway descent', tag: 'THREAD THE NEEDLE', difficulty: 'Technical', level: 3, length: 850, drop: 192, width: 3.4, slope: .2, seed: 32, sky: 0xc3d4cd, fog: 0xbdcbc1, road: 0xb58676, ground: 0x88977c, colors: [0xd4c8a7, 0x99b8a6, 0xc49481, 0xb1b6ad, 0xc2bb92, 0x83a99a], description: 'A ribbon of stairs through a city built into the hills.', features: ['Steep stairways', 'Tight passages', 'Hillside city'], par: 87 },
  { id: 'mumbai', name: 'Dharavi', country: 'Mumbai, India', type: 'Neighborhood descent', tag: 'THROUGH THE LANES', difficulty: 'Technical', level: 3, length: 1100, drop: 190, width: 3.8, slope: .155, seed: 87, sky: 0xd9cbb2, fog: 0xc9bda7, road: 0x8b8b7c, ground: 0xa59a7c, colors: [0xaba184,0x759b92,0xa98774,0xb5aa8b,0x9292a9,0x608e88,0x8f957e], description: 'Thread Dharavi-inspired lanes beneath hanging laundry and tangled cables. Low rooftops, busy workshops, and cheering fans.', features: ['Crowded balconies', 'Steep stairways', 'Market bends'], par: 112 },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', type: 'Night run', tag: 'AFTER HOURS', difficulty: 'Expert', level: 4, length: 1150, drop: 158, width: 4.6, slope: .135, seed: 57, sky: 0x151f34, fog: 0x293345, road: 0x3e515b, ground: 0x293d47, colors: [0x526570, 0x756f79, 0x425969, 0x716862, 0x536d70], description: 'Chase the neon through a maze of midnight backstreets.', features: ['Neon alleys', 'Slalom gates', 'Night riding'], par: 106 }
];

COURSES.push(
  {id:'california',name:'Pacific Coast',country:'California, USA',type:'Coastal hills',environment:'wild',terrain:'coast',tag:'RIDE THE COAST',difficulty:'Intermediate',level:2,length:1250,width:4.6,slope:.16,seed:102,sky:0x9dcdd6,fog:0xb4d3ce,road:0xb6a482,ground:0x9da57b,colors:[0x839374,0x9da67d],description:'Ocean cliffs, golden hills, and fast turns above the Pacific.',features:['Ocean-side cliffs','Coastal switchbacks','Dirt jumps'],par:119},
  {id:'redwoods',name:'Redwood Forest',country:'California, USA',type:'Forest singletrack',environment:'wild',terrain:'forest',rockChutes:[{start:35,end:135,drop:26},{start:425,end:525,drop:29},{start:790,end:885,drop:25}],tag:'AMONG GIANTS',difficulty:'Technical',level:3,length:1050,width:3.7,slope:.16,seed:120,sky:0x849f94,fog:0x718a77,road:0x87735a,ground:0x56705b,colors:[0x436451,0x567356],description:'Drop into steep moss-lined rock chutes beneath a dense canopy of redwoods and ferns.',features:['Steep rock chutes','Mossy ridgelines','Dense forest'],par:104},
  {id:'yosemite',name:'Yosemite',country:'California, USA',type:'Granite descent',environment:'wild',terrain:'granite',tag:'INTO THE VALLEY',difficulty:'Technical',level:3,length:1350,width:4.2,slope:.20,seed:151,sky:0xaecdd0,fog:0xb3c8be,road:0xb5b19a,ground:0x8a9879,colors:[0x909e90,0xb0b4a3],description:'Granite walls, pine-lined bends, and a waterfall deep in the valley.',features:['Granite cliffs','Pine forest','Rocky switchbacks'],par:132},
  {id:'rockies',name:'Rocky Mountains',country:'Colorado, USA',type:'Snow descent',environment:'wild',terrain:'snow',tag:'ABOVE THE SNOWLINE',difficulty:'Expert',level:4,length:1450,width:4.7,slope:.215,seed:191,sky:0xbccdd8,fog:0xc8d6dc,road:0xc3d0d1,ground:0xe0e5df,colors:[0xa4b4b7,0xe0e5df],description:'Snow-covered peaks, icy turns, and a fast line through alpine pines.',features:['Snow & ice','Alpine ridgelines','Low-grip corners'],par:142}
);

COURSES.push({id:'skyline',name:'Dead Air',country:'3,500 m above the valley',type:'20-second survival',environment:'extreme',terrain:'sky',tag:'NO SECOND CHANCES',difficulty:'Extreme',level:5,length:800,width:3.6,endWidth:2.2,slope:.30,seed:231,sky:0xb2c9cc,fog:0x9bb8bf,road:0xe0cfb4,ground:0x536f60,colors:[0x8a9183],description:'Ride a suspended dirt-and-gravel trail that starts wide and gradually narrows. Survive twenty seconds, brake into bends, and hop the gaps.',features:['Wide start → narrow finish','Dirt, gravel & tyre tracks','20-second survival'],par:20,duration:20,gaps:[[155,159],[360,364],[550,554]]});

COURSES.push({id:'amazon',name:'Amazon After Dark',country:'Amazon Basin, Brazil',type:'Moonlit jungle ride',environment:'wild',terrain:'rainforest',night:true,tag:'INTO THE NIGHT',difficulty:'Technical',level:3,length:1150,width:4.8,slope:.135,seed:277,sky:0x081923,fog:0x102c32,road:0x7c7960,ground:0x244b3c,colors:[0x254d3c,0x32624b,0x3b7055],description:'Follow a moonlit river beneath tropical canopies. Brake for crossing capybaras and tapirs as birds glide overhead.',features:['Moonlit river stream','Wildlife crossings','Birds & fireflies'],par:122});

COURSES.unshift({id:'halloween',name:"Hallow’s Descent",country:'October / Haunted Hollow',type:'Halloween night race',environment:'seasonal',night:true,tag:'HALLOWEEN SPECIAL',difficulty:'Technical',level:3,length:1100,width:6.2,slope:.145,seed:310,sky:0x080611,fog:0x120b18,road:0x392922,ground:0x120e17,colors:[0x352030,0x432a27],description:'Race skeletons through haunted streets. Dodge shambling zombies and pumpkins, then follow glowing reflectors into the darkness.',features:['Skeleton racers & zombies','Pumpkins, bats & full moon','Streetlights → reflector trails'],par:125});

COURSES.splice(1,0,{id:'bengaluru',name:'Bengaluru Traffic',country:'Karnataka, India',type:'Rush-hour ride',environment:'traffic',tag:'BEAT THE GRIDLOCK',difficulty:'Expert',level:4,length:1250,width:10,slope:.075,seed:363,sky:0xd7c9ad,fog:0xd0c2a9,road:0x575b59,ground:0xa39b84,colors:[0xb8b9a5,0xa9bdbe,0xc3ac91,0x8a9b98],description:'Weave through buses and autos, climb flyovers, and yield to people, dogs, and cows beside bustling street stalls.',features:['Heavy moving traffic','Rideable flyovers','People, dogs & cows'],par:145});

export function flyoverLift(s){
  let lift=0;
  for(const start of [260,790]){const t=(s-start)/180;if(t>0&&t<1)lift+=10*Math.sin(Math.PI*t)**2;}
  return lift;
}
export function makeTraffic(c){
  if(c.id!=='bengaluru')return [];
  const result=[];
  for(let s=38,i=0;s<c.length-30;s+=24,i++){
    if(forkAt(s,c,25))continue;
    const kind=i%5===0?'bus':i%3===0?'auto':'car';
    result.push({id:i,kind,s,baseS:s,x:(i%2?1:-1)*2.35,radius:kind==='bus'?1.1:kind==='auto'?.65:.85,halfLength:kind==='bus'?3.2:kind==='auto'?1.1:1.8,lane:i%2?1:-1,speed:i%2?4.4:3.2});
  }
  return result;
}
export function makeStreetCrossings(c){
  if(c.id!=='bengaluru')return [];
  return [100,180,475,535,720,1000,1100,1180].map((s,i)=>({id:i,s,kind:['pedestrian','dog','cow'][i%3],x:(i%2?1:-1)*5.5,side:i%2?1:-1,startedAt:null,progress:0,hit:false,radius:i%3===2?.85:.4}));
}
export function updateStreetTraffic(run,c,dt=0){
  // Process the front of each queue first, preserving clearance through bends and forks.
  const leaders=new Map();
  for(const v of [...(run.traffic||[])].sort((a,b)=>b.s-a.s)){
    const leader=leaders.get(v.lane);
    const next=v.s+(run.elapsed<(v.stoppedUntil||0)?0:v.speed)*Math.max(0,dt)/routeMetric(v.s,c);
    v.s=Math.max(v.s,leader?Math.min(next,leader.s-leader.halfLength-v.halfLength-3):next);
    v.x=v.lane*Math.min(2.35,halfWidthAt(v.s,c)-v.radius-.7)+impactPose(v,run.elapsed).x;
    leaders.set(v.lane,v);
  }
  for(const a of run.crossings||[]){
    if(a.startedAt===null&&run.s>=a.s-40)a.startedAt=run.elapsed;
    if(a.startedAt!==null){a.progress=Math.min(1,(run.elapsed-a.startedAt)/(a.kind==='dog'?4:7));a.x=a.side*5.5*(1-2*a.progress);}
  }
}

export function makeZombies(course){
  return course.id==='halloween'?Array.from({length:14},(_,i)=>({id:i,s:42+i*73,x:0,kind:'zombie',radius:.45,phase:i*1.8})).map(z=>{const f=forkAt(z.s,course,12);if(f)z.s=f.end+20+(z.id%3)*9;return z;}):[];
}
export function updateZombies(run,course){
  for(const z of run.zombies||[])z.x=Math.sin(run.elapsed*.48+z.phase)*(halfWidthAt(z.s,course)+.65);
}

const stairLayouts = {
  valpo: [[90,66,.85,.12],[340,52,.78,.14],[655,90,.90,.16],[895,48,.75,.13]],
  aizawl: [[35,72,.60,.14],[230,80,.58,.15],[455,85,.60,.16],[670,75,.56,.16]],
  mumbai: [[70,64,.70,.14],[300,72,.65,.14],[610,84,.70,.17],[910,66,.65,.16]],
  tokyo: [[140,44,.80,.13],[440,65,.72,.13],[760,70,.68,.15],[1000,55,.75,.16]],
};
const forkLayouts={bengaluru:[[560,670]],halloween:[[150,250],[600,700]],valpo:[[190,290],[470,570]],aizawl:[[125,215],[340,430]],mumbai:[[160,270],[420,530]],tokyo:[[220,330],[540,650]],california:[[180,300],[700,820]],redwoods:[[170,290],[570,690]],yosemite:[[180,300],[720,840]],rockies:[[190,310],[800,920]],amazon:[[150,270],[600,720]]};
for (const course of COURSES) {
  course.forks=(forkLayouts[course.id]||[]).map(([start,end],id)=>({id,start,end,side:id%2?-1:1,gaps:[.4,.7].map(t=>[start+(end-start)*t,start+(end-start)*t+3.4])}));
  course.stairs = (stairLayouts[course.id]||[]).map(([start,length,spacing,rise])=>({start,length,spacing,rise}));
  course.drop = Math.round(heightAt(0,course)-heightAt(course.length,course));
  course.par += course.duration?0:15;
  if(!course.environment)course.features = course.id === 'aizawl' ? ['520+ stair steps', 'Tight S-bends', 'Steep drops'] : course.id === 'valpo' ? ['Long stair flights', 'Sharp curves', 'Coastal streets'] : course.id === 'mumbai' ? ['Narrow market lanes', 'Rooftop crowds', '400+ stair steps'] : ['Neon stairways', 'Tight S-bends', 'Night riding'];
}

function baseCenterAt(s, course) {
  if(course.terrain==='sky')return Math.sin(s*.023)*12+Math.sin(s*.061)*3;
  const m = course.id === 'aizawl' ? 1.12 : course.id === 'tokyo' ? 1.22 : course.terrain==='coast'?.85:1;
  return m * (Math.sin(s * .018) * 18 + Math.sin(s * .067) * 8);
}
export function forkAt(s,c,margin=0){return (c.forks||[]).find(f=>s>=f.start-margin&&s<=f.end+margin);}
function forkBase(s,c,f){const t=(s-f.start)/(f.end-f.start);return baseCenterAt(f.start,c)*(1-t)+baseCenterAt(f.end,c)*t;}
function forkWave(s,f){return Math.sin(Math.PI*Math.max(0,Math.min(1,(s-f.start)/(f.end-f.start))))**2;}
export function centerAt(s,c){const f=forkAt(s,c);return f?forkBase(s,c,f)-f.side*35*forkWave(s,f):baseCenterAt(s,c);}
export function shortcutCenterAt(s,c){const f=forkAt(s,c);return f?forkBase(s,c,f)+f.side*5*forkWave(s,f):baseCenterAt(s,c);}
export function isShortcut(actor,c){const f=forkAt(actor.s,c);return !!f&&actor.route==='shortcut'&&actor.forkId===f.id;}
export function routeCenterAt(s,c,route='main'){return route==='shortcut'?shortcutCenterAt(s,c):centerAt(s,c);}
export function routeHeightAt(s,c,route='main'){const f=forkAt(s,c);return heightAt(s,c)+(route==='shortcut'&&f?1.5*forkWave(s,f):0);}
export function routeHalfWidthAt(s,c,route='main'){
 const f=forkAt(s,c);if(!f||route!=='shortcut')return halfWidthAt(s,c);
 const blend=Math.min(1,(s-f.start)/15,(f.end-s)/15);return halfWidthAt(s,c)*(1-blend)+1.05*blend;
}
export function routeCurvatureAt(s,c,route='main'){
 const a=routeCenterAt(s-1,c,route),b=routeCenterAt(s,c,route),d=routeCenterAt(s+1,c,route),slope=(d-a)/2;
 return (d-2*b+a)/Math.pow(1+slope*slope,1.5);
}
export function routeMetric(s,c,route='main'){
 const f=forkAt(s,c);if(!f)return 1;
 const dx=(routeCenterAt(s+.25,c,route)-routeCenterAt(s-.25,c,route))/.5,dy=(routeHeightAt(s+.25,c,route)-routeHeightAt(s-.25,c,route))/.5;
 const blend=Math.max(0,Math.min(1,(s-f.start)/6,(f.end-s)/6));return 1+blend*(Math.hypot(1,dx,dy)-1);
}
function chooseFork(actor,c,isPlayer=false){
 const f=forkAt(actor.s,c);if(!f){actor.route='main';actor.forkId=null;actor.queuedShortcutHop=null;return;}
 if(actor.forkId===f.id||actor.s<f.start+4)return;
 actor.forkId=f.id;
 const take=isPlayer?actor.lateral*f.side>.5&&actor.forkIntent===f.id:(actor.id+f.id)%2===0;
 actor.route=take?'shortcut':'main';actor.queuedShortcutHop=null;
 if(take){actor.lateral+=centerAt(actor.s,c)-shortcutCenterAt(actor.s,c);if(isPlayer){actor.shortcutsTaken++;actor.event='shortcut-enter';}}
 else if(isPlayer)actor.event='safe-route';
}
function bailShortcut(run){run.route='main';run.lateral=0;run.speed*=.25;run.jump=0;run.verticalVelocity=0;run.queuedShortcutHop=null;run.penalty+=6;run.crashes++;run.shortcutBails++;run.hitCooldown=2;run.event='shortcut-bail';}
export function forkHint(run,c){
 const f=forkAt(run.s,c);if(f&&run.forkId===f.id){
  if(isShortcut(run,c)){const gap=f.gaps.find(([a,b])=>run.s<b);return run.queuedShortcutHop!==null?'HOP QUEUED / KEEP YOUR LINE':gap&&gap[0]-run.s<16?'GAP AHEAD / SPACE OR HOP':'SHORTCUT / NARROW LINE';}
  return 'SAFE ROUTE / WIDE & LONG';
 }
 const next=(c.forks||[]).find(f=>run.s<f.start+4&&f.start-run.s<45);return next?`FORK AHEAD / ${next.side>0?'RIGHT':'LEFT'} SHORTCUT · ${next.side>0?'LEFT':'RIGHT'} SAFE`:'';
}
export function heightAt(s, course) {
  if(course.terrain==='sky')return 3500-s*.30+Math.sin(s*.055+1.4)*3.6+Math.sin(s*.019)*5;
  if(course.id==='bengaluru')return 75-s*course.slope+flyoverLift(s);
  let steps=0;
  for(const flight of course.stairs || []) {
    const distance=Math.max(0,Math.min(flight.length,s-flight.start));
    steps+=Math.floor(distance/flight.spacing)*(flight.rise+flight.spacing*course.slope)-distance*course.slope;
  }
  let rockDrop=0;
  for(const chute of course.rockChutes||[]) {
    const t=Math.max(0,Math.min(1,(s-chute.start)/(chute.end-chute.start)));
    rockDrop+=chute.drop*t*t*(3-2*t);
  }
  return 75-s*course.slope+Math.sin(s*.021)*1.35-steps-rockDrop;
}
export function stairAt(s, course) { return course.stairs.find(flight=>s>=flight.start&&s<flight.start+flight.length); }
export function curvatureAt(s, course) {
  const d=(centerAt(s+1,course)-centerAt(s-1,course))/2;
  return (centerAt(s+1,course)-2*centerAt(s,course)+centerAt(s-1,course))/Math.pow(1+d*d,1.5);
}
export function rockChuteAt(s, course) {
  return (course.rockChutes||[]).find(chute=>s>=chute.start&&s<=chute.end);
}
export function halfWidthAt(s, course) {
  if(course.terrain==='sky'){
    // Give riders an opening stretch to settle in, then taper smoothly through the run.
    const t=Math.max(0,Math.min(1,(s-60)/560));
    const blend=t*t*(3-2*t);
    return (course.width+(course.endWidth-course.width)*blend)*.5;
  }
  const fork=forkAt(s,course);if(fork){const blend=Math.min(1,(s-fork.start)/12,(fork.end-s)/12);return course.width*.5+(3.3-course.width*.5)*blend;}
  const squeeze = Math.max(0, Math.sin(s * .033 - 1.7));
  const normal=course.width*.5-squeeze*(course.id==='alpine'?.3:.5);
  const chute=rockChuteAt(s,course);
  if(!chute)return normal;
  const blend=Math.max(0,Math.min(1,(s-chute.start)/12,(chute.end-s)/12));
  return normal+(1.08-normal)*blend*blend*(3-2*blend);
}
export function makeObstacles(course) {
  if(course.terrain==='sky'||course.id==='bengaluru')return [];
  const result = [];
  for (let s = 65, i = 0; s < course.length - 45; s += 33 + (i % 3) * 8, i++) {
    if(rockChuteAt(s,course)||forkAt(s,course,12))continue;
    const kind = course.id==='halloween'?'pumpkin':i % 6 === 2 ? 'ramp' : course.environment === 'wild' ? 'rock' : i % 3 === 0 ? 'barrier' : 'crate';
    result.push({ s, x: kind === 'ramp' ? (i % 2 ? .65 : -.65) : (i % 2 ? 1 : -1) * (halfWidthAt(s, course) - .8), kind, radius: kind === 'ramp' ? .8 : .55, hit: false, cleared: false });
  }
  return result;
}
export function makeAnimals(course) {
  if(course.id!=='amazon')return [];
  return [75,225,395,570,760,975].map((s,i)=>({s,id:i,kind:'animal',species:i%2?'tapir':'capybara',side:i%2?1:-1,x:(i%2?1:-1)*(halfWidthAt(s,course)+2.5),startedAt:null,progress:0,hit:false,radius:.8})).map(a=>{const f=forkAt(a.s,course,12);if(f){a.s=f.end+22;a.x=a.side*(halfWidthAt(a.s,course)+2.5);}return a;});
}
export function updateAnimals(run,course) {
  for(const animal of run.animals||[]) {
    if(animal.startedAt===null&&run.s>=animal.s-34)animal.startedAt=run.elapsed;
    if(animal.startedAt!==null){
      animal.progress=Math.max(0,Math.min(1,(run.elapsed-animal.startedAt)/4.5));
      animal.x=animal.side*(halfWidthAt(animal.s,course)+2.5)*(1-2*animal.progress);
    }
  }
}
export function freshRun(course) {
  return { down:false,downTime:0,fallSide:1,recoverTime:0, route:'main',forkId:null,forkIntent:null,queuedShortcutHop:null,shortcutsTaken:0,shortcutBails:0,shortcutsCleared:0,s: 0, lateral: 0, speed: course.terrain==='sky'?29:0, elapsed: 0, jump: 0, verticalVelocity: 0, airtime: 0, crashes: 0, penalty: 0, hitCooldown: 0, steer: 0, distance: 0, checkpoint: 0, finished: false, obstacles: makeObstacles(course), animals:makeAnimals(course), zombies:makeZombies(course), traffic:makeTraffic(course), crossings:makeStreetCrossings(course), event: null, onStairs: false, curve: 0, rivals: course.terrain==='sky'?[]:makeRivals(), position: course.terrain==='sky'?1:5, falling:false, fallTime:0, failed:false, queuedGap:null, gapGrace:0 };
}
export const RIVAL_ROSTER = [
  {name:'ARJUN',color:0xf3a65c,skill:.92},
  {name:'MAYA',color:0x69d2ca,skill:1.01},
  {name:'NICO',color:0xe889a1,skill:.97},
  {name:'KAI',color:0xa6b5f0,skill:1.06},
];
export function makeRivals() {
  return RIVAL_ROSTER.map((rider,i)=>({...rider,route:'main',forkId:null,queuedShortcutHop:null,id:i,s:5+i*3,lateral:(i%2?1:-1)*.62,speed:0,jump:0,verticalVelocity:0,finished:false,finishTime:null,turn:0}));
}
export function racePosition(run) { return 1+run.rivals.filter(rider=>rider.finished||rider.s>run.s).length; }
export function stepRivals(run,course,dt) {
  for(const rider of run.rivals) {
    if(rider.finished)continue;
    chooseFork(rider,course);
    const shortcut=isShortcut(rider,course),route=shortcut?'shortcut':'main';
    const curve=Math.max(Math.abs(routeCurvatureAt(rider.s+5,course,route)),Math.abs(routeCurvatureAt(rider.s+12,course,route)));
    const stair=stairAt(rider.s+4,course);
    let targetSpeed=Math.min(21.5*rider.skill/(1+curve*16),stair?14.5*rider.skill:24);
    const obstacles=[...run.obstacles,...(run.traffic||[]),...(run.crossings||[]).filter(a=>a.progress>0&&a.progress<1),...(run.zombies||[]),...(run.animals||[]).filter(a=>a.progress>0&&a.progress<1)].filter(ob=>ob.s>rider.s-1&&ob.s<rider.s+19);
    let targetLane=Math.sin(rider.s*.036+rider.id*2)*.65;
    for(const obstacle of obstacles)if(obstacle.kind!=='ramp')targetLane=-(Math.sign(obstacle.x)||1)*(halfWidthAt(rider.s,course)-.42);
    for(const other of run.rivals)if(other!==rider&&other.route===rider.route&&other.s>rider.s&&other.s-rider.s<4&&Math.abs(other.lateral-rider.lateral)<.6){targetLane=other.lateral>0?-.7:.7;targetSpeed=Math.min(targetSpeed,other.speed+1);}
    if(run.route===rider.route&&Math.abs(run.s-rider.s)<4&&Math.abs(run.lateral-rider.lateral)<.7)targetLane=run.lateral>0?-.8:.8;
    const edge=routeHalfWidthAt(rider.s,course,route)-.35;
    targetLane=Math.max(-edge,Math.min(edge,targetLane));
    const laneChange=(targetLane-rider.lateral)*Math.min(1,dt*2.5);
    rider.lateral+=laneChange;
    rider.turn=laneChange/Math.max(dt,.001);
    rider.speed+=Math.max(-8,Math.min(4.5,(targetSpeed-rider.speed)*2))*dt;
    const previousS=rider.s;
    rider.s=Math.min(course.length,rider.s+rider.speed*dt/routeMetric(rider.s,course,route));
    for(const obstacle of obstacles)if(obstacle.kind==='ramp'&&previousS<obstacle.s&&rider.s>=obstacle.s&&Math.abs(rider.lateral-obstacle.x)<1){rider.jump=.03;rider.verticalVelocity=5;}
    const f=forkAt(rider.s,course),gap=shortcut&&f?.gaps.find(([a,b])=>rider.s>=a-4&&rider.s<b);
    if(gap&&rider.jump===0&&rider.s<gap[0]){rider.jump=.03;rider.verticalVelocity=5.8;}
    if(rider.jump>0){rider.verticalVelocity-=12*dt;rider.jump=Math.max(0,rider.jump+rider.verticalVelocity*dt);}
    if(shortcut&&gap&&rider.s>=gap[0]&&rider.jump<.18){rider.route='main';rider.lateral=0;rider.speed*=.25;}
    if(rider.s>=course.length){rider.finished=true;rider.finishTime=run.elapsed;}
  }
}
export function stepRun(run, course, input, dt) {
  if (run.finished) return;
  if(course.terrain==='sky')return stepSkyRun(run,course,input,dt);
  dt = Math.min(.04, Math.max(0, dt));
  run.event = null;
  run.elapsed += dt;
  updateAnimals(run,course);
  updateZombies(run,course);
  updateStreetTraffic(run,course,dt);
  run.hitCooldown = Math.max(0, run.hitCooldown - dt);
  run.recoverTime=Math.max(0,(run.recoverTime||0)-dt);
  if(run.down){
    run.downTime+=dt;run.speed=0;stepRivals(run,course,dt);run.position=racePosition(run);
    if(run.downTime>=.7&&(input.recover||input.jump))recoverRider(run,course);
    return;
  }
  const choice=(course.forks||[]).find(f=>run.s>=f.start-20&&run.s<f.start+5);
  if(choice){if((input.right-input.left)*choice.side>0)run.forkIntent=choice.id;else if((input.right-input.left)*choice.side<0)run.forkIntent=null;}
  chooseFork(run,course,true);
  const shortcut=isShortcut(run,course),route=shortcut?'shortcut':'main';
  const targetSteer = input.right - input.left;
  run.steer += (targetSteer - run.steer) * Math.min(1, dt * 9);
  run.onStairs=!!stairAt(run.s,course);
  run.curve=routeCurvatureAt(run.s,course,route);
  const grade=Math.max(.05,(heightAt(run.s,course)-heightAt(run.s+2,course))/2);
  const acceleration = 2.45 + grade * 9 + (input.pedal ? 5.2 : 0) - run.speed * .17 - (input.brake ? 14.5 : 0);
  run.speed = Math.max(0, Math.min(25, run.speed + acceleration * dt));
  run.lateral += run.steer * (.7 + run.speed * .23) * dt;
  // Cornering inertia pushes the rider to the outside; braking reduces it quadratically.
  run.lateral -= run.curve * run.speed * run.speed * (course.terrain==='snow'?.34:.25) * dt;
  const fork=forkAt(run.s,course),upcomingGap=shortcut&&fork?.gaps.find(([a])=>a>run.s&&a-run.s<16);
  if(input.jump&&upcomingGap&&run.jump<=.002){run.queuedShortcutHop=upcomingGap[0];run.event='jump-queued';}
  const launchQueued=shortcut&&run.queuedShortcutHop!==null&&run.s>=run.queuedShortcutHop-3;
  if (((input.jump&&!upcomingGap)||launchQueued) && run.jump <= .002 && run.speed > 2) {
    run.verticalVelocity = shortcut?5.8:4.7;run.queuedShortcutHop=null;
    run.jump = .015;
    run.event = 'jump';
  }
  if (run.jump > 0 || run.verticalVelocity > 0) {
    run.verticalVelocity -= 12 * dt;
    run.jump = Math.max(0, run.jump + run.verticalVelocity * dt);
    run.airtime += dt;
    if (run.jump === 0) { run.verticalVelocity = 0; run.event = 'land'; }
  }
  const oldS = run.s;
  run.s = Math.min(course.length, run.s + run.speed * dt/routeMetric(run.s,course,route));
  run.distance += run.s - oldS;
  stepRivals(run,course,dt);
  for(const animal of run.animals||[]) {
    if(!animal.hit&&animal.progress>0&&animal.progress<1&&Math.abs(run.s-animal.s)<1.25&&Math.abs(run.lateral-animal.x)<.95&&run.jump<1.3){
      crash(run,animal);if(run.down)run.event='wildlife-contact';return;
    }
  }
  if(!shortcut){
    for(const v of run.traffic||[])if(run.speed>.5&&Math.abs(run.s-v.s)<v.halfLength+.6&&Math.abs(run.lateral-v.x)<v.radius+.3){crash(run,v);run.event='traffic-contact';return;}
    for(const a of run.crossings||[])if(!a.hit&&a.progress>0&&a.progress<1&&Math.abs(run.s-a.s)<1.3&&Math.abs(run.lateral-a.x)<a.radius+.35){crash(run,a);if(run.down)run.event='crossing-contact';return;}
  }
  for(const zombie of run.zombies||[])if(run.hitCooldown===0&&Math.abs(run.s-zombie.s)<1&&Math.abs(run.lateral-zombie.x)<.65){crash(run,zombie);if(run.down)run.event='zombie-contact';return;}
  for(const rider of run.rivals) {
    if(!rider.finished&&run.hitCooldown===0&&Math.abs(run.s-rider.s)<1.2&&Math.abs(routeCenterAt(run.s,course,route)+run.lateral-routeCenterAt(run.s,course,rider.route)-rider.lateral)<.42&&Math.abs(run.jump-rider.jump)<.65){
      crash(run,rider);rider.speed*=.35;run.event='rider-contact';
      return;
    }
  }
  if(shortcut&&fork){
    const gap=fork.gaps.find(([a,b])=>oldS<b&&run.s>a);
    if((gap&&run.jump<.18)||Math.abs(run.lateral)>routeHalfWidthAt(run.s,course,'shortcut')-.18)bailShortcut(run);
    else if(oldS<fork.end-3&&run.s>=fork.end-3){run.shortcutsCleared++;run.event='shortcut-clear';}
  }
  const edge = routeHalfWidthAt(run.s,course,isShortcut(run,course)?'shortcut':'main') - .29;
  if (Math.abs(run.lateral) > edge) {
    run.lateral = Math.sign(run.lateral) * edge;
    if (run.hitCooldown === 0 && run.speed > 3) {crash(run);return;}
  }
  for (const obstacle of run.obstacles) {
    if (obstacle.cleared || obstacle.hit || obstacle.s < oldS - 2) continue;
    if (oldS <= obstacle.s + 1 && run.s >= obstacle.s - .8 && Math.abs(run.lateral - obstacle.x) < obstacle.radius + .3) {
      if (obstacle.kind === 'ramp') {
        if (run.jump < .15) { run.jump = .04; run.verticalVelocity = Math.max(4.5, run.speed * .43); run.event = 'jump'; }
        obstacle.cleared = true;
      } else if (run.jump > .85) { obstacle.cleared = true; run.event = 'clear'; }
      else if (run.hitCooldown === 0) { obstacle.hit = true; crash(run,obstacle);return; }
    }
  }
  const checkpoint = Math.min(3, Math.floor(run.s / (course.length / 4)));
  if (checkpoint > run.checkpoint) { run.checkpoint = checkpoint; run.event = 'checkpoint'; }
  run.position=racePosition(run);
  if (run.s >= course.length) { run.finished = true; run.event = 'finish'; }
}
function stepSkyRun(run,course,input,dt) {
  dt=Math.min(.04,Math.max(0,dt));run.event=null;
  if(run.falling){run.fallTime+=dt;if(run.fallTime>=1.1){run.finished=true;run.failed=true;run.event='fall';}return;}
  dt=Math.min(dt,Math.max(0,course.duration-run.elapsed));
  run.elapsed=Math.min(course.duration,run.elapsed+dt);
  const target=input.right-input.left;
  run.steer+=(target-run.steer)*Math.min(1,dt*12);
  run.curve=curvatureAt(run.s,course);
  const grade=(heightAt(run.s,course)-heightAt(run.s+1,course));
  run.speed=Math.max(20,Math.min(37,run.speed+(grade*8+2+(input.pedal?4:0)-run.speed*.09-(input.brake?12:0))*dt));
  run.lateral+=(run.steer*(1+run.speed*.19)-run.curve*run.speed*run.speed*.14*Math.min(1,run.s/45))*dt;
  const upcoming=course.gaps.find(([a])=>a>run.s&&a-run.s<=45);
  if(input.jump&&run.jump===0&&upcoming&&run.gapGrace===0){run.queuedGap=upcoming[0];run.event='jump-queued';}
  const launchQueued=run.queuedGap!==null&&run.s>=run.queuedGap-7;
  const launchManual=input.jump&&!upcoming;
  if(run.jump===0&&(launchQueued||launchManual)){
    run.verticalVelocity=5.8;run.jump=.015;run.queuedGap=null;run.event='jump';
  }
  if(run.jump>0){run.verticalVelocity-=12*dt;run.jump=Math.max(0,run.jump+run.verticalVelocity*dt);run.airtime+=dt;}
  const oldS=run.s;run.s+=run.speed*dt;run.distance=run.s;
  const gap=course.gaps.some(([a,b])=>oldS<b&&run.s>a);
  if(run.jump>=.12)run.gapGrace=0;
  else if(gap||run.gapGrace>0)run.gapGrace+=dt;
  if(Math.abs(run.lateral)>halfWidthAt(run.s,course)-.16||run.gapGrace>=.18){
    run.falling=true;run.failed=true;run.event='fall';return;
  }
  if(run.elapsed>=course.duration-1e-8){run.elapsed=course.duration;run.finished=true;run.event='finish';}
}
export function causesFall(body){
  return !!body&&(!!body.name||['car','auto','bus','cow','rock','barrier','crate'].includes(body.kind)||(body.kind==='animal'&&body.species==='tapir'));
}
function crash(run,body=null) {
  if(run.down)return;
  const speed=run.speed;run.fallSide=run.lateral>=(body?.x??0)?1:-1;
  if(body){
    impactBody(body,speed,-run.fallSide,run.elapsed);
    if(body.kind==='animal'||['dog','cow','pedestrian'].includes(body.kind))body.hit=true;
    // Resolve the bike outside the contacted body's rear face before falling.
    if(causesFall(body))run.s=Math.max(0,Math.min(run.s,body.s-(body.halfLength||.65)-.75));
  }
  if(!causesFall(body)){
    run.speed=body?Math.min(run.speed*.6,5):run.speed*.8;
    run.hitCooldown=.8;run.event=body?'minor-contact':'edge-scrape';return;
  }
  run.down=true;run.downTime=0;run.speed=0;run.jump=0;run.verticalVelocity=0;
  run.queuedShortcutHop=null;run.crashes++;run.penalty+=2;run.hitCooldown=1.6;run.event='crash';
}
export function recoverRider(run,c){
  const bodies=[...run.traffic,...run.obstacles.filter(o=>!o.hit&&o.kind!=='ramp'),...run.crossings,...run.animals,...run.zombies,...run.rivals.map(r=>({...r,x:r.lateral,radius:.4}))];
  for(let back=0;back<=24;back+=2){
    const s=Math.max(0,run.s-back),edge=halfWidthAt(s,c)-.45;
    for(const x of [0,-edge*.5,edge*.5,-edge,edge]){
      if(bodies.some(b=>Math.abs(b.s-s)<(b.halfLength||1)+1.4&&Math.abs((b.x||0)-x)<(b.radius||.5)+.65))continue;
      run.s=s;run.lateral=x;run.route='main';run.forkId=forkAt(s,c)?.id??null;
      run.down=false;run.recoverTime=.45;run.steer=0;run.speed=0;run.hitCooldown=.5;run.event='recovered';return true;
    }
  }
  run.event='recovery-blocked';return false;
}
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${(seconds % 60).toFixed(2).padStart(5, '0')}`;
}
export function medalFor(time, course) {
  return time <= course.par ? 'GOLD' : time <= course.par * 1.3 ? 'SILVER' : 'BRONZE';
}
