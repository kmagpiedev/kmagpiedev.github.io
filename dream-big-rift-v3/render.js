let viewportWidth=0,viewportHeight=0,renderScale=QUALITY.renderScale,currentDpr=QUALITY.dpr;
let projection=mat4Identity(),view=mat4Identity(),vp=mat4Identity();
function resize(force=false){
  const cssW=Math.max(1,innerWidth),cssH=Math.max(1,innerHeight);
  const w=Math.max(1,Math.floor(cssW*currentDpr*renderScale));
  const h=Math.max(1,Math.floor(cssH*currentDpr*renderScale));
  if(force||canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;viewportWidth=w;viewportHeight=h;gl.viewport(0,0,w,h);}
}
addEventListener('resize',()=>resize(true),{passive:true});
resize(true);

gl.clearColor(.004,.011,.025,1);
gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
gl.disable(gl.CULL_FACE);

function cameraAt(t){
  const keys=[
    {t:0, eye:[0,.02,2.55],target:[0,0,-5.35],fov:40},
    {t:8, eye:[.08,.04,2.05],target:[0,0,-5.55],fov:42},
    {t:18,eye:[.42,.12,4.65],target:[.10,0,-8.05],fov:46},
    {t:28,eye:[-.10,.18,4.05],target:[.28,.02,-8.0],fov:42},
    {t:38,eye:[.02,.04,3.55],target:[-.28,0,-7.95],fov:39},
    {t:48,eye:[.20,.15,4.05],target:[.08,-.02,-7.95],fov:41},
    {t:56,eye:[0,.02,3.90],target:[0,0,-7.86],fov:39},
    {t:60,eye:[0,.02,2.55],target:[0,0,-5.35],fov:40}
  ];
  let a=keys[0],b=keys[1];
  for(let i=0;i<keys.length-1;i++){if(t>=keys[i].t&&t<=keys[i+1].t){a=keys[i];b=keys[i+1];break;}}
  const u=smoother(a.t,b.t,t);
  let eye=lerp3(a.eye,b.eye,u),target=lerp3(a.target,b.target,u);
  const aspect=viewportWidth/Math.max(1,viewportHeight);
  if(aspect<.78){eye[2]+=5.8;target[0]*=.55;target[1]*=.75;}
  const drift=REDUCED_MOTION?0:.018;
  eye[0]+=Math.sin(t*.15)*drift;eye[1]+=Math.sin(t*.10+.8)*drift*.65;
  const fov=mix(a.fov,b.fov,u)*Math.PI/180;
  projection=mat4Perspective(fov,viewportWidth/viewportHeight,.1,120);
  view=mat4LookAt(eye,target,[0,1,0]);vp=mat4Multiply(projection,view);
}

function drawBackground(t,windowAmount,storm,after){
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.disable(gl.BLEND);
  gl.useProgram(bgProgram);gl.bindVertexArray(null);
  gl.uniform2f(bgU.uResolution,viewportWidth,viewportHeight);gl.uniform1f(bgU.uTime,t);gl.uniform1f(bgU.uWindow,windowAmount);gl.uniform1f(bgU.uCosmos,1-windowAmount);gl.uniform1f(bgU.uStorm,storm);gl.uniform1f(bgU.uAfter,after);
  gl.drawArrays(gl.TRIANGLES,0,3);
  gl.enable(gl.BLEND);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
function drawStars(t,opacity,storm,field=stars){
  if(opacity<.002)return;
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.useProgram(starProgram);gl.bindVertexArray(field.vao);gl.uniformMatrix4fv(starU.uVP,false,vp);gl.uniform1f(starU.uTime,t);gl.uniform1f(starU.uOpacity,opacity);gl.uniform1f(starU.uStorm,storm);gl.drawArrays(gl.POINTS,0,field.count);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
function drawRibbon(mesh,model,t,reveal,opacity,wave=.03,travel=0){
  if(opacity<.002||reveal<.001)return;
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.useProgram(ribbonProgram);gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(ribbonU.uVP,false,vp);gl.uniformMatrix4fv(ribbonU.uModel,false,model);gl.uniform1f(ribbonU.uTime,t);gl.uniform1f(ribbonU.uReveal,reveal);gl.uniform1f(ribbonU.uOpacity,opacity);gl.uniform1f(ribbonU.uWave,wave);gl.uniform1f(ribbonU.uTravel,travel);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_INT,0);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
function drawRift(t,open,storm,seal,opacity){
  if(opacity<.002)return;
  const mvp=mat4Multiply(vp,riftModel);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(riftProgram);gl.bindVertexArray(riftPlane.vao);gl.uniformMatrix4fv(riftU.uMVP,false,mvp);gl.uniform1f(riftU.uTime,t);gl.uniform1f(riftU.uOpen,open);gl.uniform1f(riftU.uStorm,storm);gl.uniform1f(riftU.uSeal,seal);gl.uniform1f(riftU.uOpacity,opacity);gl.drawElements(gl.TRIANGLES,riftPlane.count,gl.UNSIGNED_SHORT,0);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
function birdModel(t,fly){
  const roll=mix(-.055,.045,fly)+Math.sin(fly*Math.PI)*-.045;
  const scale=.88+Math.sin(fly*Math.PI)*.045;
  return mat4TRS([-.08,-.02,-7.72],[0,.065,roll],[scale,scale,scale]);
}

function drawSolid(mesh,matrix,color,blendAdd=false){
  gl.useProgram(solidProgram);gl.bindVertexArray(mesh.vao);gl.uniformMatrix4fv(solidU.uMVP,false,mat4Multiply(vp,matrix));gl.uniform4f(solidU.uColor,color[0],color[1],color[2],color[3]);
  gl.blendFunc(gl.SRC_ALPHA,blendAdd?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);gl.drawElements(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0);
}
function birdRoot(model,fly){
  return mat4Multiply(model,mat4TRS([mix(-2.28,1.72,fly),Math.sin(fly*Math.PI)*.38,Math.sin(fly*Math.PI)*.20],[0,0,0],[1,1,1]));
}
function drawBirdCore(model,opacity,morph,fly,flap){
  const a=opacity*smooth(.46,.84,morph);
  if(a<.002)return;
  const root=birdRoot(model,fly);
  const upperM=mat4Multiply(root,mat4TRS([-.12,.16,.02],[0,0,flap*.50],[1,1,1]));
  const lowerM=mat4Multiply(root,mat4TRS([-.10,-.02,.018],[0,0,-flap*.38],[1,1,1]));
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  const haloA=a*.046;
  drawSolid(birdTail,root,[.06,.35,.54,haloA*.78],true);
  drawSolid(birdWingUpper,upperM,[.05,.43,.63,haloA],true);
  drawSolid(birdWingLower,lowerM,[.04,.38,.58,haloA*.85],true);
  drawSolid(birdDisc,mat4Multiply(root,mat4TRS([.02,-.03,-.03],[0,0,-.04],[1.43,.63,1])),[.07,.38,.58,haloA],true);

  drawSolid(birdTail,root,[.010,.075,.120,a*.88]);
  drawSolid(birdWingUpper,upperM,[.012,.125,.190,a*.82]);
  drawSolid(birdWingLower,lowerM,[.010,.100,.165,a*.78]);
  drawSolid(birdDisc,mat4Multiply(root,mat4TRS([.02,-.03,0],[0,0,-.04],[1.34,.57,1])),[.006,.075,.120,a*.94]);
  drawSolid(birdDisc,mat4Multiply(root,mat4TRS([1.12,.29,.014],[0,0,.02],[.45,.40,1])),[.004,.054,.092,a*.96]);

  drawSolid(birdBelly,root,[.90,.91,.82,a*.78]);
  drawSolid(birdDisc,mat4Multiply(root,mat4TRS([.73,.16,.045],[0,0,-.08],[.34,.16,1])),[.91,.91,.82,a*.72]);
  drawSolid(birdWingPatchUpper,upperM,[.91,.90,.79,a*.78]);
  drawSolid(birdWingPatchLower,lowerM,[.88,.89,.78,a*.56]);
  drawSolid(birdTailWhite,root,[.82,.84,.74,a*.22]);
  drawSolid(birdWingUpper,mat4Multiply(upperM,mat4TRS([0,0,.025],[0,0,0],[.96,.96,1])),[.03,.56,.56,a*.15],true);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
function drawMagpie(t,morph,flap,fly,opacity){
  if(opacity<.002||morph<.001)return;
  const model=birdModel(t,fly);
  drawBirdCore(model,opacity,morph,fly,flap);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);
  gl.useProgram(featherProgram);gl.bindVertexArray(magpie.vao);gl.uniformMatrix4fv(featherU.uVP,false,vp);gl.uniformMatrix4fv(featherU.uModel,false,model);gl.uniform1f(featherU.uTime,t);gl.uniform1f(featherU.uMorph,morph);gl.uniform1f(featherU.uFlap,flap);gl.uniform1f(featherU.uFly,fly);gl.uniform1f(featherU.uOpacity,opacity);
  gl.uniform1f(featherU.uHalo,1);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.drawElementsInstanced(gl.TRIANGLES,magpie.count,gl.UNSIGNED_SHORT,0,magpie.instances);
  gl.uniform1f(featherU.uHalo,0);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawElementsInstanced(gl.TRIANGLES,magpie.count,gl.UNSIGNED_SHORT,0,magpie.instances);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
  drawBirdDetails(model,opacity,morph,fly);
}
function drawBirdDetails(model,opacity,morph,fly){
  if(morph<.68)return;
  const alpha=opacity*smooth(.68,.96,morph);
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  const root=birdRoot(model,fly);
  gl.bindVertexArray(beak.vao);gl.useProgram(solidProgram);gl.uniformMatrix4fv(solidU.uMVP,false,mat4Multiply(vp,root));gl.uniform4f(solidU.uColor,.90,.61,.23,alpha*.78);gl.drawElements(gl.TRIANGLES,beak.count,gl.UNSIGNED_SHORT,0);
  const eyeM=mat4Multiply(root,mat4TRS([1.23,.38,.06],[0,0,0],[.052,.052,1]));
  gl.bindVertexArray(eye.vao);gl.uniformMatrix4fv(solidU.uMVP,false,mat4Multiply(vp,eyeM));gl.uniform4f(solidU.uColor,1.0,.80,.30,alpha);gl.drawElements(gl.TRIANGLES,eye.count,gl.UNSIGNED_SHORT,0);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}

function drawPetals(t,bloom,opacity){
  if(bloom<.002||opacity<.002)return;
  gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  gl.useProgram(petalProgram);gl.bindVertexArray(petals.vao);gl.uniformMatrix4fv(petalU.uVP,false,vp);gl.uniformMatrix4fv(petalU.uModel,false,lotusModel);gl.uniform1f(petalU.uTime,t);gl.uniform1f(petalU.uBloom,bloom);gl.uniform1f(petalU.uOpacity,opacity);
  gl.uniform1f(petalU.uHalo,1);gl.drawElementsInstanced(gl.TRIANGLES,petals.count,gl.UNSIGNED_SHORT,0,petals.instances);
  gl.uniform1f(petalU.uHalo,0);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.drawElementsInstanced(gl.TRIANGLES,petals.count,gl.UNSIGNED_SHORT,0,petals.instances);
  gl.depthMask(true);gl.enable(gl.DEPTH_TEST);
}
