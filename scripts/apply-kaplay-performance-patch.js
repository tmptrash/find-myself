import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

//
// Kaplay performance patches (see CLAUDE.md §13). Plain string replacements
// instead of patch-package so Linux CI and Netlify caches do not break on
// minified one-line diffs. Each patch carries its own markers (any one of
// them means it is in), so a file that already has the older patches still
// receives the newer ones, and running the script again over a patched file
// (npm install over a cached node_modules, e.g. on Netlify) changes nothing.
// A patch whose text a later patch rewrites also lists that patch's marker.
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
//
// Zero-allocation sprite/quad/polygon vertex packing: reuses one Float32Array
// in ze() instead of allocating `new Array(f*8)` per draw, adds a direct quad
// path for drawUVQuad/drawSprite (skipping per-sprite Object.assign clones,
// Quad/Vec2 allocations and temporary attribute arrays), and extends the
// polygon fast path to per-vertex opacities.
//
const ZERO_ALLOC_SE_OLD =
  't.fill!==!1&&t.colors&&t.indices&&!t.uv&&!t.opacities&&!t.triangulate)ze({fast:1,pts:t.pts,colors:t.colors,op:t.opacity??1},'
const ZERO_ALLOC_SE_NEW =
  't.fill!==!1&&t.colors&&t.indices&&!t.uv&&!t.triangulate)ze({fast:1,pts:t.pts,colors:t.colors,ops:t.opacities,op:t.opacity??1},'
const ZERO_ALLOC_ZE_OLD =
  'let u=l.gfx.transform,f=t.fast?t.pts.length:t.pos.length/2,p=new Array(f*8),g=0;if(t.fast){let A=u.a,B=u.b,C=u.c,D=u.d,E=u.e,H=u.f,O=t.op;for(let x=0;x<f;x++){let P=t.pts[x],K=t.colors[x],X=P.x,V=P.y;p[g++]=A*X+C*V+E,p[g++]=B*X+D*V+H,p[g++]=1,p[g++]=1,p[g++]=K.r/255,p[g++]=K.g/255,p[g++]=K.b/255,p[g++]=O}}else for('
const ZERO_ALLOC_ZE_NEW =
  'let u=l.gfx.transform,f=t.qfast?4:t.fast?t.pts.length:t.pos.length/2,_zN=f*8,_zB=l.gfx._zeBuf&&l.gfx._zeBuf.length>=_zN?l.gfx._zeBuf:(l.gfx._zeBuf=new Float32Array(Math.max(_zN,8192))),p=_zB.subarray(0,_zN),g=0;if(t.qfast){let A=u.a,B=u.b,C=u.c,D=u.d,E=u.e,H=u.f,hw=t.hw,hh=t.hh,cr=t.cr,cg=t.cg,cb=t.cb,O=t.op;p[0]=-hw*A+hh*C+E,p[1]=-hw*B+hh*D+H,p[2]=t.u0,p[3]=t.v1,p[4]=cr,p[5]=cg,p[6]=cb,p[7]=O,p[8]=-hw*A-hh*C+E,p[9]=-hw*B-hh*D+H,p[10]=t.u0,p[11]=t.v0,p[12]=cr,p[13]=cg,p[14]=cb,p[15]=O,p[16]=hw*A-hh*C+E,p[17]=hw*B-hh*D+H,p[18]=t.u1,p[19]=t.v0,p[20]=cr,p[21]=cg,p[22]=cb,p[23]=O,p[24]=hw*A+hh*C+E,p[25]=hw*B+hh*D+H,p[26]=t.u1,p[27]=t.v1,p[28]=cr,p[29]=cg,p[30]=cb,p[31]=O}else if(t.fast){let A=u.a,B=u.b,C=u.c,D=u.d,E=u.e,H=u.f,O=t.op,Os=t.ops;for(let x=0;x<f;x++){let P=t.pts[x],K=t.colors[x],X=P.x,V=P.y;p[g++]=A*X+C*V+E,p[g++]=B*X+D*V+H,p[g++]=1,p[g++]=1,p[g++]=K.r/255,p[g++]=K.g/255,p[g++]=K.b/255,p[g++]=Os?Os[x]:O}}else for('
const ZERO_ALLOC_FE_OLD =
  'let e=t.width,r=t.height,n=ge(t.anchor||tt),o=n.x*e*-.5,s=n.y*r*-.5,i=t.quad||new Y(0,0,1,1),a=t.color||F.WHITE,c=t.opacity??1;re(),Ee(t.pos),We(t.angle),ht(t.scale),Xt(t.skew),$e(o,s),ze({pos:[-e/2,r/2,-e/2,-r/2,e/2,-r/2,e/2,r/2],uv:[t.flipX?i.x+i.w:i.x,t.flipY?i.y:i.y+i.h,t.flipX?i.x+i.w:i.x,t.flipY?i.y+i.h:i.y,t.flipX?i.x:i.x+i.w,t.flipY?i.y+i.h:i.y,t.flipX?i.x:i.x+i.w,t.flipY?i.y:i.y+i.h],color:[a.r,a.g,a.b,a.r,a.g,a.b,a.r,a.g,a.b,a.r,a.g,a.b],opacity:[c,c,c,c]},[0,1,3,1,2,3],t.fixed,t.tex,t.shader,t.uniform??void 0,t.blend??0),W()'
const ZERO_ALLOC_FE_NEW =
  'let e=t.width,r=t.height,n=ge(t.anchor||tt),o=n.x*e*-.5,s=n.y*r*-.5,i=t.quad||(l.gfx._unitQ||(l.gfx._unitQ=new Y(0,0,1,1))),a=t.color||F.WHITE,c=t.opacity??1,q=l.gfx._feQ||(l.gfx._feQ={qfast:1,hw:0,hh:0,u0:0,v0:0,u1:0,v1:0,cr:1,cg:1,cb:1,op:1}),qi=l.gfx._feI||(l.gfx._feI=new Uint16Array([0,1,3,1,2,3]));q.hw=e*.5,q.hh=r*.5,q.u0=t.flipX?i.x+i.w:i.x,q.u1=t.flipX?i.x:i.x+i.w,q.v0=t.flipY?i.y+i.h:i.y,q.v1=t.flipY?i.y:i.y+i.h,q.cr=a.r/255,q.cg=a.g/255,q.cb=a.b/255,q.op=c,re(),Ee(t.pos),We(t.angle),ht(t.scale),Xt(t.skew),$e(o,s),ze(q,qi,t.fixed,t.tex,t.shader,t.uniform??void 0,t.blend??0),W()'
const ZERO_ALLOC_IL_OLD =
  'let r=(c,m,u,f)=>{let p=b(1,1);return u&&f?(p.x=u/(c.width*m.w),p.y=f/(c.height*m.h)):u?(p.x=u/(c.width*m.w),p.y=p.x):f&&(p.y=f/(c.height*m.h),p.x=p.y),p},n=e.data.frames[t.frame??0];if(!n)throw new Error(`Frame not found: ${t.frame??0}`);let o=n.q.scale(t.quad??new Y(0,0,1,1)),s=r(n.tex,o,t.width,t.height),i=t.width??n.tex.width*o.w*s.x,a=t.height??n.tex.height*o.h*s.y;Ft(Object.assign({},t,{tex:n.tex,quad:o,width:i,height:a}))'
const ZERO_ALLOC_IL_NEW =
  'let n=e.data.frames[t.frame??0];if(!n)throw new Error(`Frame not found: ${t.frame??0}`);let fq=n.q,tq=t.quad,ox=tq?fq.x+fq.w*tq.x:fq.x,oy=tq?fq.y+fq.h*tq.y:fq.y,ow=tq?fq.w*tq.w:fq.w,oh=tq?fq.h*tq.h:fq.h,tw=n.tex.width*ow,th=n.tex.height*oh,uw=t.width,uh=t.height,sx=1,sy=1;uw&&uh?(sx=uw/tw,sy=uh/th):uw?(sx=uw/tw,sy=sx):uh&&(sy=uh/th,sx=sy);let i=uw??tw*sx,a=uh??th*sy;if(t.tiled){Ft(Object.assign({},t,{tex:n.tex,quad:new Y(ox,oy,ow,oh),width:i,height:a}));return}let qd=l.gfx._ilQ||(l.gfx._ilQ=new Y(0,0,1,1));qd.x=ox,qd.y=oy,qd.w=ow,qd.h=oh;let d=l.gfx._ilT||(l.gfx._ilT={});d.width=i,d.height=a,d.anchor=t.anchor,d.pos=t.pos,d.angle=t.angle,d.scale=t.scale??w.ONE,d.skew=t.skew,d.quad=qd,d.color=t.color,d.opacity=t.opacity,d.flipX=t.flipX,d.flipY=t.flipY,d.fixed=t.fixed,d.tex=n.tex,d.shader=t.shader,d.uniform=t.uniform,d.blend=t.blend,Fe(d)'
//
// Typed-array renderer queues: writes vertices and indices directly into
// persistent Float32Array / Uint16Array buffers instead of pushing element by
// element onto JS arrays and re-copying on every flush().
//
const TYPED_QUEUE_OLD =
  '(e!==this.curPrimitive||s!==this.curTex||o!==this.curShader||this.curUniform!=i&&!ln(this.curUniform,i)||a!==this.curBlend||u!==this.curFixed||this.vqueue.length+r.length>this.maxVertices||this.iqueue.length+n.length>this.maxIndices)&&(this.flush(c,m),this.setBlend(a));let f=this.vqueue.length/this.stride,p=r.length;for(let g=0;g<p;g++)this.vqueue.push(r[g]);p=n.length;for(let g=0;g<p;g++)this.iqueue.push(n[g]+f);this.curPrimitive=e,this.curShader=o,this.curTex=s,this.curUniform=i,this.curFixed=u}flush(e,r){if(!this.curPrimitive||!this.curShader||this.vqueue.length===0||this.iqueue.length===0)return;let n=this.ctx.gl;this.ctx.pushArrayBuffer(this.glVBuf),this._vScratch&&this._vScratch.length>=this.vqueue.length||(this._vScratch=new Float32Array(this.vqueue.length)),this._vScratch.set(this.vqueue),n.bufferData(n.ARRAY_BUFFER,this._vScratch.subarray(0,this.vqueue.length),n.DYNAMIC_DRAW),this.ctx.pushElementArrayBuffer(this.glIBuf),this._iScratch&&this._iScratch.length>=this.iqueue.length||(this._iScratch=new Uint16Array(this.iqueue.length)),this._iScratch.set(this.iqueue),n.bufferData(n.ELEMENT_ARRAY_BUFFER,this._iScratch.subarray(0,this.iqueue.length),n.DYNAMIC_DRAW),this.ctx.setVertexFormat(this.vertexFormat),this.curShader.bind(),this.curUniform&&this.curShader.send(this.curUniform),this.curShader.send({width:e,height:r,camera:this.curFixed?yr:Pt(),transform:yr}),this.curTex?.bind(),n.drawElements(this.curPrimitive,this.iqueue.length,n.UNSIGNED_SHORT,0),this.curTex?.unbind(),this.curShader.unbind(),this.ctx.popArrayBuffer(),this.ctx.popElementArrayBuffer(),this.vqueue.length=0,this.iqueue.length=0,this.numDraws++}'
const TYPED_QUEUE_NEW =
  'let _vl=this._vqLen||0,_il=this._iqLen||0;(e!==this.curPrimitive||s!==this.curTex||o!==this.curShader||this.curUniform!=i&&!ln(this.curUniform,i)||a!==this.curBlend||u!==this.curFixed||_vl+r.length>this.maxVertices||_il+n.length>this.maxIndices)&&(this.flush(c,m),this.setBlend(a),_vl=0,_il=0);let _vn=_vl+r.length,_in=_il+n.length,vb=this._vScratch;if(!vb||vb.length<_vn){let nv=new Float32Array(Math.max(this.maxVertices,_vn*2));vb&&_vl>0&&nv.set(vb.subarray(0,_vl)),vb=this._vScratch=nv}let ib=this._iScratch;if(!ib||ib.length<_in){let ni=new Uint16Array(Math.max(this.maxIndices,_in*2));ib&&_il>0&&ni.set(ib.subarray(0,_il)),ib=this._iScratch=ni}vb.set(r,_vl);let f=_vl/this.stride,p=n.length;for(let g=0;g<p;g++)ib[_il+g]=n[g]+f;this._vqLen=_vn,this._iqLen=_in,this.curPrimitive=e,this.curShader=o,this.curTex=s,this.curUniform=i,this.curFixed=u}flush(e,r){let vl=this._vqLen||0,il=this._iqLen||0;if(!this.curPrimitive||!this.curShader||vl===0||il===0)return;let n=this.ctx.gl;this.ctx.pushArrayBuffer(this.glVBuf),n.bufferData(n.ARRAY_BUFFER,this._vScratch.subarray(0,vl),n.DYNAMIC_DRAW),this.ctx.pushElementArrayBuffer(this.glIBuf),n.bufferData(n.ELEMENT_ARRAY_BUFFER,this._iScratch.subarray(0,il),n.DYNAMIC_DRAW),this.ctx.setVertexFormat(this.vertexFormat),this.curShader.bind(),this.curUniform&&this.curShader.send(this.curUniform),this.curShader.send({width:e,height:r,camera:this.curFixed?yr:Pt(),transform:yr}),this.curTex?.bind(),n.drawElements(this.curPrimitive,il,n.UNSIGNED_SHORT,0),this.curTex?.unbind(),this.curShader.unbind(),this.ctx.popArrayBuffer(),this.ctx.popElementArrayBuffer(),this._vqLen=0,this._iqLen=0,this.numDraws++}'
//
// World size from a fractional `scale`: drawingBuffer / pixelDensity / scale
// lands a hair off a whole number (1949.9999…) whenever pixelDensity is not
// a power of two, though the game sets pixelDensity = 1 / scale so it is
// meant to be the buffer size exactly (game-engine.js scales a phone's
// world). Rounded at boot and on every resize, so k.width() / k.height()
// stay whole.
//
const WORLD_SIZE_BOOT_OLD =
  'width:e.width??o.drawingBufferWidth/n/e.scale,height:e.height??o.drawingBufferHeight/n/e.scale,'
const WORLD_SIZE_BOOT_NEW =
  'width:e.width??Math.round(o.drawingBufferWidth/n/e.scale),height:e.height??Math.round(o.drawingBufferHeight/n/e.scale),'
const WORLD_SIZE_RESIZE_OLD =
  'l.gfx.width=l.gfx.ggl.gl.drawingBufferWidth/l.gfx.pixelDensity/l.globalOpt.scale,l.gfx.height=l.gfx.ggl.gl.drawingBufferHeight/l.gfx.pixelDensity/l.globalOpt.scale)'
const WORLD_SIZE_RESIZE_NEW =
  'l.gfx.width=Math.round(l.gfx.ggl.gl.drawingBufferWidth/l.gfx.pixelDensity/l.globalOpt.scale),l.gfx.height=Math.round(l.gfx.ggl.gl.drawingBufferHeight/l.gfx.pixelDensity/l.globalOpt.scale))'
//
// The typed queues rewrite the push-limit patch's line, so their marker
// stands for both.
//
const TYPED_QUEUE_MARKER = 'this._vqLen'

const PATCHES = [
  { markers: ['_vScratch'], pairs: [[FLUSH_OLD, FLUSH_NEW], [UNIFORM_OLD, UNIFORM_NEW]] },
  { markers: ['e._direct'], pairs: [[FRAME_START_OLD, FRAME_START_NEW], [FRAME_END_OLD, FRAME_END_NEW]] },
  { markers: ['let o=t.indices;o||'], pairs: [[POLY_FAN_OLD, POLY_FAN_NEW]] },
  { markers: ['this.vqueue.length+r.length>this.maxVertices', TYPED_QUEUE_MARKER], pairs: [[PUSH_LIMIT_OLD, PUSH_LIMIT_NEW]] },
  { markers: ['ze({fast:1,'], pairs: [[POLY_FAST_SE_OLD, POLY_FAST_SE_NEW], [POLY_FAST_ZE_OLD, POLY_FAST_ZE_NEW]] },
  {
    markers: ['l.gfx._zeBuf'],
    pairs: [
      [ZERO_ALLOC_SE_OLD, ZERO_ALLOC_SE_NEW],
      [ZERO_ALLOC_ZE_OLD, ZERO_ALLOC_ZE_NEW],
      [ZERO_ALLOC_FE_OLD, ZERO_ALLOC_FE_NEW],
      [ZERO_ALLOC_IL_OLD, ZERO_ALLOC_IL_NEW]
    ]
  },
  { markers: [TYPED_QUEUE_MARKER], pairs: [[TYPED_QUEUE_OLD, TYPED_QUEUE_NEW]] },
  {
    markers: ['??Math.round(o.drawingBufferWidth/n/e.scale)'],
    pairs: [[WORLD_SIZE_BOOT_OLD, WORLD_SIZE_BOOT_NEW], [WORLD_SIZE_RESIZE_OLD, WORLD_SIZE_RESIZE_NEW]]
  }
]

for (const name of DIST_FILES) {
  const path = join(KAPLAY_DIST, name)
  if (!existsSync(path)) {
    console.error(`apply-kaplay-performance-patch: missing ${path}`)
    process.exit(1)
  }
  let src = readFileSync(path, 'utf8')
  for (const patch of PATCHES) {
    if (patch.markers.some(marker => src.includes(marker))) continue
    if (!patch.pairs.every(([from]) => src.includes(from))) {
      console.error(`apply-kaplay-performance-patch: unexpected ${name} (${patch.markers[0]}) — cannot patch`)
      process.exit(1)
    }
    for (const [from, to] of patch.pairs) src = src.replace(from, to)
  }
  writeFileSync(path, src)
}
