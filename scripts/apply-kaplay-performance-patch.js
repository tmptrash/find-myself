import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

//
// Kaplay flush() performance fix (see CLAUDE.md §13): bufferData + uniform
// location cache. Replaces patch-package so Linux CI and Netlify caches do not
// break on minified one-line diffs.
//
const KAPLAY_DIST = join('node_modules', 'kaplay', 'dist')
const DIST_FILES = ['kaplay.mjs', 'kaplay.cjs']
const FLUSH_OLD =
  'this.ctx.pushArrayBuffer(this.glVBuf),n.bufferSubData(n.ARRAY_BUFFER,0,new Float32Array(this.vqueue)),this.ctx.pushElementArrayBuffer(this.glIBuf),n.bufferSubData(n.ELEMENT_ARRAY_BUFFER,0,new Uint16Array(this.iqueue)),'
const FLUSH_NEW =
  'this.ctx.pushArrayBuffer(this.glVBuf),this._vScratch&&this._vScratch.length>=this.vqueue.length||(this._vScratch=new Float32Array(this.vqueue.length)),this._vScratch.set(this.vqueue),n.bufferData(n.ARRAY_BUFFER,this._vScratch.subarray(0,this.vqueue.length),n.DYNAMIC_DRAW),this.ctx.pushElementArrayBuffer(this.glIBuf),this._iScratch&&this._iScratch.length>=this.iqueue.length||(this._iScratch=new Uint16Array(this.iqueue.length)),this._iScratch.set(this.iqueue),n.bufferData(n.ELEMENT_ARRAY_BUFFER,this._iScratch.subarray(0,this.iqueue.length),n.DYNAMIC_DRAW),'
const UNIFORM_OLD = 'let o=e[n],s=r.getUniformLocation(this.glProgram,n);'
const UNIFORM_NEW =
  'let o=e[n],locs=this._locs||(this._locs={}),s=n in locs?locs[n]:(locs[n]=r.getUniformLocation(this.glProgram,n));'
const PATCHED_MARKER = '_vScratch'

for (const name of DIST_FILES) {
  const path = join(KAPLAY_DIST, name)
  if (!existsSync(path)) {
    console.error(`apply-kaplay-performance-patch: missing ${path}`)
    process.exit(1)
  }
  let src = readFileSync(path, 'utf8')
  if (src.includes(PATCHED_MARKER)) {
    continue
  }
  if (!src.includes(FLUSH_OLD) || !src.includes(UNIFORM_OLD)) {
    console.error(`apply-kaplay-performance-patch: unexpected ${name} — cannot patch`)
    process.exit(1)
  }
  src = src.replace(FLUSH_OLD, FLUSH_NEW).replace(UNIFORM_OLD, UNIFORM_NEW)
  writeFileSync(path, src)
}
