const GLSL_NOISE = `
float hash21(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float noise2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float v=0.0,a=.5; for(int i=0;i<5;i++){v+=a*noise2(p);p=p*2.03+vec2(2.7,-1.8);a*=.5;} return v; }
`;

const bgProgram = program(`#version 300 es
precision highp float;
out vec2 vUv;
void main(){
  vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);
  vUv=p*.5;
  gl_Position=vec4(p*2.0-1.0,0,1);
}` , `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime,uWindow,uCosmos,uStorm,uAfter;
${GLSL_NOISE}
void main(){
  vec2 uv=vUv;
  vec2 p=(uv-.5)*vec2(uResolution.x/uResolution.y,1.0);
  float n1=fbm(p*1.26+vec2(uTime*.006,-uTime*.003));
  float n2=fbm(p*3.65-vec2(uTime*.004,uTime*.007));
  float n3=noise2(p*9.0+vec2(uTime*.012,-uTime*.009));

  vec3 deep=vec3(.003,.010,.026);
  vec3 indigo=vec3(.012,.052,.102);
  vec3 jade=vec3(.018,.185,.205);
  vec3 violet=vec3(.112,.046,.185);
  vec3 pearl=vec3(.38,.48,.56);
  float aurora=pow(max(0.0,1.0-abs(p.y+.08+.16*sin(p.x*2.15+n1*.8))),3.4);
  vec3 cosmos=deep+indigo*(.18+.20*(1.0-p.y));
  cosmos+=jade*smoothstep(.42,.76,n1)*(.12+aurora*.72);
  cosmos+=violet*smoothstep(.48,.80,n2)*(.10+aurora*.50);
  cosmos+=pearl*pow(max(0.0,n2-.66),2.6)*(.17+.36*uStorm);
  cosmos+=vec3(.48,.33,.14)*pow(max(0.0,n3-.79),3.2)*uAfter*.32;

  vec2 moonP=p-vec2(-.02,.015);
  float moonCore=1.0-smoothstep(.165,.210,length(moonP));
  float moonHalo=1.0-smoothstep(.17,.62,length(moonP));
  float paperGrain=fbm(p*6.4+vec2(.0,uTime*.002));
  float fibersX=pow(max(0.0,noise2(vec2(p.x*58.0,p.y*2.1))-0.68),3.0);
  float fibersY=pow(max(0.0,noise2(vec2(p.x*2.2,p.y*67.0))-0.70),3.0);
  vec3 paper=vec3(.040,.062,.078)+vec3(.20,.22,.21)*(paperGrain*.36);
  paper+=vec3(.79,.82,.78)*moonCore*.90+vec3(.26,.36,.46)*moonHalo*.42;
  paper+=vec3(.11,.095,.065)*(fibersX+fibersY)*.86;
  paper+=vec3(.16,.24,.28)*smoothstep(.58,.86,n1)*.12;

  float transition=smoothstep(.0,1.0,uWindow);
  vec3 color=mix(cosmos,paper,transition);
  color+=vec3(.04,.13,.18)*uAfter*(.18+.48*aurora);
  color+=vec3(.10,.028,.14)*uStorm*pow(max(0.0,n2-.54),2.0)*.55;
  float vignette=smoothstep(1.18,.12,length(p*vec2(.73,1.0)));
  color*=.46+.54*vignette;
  outColor=vec4(color,1.0);
}`);
const bgU = uniformLocations(bgProgram, ['uResolution','uTime','uWindow','uCosmos','uStorm','uAfter']);

const planeVS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUv;
uniform mat4 uMVP;
out vec2 vUv;
void main(){vUv=aUv;gl_Position=uMVP*vec4(aPosition,1.0);}`;

const starProgram = program(`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aColor;
layout(location=2) in vec2 aSizePhase;
uniform mat4 uVP;uniform float uTime,uOpacity,uStorm;
out vec3 vColor;out float vAlpha;
void main(){
  vec3 p=aPosition;
  p.xy+=vec2(sin(uTime*.07+aSizePhase.y*31.0),cos(uTime*.05+aSizePhase.y*17.0))*.035*(1.0+uStorm);
  vec4 clip=uVP*vec4(p,1.0);gl_Position=clip;
  float depth=max(.35,clip.w);
  gl_PointSize=clamp(aSizePhase.x*(180.0/depth)*(1.0+.35*sin(uTime*1.7+aSizePhase.y*40.0)),1.0,7.0);
  vColor=aColor;vAlpha=uOpacity*(.44+.56*fract(aSizePhase.y*31.7));
}` , `#version 300 es
precision highp float;
in vec3 vColor;in float vAlpha;out vec4 outColor;
void main(){vec2 q=gl_PointCoord-.5;float d=length(q);float a=smoothstep(.5,.02,d);float core=smoothstep(.16,0.0,d);outColor=vec4(vColor*(.7+core*1.8),a*vAlpha);}`);
const starU = uniformLocations(starProgram, ['uVP','uTime','uOpacity','uStorm']);

const ribbonProgram = program(`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aOffset;
layout(location=2) in vec2 aUv;
layout(location=3) in vec4 aColor;
uniform mat4 uVP,uModel;
uniform float uTime,uReveal,uOpacity,uWave,uTravel;
out vec2 vUv;out vec4 vColor;out float vVisible;
void main(){
  vec3 p=aPosition+aOffset;
  float wave=sin(aUv.x*17.0+uTime*(.55+aColor.r*.2)+aColor.b*4.0)*uWave*(.35+.65*aUv.x);
  p+=normalize(aOffset+vec3(.0001))*wave;
  p.z+=sin(aUv.x*10.0+uTime*.38+aColor.g*3.0)*uWave*.45;
  gl_Position=uVP*uModel*vec4(p,1.0);
  vUv=aUv;vColor=vec4(aColor.rgb,aColor.a*uOpacity);
  float head=1.0-smoothstep(uReveal,uReveal+.065,aUv.x);
  float tail=smoothstep(uTravel-.10,uTravel+.02,aUv.x);
  vVisible=head*(uTravel<.05?1.0:tail);
}` , `#version 300 es
precision highp float;
in vec2 vUv;in vec4 vColor;in float vVisible;out vec4 outColor;
void main(){float edge=smoothstep(1.0,.08,abs(vUv.y));float core=smoothstep(.36,0.0,abs(vUv.y));vec3 c=vColor.rgb*(.55+1.6*core);outColor=vec4(c,edge*vColor.a*vVisible);}`);
const ribbonU = uniformLocations(ribbonProgram, ['uVP','uModel','uTime','uReveal','uOpacity','uWave','uTravel']);

const riftProgram = program(planeVS, `#version 300 es
precision highp float;
in vec2 vUv;out vec4 outColor;
uniform float uTime,uOpen,uStorm,uSeal,uOpacity;
${GLSL_NOISE}
void main(){
  vec2 p=vUv-.5;
  float taper=pow(max(0.0,1.0-abs(p.y)*1.94),.58);
  float jag=(fbm(vec2(p.y*4.1,uTime*.075))-0.5)*.145+sin(p.y*19.0+uTime*.25)*.006;
  float center=jag*(.16+.84*uOpen);
  float d=abs(p.x-center);
  float width=(.009+.045*uOpen+.008*uStorm)*taper;
  float inside=1.0-smoothstep(width*.34,width,d);
  float edge=(1.0-smoothstep(width,width*1.58+.004,d))-inside;
  float halo=1.0-smoothstep(width*.86,width*3.15+.012,d);
  float branchA=abs(p.x-(center+.125*(p.y+.13)+.010*sin(p.y*31.0)));
  float branchB=abs(p.x-(center-.102*(p.y-.17)+.009*sin(p.y*27.0+2.0)));
  float maskA=smoothstep(.07,.19,p.y)*(1.0-smoothstep(.31,.46,p.y));
  float maskB=smoothstep(-.46,-.33,p.y)*(1.0-smoothstep(-.18,-.03,p.y));
  float branches=((1.0-smoothstep(.003,.012,branchA))*maskA+(1.0-smoothstep(.003,.011,branchB))*maskB)*uOpen;
  float inner=fbm(vec2(p.x*16.0-uTime*.035,p.y*5.8+uTime*.015));
  vec3 voidColor=mix(vec3(.0003,.0006,.002),vec3(.005,.002,.012),inner*.30);
  vec3 cold=mix(vec3(.71,.88,1.0),vec3(.35,.54,.94),inner);
  vec3 gold=vec3(1.0,.64,.20);
  vec3 edgeColor=mix(cold,gold,uSeal);
  vec3 color=voidColor*inside+edgeColor*(edge*1.15+halo*.055+branches*.18);
  float seam=(1.0-smoothstep(.0015,.007,d))*uSeal*taper;
  color+=gold*seam*2.15;
  float alpha=max(max(inside*.985,edge*.68),max(halo*.032,branches*.11));
  alpha*=smoothstep(.01,.08,uOpen+uSeal)*uOpacity;
  outColor=vec4(color,alpha);
}`);
const riftU = uniformLocations(riftProgram, ['uMVP','uTime','uOpen','uStorm','uSeal','uOpacity']);

const featherProgram = program(`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUv;
layout(location=2) in vec3 iStart;
layout(location=3) in vec3 iTarget;
layout(location=4) in vec4 iScaleAngle;
layout(location=5) in vec4 iColor;
layout(location=6) in vec4 iMeta;
uniform mat4 uVP,uModel;
uniform float uTime,uMorph,uFlap,uFly,uOpacity,uHalo;
out vec2 vUv;out vec4 vColor;out float vGlow;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
void main(){
  float phase=iScaleAngle.w;
  float eased=uMorph*uMorph*(3.0-2.0*uMorph);
  vec3 swirl=iStart;
  float a=uTime*(.16+.15*phase)+phase*23.0;
  swirl.xy+=vec2(cos(a),sin(a))*(.18+.62*(1.0-eased));
  swirl.z+=sin(a*.7)*.22;
  vec3 target=iTarget;
  float wing=iMeta.x;
  if(abs(wing)>.001){
    float flap=uFlap*wing*(.62+.38*iMeta.y);
    vec2 shoulder=vec2(-.15,.18);
    vec2 q=target.xy-shoulder;
    q=rot(flap)*q;target.xy=shoulder+q;target.z+=abs(flap)*.35*(.2+iMeta.y);
  }
  target.x+=mix(-2.45,1.55,uFly);
  target.y+=sin(uFly*3.14159265)*.52;
  target.z+=sin(uFly*3.14159265)*.28;
  vec3 center=mix(swirl,target,eased);
  float angle=mix(iMeta.z,iScaleAngle.z,eased)+sin(uTime*.42+phase*19.0)*.025;
  vec2 local=aPosition.xy*vec2(iScaleAngle.x,iScaleAngle.y)*(1.0+uHalo*.16);
  local=rot(angle)*local;
  vec3 p=center+vec3(local,aPosition.z*iScaleAngle.x);
  gl_Position=uVP*uModel*vec4(p,1.0);
  vUv=aUv;vColor=vec4(iColor.rgb,iColor.a*uOpacity);vGlow=uHalo;
}` , `#version 300 es
precision highp float;
in vec2 vUv;in vec4 vColor;in float vGlow;out vec4 outColor;
void main(){
  vec2 p=vUv-vec2(.5,.48);
  float shape=smoothstep(.52,.06,length(vec2(p.x*1.28,p.y)));
  float shaft=smoothstep(.055,.0,abs(p.x))*(1.0-smoothstep(.02,.46,abs(p.y)));
  float tip=smoothstep(.52,.16,abs(p.y));
  float sheen=pow(max(0.0,1.0-abs(p.x*2.0+.23*sin(vUv.y*12.0))),3.0);
  vec3 c=mix(vColor.rgb,vec3(1.0),sheen*.24);
  if(vGlow>.5)c=mix(vec3(.12,.50,.82),vec3(.88,.62,.24),vColor.r*.42+vColor.g*.16);
  float a=shape*vColor.a*(vGlow>.5?.055:.92)+shaft*.16*step(vGlow,.5);
  outColor=vec4(c*(.72+tip*.55+sheen*.38),a);
}`);
const featherU = uniformLocations(featherProgram, ['uVP','uModel','uTime','uMorph','uFlap','uFly','uOpacity','uHalo']);

const petalProgram = program(`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec2 aUv;
layout(location=2) in vec3 iTarget;
layout(location=3) in vec4 iScaleAngle;
layout(location=4) in vec4 iColor;
uniform mat4 uVP,uModel;uniform float uTime,uBloom,uOpacity,uHalo;
out vec2 vUv;out vec4 vColor;out float vHalo;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
void main(){
  float e=uBloom*uBloom*(3.0-2.0*uBloom);
  float phase=iScaleAngle.w;
  vec3 center=mix(vec3(0.0,0.0,.15*sin(phase*20.0)),iTarget,e);
  float angle=iScaleAngle.z+(.42*(1.0-e))+sin(uTime*.18+phase*20.0)*.012;
  vec2 local=aPosition.xy*vec2(iScaleAngle.x,iScaleAngle.y)*(1.0+uHalo*.18)*(.04+.96*e);
  local=rot(angle)*local;
  vec3 p=center+vec3(local,aPosition.z*iScaleAngle.x);
  p.z+=sin(phase*41.0+uTime*.24)*.025*e;
  gl_Position=uVP*uModel*vec4(p,1.0);vUv=aUv;vColor=vec4(iColor.rgb,iColor.a*uOpacity);vHalo=uHalo;
}` , `#version 300 es
precision highp float;
in vec2 vUv;in vec4 vColor;in float vHalo;out vec4 outColor;
void main(){
  vec2 p=vUv-vec2(.5,.42);
  float d=length(vec2(p.x*1.42,p.y));
  float shape=smoothstep(.56,.075,d);
  float inner=smoothstep(.43,.06,d);
  float rim=smoothstep(.28,.52,d);
  vec3 gold=vec3(1.0,.67,.22);
  vec3 c=mix(vColor.rgb,gold,rim*.38);
  c=mix(c,vec3(1.0,.92,.70),pow(max(0.0,1.0-vUv.y),2.0)*.18);
  float a=shape*vColor.a*(vHalo>.5?.045:.88);
  outColor=vec4(c*(.64+inner*.68),a);
}`);
const petalU = uniformLocations(petalProgram, ['uVP','uModel','uTime','uBloom','uOpacity','uHalo']);

const solidProgram = program(`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
uniform mat4 uMVP;void main(){gl_Position=uMVP*vec4(aPosition,1.0);}` , `#version 300 es
precision highp float;uniform vec4 uColor;out vec4 outColor;void main(){outColor=uColor;}`);
const solidU = uniformLocations(solidProgram, ['uMVP','uColor']);
