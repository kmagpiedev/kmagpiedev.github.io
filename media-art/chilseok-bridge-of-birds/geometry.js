import {
  TAU,
  clamp,
  lerp,
  mulberry32,
  randRange,
  v3Length,
  v3Normalize,
  v3Sub,
} from './math.js';

export const COLORS = Object.freeze({
  moon: [1.00, .95, .82],
  ivory: [.94, .97, 1.00],
  pearl: [.73, .88, 1.00],
  cyan: [.18, .70, .92],
  coral: [1.00, .48, .42],
  violet: [.55, .42, .90],
  navy: [.055, .12, .25],
  ink: [.025, .055, .12],
});

const tempDirection = [0, 0, 0];
const cloneColor = (color) => [color[0], color[1], color[2]];
const midpoint = (a, b) => [(a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5];

function segmentFromPoints(a, b, color = COLORS.ivory, meta = {}) {
  v3Sub(tempDirection, b, a);
  const length = v3Length(tempDirection) || .001;
  return {
    position: midpoint(a, b),
    direction: v3Normalize([0, 0, 0], tempDirection),
    length,
    color: cloneColor(color),
    group: meta.group || 0,
    delay: meta.delay ?? 0,
    emission: meta.emission ?? .72,
    seed: meta.seed ?? .5,
  };
}

function addLine(out, a, b, subdivisions, color, meta = {}) {
  const count = Math.max(1, subdivisions | 0);
  for (let index = 0; index < count; index++) {
    const t0 = index / count;
    const t1 = (index + 1) / count;
    const p0 = [lerp(a[0], b[0], t0), lerp(a[1], b[1], t0), lerp(a[2], b[2], t0)];
    const p1 = [lerp(a[0], b[0], t1), lerp(a[1], b[1], t1), lerp(a[2], b[2], t1)];
    out.push(segmentFromPoints(p0, p1, color, { ...meta, delay: meta.delay ?? t0 }));
  }
}

function addEllipse(out, center, rx, ry, subdivisions, color, meta = {}) {
  for (let index = 0; index < subdivisions; index++) {
    const a0 = index / subdivisions * TAU;
    const a1 = (index + 1) / subdivisions * TAU;
    const p0 = [center[0] + Math.cos(a0) * rx, center[1] + Math.sin(a0) * ry, center[2]];
    const p1 = [center[0] + Math.cos(a1) * rx, center[1] + Math.sin(a1) * ry, center[2]];
    out.push(segmentFromPoints(p0, p1, color, { ...meta, delay: meta.delay ?? index / subdivisions }));
  }
}

function addMountainRange(out, side, density) {
  const points = side < 0
    ? [[-6.9,-2.48,0],[-6.2,-2.05,.04],[-5.6,-2.34,.02],[-4.85,-1.82,.05],[-4.0,-2.30,.02],[-3.2,-2.05,.04],[-2.3,-2.43,0],[-.35,-2.5,0]]
    : [[.35,-2.5,0],[2.25,-2.43,0],[3.1,-2.07,.04],[3.95,-2.31,.02],[4.85,-1.84,.05],[5.58,-2.34,.02],[6.18,-2.05,.04],[6.9,-2.48,0]];
  for (let index = 0; index < points.length - 1; index++) {
    addLine(out, points[index], points[index + 1], Math.round(6 * density), COLORS.navy, { emission: .32, seed: (index + 1) / 8 });
  }
}

function generateOpeningPair(density, rng) {
  const from = [];
  addMountainRange(from, -1, density);
  addMountainRange(from, 1, density);
  const to = from.map((item) => ({
    ...item,
    position: [...item.position],
    direction: [...item.direction],
    color: cloneColor(item.color),
  }));
  return { from, to };
}

function birdItem(position, direction, color, meta = {}) {
  return {
    position,
    direction: v3Normalize([0,0,0], direction),
    length: meta.length ?? .22,
    color: cloneColor(color),
    group: meta.group ?? 1,
    delay: meta.delay ?? 0,
    emission: meta.emission ?? .88,
    seed: meta.seed ?? .5,
  };
}

function generateDistantBirds(count, rng) {
  const birds = new Array(count);
  for (let index = 0; index < count; index++) {
    const side = index < count / 2 ? -1 : 1;
    const x = side * randRange(rng, 1.1, 6.3);
    const y = randRange(rng, -1.7, 3.35);
    birds[index] = birdItem([x,y,randRange(rng,-1.7,.3)],[-side,randRange(rng,-.18,.18),0],COLORS.pearl,{length:randRange(rng,.055,.12),delay:rng(),emission:.44,seed:rng()});
  }
  return birds;
}

function generateFlock(count, rng) {
  const birds = new Array(count);
  for (let index = 0; index < count; index++) {
    const side = index < count / 2 ? -1 : 1;
    const local = (index % Math.ceil(count / 2)) / Math.ceil(count / 2);
    const u = clamp(local + randRange(rng,-.035,.035));
    const x = side * lerp(6.25, .85, Math.pow(u,.82)) + randRange(rng,-.22,.22);
    const y = -1.35 + Math.sin(u*Math.PI)*4.2 + randRange(rng,-.42,.42);
    const z = randRange(rng,-1.0,.65) + Math.sin(u*TAU)*.18;
    const paletteRoll = rng();
    const hero = index % 47 === 0;
    const color = hero ? COLORS.ivory : (paletteRoll < .67 ? COLORS.ivory : (paletteRoll < .82 ? COLORS.navy : (side < 0 ? COLORS.cyan : COLORS.coral)));
    birds[index] = birdItem([x,y,z],[-side,side*Math.cos(u*Math.PI)*.65,randRange(rng,-.08,.08)],color,{length:hero?randRange(rng,.38,.52):randRange(rng,.15,.28),group:hero?3.4:1,delay:u*.72,emission:hero?1:randRange(rng,.62,.96),seed:rng()});
  }
  return birds;
}

function generateBridgeBirds(count, rng) {
  const birds = new Array(count);
  const lanes = 3;
  for (let index = 0; index < count; index++) {
    const lane = index % lanes;
    const row = Math.floor(index / lanes);
    const rows = Math.ceil(count / lanes);
    const t = clamp((row + rng()*.28) / Math.max(1, rows-1));
    const laneOffset = (lane-(lanes-1)/2)*.20;
    const x = lerp(-5.35,5.35,t) + randRange(rng,-.065,.065);
    const y = -1.62 + Math.sin(t*Math.PI)*3.95 + laneOffset + randRange(rng,-.055,.055);
    const z = (lane-(lanes-1)/2)*.14 + Math.sin(t*TAU)*.12;
    const colorRoll = rng();
    const color = colorRoll < .54 ? COLORS.ivory : (colorRoll < .70 ? COLORS.pearl : (t<.5?COLORS.cyan:COLORS.coral));
    const hero=index%41===0;
    birds[index] = birdItem([x,y,z],[1,Math.cos(t*Math.PI)*1.16,0],color,{length:hero?randRange(rng,.38,.50):randRange(rng,.19,.29),group:hero?1.75:1,delay:1-Math.abs(t-.5)*2,emission:.92,seed:rng()});
  }
  return birds;
}

function generateBridgeSegments(count, rng, meeting = false) {
  const segments = new Array(count);
  const lanes = meeting ? 5 : 9;
  for (let index = 0; index < count; index++) {
    const lane = index % lanes;
    const row = Math.floor(index / lanes);
    const rows = Math.ceil(count / lanes);
    const t0 = row / rows;
    const t1 = Math.min(1,(row+1)/rows);
    const laneOffset = (lane-(lanes-1)/2)*(meeting?.075:.105);
    const point = (t) => [lerp(-5.42,5.42,t),-1.64+Math.sin(t*Math.PI)*(meeting?4.06:3.95)+laneOffset,-.20+lane*.052+Math.sin(t*TAU)*.08];
    const color = meeting ? (Math.abs(t0-.5)<.1?COLORS.moon:(t0<.5?COLORS.cyan:COLORS.coral)) : (lane%3===0?COLORS.pearl:COLORS.ivory);
    segments[index] = segmentFromPoints(point(t0),point(t1),color,{delay:1-Math.abs(t0-.5)*2,emission:meeting?1:.74,seed:rng()});
  }
  return segments;
}

function generateReunionSegments(count, rng) {
  const out = [];
  const addPerson = (side) => {
    const x = side * .44;
    const accent = side < 0 ? COLORS.cyan : COLORS.coral;
    addEllipse(out,[x,3.13,.30],.15,.18,28,COLORS.moon,{emission:1});
    addLine(out,[x,2.95,.30],[x,2.48,.30],34,accent,{emission:1});
    addLine(out,[x,2.82,.30],[side*.10,2.70,.30],22,COLORS.ivory,{emission:1});
    addLine(out,[x,2.48,.30],[x-side*.30,2.22,.30],30,accent,{emission:.92});
    addLine(out,[x,2.48,.30],[x+side*.28,2.22,.30],30,accent,{emission:.92});
    addLine(out,[x-side*.30,2.22,.30],[x+side*.28,2.22,.30],22,accent,{emission:.88});
  };
  addPerson(-1);
  addPerson(1);
  addLine(out,[-.12,2.70,.32],[.12,2.70,.32],36,COLORS.moon,{emission:1});
  while(out.length<count){
    const angle=rng()*TAU,radius=Math.pow(rng(),.72)*1.2;
    const center=[Math.cos(angle)*radius,2.72+Math.sin(angle)*radius*.62,randRange(rng,-.15,.22)];
    const length=randRange(rng,.018,.06);
    out.push(segmentFromPoints([center[0]-length,center[1],center[2]],[center[0]+length,center[1],center[2]],rng()<.6?COLORS.moon:COLORS.pearl,{delay:rng(),emission:randRange(rng,.65,1),seed:rng()}));
  }
  return out.slice(0,count);
}

function createInstanceData(fromItems, toItems, rng, options = {}) {
  const count = options.count || Math.max(fromItems.length, toItems.length);
  const from = new Float32Array(count*3), to = new Float32Array(count*3), dirFrom = new Float32Array(count*3), dirTo = new Float32Array(count*3), scalePhase = new Float32Array(count*4), colorFrom = new Float32Array(count*3), colorTo = new Float32Array(count*3), extra = new Float32Array(count*4);
  const thicknessMin = options.thicknessMin ?? .028, thicknessMax = options.thicknessMax ?? .072, lengthScale = options.lengthScale ?? .62;
  for (let index = 0; index < count; index++) {
    const source = fromItems[Math.floor(index/count*fromItems.length)%fromItems.length], target = toItems[Math.floor(index/count*toItems.length)%toItems.length];
    const o3=index*3,o4=index*4,thickness=randRange(rng,thicknessMin,thicknessMax),length=options.fixedLength??Math.max(.035,lerp(source.length||.18,target.length||.18,.5)*lengthScale);
    from.set(source.position,o3);to.set(target.position,o3);dirFrom.set(source.direction||[0,0,1],o3);dirTo.set(target.direction||[0,0,1],o3);
    scalePhase.set([thickness,thickness*randRange(rng,.72,1.16),length,rng()],o4);colorFrom.set(source.color||COLORS.ivory,o3);colorTo.set(target.color||COLORS.ivory,o3);
    extra.set([target.group??source.group??0,clamp(target.delay??source.delay??rng()),Math.max(source.emission??.5,target.emission??.5),target.seed??source.seed??rng()],o4);
  }
  return {count,from,to,dirFrom,dirTo,scalePhase,colorFrom,colorTo,extra};
}

function generateParticleTargets(count, rng, flock, bridge) {
  const seed=new Float32Array(count*4),star=new Float32Array(count*3),thread=new Float32Array(count*3),magpie=new Float32Array(count*3),bridgeTarget=new Float32Array(count*3),release=new Float32Array(count*3),color=new Float32Array(count*3);
  for (let index=0; index<count; index++) {
    const o3=index*3,o4=index*4,angle=rng()*TAU,radius=randRange(rng,5.0,16.0),riverY=randRange(rng,-4.4,4.4);
    star.set([Math.cos(angle)*radius*.72,randRange(rng,-4.3,4.3),randRange(rng,-6,2)],o3);
    thread.set([randRange(rng,-.65,.65)+Math.sin(riverY*1.7)*.13,riverY,randRange(rng,-1.5,.3)],o3);
    magpie.set(flock[index%flock.length].position,o3);bridgeTarget.set(bridge[index%bridge.length].position,o3);
    const side=index%2?-1:1;release.set([side*randRange(rng,.4,7.2),randRange(rng,-.5,5.5),randRange(rng,-3,.4)],o3);seed.set([rng(),rng(),rng(),rng()],o4);
    color.set(index%5===0?COLORS.coral:(index%3===0?COLORS.cyan:COLORS.ivory),o3);
  }
  return {count,seed,star,thread,magpie,bridge:bridgeTarget,lotus:release,color};
}

export function createProceduralAssets({density=1,particleCount=9000,seed=7070707}={}) {
  const rng=mulberry32(seed),opening=generateOpeningPair(density,rng),birdCount=Math.round(210*density),distant=generateDistantBirds(birdCount,rng),flock=generateFlock(birdCount,rng),bridgeBirds=generateBridgeBirds(birdCount,rng),bridgeSegmentCount=Math.round(180*density),bridgeSegments=generateBridgeSegments(bridgeSegmentCount,rng,false),meetingSegments=generateBridgeSegments(bridgeSegmentCount,rng,true);
  const latticeToThreads=createInstanceData(opening.from,opening.to,rng,{count:opening.from.length,thicknessMin:.018,thicknessMax:.042,lengthScale:.62});
  const threadToMagpie=createInstanceData(distant,flock,rng,{count:birdCount,thicknessMin:.076,thicknessMax:.142,lengthScale:1.12});
  const magpieToBridge=createInstanceData(flock,bridgeBirds,rng,{count:birdCount,thicknessMin:.078,thicknessMax:.146,lengthScale:1.14});
  const bridgeToLotus=createInstanceData(bridgeSegments,meetingSegments,rng,{count:bridgeSegmentCount,thicknessMin:.018,thicknessMax:.042,lengthScale:.74});
  const particles=generateParticleTargets(particleCount,rng,flock,bridgeBirds);
  return {latticeToThreads,threadToMagpie,magpieToBridge,bridgeToLotus,particles,stats:{latticeSegments:latticeToThreads.count,featherInstances:birdCount,bridgeSegments:bridgeSegmentCount,particles:particleCount}};
}
