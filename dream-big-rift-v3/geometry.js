function createPlaneGeometry(width = 2, height = 2) {
  const positions = new Float32Array([-width/2,-height/2,0, width/2,-height/2,0, width/2,height/2,0, -width/2,height/2,0]);
  const uvs = new Float32Array([0,0,1,0,1,1,0,1]);
  const indices = new Uint16Array([0,1,2,0,2,3]);
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, createBuffer(positions)); attrib(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER, createBuffer(uvs)); attrib(1,2,gl.FLOAT,false,0,0);
  const index = createBuffer(indices, gl.ELEMENT_ARRAY_BUFFER);
  gl.bindVertexArray(null);
  return { vao, index, count: indices.length };
}
function createFeatherGeometry() {
  const positions = new Float32Array([
    0,-.52,0, -.40,-.04,0, -.23,.39,0, 0,.56,0, .23,.39,0, .40,-.04,0
  ]);
  const uvs = new Float32Array([.5,0, .08,.43, .26,.82, .5,1, .74,.82, .92,.43]);
  const indices = new Uint16Array([0,1,2,0,2,3,0,3,4,0,4,5]);
  return { positions, uvs, indices };
}
function createCircleGeometry(segments = 48) {
  const p=[0,0,0];
  for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2;p.push(Math.cos(a),Math.sin(a),0);}
  const idx=[];for(let i=1;i<=segments;i++)idx.push(0,i,i+1);
  return {positions:new Float32Array(p),indices:new Uint16Array(idx)};
}

function createStars(count, dust = false) {
  const positions=new Float32Array(count*3), colors=new Float32Array(count*3), sizePhase=new Float32Array(count*2);
  const palette=dust ? [[.95,.80,.48],[.24,.76,1.0],[.77,.88,1.0],[.62,.36,.95]] : [[.55,.76,1.0],[1.0,.86,.58],[.72,.90,1.0],[.62,.44,.94]];
  for(let i=0;i<count;i++){
    const r=dust?rand(2.2,10):rand(11,65);
    const a=rand(0,Math.PI*2), y=rand(-1,1);
    const rr=Math.sqrt(1-y*y)*r;
    positions[i*3]=Math.cos(a)*rr+(dust?0:.5);
    positions[i*3+1]=y*r;
    positions[i*3+2]=(dust?rand(-10,-6):-rand(8,58));
    const c=palette[Math.floor(rand(0,palette.length))];
    colors.set(c,i*3);
    sizePhase[i*2]=dust?rand(.6,2.4):rand(.45,2.1);
    sizePhase[i*2+1]=random();
  }
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(positions));attrib(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(colors));attrib(1,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(sizePhase));attrib(2,2,gl.FLOAT,false,0,0);
  gl.bindVertexArray(null);
  return {vao,count};
}

function catmull(points, t) {
  const n=points.length-1;
  const p=clamp(t)*n;
  const i=Math.min(n-1,Math.floor(p));
  const f=p-i;
  const p0=points[Math.max(0,i-1)], p1=points[i], p2=points[Math.min(n,i+1)], p3=points[Math.min(n,i+2)];
  const f2=f*f,f3=f2*f;
  const out=[0,0,0];
  for(let k=0;k<3;k++)out[k]=.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f2+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f3);
  return out;
}
function buildRibbon(paths, width = .06, alpha = .7) {
  const positions=[], offsets=[], uvs=[], colors=[], indices=[];
  let base=0;
  paths.forEach((path,pathIndex)=>{
    const segments=path.segments||150;
    const color=path.color;
    const localWidth=path.width||width;
    for(let i=0;i<=segments;i++){
      const t=i/segments;
      const p=catmull(path.points,t);
      const p0=catmull(path.points,Math.max(0,t-1/segments));
      const p1=catmull(path.points,Math.min(1,t+1/segments));
      const dx=p1[0]-p0[0],dy=p1[1]-p0[1];
      const len=Math.hypot(dx,dy)||1;
      const nx=-dy/len,ny=dx/len;
      const taper=Math.sin(Math.PI*clamp(t))*.36+.64;
      for(const side of [-1,1]){
        positions.push(...p);
        offsets.push(nx*localWidth*side*taper,ny*localWidth*side*taper,0);
        uvs.push(t,side);
        colors.push(color[0],color[1],color[2],color[3]??alpha);
      }
      if(i<segments){const o=base+i*2;indices.push(o,o+1,o+2,o+1,o+3,o+2);}
    }
    base+=(segments+1)*2;
  });
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(new Float32Array(positions)));attrib(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(new Float32Array(offsets)));attrib(1,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(new Float32Array(uvs)));attrib(2,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(new Float32Array(colors)));attrib(3,4,gl.FLOAT,false,0,0);
  const index=createBuffer(new Uint32Array(indices),gl.ELEMENT_ARRAY_BUFFER);gl.bindVertexArray(null);
  return {vao,index,count:indices.length};
}

const OBANG = [
  [.97,.87,.66,.82],
  [.96,.54,.22,.78],
  [.15,.64,.96,.82],
  [.93,.24,.28,.76],
  [.18,.76,.54,.74]
];
function createLatticeRibbons(widthScale=1,alphaScale=1) {
  const paths=[];
  const ivory=[.98,.91,.72,.83*alphaScale];
  const pale=[.69,.84,.91,.64*alphaScale];
  const gold=[1.0,.61,.17,.90*alphaScale];
  const addFlower=(cx,cy,r,petals,accent=0)=>{
    for(let k=0;k<petals;k++){
      const a=k/petals*Math.PI*2;
      const dx=Math.cos(a),dy=Math.sin(a),px=-dy,py=dx;
      const pts=[
        [cx+dx*r*.12+px*r*.08,cy+dy*r*.12+py*r*.08,0.0],
        [cx+dx*r*.55+px*r*.28,cy+dy*r*.55+py*r*.28,0.0],
        [cx+dx*r,cy+dy*r,0.0],
        [cx+dx*r*.55-px*r*.28,cy+dy*r*.55-py*r*.28,0.0],
        [cx+dx*r*.12-px*r*.08,cy+dy*r*.12-py*r*.08,0.0]
      ];
      paths.push({color:(k+accent)%3===0?gold:((k+accent)%3===1?ivory:pale),width:(.026+((k+accent)%3===0?.010:0))*widthScale,segments:Math.max(22,Math.round(42*QUALITY.geometry)),points:pts});
    }
    const ring=[];const n=24;
    for(let i=0;i<=n;i++){const a=i/n*Math.PI*2;ring.push([cx+Math.cos(a)*r*.32,cy+Math.sin(a)*r*.32,0.0]);}
    paths.push({color:gold,width:.026*widthScale,segments:Math.max(28,Math.round(58*QUALITY.geometry)),points:ring});
  };
  addFlower(0,0,1.58,12,0);
  addFlower(-2.58,-1.62,.72,8,1);
  addFlower(2.58,-1.62,.72,8,2);
  addFlower(-2.58,1.62,.72,8,2);
  addFlower(2.58,1.62,.72,8,1);
  const frame=[[-3.32,-2.10,0.0],[3.32,-2.10,0.0],[3.32,2.10,0.0],[-3.32,2.10,0.0],[-3.32,-2.10,0.0]];
  const diamond=[[0,-2.10,0.0],[3.32,0,0.0],[0,2.10,0.0],[-3.32,0,0.0],[0,-2.10,0.0]];
  paths.push({color:ivory,width:.032*widthScale,segments:Math.max(50,Math.round(90*QUALITY.geometry)),points:frame});
  paths.push({color:gold,width:.024*widthScale,segments:Math.max(50,Math.round(90*QUALITY.geometry)),points:diamond});
  [[[-3.32,0,0.0],[3.32,0,0.0]],[[0,-2.10,0.0],[0,2.10,0.0]]].forEach((pts,i)=>paths.push({color:i?ivory:pale,width:.018*widthScale,segments:Math.max(12,Math.round(24*QUALITY.geometry)),points:pts}));
  return buildRibbon(paths,.032*widthScale,.82*alphaScale);
}

function createObangRibbons(widthScale=1,alphaScale=1) {
  const paths=[];
  for(let k=0;k<5;k++){
    const phase=(k/5)*Math.PI*2-.42;
    const c=OBANG[k];
    paths.push({color:[c[0],c[1],c[2],c[3]*alphaScale],width:(.056+(k===0?.016:0))*widthScale,segments:Math.max(84,Math.round(150*QUALITY.geometry)),points:[
      [0,0,-5.28],
      [Math.cos(phase)*.42,Math.sin(phase)*.32,-5.72],
      [Math.cos(phase+.45)*1.12,Math.sin(phase+.45)*.76,-6.35],
      [-1.55+Math.cos(phase)*.58,Math.sin(phase+1.0)*1.02,-7.06],
      [-.35+Math.cos(phase+.7)*.65,Math.sin(phase+1.6)*.82,-7.66],
      [1.12+Math.cos(phase+1.1)*.72,Math.sin(phase+2.1)*.62,-8.02],
      [2.84,Math.sin(phase+2.5)*.44,-8.34],
      [4.65,(k-2)*.17,-8.54]
    ]});
  }
  return buildRibbon(paths,.068*widthScale,.80*alphaScale);
}
function createBridgeRibbons(widthScale=1,alphaScale=1) {
  const paths=[];
  const upper=[[-4.8,-.02,-7.86],[-3.45,.18,-7.89],[-2.55,1.16,-7.96],[-1.30,1.36,-8.00],[-.10,.12,-7.84],[1.18,-1.34,-8.07],[2.48,-1.14,-8.02],[3.44,-.18,-7.90],[4.82,.02,-7.84]];
  const lower=[[-4.8,.02,-7.82],[-3.45,-.18,-7.88],[-2.55,-1.16,-8.04],[-1.30,-1.36,-8.08],[.10,-.12,-7.92],[1.18,1.34,-7.86],[2.48,1.14,-7.92],[3.44,.18,-7.88],[4.82,-.02,-7.82]];
  for(let k=0;k<5;k++){
    const c=OBANG[k];const off=(k-2)*.045;
    const tweak=(pts,sign)=>pts.map((p,i)=>[p[0],p[1]+off,p[2]+sign*off*.45+(i===4?(k%2?-.075:.075):0)]);
    paths.push({color:[c[0],c[1],c[2],c[3]*.78*alphaScale],width:(.036+(k===0?.010:0))*widthScale,segments:Math.max(92,Math.round(168*QUALITY.geometry)),points:tweak(upper,1)});
    paths.push({color:[c[0],c[1],c[2],c[3]*.72*alphaScale],width:(.032+(k===1?.010:0))*widthScale,segments:Math.max(92,Math.round(168*QUALITY.geometry)),points:tweak(lower,-1)});
  }
  paths.push({color:[1,.70,.24,.94*alphaScale],width:.072*widthScale,segments:Math.max(108,Math.round(194*QUALITY.geometry)),points:upper});
  paths.push({color:[.92,.88,.69,.86*alphaScale],width:.056*widthScale,segments:Math.max(108,Math.round(194*QUALITY.geometry)),points:lower});
  return buildRibbon(paths,.054*widthScale,.82*alphaScale);
}
function createLotusRings(widthScale=1,alphaScale=1) {
  const paths=[];
  [0.72,1.40,2.12,2.72].forEach((r,i)=>{
    const pts=[];const seg=36;
    for(let j=0;j<=seg;j++){const a=j/seg*Math.PI*2;const wobble=i===2?.035*Math.sin(a*12.0):0;pts.push([Math.cos(a)*(r+wobble),Math.sin(a)*(r+wobble),-7.96+.025*i]);}
    const palette=[[1,.72,.25,.90],[.93,.89,.70,.72],[.10,.60,.68,.66],[.20,.36,.78,.62]];
    paths.push({color:[...palette[i].slice(0,3),palette[i][3]*alphaScale],width:(i===0?.052:(i===1?.038:.026))*widthScale,segments:Math.max(62,Math.round(116*QUALITY.geometry)),points:pts});
  });
  return buildRibbon(paths,.044*widthScale,.68*alphaScale);
}
function sampleEllipse(cx,cy,rx,ry,rot=0){
  const a=rand(0,Math.PI*2),r=Math.sqrt(random());let x=Math.cos(a)*rx*r,y=Math.sin(a)*ry*r;const s=Math.sin(rot),c=Math.cos(rot);return [cx+c*x-s*y,cy+s*x+c*y];
}
function buildMagpie(count) {
  const starts=new Float32Array(count*3),targets=new Float32Array(count*3),scaleAngle=new Float32Array(count*4),colors=new Float32Array(count*4),meta=new Float32Array(count*4);
  const dark=[.018,.070,.115,.92], blue=[.025,.31,.44,.92], jade=[.035,.43,.43,.90], white=[.90,.91,.82,.94], gold=[.96,.64,.22,.90];
  for(let i=0;i<count;i++){
    const r=random();let p,region=0,wing=0,layer=random(),color=dark,angle=0,sx,sy;
    if(r<.22){
      p=sampleEllipse(.02,-.03,1.26,.50,-.06);region=0;angle=-.06+rand(-.22,.22);sx=rand(.038,.072);sy=rand(.095,.17);
      const belly=p[0]>.02&&p[1]<.06; color=belly&&random()<.58?white:(random()<.34?blue:dark);
    }else if(r<.30){
      p=sampleEllipse(1.16,.30,.43,.38,.02);region=1;angle=rand(-.42,.42);sx=rand(.034,.060);sy=rand(.080,.14);color=random()<.24?blue:dark;
    }else if(r<.61){
      p=sampleEllipse(-.38,.72,1.48,.34,.66);region=2;wing=1;angle=.66+rand(-.18,.18);sx=rand(.040,.073);sy=rand(.12,.23);
      const inner=p[0]>-.45&&p[1]<.92;color=inner&&random()<.34?white:(random()<.42?jade:(random()<.66?blue:dark));
    }else if(r<.83){
      p=sampleEllipse(-.30,-.55,1.22,.30,-.55);region=3;wing=-.78;angle=-.55+rand(-.18,.18);sx=rand(.038,.069);sy=rand(.11,.21);
      const inner=p[0]>-.42&&p[1]>-.72;color=inner&&random()<.30?white:(random()<.38?jade:(random()<.65?blue:dark));
    }else{
      const u=random();const lane=i%2;
      p=[-.72-u*3.05+lane*.14,-.12-u*(.66+lane*.12)+Math.sin(u*4.0+lane)*.045];region=4;angle=-1.25+rand(-.07,.07);sx=rand(.040,.071);sy=rand(.16,.32);
      color=(u>.62&&random()<.30)?white:(random()<.40?blue:dark);
    }
    if(i<16){color=gold;sx*=.62;sy*=.68;}
    starts[i*3]=rand(-3.2,3.2);starts[i*3+1]=rand(-2.5,2.5);starts[i*3+2]=rand(-.8,.8);
    targets[i*3]=p[0];targets[i*3+1]=p[1];targets[i*3+2]=rand(-.10,.14)+(region===2?.04:0);
    scaleAngle.set([sx,sy,angle,random()],i*4);colors.set(color,i*4);meta.set([wing,layer,rand(-Math.PI,Math.PI),region],i*4);
  }
  const feather=createFeatherGeometry();
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(feather.positions));attrib(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(feather.uvs));attrib(1,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(starts));attrib(2,3,gl.FLOAT,false,0,0,1);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(targets));attrib(3,3,gl.FLOAT,false,0,0,1);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(scaleAngle));attrib(4,4,gl.FLOAT,false,0,0,1);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(colors));attrib(5,4,gl.FLOAT,false,0,0,1);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(meta));attrib(6,4,gl.FLOAT,false,0,0,1);
  const index=createBuffer(feather.indices,gl.ELEMENT_ARRAY_BUFFER);gl.bindVertexArray(null);
  return {vao,index,count:feather.indices.length,instances:count};
}

function buildPetals(count) {
  const target=new Float32Array(count*3),scaleAngle=new Float32Array(count*4),colors=new Float32Array(count*4);
  const ringCounts=[Math.max(8,Math.round(count*.17)),Math.max(12,Math.round(count*.25)),Math.max(16,Math.round(count*.27))];
  ringCounts.push(Math.max(20,count-ringCounts[0]-ringCounts[1]-ringCounts[2]));
  const ringPalette=[
    [[1,.73,.27,.94],[.94,.88,.68,.92]],
    [[.08,.57,.64,.90],[.88,.29,.29,.88],[.94,.84,.58,.90]],
    [[.14,.33,.76,.88],[.08,.57,.48,.86],[.92,.87,.66,.88]],
    [[.06,.28,.39,.84],[.52,.30,.76,.84],[.91,.31,.28,.82],[.94,.84,.60,.86]]
  ];
  let cursor=0;
  ringCounts.forEach((n,ring)=>{
    for(let j=0;j<n&&cursor<count;j++,cursor++){
      const a=(j/n)*Math.PI*2+(ring%2?Math.PI/n:0);
      const radius=.50+ring*.63;
      target[cursor*3]=Math.cos(a)*radius;target[cursor*3+1]=Math.sin(a)*radius;target[cursor*3+2]=-.10+ring*.030;
      scaleAngle.set([.22+ring*.040,.45+ring*.125,a-Math.PI/2,((j+1)*(ring+3)%97)/97],cursor*4);
      const c=ringPalette[ring][j%ringPalette[ring].length];colors.set(c,cursor*4);
    }
  });
  const petal=createFeatherGeometry();
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(petal.positions));attrib(0,3,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(petal.uvs));attrib(1,2,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(target));attrib(2,3,gl.FLOAT,false,0,0,1);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(scaleAngle));attrib(3,4,gl.FLOAT,false,0,0,1);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(colors));attrib(4,4,gl.FLOAT,false,0,0,1);
  const index=createBuffer(petal.indices,gl.ELEMENT_ARRAY_BUFFER);gl.bindVertexArray(null);
  return {vao,index,count:petal.indices.length,instances:count};
}

function createSolidGeometry(positions, indices) {
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,createBuffer(new Float32Array(positions)));attrib(0,3,gl.FLOAT,false,0,0);
  const index=createBuffer(new Uint16Array(indices),gl.ELEMENT_ARRAY_BUFFER);gl.bindVertexArray(null);
  return {vao,index,count:indices.length};
}

const riftPlane=createPlaneGeometry(6.0,10.2);
const stars=createStars(QUALITY.stars,false);
const dust=createStars(QUALITY.dust,true);
const latticeHalo=createLatticeRibbons(2.25,.16);
const latticeRibbons=createLatticeRibbons(1,1);
const obangHalo=createObangRibbons(2.15,.15);
const obangRibbons=createObangRibbons(1,.96);
const bridgeHalo=createBridgeRibbons(2.25,.13);
const bridgeRibbons=createBridgeRibbons(1,1);
const lotusHalo=createLotusRings(2.20,.14);
const lotusRings=createLotusRings(1,1);
const magpie=buildMagpie(QUALITY.feathers);
const petals=buildPetals(QUALITY.petals);
const beak=createSolidGeometry([1.46,.38,0, 1.96,.31,0, 1.47,.17,0],[0,1,2]);
const eyeData=createCircleGeometry(24);
const eye=createSolidGeometry(eyeData.positions,eyeData.indices);
const birdDiscData=createCircleGeometry(48);
const birdDisc=createSolidGeometry(birdDiscData.positions,birdDiscData.indices);
const birdWingUpper=createSolidGeometry([
  .24,.02,0, -.22,.72,0, -1.28,1.53,0, -1.56,1.35,0, -1.02,.43,0, -.22,-.04,0
],[0,1,2,0,2,3,0,3,4,0,4,5]);
const birdWingLower=createSolidGeometry([
  .18,.02,0, -.22,-.62,0, -1.26,-1.20,0, -1.50,-1.02,0, -.90,-.32,0, -.20,.05,0
],[0,1,2,0,2,3,0,3,4,0,4,5]);
const birdWingPatchUpper=createSolidGeometry([
  .08,.02,.02, -.10,.23,.02, -.40,.53,.02, -.68,.47,.02, -.37,.18,.02, -.05,-.01,.02
],[0,1,2,0,2,3,0,3,4,0,4,5]);
const birdWingPatchLower=createSolidGeometry([
  .06,.01,.02, -.09,-.15,.02, -.30,-.35,.02, -.47,-.31,.02, -.27,-.12,.02, -.04,.02,.02
],[0,1,2,0,2,3,0,3,4,0,4,5]);
const birdBelly=createSolidGeometry([
  -.24,.05,.03, .56,.13,.03, .91,.01,.03, .66,-.29,.03, .02,-.37,.03, -.36,-.17,.03
],[0,1,2,0,2,3,0,3,4,0,4,5]);
const birdTail=createSolidGeometry([
  -.68,-.08,0, -3.72,-.62,0, -3.46,-.92,0, -.50,-.36,0,
  -.66,-.20,.01, -3.42,-1.12,.01, -3.08,-1.36,.01, -.43,-.43,.01
],[0,1,2,0,2,3,4,5,6,4,6,7]);
const birdTailWhite=createSolidGeometry([-1.26,-.32,.02,-3.08,-.84,.02,-2.91,-1.00,.02,-1.13,-.48,.02],[0,1,2,0,2,3]);

const riftModel=mat4TRS([1.46,.02,-8.05],[0,.07,.035],[.77,1.02,1]);
const ribbonModel=mat4Identity();
const lotusModel=mat4TRS([0,0,-7.86],[0,0,0],[1.06,1.06,1]);
