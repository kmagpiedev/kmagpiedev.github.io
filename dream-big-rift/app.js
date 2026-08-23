import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const fallback = document.getElementById('fallback');

try {
  const parts = await Promise.all(
    [1, 2, 3, 4].map(async index => {
      const response = await fetch(`./app.${index}.txt`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`Runtime part ${index} failed: ${response.status}`);
      return response.text();
    })
  );

  const encoded = parts.join('').replace(/\s+/g, '');
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const source = new TextDecoder('utf-8').decode(bytes);
  const entry = source.indexOf('const DURATION');
  if (entry < 0) throw new Error('Artwork runtime entry point was not found.');

  const execute = new Function(
    'THREE',
    'EffectComposer',
    'RenderPass',
    'UnrealBloomPass',
    'OutputPass',
    source.slice(entry)
  );

  execute(THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass);
} catch (error) {
  console.error('[RIFT : SEAM OF LIGHT]', error);
  if (fallback) fallback.hidden = false;
}
