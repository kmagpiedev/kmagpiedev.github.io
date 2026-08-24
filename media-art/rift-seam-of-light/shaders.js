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
void main(){
  vec2 frag=vUv*uResolution;
  vec2 uv=(frag*2.0-uResolution)/min(uResolution.x,uResolution.y);
  vec2 flow=uv;flow.x+=.035*sin(flow.y*2.8+uTime*.045);flow.y+=.025*sin(flow.x*2.2-uTime*.038);
  float n1=fbm(flow*1.12+vec2(uTime*.006,-uTime*.003));
  float n2=fbm(flow*2.35-vec2(uTime*.004,uTime*.002));
  float nebula=smoothstep(.34,.79,n1+n2*.38),cloud=smoothstep(.44,.75,n2);
  vec3 navy=vec3(.008,.026,.070),deepBlue=vec3(.020,.115,.235),jade=vec3(.018,.225,.275),violet=vec3(.175,.072,.305),hanji=vec3(.965,.925,.815),gold=vec3(.925,.625,.165);
  vec3 color=navy+deepBlue*nebula*(.62+.28*uEnergy)+jade*cloud*nebula*.24+violet*smoothstep(.48,.82,n1)*.22;
  float stars=star(uv+vec2(uTime*.0007,0),82.0,.955)+star(uv*.73-vec2(.1,uTime*.00045),49.0,.972)*.72;
  color+=mix(vec3(.48,.72,1.0),hanji,stars)*stars*(.55+.45*(1.0-uWindow));
  float windowMix=clamp(uWindow,0.0,1.0);
  float fiberA=noise(vec2(uv.x*285.0,uv.y*8.0+uTime*.01)),fiberB=noise(vec2(uv.y*330.0,uv.x*10.0));
  float fibers=pow(max(0.0,fiberA-.54),2.0)+pow(max(0.0,fiberB-.57),2.0);
  color=mix(color,color+hanji*fibers*.34,windowMix);
  vec2 moonUv=uv-vec2(-.48,.16);float moonD=length(moonUv);float moon=smoothstep(.39,.34,moonD)*windowMix;float moonHalo=smoothstep(.95,.18,moonD)*windowMix;float moonTexture=.78+.22*fbm(moonUv*8.0+2.0);
  color+=hanji*moon*moonTexture*.52+vec3(.34,.52,.72)*moonHalo*.13+hanji*windowMix*.018;
  float riftCenter=.13+.12*sin(uv.y*2.9+uTime*.16)+.035*sin(uv.y*10.5-uTime*.31)+.016*sin(uv.y*28.0+1.2);
  float taper=smoothstep(1.22,.15,abs(uv.y+.02));float riftWidth=(.006+uRift*.145)*taper;float riftDistance=abs(uv.x-riftCenter);
  float voidMask=1.0-smoothstep(riftWidth*.62,riftWidth,riftDistance);float edge=1.0-smoothstep(riftWidth,riftWidth+.028+uRift*.035,riftDistance);edge=max(0.0,edge-voidMask);float outer=(1.0-smoothstep(riftWidth+.035,riftWidth+.19,riftDistance))*uRift*taper;
  vec3 voidColor=vec3(.003,.004,.008)+vec3(.055,.035,.085)*fbm(vec2(uv.y*6.0,uv.x*18.0+uTime*.05))*uRift;
  color=mix(color,voidColor,voidMask*uRift);color+=mix(vec3(.24,.76,1.0),gold,uSeal)*edge*uRift*(1.0+uEnergy*.45);color+=vec3(.10,.32,.52)*outer*(.12+.15*sin(uv.y*16.0+uTime));
  float angle=atan(uv.y,uv.x),radius=length(uv),petals=pow(max(0.0,cos(angle*8.0)),4.0);float lotusRing=exp(-32.0*abs(radius-(.46+petals*.16))),lotusInner=exp(-42.0*abs(radius-.22));
  color+=(gold*lotusRing+jade*lotusInner)*uLotus*.34;
  float seam=exp(-175.0*riftDistance)*taper*uSeal;color+=gold*seam*1.2;
  float vignette=smoothstep(1.45,.35,length(uv*vec2(.82,1.0)));color*=.70+.40*vignette;
  outColor=vec4(color,1.0);
}`;

export const meshVertex = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aFrom;layout(location=3) in vec3 aTo;layout(location=4) in vec3 aDirFrom;layout(location=5) in vec3 aDirTo;layout(location=6) in vec4 aScalePhase;layout(location=7) in vec3 aColorFrom;layout(location=8) in vec3 aColorTo;layout(location=9) in vec4 aExtra;
uniform mat4 uViewProj;uniform mat4 uModel;uniform float uTime;uniform float uMorph;uniform float uOpacity;uniform float uTurbulence;uniform float uFlap;uniform float uPulse;
out vec3 vColor;out vec3 vNormal;out vec3 vWorld;out float vAlpha;out float vEmission;
mat3 basisFromDirection(vec3 direction){vec3 forward=normalize(direction+vec3(.00001,0,0));vec3 reference=abs(forward.y)<.92?vec3(0,1,0):vec3(1,0,0);vec3 right=normalize(cross(reference,forward));vec3 up=normalize(cross(forward,right));return mat3(right,up,forward);}
void main(){
 float delay=aExtra.y*.32;float morph=smoothstep(delay,min(1.0,delay+.58),uMorph);morph=morph*morph*(3.0-2.0*morph);
 vec3 center=mix(aFrom,aTo,morph);vec3 direction=normalize(mix(aDirFrom,aDirTo,morph));mat3 basis=basisFromDirection(direction);
 float phase=aScalePhase.w*6.28318530718;float breathe=1.0+(.035+.04*aExtra.w)*sin(uTime*(.8+aExtra.w*.7)+phase)*uPulse;vec3 localScale=aScalePhase.xyz;localScale.xy*=breathe;localScale.z*=1.0+.08*sin(uTime*.6+phase);
 vec3 side=basis[0],up=basis[1];center+=side*sin(uTime*.72+phase+center.y*.4)*uTurbulence*(.15+aExtra.w*.2);center+=up*cos(uTime*.55+phase*1.7)*uTurbulence*.09;
 float wing=aExtra.x;float flap=sin(uTime*2.2+phase*.12)*uFlap*wing;center.y+=flap*(.22+abs(aTo.x)*.05);center.z+=flap*.10*sign(aTo.y+.001);
 vec3 local=basis*(aPosition*localScale);vec4 world=uModel*vec4(center+local,1.0);vec3 worldNormal=normalize(mat3(uModel)*(basis*aNormal));
 vColor=mix(aColorFrom,aColorTo,morph);vNormal=worldNormal;vWorld=world.xyz;vAlpha=.72+.28*sin(phase+uTime*.5);vEmission=aExtra.z;gl_Position=uViewProj*world;
}`;

export const meshFragment = `#version 300 es
precision highp float;
in vec3 vColor;in vec3 vNormal;in vec3 vWorld;in float vAlpha;in float vEmission;out vec4 outColor;
uniform vec3 uCamera;uniform vec3 uLightDirection;uniform float uGlow;uniform float uOpacity;
void main(){vec3 normal=normalize(vNormal),view=normalize(uCamera-vWorld),lightDir=normalize(uLightDirection);float diffuse=max(dot(normal,lightDir),0.0),back=max(dot(normal,-lightDir),0.0),fresnel=pow(1.0-max(dot(normal,view),0.0),2.4),lighting=.20+diffuse*.58+back*.12;vec3 color=vColor*lighting;color+=vColor*(fresnel*(.65+uGlow*.85)+vEmission*(.45+uGlow));color+=vec3(1.0,.84,.47)*fresnel*vEmission*.16;float alpha=clamp(vAlpha*uOpacity*(.72+fresnel*.42),0.0,1.0);outColor=vec4(color,alpha);}`;

export const particleVertex = `#version 300 es
precision highp float;
layout(location=0) in vec4 aSeed;layout(location=1) in vec3 aStar;layout(location=2) in vec3 aThread;layout(location=3) in vec3 aMagpie;layout(location=4) in vec3 aBridge;layout(location=5) in vec3 aLotus;layout(location=6) in vec3 aColor;
uniform mat4 uViewProj;uniform float uTime;uniform float uThreads;uniform float uMagpie;uniform float uBridge;uniform float uLotus;uniform float uRift;uniform float uPointScale;uniform float uOpacity;
out vec3 vColor;out float vAlpha;out float vSeed;
float delayed(float phase,float seed){float delay=seed*.26;return smoothstep(delay,min(1.0,delay+.55),phase);}
void main(){float threadT=delayed(uThreads,aSeed.x),magpieT=delayed(uMagpie,aSeed.y),bridgeT=delayed(uBridge,aSeed.z),lotusT=delayed(uLotus,aSeed.w);vec3 position=mix(aStar,aThread,threadT);position=mix(position,aMagpie,magpieT);position=mix(position,aBridge,bridgeT);position=mix(position,aLotus,lotusT);float drift=.10+.16*(1.0-max(max(magpieT,bridgeT),lotusT));position.x+=sin(uTime*(.22+aSeed.x*.42)+aSeed.z*31.0)*drift;position.y+=cos(uTime*(.18+aSeed.y*.35)+aSeed.w*27.0)*drift;position.z+=sin(uTime*.14+aSeed.x*17.0)*drift*.6;float pull=uRift*(1.0-bridgeT)*(.18+aSeed.z*.28);position.x=mix(position.x,.15+.12*sin(position.y*2.8),pull*.18);vec4 clip=uViewProj*vec4(position,1.0);gl_Position=clip;float depthScale=clamp(5.5/max(1.0,clip.w),.35,2.3);float sparkle=.72+.28*sin(uTime*(1.8+aSeed.w*3.0)+aSeed.x*70.0);gl_PointSize=uPointScale*depthScale*(.58+aSeed.z*1.25)*sparkle;vColor=aColor;vAlpha=uOpacity*(.28+.72*aSeed.y)*sparkle;vSeed=aSeed.x;}`;

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
float hash21(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}void main(){vec2 uv=vUv,center=uv-.5;float aberration=uRift*(1.0-uSeal)*.0014*smoothstep(0.0,.72,length(center));vec3 scene;scene.r=texture(uScene,uv+center*aberration).r;scene.g=texture(uScene,uv).g;scene.b=texture(uScene,uv-center*aberration).b;vec3 color=scene+texture(uBloom,uv).rgb*uBloomStrength;color*=vec3(1.015,.995,.965);color=vec3(1.0)-exp(-color*uExposure);color=pow(max(color,0.0),vec3(.92));float vignette=smoothstep(.84,.28,length(center*vec2(.86,1.0)));color*=.70+.30*vignette;color+=(hash21(gl_FragCoord.xy+fract(uTime)*997.0)-.5)*.018;outColor=vec4(color,1.0);}`;
