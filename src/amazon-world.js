import {impactPose} from './impacts.js';
import * as THREE from 'three';
import {centerAt,heightAt,halfWidthAt,makeAnimals,forkAt,routeCenterAt,routeHeightAt} from './game.js';

export class AmazonWorld {
  constructor(w){
    this.w=w;this.course=w.course;const c=this.course,rand=w.rand;
    w.scene.fog.density=.008;w.sun.intensity=1.65;w.renderer.toneMappingExposure=1.3;
    // A low riverbed keeps the ribbon of water visible beside the dirt trail.
    this.water=w.surface(s=>-7-Math.sin(s*.023),s=>-17-Math.sin(s*.023)*2,0x23666e,-.08);
    this.water.material.roughness=.28;this.water.material.metalness=.25;
    this.water.material.emissive.setHex(0x103d46);this.water.material.emissiveIntensity=.35;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.fillStyle='#347581';ctx.fillRect(0,0,128,128);
    for(let i=0;i<38;i++){ctx.strokeStyle=i%2?'#81b8bc':'#245c69';ctx.globalAlpha=.35;ctx.beginPath();const y=rand()*128;ctx.moveTo(rand()*100,y);ctx.lineTo(128,y+rand()*3);ctx.stroke();}
    this.waterMap=new THREE.CanvasTexture(canvas);this.waterMap.wrapS=this.waterMap.wrapT=THREE.RepeatWrapping;this.water.material.map=this.waterMap;
    const moon=new THREE.Mesh(new THREE.SphereGeometry(8,20,16),new THREE.MeshBasicMaterial({color:0xdce9d2}));moon.position.set(-80,145,-240);w.level.add(moon);
    for(let s=-25,index=0;s<c.length+70;s+=9,index++)for(const side of [-1,1]){
      if(forkAt(s,c,16))continue;
      const y=heightAt(s,c),x=centerAt(s,c),half=halfWidthAt(s,c);
      for(let k=0;k<3;k++){
        const offset=side<0?(k===0?half+1.7:22+k*6):half+2.5+k*7;
        const tx=x+side*(offset+rand()),tz=-s,h=14+rand()*14;
        w.cylinder([tx,y-.2,tz],[tx+side*.7,y+h,tz],.27+rand()*.2,0x485547);
        // Broadleaf crowns, spreading branches, buttress roots and hanging vines.
        for(let j=0;j<3;j++){
          const bx=tx+(j-1)*2.5,by=y+h-2+Math.sin(j)*2;
          w.cylinder([tx,y+h-5,tz],[bx,by,tz+1.4],.1,0x485547);
          const crown=new THREE.IcosahedronGeometry(3.4+rand(),1);crown.scale(1.3,.5,1.15);w.addGeom(crown,[0x24533e,0x32634a,0x407b59][j],[bx,by,tz]);
          if(j===1)w.cylinder([bx,by-1,tz+2],[bx+.2,by-8,tz+2.3],.025,0x658562);
        }
        for(let j=0;j<3;j++)w.cylinder([tx,y+1.6,tz],[tx+Math.cos(j*2.1)*1.1,y,tz+Math.sin(j*2.1)*1.1],.15,0x52614d);
      }
      const px=x+side*(half+1),pz=-s;
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3,tip=[px+Math.cos(a)*.9,y+1.4+rand()*.5,pz+Math.sin(a)*.9];
        w.cylinder([px,y,pz],tip,.022,0x719a63);
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([px,y+.2,pz,tip[0]+.28,tip[1]-.25,tip[2],tip[0],tip[1],tip[2],tip[0]-.28,tip[1]-.25,tip[2]],3));g.setIndex([0,1,2,0,2,3,2,1,0,3,2,0]);g.computeVertexNormals();w.addGeom(g,[0x568b59,0x397d50,0x70a26b][j%3],[0,0,0]);
      }
      if(index%4===0)w.addGeom(new THREE.DodecahedronGeometry(.55,1),0x5b8070,[x-6,y-.05,-s]);
    }
    const glowPositions=[];
    for(let s=0;s<c.length;s+=3)glowPositions.push(centerAt(s,c)+(rand()-.5)*14,heightAt(s,c)+1+rand()*4,-s);
    const glowGeo=new THREE.BufferGeometry();glowGeo.setAttribute('position',new THREE.Float32BufferAttribute(glowPositions,3));
    this.fireflies=new THREE.Points(glowGeo,new THREE.PointsMaterial({color:0xd4f59d,size:.065,transparent:true,opacity:.7}));w.level.add(this.fireflies);
    this.headlight=new THREE.SpotLight(0xdfeccb,32,48,.48,.85,1);this.headlight.target=new THREE.Object3D();w.level.add(this.headlight,this.headlight.target);
    this.animals=makeAnimals(c).map(a=>this.animal(a));
    this.birds=Array.from({length:12},(_,i)=>this.bird(i));
    for(const a of makeAnimals(c)){const s=a.s-26,x=centerAt(s,c)+halfWidthAt(s,c)+.4,y=heightAt(s,c);w.box(x,y+.85,-s,.06,1.7,.06,0x506850);w.frontSign('WILDLIFE / SLOW',x,y+1.7,-s,1.5,.45);}
  }
  oval(group,color,pos,scale){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),this.w.material(color));mesh.position.set(...pos);mesh.scale.set(...scale);mesh.castShadow=true;group.add(mesh);return mesh;}
  animal(a){
    const g=new THREE.Group(),tapir=a.species==='tapir',color=tapir?0x777b70:0x9b8968;
    this.oval(g,color,[0,.57,0],[.67,.38,.3]);this.oval(g,color,[.56,.66,0],[.32,.28,.25]);
    this.oval(g,tapir?0x626d67:0x9b8968,[.83,.55,0],tapir?[.25,.12,.14]:[.2,.19,.23]);
    for(const z of [-.17,.17]){this.oval(g,0x3a4642,[.58,.91,z],[.075,.12,.06]);this.oval(g,0x162823,[.75,.75,z*1.4],[.025,.025,.025]);}
    const legs=[];for(const x of [-.4,.38])for(const z of [-.2,.2])legs.push(this.oval(g,color,[x,.21,z],[.10,.24,.1]));
    this.w.level.add(g);return {group:g,legs};
  }
  bird(i){
    const g=new THREE.Group();this.oval(g,0xa6b8a4,[0,0,0],[.12,.1,.26]);
    this.oval(g,0xd0ceaa,[0,.1,-.2],[.12,.12,.1]);
    const wings=[];for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.BoxGeometry(.58,.035,.22),this.w.material(0x819b8e));wing.position.set(side*.32,0,0);g.add(wing);wings.push(wing);}
    this.w.level.add(g);return {group:g,wings,s:35+i*95};
  }
  update(run,time,menu){
    const c=this.course,states=run.animals||makeAnimals(c);
    this.headlight.position.set(routeCenterAt(run.s,c,run.route)+run.lateral,routeHeightAt(run.s,c,run.route)+1.4,-run.s);
    this.headlight.target.position.set(routeCenterAt(run.s+20,c,run.route),routeHeightAt(run.s+20,c,run.route),-run.s-20);
    this.waterMap.offset.y=-time*.12;this.fireflies.material.opacity=.55+.2*Math.sin(time*2);
    states.forEach((a,i)=>{
      const model=this.animals[i];model.group.visible=Math.abs(a.s-run.s)<130;
      const preview=menu?Math.sin(time*.5+i):0,x=menu?preview*(halfWidthAt(a.s,c)+2):a.x;
      const p=impactPose(a,run.elapsed||0);model.group.position.set(centerAt(a.s,c)+x+p.x,heightAt(a.s,c)+.04+p.y,-a.s);model.group.rotation.z=p.tilt;model.group.rotation.y=a.side>0?Math.PI:0;
      const walking=menu||(a.progress>0&&a.progress<1),t=menu?time:run.elapsed;
      model.legs.forEach((leg,j)=>{leg.rotation.z=walking?Math.sin(t*9+j*Math.PI)*.35:0;});
    });
    this.birds.forEach((bird,i)=>{const s=bird.s+Math.sin(time*.35+i)*8;bird.group.visible=Math.abs(s-run.s)<150;bird.group.position.set(centerAt(s,c)+Math.sin(time*.6+i)*9,heightAt(s,c)+6+i%3,-s);bird.group.rotation.y=Math.cos(time*.6+i)>0?-Math.PI/2:Math.PI/2;bird.wings.forEach((wing,j)=>wing.rotation.z=Math.sin(time*7+i)*(j?1:-1)*.55);});
  }
}
