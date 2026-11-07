import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

//
// Kaplay performance patches (see CLAUDE.md §13). Plain string replacements
// instead of patch-package so Linux CI and Netlify caches do not break on
// minified one-line diffs. Each patch carries its own marker, so a file that
// already has the older patches still receives the newer ones.
//
const KAPLAY_DIST = join('node_modules', 'kaplay', 'dist')
const DIST_FILES = ['kaplay.mjs', 'kaplay.cjs']
//
// flush(): bufferData (orphans the previous buffer) instead of bufferSubData
// at offset 0, which stalls the macOS WebGL→Metal path once per batch.
//
const FLUSH_OLD =
  'this.ctx.pushArrayBuffer(this.glVBuf),n.bufferSubData(n.ARRAY_BUFFER,0,new Float32Array(this.vqueue)),this.ctx.pushElementArrayBuffer(this.glIBuf),n.bufferSubData(n.ELEMENT_ARRAY_BUFFER,0,new Uint16Array(this.iqueue)),'
const FLUSH_NEW =
  'this.ctx.pushArrayBuffer(this.glVBuf),this._vScratch&&this._vScratch.length>=this.vqueue.length||(this._vScratch=new Float32Array(this.vqueue.length)),this._vScratch.set(this.vqueue),n.bufferData(n.ARRAY_BUFFER,this._vScratch.subarray(0,this.vqueue.length),n.DYNAMIC_DRAW),this.ctx.pushElementArrayBuffer(this.glIBuf),this._iScratch&&this._iScratch.length>=this.iqueue.length||(this._iScratch=new Uint16Array(this.iqueue.length)),this._iScratch.set(this.iqueue),n.bufferData(n.ELEMENT_ARRAY_BUFFER,this._iScratch.subarray(0,this.iqueue.length),n.DYNAMIC_DRAW),'
//
// Uniform locations are looked up once per shader program, not per draw.
//
const UNIFORM_OLD = 'let o=e[n],s=r.getUniformLocation(this.glProgram,n);'
const UNIFORM_NEW =
  'let o=e[n],locs=this._locs||(this._locs={}),s=n in locs?locs[n]:(locs[n]=r.getUniformLocation(this.glProgram,n));'
//
// Direct-to-screen frames. Kaplay renders every frame into its own offscreen
// framebuffer and then blits it to the canvas. When that buffer is exactly
// the canvas size, at 0,0, with no post shader (native-resolution scenes),
// the blit is a 1:1 copy: one more full-screen pass plus a render-target
// switch, which on tile-based GPUs (Apple) costs a tile flush every frame.
// In that case the frame is drawn straight onto the canvas instead.
//
const FRAME_START_OLD =
  'function o(){e.gl.clear(e.gl.COLOR_BUFFER_BIT),e.frameBuffer.bind(),e.gl.clear(e.gl.COLOR_BUFFER_BIT),'
const FRAME_START_NEW =
  'function o(){e._direct=!e.postShader&&e.viewport.x===0&&e.viewport.y===0&&e.viewport.width===e.gl.drawingBufferWidth&&e.viewport.height===e.gl.drawingBufferHeight&&e.frameBuffer.width===e.gl.drawingBufferWidth&&e.frameBuffer.height===e.gl.drawingBufferHeight,e.gl.clear(e.gl.COLOR_BUFFER_BIT),e._direct?e.ggl.pushViewport({x:0,y:0,w:e.gl.drawingBufferWidth,h:e.gl.drawingBufferHeight}):(e.frameBuffer.bind(),e.gl.clear(e.gl.COLOR_BUFFER_BIT)),'
const FRAME_END_OLD =
  'function s(){xe(),e.lastDrawCalls=e.renderer.numDraws,e.frameBuffer.unbind(),'
const FRAME_END_NEW =
  'function s(){if(xe(),e.lastDrawCalls=e.renderer.numDraws,e._direct)return void e.ggl.popViewport();e.frameBuffer.unbind(),'
//
// drawPolygon(): the default fan indices were built (spread, map, flat over
// every vertex) on every call and thrown away whenever the caller passed its
// own indices — a large per-frame allocation for big batched polygons
// (utils/poly-batch.js). They are built only when no indices are given.
//
const POLY_FAN_OLD =
  'let o;t.triangulate?o=qr(t.pts).map(i=>i.map(a=>t.pts.indexOf(a))).flat():o=[...Array(e-2).keys()].map(s=>[0,s+1,s+2]).flat(),ze(n,t.indices??o,'
const POLY_FAN_NEW =
  'let o=t.indices;o||(t.triangulate?o=qr(t.pts).map(i=>i.map(a=>t.pts.indexOf(a))).flat():o=[...Array(e-2).keys()].map(s=>[0,s+1,s+2]).flat()),ze(n,o,'
//
// renderer.push(): the overflow check multiplied the incoming vertex data
// (already a flat array of floats) by the stride again, so any polygon of
// more than ~1000 vertices flushed the batch before it — an extra draw call
// and buffer upload per big polygon every frame.
//
const PUSH_LIMIT_OLD = 'this.vqueue.length+r.length*this.stride>this.maxVertices'
const PUSH_LIMIT_NEW = 'this.vqueue.length+r.length>this.maxVertices'
//
// drawPolygon() fast path for polygons with per-vertex colours and their own
// indices (every utils/poly-batch.js flush): the vertices go straight into
// the one interleaved array the renderer takes, instead of first into four
// per-attribute arrays (pos, uv, colour, opacity) that the raw draw then
// re-reads, and the transform matrix is applied inline instead of through
// a method call per vertex. Same output; one array and one pass per call
// instead of five.
//
const POLY_FAST_SE_OLD =
  't.fill!==!1){let r=t.color??F.WHITE,n={pos:'
const POLY_FAST_SE_NEW =
  't.fill!==!1&&t.colors&&t.indices&&!t.uv&&!t.opacities&&!t.triangulate)ze({fast:1,pts:t.pts,colors:t.colors,op:t.opacity??1},t.indices,t.fixed,void 0,t.shader,t.uniform??void 0,t.blend??0);else if(t.fill!==!1){let r=t.color??F.WHITE,n={pos:'
const POLY_FAST_ZE_OLD =
  'let u=l.gfx.transform,f=t.pos.length/2,p=new Array(f*8),g=0;for('
const POLY_FAST_ZE_NEW =
  'let u=l.gfx.transform,f=t.fast?t.pts.length:t.pos.length/2,p=new Array(f*8),g=0;if(t.fast){let A=u.a,B=u.b,C=u.c,D=u.d,E=u.e,H=u.f,O=t.op;for(let x=0;x<f;x++){let P=t.pts[x],K=t.colors[x],X=P.x,V=P.y;p[g++]=A*X+C*V+E,p[g++]=B*X+D*V+H,p[g++]=1,p[g++]=1,p[g++]=K.r/255,p[g++]=K.g/255,p[g++]=K.b/255,p[g++]=O}}else for('
const PATCHES = [
  { marker: '_vScratch', pairs: [[FLUSH_OLD, FLUSH_NEW], [UNIFORM_OLD, UNIFORM_NEW]] },
  { marker: 'e._direct', pairs: [[FRAME_START_OLD, FRAME_START_NEW], [FRAME_END_OLD, FRAME_END_NEW]] },
  { marker: 'let o=t.indices;o||', pairs: [[POLY_FAN_OLD, POLY_FAN_NEW]] },
  { marker: 'this.vqueue.length+r.length>this.maxVertices', pairs: [[PUSH_LIMIT_OLD, PUSH_LIMIT_NEW]] },
  { marker: 'ze({fast:1,', pairs: [[POLY_FAST_SE_OLD, POLY_FAST_SE_NEW], [POLY_FAST_ZE_OLD, POLY_FAST_ZE_NEW]] }
]

for (const name of DIST_FILES) {
  const path = join(KAPLAY_DIST, name)
  if (!existsSync(path)) {
    console.error(`apply-kaplay-performance-patch: missing ${path}`)
    process.exit(1)
  }
  let src = readFileSync(path, 'utf8')
  for (const patch of PATCHES) {
    if (src.includes(patch.marker)) continue
    if (!patch.pairs.every(([from]) => src.includes(from))) {
      console.error(`apply-kaplay-performance-patch: unexpected ${name} (${patch.marker}) — cannot patch`)
      process.exit(1)
    }
    for (const [from, to] of patch.pairs) src = src.replace(from, to)
  }
  writeFileSync(path, src)
}
