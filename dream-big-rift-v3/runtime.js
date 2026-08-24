let started=false,startStamp=performance.now(),pausedAt=0,muted=false,audio=null,lastTimeline=0;
let idleTimer=null,frameAccumulator=0,frameSamples=0,lastPerfCheck=performance.now(),lastFrameNow=performance.now();

function sceneValues(t){
  const windowAmount=1-smooth(7.8,16.4,t);
  const windowDisperse=smooth(8.0,16.8,t);
  const cosmos=smooth(6.8,18.2,t);
  const obang=pulse(7.2,10.5,28.6,34.5,t);
  const riftOpen=smooth(17.0,24.0,t)*(1-smooth(48.5,56.0,t));
  const storm=pulse(22.5,28.5,39.5,45.5,t);
  const birdMorph=smooth(27.4,36.2,t)*(1-smooth(51.0,57.0,t)*.82);
  const fly=smooth(38.2,49.2,t);
  const flap=(Math.sin(clamp((t-34.5)/13,0,1)*Math.PI*2.65)*.24+Math.sin(clamp((t-34.5)/13,0,1)*Math.PI)*.10)*smooth(34.2,37.4,t)*(1-smooth(48.2,51,t));
  const bridge=smooth(39.2,50.4,t)*(1-smooth(52.6,57.5,t));
  const seal=smooth(42.0,52.5,t)*(1-smooth(57.0,59.4,t));
  const lotus=smooth(50.0,55.6,t)*(1-smooth(58.4,60,t));
  const after=smooth(51.0,56.4,t);
  const end=pulse(56.2,58.0,59.35,60.0,t);
  const fadeOut=smooth(59.18,60,t);
  return {windowAmount,windowDisperse,cosmos,obang,riftOpen,storm,birdMorph,fly,flap,bridge,seal,lotus,after,end,fadeOut};
}

function render(t,now){
  resize();cameraAt(t);const s=sceneValues(t);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  drawBackground(t,s.windowAmount,s.storm,s.after);
  drawStars(t,s.cosmos*.62,s.storm,stars);

  if(s.windowAmount>.002){
    const drift=s.windowDisperse;
    const latticeModel=mat4TRS([0,0,-5.35],[0,0,.018+t*.0015],[1.0+drift*.10,1.0+drift*.10,1]);
    drawRibbon(latticeHalo,latticeModel,t,1,s.windowAmount*.66,.008+drift*.032,0);
    drawRibbon(latticeRibbons,latticeModel,t,1,s.windowAmount,.003+drift*.018,0);
  }
  drawRibbon(obangHalo,ribbonModel,t,smoother(7.4,16.0,t),s.obang*.66,.030,0);
  drawRibbon(obangRibbons,ribbonModel,t,smoother(7.4,16.0,t),s.obang,.018,0);
  drawRift(t,s.riftOpen,s.storm,s.seal,clamp(s.cosmos*1.15));
  drawStars(t,clamp((s.birdMorph+s.bridge+s.lotus)*.25),s.storm,dust);
  drawMagpie(t,s.birdMorph,s.flap,s.fly,1-smooth(51.8,55.6,t));
  drawRibbon(bridgeHalo,ribbonModel,t,s.bridge,s.bridge*.62,.020,0);
  drawRibbon(bridgeRibbons,ribbonModel,t,s.bridge,s.bridge,.010,0);
  drawRibbon(lotusHalo,ribbonModel,t,s.lotus,s.lotus*.58,.006,0);
  drawRibbon(lotusRings,ribbonModel,t,s.lotus,s.lotus,.002,0);
  drawPetals(t,s.lotus,s.lotus);

  document.documentElement.style.setProperty('--fade',String(s.fadeOut));
  progressBar.style.transform=`scaleX(${clamp(t/DURATION)})`;
  endCard.style.opacity=String(s.end);
  endCard.style.transform=`translate(-50%, ${mix(-45,-48,s.end)}%) scale(${mix(.985,1,s.end)})`;
  endCard.setAttribute('aria-hidden',s.end>.2?'false':'true');
  updateAudio(t,s);
  updateDebug(t,s,now);
}

function currentTime(now){
  if(STATIC_FRAME!==null)return ((STATIC_FRAME%DURATION)+DURATION)%DURATION;
  if(!started)return 0;
  return ((now-startStamp)/1000)%DURATION;
}

function animate(now){
  const dt=now-lastFrameNow;lastFrameNow=now;
  if(!document.hidden){
    const t=currentTime(now);render(t,now);
    frameAccumulator+=dt;frameSamples++;
    if(!CAPTURE_MODE&&STATIC_FRAME===null&&now-lastPerfCheck>2600){
      const avg=frameAccumulator/Math.max(1,frameSamples);
      if(avg>25.5&&renderScale>.68){renderScale=Math.max(.68,renderScale-.06);resize(true);}
      else if(avg<15.5&&renderScale<QUALITY.renderScale){renderScale=Math.min(QUALITY.renderScale,renderScale+.025);resize(true);}
      frameAccumulator=0;frameSamples=0;lastPerfCheck=now;
    }
  }
  requestAnimationFrame(animate);
}

function createAudio(){
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return null;
  const ctx=new AudioCtx();const master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
  const droneA=ctx.createOscillator(),droneB=ctx.createOscillator(),gA=ctx.createGain(),gB=ctx.createGain();
  droneA.type='sine';droneA.frequency.value=55;droneB.type='triangle';droneB.frequency.value=82.5;gA.gain.value=.10;gB.gain.value=.025;
  const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=420;low.Q.value=.6;
  droneA.connect(gA).connect(low);droneB.connect(gB).connect(low);low.connect(master);droneA.start();droneB.start();
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,.7);
  return {ctx,master,droneA,droneB,low,buffer,events:new Set()};
}
function strike(key,frequency,when,gain=.05,duration=2.4){
  if(!audio||audio.events.has(key))return;audio.events.add(key);
  const {ctx,master}=audio;const osc=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter();osc.type='sine';osc.frequency.setValueAtTime(frequency,when);osc.frequency.exponentialRampToValueAtTime(frequency*.995,when+duration);
  filter.type='bandpass';filter.frequency.value=frequency*1.9;filter.Q.value=2.2;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(gain,when+.025);g.gain.exponentialRampToValueAtTime(.0001,when+duration);
  osc.connect(filter).connect(g).connect(master);osc.start(when);osc.stop(when+duration+.1);
}
function noiseSweep(key,when,frequency,gain=.025,duration=1.2){
  if(!audio||audio.events.has(key))return;audio.events.add(key);
  const {ctx,master,buffer}=audio;const src=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency*.4,when);filter.frequency.exponentialRampToValueAtTime(frequency,when+duration);filter.Q.value=.8;g.gain.setValueAtTime(.0001,when);g.gain.exponentialRampToValueAtTime(gain,when+.08);g.gain.exponentialRampToValueAtTime(.0001,when+duration);
  src.connect(filter).connect(g).connect(master);src.start(when);src.stop(when+duration+.05);
}
function updateAudio(t,s){
  if(!audio)return;const now=audio.ctx.currentTime;audio.master.gain.setTargetAtTime(muted?0:.32,now,.12);audio.low.frequency.setTargetAtTime(330+s.storm*900+s.lotus*340,now,.18);
  audio.droneA.frequency.setTargetAtTime(55+s.seal*27.5,now,.3);audio.droneB.frequency.setTargetAtTime(82.5+s.storm*27+s.lotus*41.25,now,.25);
  if(t<lastTimeline-.5)audio.events.clear();
  if(t>=7.8&&lastTimeline<7.8)strike('moon',523.25,now,.045,2.8);
  if(t>=18&&lastTimeline<18)noiseSweep('rift',now,720,.028,2.1);
  if(t>=30&&lastTimeline<30)strike('bird',329.63,now,.055,3.2);
  if(t>=38.5&&lastTimeline<38.5)noiseSweep('wing',now,180,.07,1.0);
  if(t>=47&&lastTimeline<47){strike('knot1',392,now,.052,3.4);strike('knot2',587.33,now+.12,.036,3.0);}
  if(t>=54&&lastTimeline<54){strike('lotus1',659.25,now,.04,3.8);strike('lotus2',987.77,now+.18,.025,3.2);}
  lastTimeline=t;
}
function updateDebug(t,s,now){
  if(!DEBUG_MODE)return;debugPanel.hidden=false;
  const fps=1000/Math.max(1,now-lastFrameNow);
  debugPanel.textContent=`GYEOL : VEINS OF LIGHT\nquality  ${qualityName}\ncanvas   ${viewportWidth} × ${viewportHeight}\nscale    ${renderScale.toFixed(2)}\ntime     ${t.toFixed(2)} / ${DURATION}\nwindow   ${s.windowAmount.toFixed(2)}\nrift     ${s.riftOpen.toFixed(2)}\nbird     ${s.birdMorph.toFixed(2)}\nbridge   ${s.bridge.toFixed(2)}\nlotus    ${s.lotus.toFixed(2)}`;
}

function begin(withAudio=true){
  started=true;startStamp=performance.now()-(STATIC_FRAME!==null?STATIC_FRAME*1000:0);lastTimeline=0;
  intro.classList.add('is-hidden');document.body.classList.add('is-playing');
  if(withAudio&&!CAPTURE_MODE){if(!audio)audio=createAudio();audio?.ctx.resume();muted=false;soundButton.classList.remove('is-muted');}
  wakeUI();
}
function wakeUI(){
  document.body.classList.remove('ui-idle');clearTimeout(idleTimer);idleTimer=setTimeout(()=>document.body.classList.add('ui-idle'),2600);
}
['pointermove','pointerdown','keydown','touchstart'].forEach((name)=>addEventListener(name,wakeUI,{passive:true}));
startButton.addEventListener('click',()=>begin(true));
replayButton.addEventListener('click',()=>begin(false));
soundButton.addEventListener('click',()=>{muted=!muted;soundButton.classList.toggle('is-muted',muted);audio?.ctx.resume();wakeUI();});
fullscreenButton.addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen();}catch{}wakeUI();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){pausedAt=performance.now();audio?.ctx.suspend();}else if(started&&STATIC_FRAME===null){startStamp+=performance.now()-pausedAt;audio?.ctx.resume();}});

if(CAPTURE_MODE){document.body.classList.add('capture-mode');begin(false);}
if(STATIC_FRAME!==null){started=true;intro.classList.add('is-hidden');document.body.classList.add('is-playing');}

try {
  requestAnimationFrame(animate);
} catch (error) {
  console.error(error);showError(error);
}
