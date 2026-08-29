export const fullscreenVertex = `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const backgroundFragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uWindow;
uniform float uThreads;
uniform float uRift;
uniform float uSeal;
uniform float uLotus;
uniform float uEnergy;
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.0),f.x),f.y);}
float fbm(vec2 p){float value=0.0,amplitude=.52;mat2 rotation=mat2(.80,-.60,.60,.80);for(int i=0;i<4;i++){value+=amplitude*noise(p);p=rotation*p*2.04+7.31;amplitude*=.5;}return value;}
float star(vec2 uv,float scale,float threshold){vec2 p=uv*scale,id=floor(p),cell=fract(p)-.5;float seed=hash21(id);vec2 offset=vec2(hash21(id+17.4),hash21(id+91.7))-.5;float d=length(cell-offset*.62);float core=smoothstep(.055,0.0,d);float twinkle=.65+.35*sin(uTime*(1.2+seed*2.0)+seed*51.0);return core*step(threshold,seed)*twinkle;}
float capsule(vec2 p,vec2 a,vec2 b,float radius){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);return 1.0-smoothstep(radius*.62,radius,length(pa-ba*h));}
float reunionFigure(vec2 p,float side){
  float x=side*.078;
  vec2 head=vec2(x,.704);float headMask=1.0-smoothstep(.017,.023,length(p-head));
  float hairKnot=1.0-smoothstep(.008,.012,length(p-(head+vec2(side*.010,.025))));
  float neck=capsule(p,vec2(x,.682),vec2(x-side*.004,.661),.0065);
  float jacketWidth=mix(.048,.027,clamp((p.y-.603)/.064,0.0,1.0));
  float jacket=(1.0-smoothstep(jacketWidth,jacketWidth+.007,abs(p.x-(x-side*.006))))*smoothstep(.596,.605,p.y)*smoothstep(.672,.663,p.y);
  float skirtWidth=mix(.057,.026,clamp((p.y-.526)/.082,0.0,1.0));
  float skirt=(1.0-smoothstep(skirtWidth,skirtWidth+.007,abs(p.x-(x-side*.012))))*smoothstep(.520,.530,p.y)*smoothstep(.612,.603,p.y);
  float sleeve=capsule(p,vec2(x-side*.008,.646),vec2(side*.009,.621),.012);
  return max(max(headMask,hairKnot),max(max(neck,jacket),max(skirt,sleeve)));
}
float distantFigure(vec2 p,float side){
  float x=side*1.20;
  vec2 head=vec2(x,-.405);
  float face=1.0-smoothstep(.017,.022,length(p-head));
  float hairKnot=1.0-smoothstep(.007,.011,length(p-(head+vec2(side*.005,.026))));
  float neck=capsule(p,vec2(x,-.423),vec2(x-side*.004,-.447),.0065);
  float torso=capsule(p,vec2(x-side*.004,-.444),vec2(x-side*.010,-.502),.013);
  float robeWidth=mix(.060,.017,clamp((p.y+.595)/.095,0.0,1.0));
  float robe=(1.0-smoothstep(robeWidth,robeWidth+.008,abs(p.x-(x-side*.012))))*smoothstep(-.600,-.590,p.y)*smoothstep(-.493,-.504,p.y);
  float sleeve=capsule(p,vec2(x-side*.004,-.458),vec2(x-side*.068,-.500),.010);
  float inwardHand=capsule(p,vec2(x-side*.066,-.500),vec2(x-side*.088,-.508),.005);
  return max(max(face,hairKnot),max(max(neck,torso),max(robe,max(sleeve,inwardHand))));
}
void main(){
  vec2 frag=vUv*uResolution;
  vec2 uv=(frag*2.0-uResolution)/min(uResolution.x,uResolution.y);
  vec3 indigo=vec3(.025,.045,.145),blue=vec3(.045,.16,.34),violet=vec3(.23,.13,.42),pearl=vec3(.78,.88,1.0),moon=vec3(1.0,.91,.75),coral=vec3(1.0,.42,.34);
  float vertical=clamp((uv.y+1.0)*.5,0.0,1.0);
  vec3 color=mix(vec3(.075,.09,.24),indigo,vertical);
  float cloud=fbm(uv*1.08+vec2(uTime*.004,-uTime*.002));
  float veil=smoothstep(.36,.82,cloud);
  color+=mix(blue,violet,smoothstep(-.7,.9,uv.x))*veil*(.16+.10*uEnergy);
  float stars=star(uv+vec2(uTime*.0005,0),84.0,.952)+star(uv*.71-vec2(.07,uTime*.0004),47.0,.968)*.72;
  color+=pearl*stars*(.46+.28*uThreads);
  float riverCenter=.055*sin(uv.y*2.1+uTime*.025)+.018*sin(uv.y*9.0-uTime*.05);
  float riverDistance=abs(uv.x-riverCenter);
  float riverNoise=fbm(vec2(uv.y*2.2-uTime*.008,uv.x*10.0));
  float riverWidth=.12+.055*riverNoise+.05*uRift;
  float riverCore=exp(-riverDistance*riverDistance/(riverWidth*riverWidth));
  float riverMist=exp(-riverDistance*riverDistance/.24)*(.28+.34*riverNoise);
  float riverDim=1.0-uSeal*.38;
  color+=mix(vec3(.38,.60,.92),pearl,riverCore)*riverCore*(.10+uRift*.40)*riverDim;
  color+=violet*riverMist*(.06+uRift*.14)*(1.0-uSeal*.22);
  float filamentA=exp(-42.0*abs(riverDistance-(.035+.045*noise(vec2(uv.y*5.1,uTime*.006)))));
  float filamentB=exp(-34.0*abs(riverDistance-(.11+.035*noise(vec2(uv.y*3.3+7.0,uTime*.004)))));
  float filamentPulse=.72+.28*sin(uv.y*12.0-uTime*.08);
  color+=mix(vec3(.26,.62,1.0),pearl,filamentPulse)*(filamentA*.10+filamentB*.055)*uRift*(1.0-uSeal*.30);
  float riverDust=star(vec2(uv.y*1.4,uv.x)*vec2(74.0,52.0)+vec2(uTime*.003,0),1.0,.925)*riverMist;
  color+=mix(vec3(.48,.62,1.0),moon,riverCore)*riverDust*(.12+.34*uRift)*riverDim;
  float riverStars=star(vec2(uv.y,uv.x)*vec2(92.0,38.0),1.0,.94)*riverCore;
  color+=moon*riverStars*(.34+uRift*.38)*riverDim;
  vec2 moonUv=uv-vec2(-.98,.53);float moonD=length(moonUv);float moonDisc=smoothstep(.145,.132,moonD);float moonHalo=smoothstep(.58,.11,moonD);
  float moonTexture=.72+.28*fbm(moonUv*9.0+vec2(3.1,7.4));
  float moonShade=smoothstep(-.11,.12,moonUv.x+moonUv.y*.28);
  color+=mix(vec3(.58,.66,.84),moon,moonShade)*moonDisc*moonTexture*.78*uWindow+vec3(.30,.42,.75)*moonHalo*.13*uWindow;
  float horizon=exp(-9.0*abs(uv.y+.76));
  color+=mix(violet,coral,uLotus)*horizon*(.08+.42*uLotus);
  float dawnReflection=exp(-4.2*length(vec2(uv.x*.48,uv.y+.78)))*uLotus;
  color+=mix(violet,coral,.58)*dawnReflection*.22;
  float mountainFar=-.72+.035*sin(uv.x*1.65+2.0)+.022*sin(uv.x*4.1);
  float mountainBack=-.79+.055*sin(uv.x*2.3)+.035*sin(uv.x*5.7+1.2);
  float mountainFront=-.86+.075*sin(uv.x*3.1+.8)+.04*sin(uv.x*7.9);
  color=mix(color,vec3(.075,.075,.18)+violet*.08,smoothstep(mountainFar+.02,mountainFar-.02,uv.y)*.72);
  color=mix(color,vec3(.035,.055,.12),smoothstep(mountainBack+.025,mountainBack-.025,uv.y));
  color=mix(color,vec3(.018,.032,.075),smoothstep(mountainFront+.025,mountainFront-.025,uv.y));
  float bankFigureFade=1.0-smoothstep(42.0,48.0,uTime);
  float leftBankFigure=distantFigure(uv,-1.0)*bankFigureFade;
  float rightBankFigure=distantFigure(uv,1.0)*bankFigureFade;
  color+=vec3(.25,.72,1.0)*leftBankFigure*.42+coral*rightBankFigure*.40;
  color+=pearl*(leftBankFigure+rightBankFigure)*.10;
  float meetingGlow=exp(-5.5*length((uv-vec2(0.0,-.02))*vec2(1.0,1.35)))*uSeal;
  color+=mix(pearl,moon,uSeal)*meetingGlow*.10*uSeal;
  float leftFigure=reunionFigure(uv,-1.0)*uLotus;
  float rightFigure=reunionFigure(uv,1.0)*uLotus;
  float joinedHands=capsule(uv,vec2(-.008,.621),vec2(.008,.621),.005)*uLotus;
  color+=vec3(.30,.78,1.0)*leftFigure*.52+coral*rightFigure*.50+moon*joinedHands*.72;
  color+=pearl*(leftFigure+rightFigure)*.12;
  float fiberA=noise(vec2(uv.x*310.0,uv.y*9.0)),fiberB=noise(vec2(uv.y*340.0,uv.x*11.0));
  float fibers=pow(max(0.0,fiberA-.59),2.0)+pow(max(0.0,fiberB-.61),2.0);
  color+=pearl*fibers*.10;
  float vignette=smoothstep(1.48,.38,length(uv*vec2(.76,1.0)));color*=.76+.28*vignette;
  outColor=vec4(color,1.0);
}`;

export const meshVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aFrom;layout(location=3) in vec3 aTo;layout(location=4) in vec3 aDirFrom;layout(location=5) in vec3 aDirTo;layout(location=6) in vec4 aScalePhase;layout(location=7) in vec3 aColorFrom;layout(location=8) in vec3 aColorTo;layout(location=9) in vec4 aExtra;
uniform mat4 uViewProj;uniform mat4 uModel;uniform float uTime;uniform float uMorph;uniform float uOpacity;uniform float uTurbulence;uniform float uFlap;uniform float uPulse;
out vec3 vColor;out vec3 vNormal;out vec3 vWorld;out vec3 vLocal;out float vAlpha;out float vEmission;
mat3 basisFromDirection(vec3 direction){vec3 forward=normalize(direction+vec3(.00001,0,0));vec3 reference=abs(forward.y)<.92?vec3(0,1,0):vec3(1,0,0);vec3 right=normalize(cross(reference,forward));vec3 up=normalize(cross(forward,right));return mat3(right,up,forward);}
void main(){
 float delay=aExtra.y*.32;float morph=smoothstep(delay,min(1.0,delay+.58),uMorph);morph=morph*morph*(3.0-2.0*morph);
 vec3 center=mix(aFrom,aTo,morph);vec3 direction=normalize(mix(aDirFrom,aDirTo,morph));mat3 basis=basisFromDirection(direction);
 float phase=aScalePhase.w*6.28318530718;float breathe=1.0+(.035+.04*aExtra.w)*sin(uTime*(.8+aExtra.w*.7)+phase)*uPulse;float hero=max(0.0,aExtra.x-1.0);vec3 localScale=aScalePhase.xyz*(1.0+hero*.38);localScale.xy*=breathe;localScale.z*=1.0+.08*sin(uTime*.6+phase);
 vec3 side=basis[0],up=basis[1];center+=side*sin(uTime*.72+phase+center.y*.4)*uTurbulence*(.15+aExtra.w*.2);center+=up*cos(uTime*.55+phase*1.7)*uTurbulence*.09;
 float wing=aExtra.x;float flap=sin(uTime*2.2+phase*.12)*uFlap*wing;center.y+=flap*(.22+abs(aTo.x)*.05);center.z+=flap*.10*sign(aTo.y+.001);
 vec3 local=basis*(aPosition*localScale);vec4 world=uModel*vec4(center+local,1.0);vec3 worldNormal=normalize(mat3(uModel)*(basis*aNormal));
 vColor=mix(aColorFrom,aColorTo,morph);vNormal=worldNormal;vWorld=world.xyz;vLocal=aPosition;vAlpha=.72+.28*sin(phase+uTime*.5);vEmission=aExtra.z;gl_Position=uViewProj*world;
}`;

export const meshFragment = `#version 300 es
precision highp float;
in vec3 vColor;in vec3 vNormal;in vec3 vWorld;in vec3 vLocal;in float vAlpha;in float vEmission;out vec4 outColor;
uniform vec3 uCamera;uniform vec3 uLightDirection;uniform float uGlow;uniform float uOpacity;uniform float uBird;
void main(){vec3 normal=normalize(vNormal),view=normalize(uCamera-vWorld),lightDir=normalize(uLightDirection);float diffuse=max(dot(normal,lightDir),0.0),back=max(dot(normal,-lightDir),0.0),fresnel=pow(1.0-max(dot(normal,view),0.0),2.4),lighting=.20+diffuse*.58+back*.12;float wingBand=smoothstep(.42,.72,abs(vLocal.x))*(1.0-smoothstep(1.36,1.92,abs(vLocal.x)));float wingPatch=wingBand*(1.0-smoothstep(.38,.90,vLocal.z))*uBird;float tailPatch=smoothstep(-1.42,-.96,vLocal.z)*(1.0-smoothstep(-.70,-.32,vLocal.z))*uBird;vec3 magpieInk=vec3(.006,.018,.052),magpieWhite=mix(vec3(.82,.92,1.0),vColor,.15);vec3 material=mix(vColor,magpieInk,uBird*.82);material=mix(material,magpieWhite,max(wingPatch*.88,tailPatch*.24));material+=vColor*uBird*.14;vec3 color=material*lighting;color+=material*(fresnel*(.46+uGlow*.56)+vEmission*(.26+uGlow*.52));color+=vec3(.72,.86,1.0)*fresnel*vEmission*.10;float alpha=clamp(vAlpha*uOpacity*(.80+fresnel*.28),0.0,1.0);outColor=vec4(color,alpha);}`;

export const particleVertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 aSeed;layout(location=1) in vec3 aStar;layout(location=2) in vec3 aThread;layout(location=3) in vec3 aMagpie;layout(location=4) in vec3 aBridge;layout(location=5) in vec3 aLotus;layout(location=6) in vec3 aColor;
uniform mat4 uViewProj;uniform float uTime;uniform float uThreads;uniform float uMagpie;uniform float uBridge;uniform float uLotus;uniform float uRift;uniform float uPointScale;uniform float uOpacity;
out vec3 vColor;out float vAlpha;out float vSeed;
float delayed(float phase,float seed){float delay=seed*.26;return smoothstep(delay,min(1.0,delay+.55),phase);}
void main(){float threadT=delayed(uThreads,aSeed.x),magpieT=delayed(uMagpie,aSeed.y),bridgeT=delayed(uBridge,aSeed.z),lotusT=delayed(uLotus,aSeed.w);vec3 position=mix(aStar,aThread,threadT);position=mix(position,aMagpie,magpieT);position=mix(position,aBridge,bridgeT);position=mix(position,aLotus,lotusT);float drift=.08+.14*(1.0-max(max(magpieT,bridgeT),lotusT));position.x+=sin(uTime*(.22+aSeed.x*.42)+aSeed.z*31.0)*drift;position.y+=cos(uTime*(.18+aSeed.y*.35)+aSeed.w*27.0)*drift;position.z+=sin(uTime*.14+aSeed.x*17.0)*drift*.6;vec4 clip=uViewProj*vec4(position,1.0);gl_Position=clip;float depthScale=clamp(5.5/max(1.0,clip.w),.35,2.3);float sparkle=.72+.28*sin(uTime*(1.8+aSeed.w*3.0)+aSeed.x*70.0);gl_PointSize=uPointScale*depthScale*(.58+aSeed.z*1.25)*sparkle;vColor=aColor;vAlpha=uOpacity*(.28+.72*aSeed.y)*sparkle;vSeed=aSeed.x;}`;

export const particleFragment = `#version 300 es
precision highp float;
in vec3 vColor;in float vAlpha;in float vSeed;out vec4 outColor;
void main(){vec2 p=gl_PointCoord-.5;float d=length(p),core=smoothstep(.24,0.0,d),halo=smoothstep(.5,.08,d),ray=smoothstep(.10,0.0,abs(p.x))*smoothstep(.5,0.0,abs(p.y))+smoothstep(.10,0.0,abs(p.y))*smoothstep(.5,0.0,abs(p.x));float alpha=(halo*.38+core*.88+ray*.12)*vAlpha;vec3 color=vColor*(.68+core*1.35+ray*.25);if(alpha<.006)discard;outColor=vec4(color,alpha);}`;

export const bloomExtractFragment = `#version 300 es
precision highp float;in vec2 vUv;out vec4 outColor;uniform sampler2D uScene;uniform float uThreshold;void main(){vec3 color=texture(uScene,vUv).rgb;float brightness=max(max(color.r,color.g),color.b),contribution=smoothstep(uThreshold,1.0,brightness);outColor=vec4(color*contribution,1.0);}`;
export const blurFragment = `#version 300 es
precision highp float;in vec2 vUv;out vec4 outColor;uniform sampler2D uTexture;uniform vec2 uDirection;uniform vec2 uTexel;void main(){vec3 color=texture(uTexture,vUv).rgb*.227027;color+=texture(uTexture,vUv+uDirection*uTexel*1.384615).rgb*.316216;color+=texture(uTexture,vUv-uDirection*uTexel*1.384615).rgb*.316216;color+=texture(uTexture,vUv+uDirection*uTexel*3.230769).rgb*.070270;color+=texture(uTexture,vUv-uDirection*uTexel*3.230769).rgb*.070270;outColor=vec4(color,1.0);}`;
export const compositeFragment = `#version 300 es
precision highp float;in vec2 vUv;out vec4 outColor;uniform sampler2D uScene;uniform sampler2D uBloom;uniform vec2 uResolution;uniform float uTime;uniform float uBloomStrength;uniform float uExposure;uniform float uRift;uniform float uSeal;
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}void main(){vec2 uv=vUv,center=uv-.5;float aberration=(1.0-uSeal)*.00022*smoothstep(0.0,.72,length(center));vec3 scene;scene.r=texture(uScene,uv+center*aberration).r;scene.g=texture(uScene,uv).g;scene.b=texture(uScene,uv-center*aberration).b;vec3 color=scene+texture(uBloom,uv).rgb*uBloomStrength;color*=vec3(1.015,.995,.975);color=vec3(1.0)-exp(-color*uExposure);color=pow(max(color,0.0),vec3(.92));float vignette=smoothstep(.84,.28,length(center*vec2(.86,1.0)));color*=.74+.26*vignette;color+=(hash21(gl_FragCoord.xy+fract(uTime)*997.0)-.5)*.012;outColor=vec4(color,1.0);}`;
