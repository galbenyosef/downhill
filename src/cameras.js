import {routeCenterAt,routeHeightAt,routeHalfWidthAt} from './game.js';
export const CAMERA_MODES=['FPV','Aerial','Behind','Side'];
export function nextCameraMode(mode){return (mode+1)%CAMERA_MODES.length;}
export function followCameraPose(mode,run,c){
  const s=run.s,route=run.route||'main',x=routeCenterAt(s,c,route)+run.lateral;
  const y=routeHeightAt(s,c,route)+run.jump-(run.falling?(run.fallTime||0)**2*16:0);
  const dx=(routeCenterAt(s+1,c,route)-routeCenterAt(s-1,c,route))/2;
  const len=Math.hypot(dx,1),forward=[dx/len,0,-1/len],right=[1/len,0,dx/len];
  let back=7,height=3.6,side=0;
  if(mode===1){back=5;height=22;}
  if(mode===3){back=1.4;height=2.3;side=Math.max(1.2,Math.min(4,routeHalfWidthAt(s,c,route)-Math.abs(run.lateral)-.4));}
  const cameraS=s+forward[2]*back-right[2]*side;
  const cameraY=run.falling?y+height:Math.max(y+height,routeHeightAt(cameraS,c,route)+2.2);
  return {position:[x-forward[0]*back+right[0]*side,cameraY,-cameraS],target:[x,y+1,-s],fov:mode===1?62:70};
}
