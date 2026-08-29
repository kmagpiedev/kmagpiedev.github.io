import {
  backgroundFragment,
  bloomExtractFragment,
  blurFragment,
  compositeFragment,
  fullscreenVertex,
  meshFragment,
  meshVertex,
  particleFragment,
  particleVertex,
} from './shaders.js';
import {
  cameraKeyframe,
  createMat4,
  mat4LookAt,
  mat4Multiply,
  mat4Perspective,
} from './math.js';

const CAMERA_KEYFRAMES = Object.freeze([
  { time: 0,  eye: [0.0, 0.10, 12.80], target: [0.0, -0.05, 0.0] },
  { time: 9,  eye: [-.12, 0.18, 12.15], target: [-.12, 0.10, 0.0] },
  { time: 19, eye: [.18, 0.34, 11.20], target: [0.0, 0.28, 0.0] },
  { time: 29, eye: [-.16, 0.26, 10.55], target: [0.0, 0.36, 0.0] },
  { time: 40, eye: [0.0, 0.20, 12.25], target: [0.0, 0.15, 0.0] },
  { time: 48, eye: [0.0, 0.18, 11.35], target: [0.0, 0.34, 0.0] },
  { time: 55, eye: [0.0, 0.12, 12.35], target: [0.0, 0.06, 0.0] },
  { time: 60, eye: [0.0, 0.10, 12.80], target: [0.0, -0.05, 0.0] },
]);

function numberedSource(source) {
  return source.split('\n').map((line, index) => `${String(index + 1).padStart(3, '0')} | ${line}`).join('\n');
}

function compileShader(gl, type, source, label) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error(`Unable to create ${label} shader.`);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'Unknown shader compile error';
    gl.deleteShader(shader);
    throw new Error(`${label} shader failed:\n${log}\n${numberedSource(source)}`);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource, label) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource, `${label} vertex`);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource, `${label} fragment`);
  const program = gl.createProgram();
  if (!program) throw new Error(`Unable to create ${label} program.`);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'Unknown program link error';
    gl.deleteProgram(program);
    throw new Error(`${label} program failed: ${log}`);
  }
  return program;
}

function uniform(gl, program, name) {
  return gl.getUniformLocation(program, name);
}

function createArrayBuffer(gl, data, usage = gl.STATIC_DRAW) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Unable to create WebGL array buffer.');
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  return buffer;
}

function createElementBuffer(gl, data) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error('Unable to create WebGL element buffer.');
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buffer;
}

function configureAttribute(gl, location, size, type = gl.FLOAT, normalized = false, stride = 0, offset = 0, divisor = 0) {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
  if (divisor) gl.vertexAttribDivisor(location, divisor);
}

function createTexture(gl, width, height) {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Unable to create WebGL texture.');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return texture;
}

function createRenderTarget(gl, width, height, withDepth = false) {
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Unable to create WebGL framebuffer.');
  const texture = createTexture(gl, width, height);
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  let depth = null;
  if (withDepth) {
    depth = gl.createRenderbuffer();
    if (!depth) throw new Error('Unable to create WebGL depth buffer.');
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  }
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { framebuffer, texture, depth, width, height };
}

function destroyRenderTarget(gl, target) {
  if (!target) return;
  if (target.depth) gl.deleteRenderbuffer(target.depth);
  if (target.texture) gl.deleteTexture(target.texture);
  if (target.framebuffer) gl.deleteFramebuffer(target.framebuffer);
}

function cubeGeometry() {
  const positions = new Float32Array([
    // +X
     .5,-.5,-.5,  .5, .5,-.5,  .5, .5, .5,  .5,-.5, .5,
    // -X
    -.5,-.5, .5, -.5, .5, .5, -.5, .5,-.5, -.5,-.5,-.5,
    // +Y
    -.5, .5,-.5, -.5, .5, .5,  .5, .5, .5,  .5, .5,-.5,
    // -Y
    -.5,-.5, .5, -.5,-.5,-.5,  .5,-.5,-.5,  .5,-.5, .5,
    // +Z
    -.5,-.5, .5,  .5,-.5, .5,  .5, .5, .5, -.5, .5, .5,
    // -Z
     .5,-.5,-.5, -.5,-.5,-.5, -.5, .5,-.5,  .5, .5,-.5,
  ]);
  const normals = new Float32Array([
     1,0,0, 1,0,0, 1,0,0, 1,0,0,
    -1,0,0,-1,0,0,-1,0,0,-1,0,0,
     0,1,0, 0,1,0, 0,1,0, 0,1,0,
     0,-1,0,0,-1,0,0,-1,0,0,-1,0,
     0,0,1, 0,0,1, 0,0,1, 0,0,1,
     0,0,-1,0,0,-1,0,0,-1,0,0,-1,
  ]);
  const indices = new Uint16Array([
     0, 1, 2, 0, 2, 3,  4, 5, 6, 4, 6, 7,
     8, 9,10, 8,10,11, 12,13,14,12,14,15,
    16,17,18,16,18,19, 20,21,22,20,22,23,
  ]);
  return { positions, normals, indices };
}

function birdGeometry() {
  // Local Z is the direction of flight. The silhouette deliberately reads as
  // a long-tailed magpie even when each instance occupies only a few pixels.
  const triangles = [
    [-.18,0,.72], [.18,0,.72], [0,.08,-.42],
    [-.10,.02,.24], [-2.42,0,.70], [-.50,.04,-.04],
    [-.10,.025,.18], [-.50,.04,-.04], [-1.52,0,-.42],
    [.10,.02,.24], [.50,.04,-.04], [2.42,0,.70],
    [.10,.025,.18], [1.52,0,-.42], [.50,.04,-.04],
    [-.14,.01,-.18], [-.48,0,-1.62], [-.02,.03,-.72],
    [.14,.01,-.18], [.02,.03,-.72], [.48,0,-1.62],
    [-.12,.04,.67], [0,.06,1.10], [.12,.04,.67],
    [0,.045,.96], [.09,.035,.78], [.25,.025,.89],
  ];
  const positions = new Float32Array(triangles.length * 3);
  const normals = new Float32Array(triangles.length * 3);
  triangles.forEach((vertex, index) => {
    positions.set(vertex, index * 3);
    normals.set([0, 1, .18], index * 3);
  });
  return { positions, normals, indices: null };
}

function composeModel(out, translation = [0,0,0], rotationZ = 0, scale = [1,1,1]) {
  const c = Math.cos(rotationZ), s = Math.sin(rotationZ);
  out[0]=c*scale[0]; out[1]=s*scale[0]; out[2]=0; out[3]=0;
  out[4]=-s*scale[1]; out[5]=c*scale[1]; out[6]=0; out[7]=0;
  out[8]=0; out[9]=0; out[10]=scale[2]; out[11]=0;
  out[12]=translation[0]; out[13]=translation[1]; out[14]=translation[2]; out[15]=1;
  return out;
}

class InstancedMorphMesh {
  constructor(gl, program, geometry, data, options = {}) {
    this.gl = gl;
    this.program = program;
    this.count = data.count;
    this.indexCount = geometry.indices?.length || 0;
    this.vertexCount = geometry.positions.length / 3;
    this.isBird = Boolean(options.bird);
    this.vao = gl.createVertexArray();
    if (!this.vao) throw new Error('Unable to create instanced mesh VAO.');
    gl.bindVertexArray(this.vao);
    this.buffers = [];

    let buffer = createArrayBuffer(gl, geometry.positions); this.buffers.push(buffer); configureAttribute(gl, 0, 3);
    buffer = createArrayBuffer(gl, geometry.normals); this.buffers.push(buffer); configureAttribute(gl, 1, 3);
    if (geometry.indices) { this.indexBuffer = createElementBuffer(gl, geometry.indices); }

    const attributes = [
      [2, data.from, 3], [3, data.to, 3], [4, data.dirFrom, 3], [5, data.dirTo, 3],
      [6, data.scalePhase, 4], [7, data.colorFrom, 3], [8, data.colorTo, 3], [9, data.extra, 4],
    ];
    for (const [location, values, size] of attributes) {
      buffer = createArrayBuffer(gl, values);
      this.buffers.push(buffer);
      configureAttribute(gl, location, size, gl.FLOAT, false, 0, 0, 1);
    }
    gl.bindVertexArray(null);

    this.uniforms = {
      viewProj: uniform(gl, program, 'uViewProj'), model: uniform(gl, program, 'uModel'),
      time: uniform(gl, program, 'uTime'), morph: uniform(gl, program, 'uMorph'),
      opacity: uniform(gl, program, 'uOpacity'), turbulence: uniform(gl, program, 'uTurbulence'),
      flap: uniform(gl, program, 'uFlap'), pulse: uniform(gl, program, 'uPulse'),
      camera: uniform(gl, program, 'uCamera'), lightDirection: uniform(gl, program, 'uLightDirection'),
      glow: uniform(gl, program, 'uGlow'), fragmentOpacity: uniform(gl, program, 'uOpacity'),
      bird: uniform(gl, program, 'uBird'),
    };
  }

  draw({ viewProj, model, camera, time, morph, opacity, turbulence=0, flap=0, pulse=0, glow=.7 }) {
    if (opacity <= .001) return false;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(this.uniforms.viewProj, false, viewProj);
    gl.uniformMatrix4fv(this.uniforms.model, false, model);
    gl.uniform1f(this.uniforms.time, time);
    gl.uniform1f(this.uniforms.morph, morph);
    gl.uniform1f(this.uniforms.opacity, opacity);
    gl.uniform1f(this.uniforms.turbulence, turbulence);
    gl.uniform1f(this.uniforms.flap, flap);
    gl.uniform1f(this.uniforms.pulse, pulse);
    gl.uniform3fv(this.uniforms.camera, camera);
    gl.uniform3f(this.uniforms.lightDirection, -.35, .72, .58);
    gl.uniform1f(this.uniforms.glow, glow);
    gl.uniform1f(this.uniforms.bird, this.isBird ? 1 : 0);
    if (this.indexCount) gl.drawElementsInstanced(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0, this.count);
    else gl.drawArraysInstanced(gl.TRIANGLES, 0, this.vertexCount, this.count);
    return true;
  }
}

class ParticleMorphSystem {
  constructor(gl, program, data) {
    this.gl = gl;
    this.program = program;
    this.count = data.count;
    this.vao = gl.createVertexArray();
    if (!this.vao) throw new Error('Unable to create particle VAO.');
    gl.bindVertexArray(this.vao);
    this.buffers = [];
    const attributes = [
      [0,data.seed,4],[1,data.star,3],[2,data.thread,3],[3,data.magpie,3],
      [4,data.bridge,3],[5,data.lotus,3],[6,data.color,3],
    ];
    for (const [location, values, size] of attributes) {
      const buffer = createArrayBuffer(gl, values);
      this.buffers.push(buffer);
      configureAttribute(gl, location, size);
    }
    gl.bindVertexArray(null);
    this.uniforms = {
      viewProj: uniform(gl, program, 'uViewProj'), time: uniform(gl, program, 'uTime'),
      threads: uniform(gl, program, 'uThreads'), magpie: uniform(gl, program, 'uMagpie'),
      bridge: uniform(gl, program, 'uBridge'), lotus: uniform(gl, program, 'uLotus'),
      rift: uniform(gl, program, 'uRift'), pointScale: uniform(gl, program, 'uPointScale'),
      opacity: uniform(gl, program, 'uOpacity'),
    };
  }

  draw({viewProj,time,threads,magpie,bridge,lotus,rift,pointScale,opacity}) {
    if (opacity <= .001) return false;
    const gl = this.gl;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.uniformMatrix4fv(this.uniforms.viewProj, false, viewProj);
    gl.uniform1f(this.uniforms.time, time);
    gl.uniform1f(this.uniforms.threads, threads);
    gl.uniform1f(this.uniforms.magpie, magpie);
    gl.uniform1f(this.uniforms.bridge, bridge);
    gl.uniform1f(this.uniforms.lotus, lotus);
    gl.uniform1f(this.uniforms.rift, rift);
    gl.uniform1f(this.uniforms.pointScale, pointScale);
    gl.uniform1f(this.uniforms.opacity, opacity);
    gl.drawArrays(gl.POINTS, 0, this.count);
    return true;
  }
}

export class ArtworkRenderer {
  constructor(canvas, assets, options = {}) {
    this.canvas = canvas;
    this.options = options;
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
    });
    if (!gl) throw new Error('WEBGL2_CONTEXT_UNAVAILABLE');
    this.gl = gl;
    if (gl.getParameter(gl.MAX_VERTEX_ATTRIBS) < 10) throw new Error('WEBGL2_VERTEX_ATTRIBUTE_LIMIT');

    this.programs = {
      background: createProgram(gl, fullscreenVertex, backgroundFragment, 'background'),
      mesh: createProgram(gl, meshVertex, meshFragment, 'mesh'),
      particle: createProgram(gl, particleVertex, particleFragment, 'particle'),
      bloom: createProgram(gl, fullscreenVertex, bloomExtractFragment, 'bloom extract'),
      blur: createProgram(gl, fullscreenVertex, blurFragment, 'bloom blur'),
      composite: createProgram(gl, fullscreenVertex, compositeFragment, 'composite'),
    };

    this.fullscreenVao = gl.createVertexArray();
    if (!this.fullscreenVao) throw new Error('Unable to create fullscreen VAO.');
    const cube = cubeGeometry();
    const bird = birdGeometry();
    this.latticeThreads = new InstancedMorphMesh(gl, this.programs.mesh, cube, assets.latticeToThreads);
    this.threadMagpie = new InstancedMorphMesh(gl, this.programs.mesh, bird, assets.threadToMagpie, { bird:true });
    this.magpieBridge = new InstancedMorphMesh(gl, this.programs.mesh, bird, assets.magpieToBridge, { bird:true });
    this.bridgeLotus = new InstancedMorphMesh(gl, this.programs.mesh, cube, assets.bridgeToLotus);
    this.particles = new ParticleMorphSystem(gl, this.programs.particle, assets.particles);

    this.backgroundUniforms = {
      resolution: uniform(gl,this.programs.background,'uResolution'), time: uniform(gl,this.programs.background,'uTime'),
      window: uniform(gl,this.programs.background,'uWindow'), threads: uniform(gl,this.programs.background,'uThreads'),
      rift: uniform(gl,this.programs.background,'uRift'), seal: uniform(gl,this.programs.background,'uSeal'),
      lotus: uniform(gl,this.programs.background,'uLotus'), energy: uniform(gl,this.programs.background,'uEnergy'),
    };
    this.bloomUniforms = { scene:uniform(gl,this.programs.bloom,'uScene'), threshold:uniform(gl,this.programs.bloom,'uThreshold') };
    this.blurUniforms = {
      texture:uniform(gl,this.programs.blur,'uTexture'), direction:uniform(gl,this.programs.blur,'uDirection'), texel:uniform(gl,this.programs.blur,'uTexel'),
    };
    this.compositeUniforms = {
      scene:uniform(gl,this.programs.composite,'uScene'), bloom:uniform(gl,this.programs.composite,'uBloom'),
      resolution:uniform(gl,this.programs.composite,'uResolution'), time:uniform(gl,this.programs.composite,'uTime'),
      bloomStrength:uniform(gl,this.programs.composite,'uBloomStrength'), exposure:uniform(gl,this.programs.composite,'uExposure'),
      rift:uniform(gl,this.programs.composite,'uRift'), seal:uniform(gl,this.programs.composite,'uSeal'),
    };

    this.maxRenderSize = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
    this.width = 1;
    this.height = 1;
    this.bloomWidth = 1;
    this.bloomHeight = 1;
    this.sceneTarget = null;
    this.bloomA = null;
    this.bloomB = null;
    this.view = createMat4();
    this.projection = createMat4();
    this.viewProjection = createMat4();
    this.modelLattice = createMat4();
    this.modelMagpie = createMat4();
    this.modelBridge = createMat4();
    this.modelLotus = createMat4();
    this.eye = new Float32Array([0,0,10]);
    this.target = new Float32Array([0,0,0]);
    this.up = new Float32Array([0,1,0]);
    this.drawCalls = 0;
    this.bloomIterations = Math.max(1, options.bloomIterations || 1);
    this.stats = { ...assets.stats, drawCalls: 0, width: 1, height: 1, scale: 1, renderer: gl.getParameter(gl.RENDERER) };

    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0.002,0.006,0.018,1);

    canvas.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      window.dispatchEvent(new CustomEvent('artworkerror', { detail: new Error('WEBGL_CONTEXT_LOST') }));
    }, false);
  }

  resize(width, height) {
    let nextWidth = Math.max(2, Math.floor(width));
    let nextHeight = Math.max(2, Math.floor(height));
    if (nextWidth > this.maxRenderSize || nextHeight > this.maxRenderSize) {
      const fit = Math.min(this.maxRenderSize / nextWidth, this.maxRenderSize / nextHeight);
      nextWidth = Math.max(2, Math.floor(nextWidth * fit));
      nextHeight = Math.max(2, Math.floor(nextHeight * fit));
    }
    if (nextWidth === this.width && nextHeight === this.height && this.sceneTarget) return false;
    this.width = nextWidth;
    this.height = nextHeight;
    this.bloomWidth = Math.max(2, Math.floor(nextWidth * .5));
    this.bloomHeight = Math.max(2, Math.floor(nextHeight * .5));
    this.canvas.width = nextWidth;
    this.canvas.height = nextHeight;
    destroyRenderTarget(this.gl, this.sceneTarget);
    destroyRenderTarget(this.gl, this.bloomA);
    destroyRenderTarget(this.gl, this.bloomB);
    this.sceneTarget = createRenderTarget(this.gl, nextWidth, nextHeight, true);
    this.bloomA = createRenderTarget(this.gl, this.bloomWidth, this.bloomHeight, false);
    this.bloomB = createRenderTarget(this.gl, this.bloomWidth, this.bloomHeight, false);
    this.stats.width = nextWidth;
    this.stats.height = nextHeight;
    return true;
  }

  updateCamera(time) {
    cameraKeyframe(time, CAMERA_KEYFRAMES, this.eye, this.target);
    const subtle = Math.sin(time * .16) * .025;
    this.eye[1] += subtle;
    mat4Perspective(this.projection, 40 * Math.PI / 180, this.width / this.height, .1, 100);
    mat4LookAt(this.view, this.eye, this.target, this.up);
    mat4Multiply(this.viewProjection, this.projection, this.view);
  }

  drawFullscreen(program) {
    const gl = this.gl;
    gl.useProgram(program);
    gl.bindVertexArray(this.fullscreenVao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    this.drawCalls += 1;
  }

  renderBackground(time, state) {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.programs.background);
    gl.uniform2f(this.backgroundUniforms.resolution, this.width, this.height);
    gl.uniform1f(this.backgroundUniforms.time, time);
    gl.uniform1f(this.backgroundUniforms.window, state.window);
    gl.uniform1f(this.backgroundUniforms.threads, state.threads);
    gl.uniform1f(this.backgroundUniforms.rift, state.rift);
    gl.uniform1f(this.backgroundUniforms.seal, state.seal);
    gl.uniform1f(this.backgroundUniforms.lotus, state.lotusOpacity);
    gl.uniform1f(this.backgroundUniforms.energy, Math.max(state.threads, state.magpieMorph, state.bridgeMorph));
    this.drawFullscreen(this.programs.background);
  }

  renderSceneMeshes(time, state, pointScale) {
    const gl = this.gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthMask(false);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    composeModel(this.modelLattice, [0,0,0], 0, [1,1,1]);
    composeModel(this.modelMagpie, [0, .03 + state.magpieFlap * .03, 0], 0, [1,1,1]);
    composeModel(this.modelBridge, [0,0,0], 0, [1,1,1]);
    composeModel(this.modelLotus, [0,0,0], 0, [1,1,1]);

    if (this.latticeThreads.draw({
      viewProj:this.viewProjection,model:this.modelLattice,camera:this.eye,time,morph:state.latticeMorph,
      opacity:state.latticeOpacity,turbulence:state.threads*.28,flap:0,pulse:state.window,glow:.72,
    })) this.drawCalls++;

    if (this.threadMagpie.draw({
      viewProj:this.viewProjection,model:this.modelMagpie,camera:this.eye,time,morph:state.magpieMorph,
      opacity:state.magpieOpacity,turbulence:(1-state.magpieMorph)*.20+state.rift*.04,
      flap:state.magpieFlap,pulse:state.magpieMorph,glow:.98,
    })) this.drawCalls++;

    if (this.magpieBridge.draw({
      viewProj:this.viewProjection,model:this.modelBridge,camera:this.eye,time,morph:state.bridgeMorph,
      opacity:state.bridgeOpacity,turbulence:(1-state.bridgeMorph)*.12,flap:state.magpieFlap*.28,pulse:state.seal,glow:1.08,
    })) this.drawCalls++;

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    if (this.bridgeLotus.draw({
      viewProj:this.viewProjection,model:this.modelLotus,camera:this.eye,time,morph:state.lotusMorph,
      opacity:state.lotusOpacity*.30,turbulence:.025,flap:0,pulse:state.lotus,glow:.92,
    })) this.drawCalls++;

    if (this.particles.draw({
      viewProj:this.viewProjection,time,threads:state.particleThreads,magpie:state.particleMagpie,
      bridge:state.particleBridge,lotus:state.particleLotus,rift:state.rift,pointScale,
      opacity:.38+.24*Math.max(state.threads,state.magpieMorph,state.bridgeMorph,state.lotus),
    })) this.drawCalls++;

    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  renderBloom() {
    const gl = this.gl;
    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomA.framebuffer);
    gl.viewport(0,0,this.bloomWidth,this.bloomHeight);
    gl.useProgram(this.programs.bloom);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.sceneTarget.texture);
    gl.uniform1i(this.bloomUniforms.scene,0);
    gl.uniform1f(this.bloomUniforms.threshold,.67);
    this.drawFullscreen(this.programs.bloom);

    let source = this.bloomA;
    let destination = this.bloomB;
    for (let iteration=0; iteration<this.bloomIterations; iteration++) {
      gl.bindFramebuffer(gl.FRAMEBUFFER,destination.framebuffer);
      gl.viewport(0,0,this.bloomWidth,this.bloomHeight);
      gl.useProgram(this.programs.blur);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,source.texture);
      gl.uniform1i(this.blurUniforms.texture,0);
      gl.uniform2f(this.blurUniforms.direction,1,0);
      gl.uniform2f(this.blurUniforms.texel,1/this.bloomWidth,1/this.bloomHeight);
      this.drawFullscreen(this.programs.blur);
      [source,destination]=[destination,source];

      gl.bindFramebuffer(gl.FRAMEBUFFER,destination.framebuffer);
      gl.useProgram(this.programs.blur);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D,source.texture);
      gl.uniform1i(this.blurUniforms.texture,0);
      gl.uniform2f(this.blurUniforms.direction,0,1);
      gl.uniform2f(this.blurUniforms.texel,1/this.bloomWidth,1/this.bloomHeight);
      this.drawFullscreen(this.programs.blur);
      [source,destination]=[destination,source];
    }
    return source.texture;
  }

  composite(time, state, bloomTexture) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.viewport(0,0,this.width,this.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.useProgram(this.programs.composite);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D,this.sceneTarget.texture);
    gl.uniform1i(this.compositeUniforms.scene,0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D,bloomTexture);
    gl.uniform1i(this.compositeUniforms.bloom,1);
    gl.uniform2f(this.compositeUniforms.resolution,this.width,this.height);
    gl.uniform1f(this.compositeUniforms.time,time);
    gl.uniform1f(this.compositeUniforms.bloomStrength,.42 + state.seal*.20 + state.lotus*.10);
    gl.uniform1f(this.compositeUniforms.exposure,.94 + state.window*.04 + state.seal*.05);
    gl.uniform1f(this.compositeUniforms.rift,state.rift);
    gl.uniform1f(this.compositeUniforms.seal,state.seal);
    this.drawFullscreen(this.programs.composite);
  }

  render(time, state, pointScale = 2.2) {
    if (!this.sceneTarget) return;
    const gl = this.gl;
    this.drawCalls = 0;
    this.updateCamera(time);
    gl.bindFramebuffer(gl.FRAMEBUFFER,this.sceneTarget.framebuffer);
    gl.viewport(0,0,this.width,this.height);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    this.renderBackground(time,state);
    this.renderSceneMeshes(time,state,pointScale);
    const bloomTexture = this.renderBloom();
    this.composite(time,state,bloomTexture);
    gl.flush();
    this.stats.drawCalls=this.drawCalls;
  }

  getStats() { return this.stats; }
}
