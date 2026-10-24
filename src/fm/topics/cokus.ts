/*
 * Copyright (c) 2006 Gregor Heinrich. All rights reserved. Redistribution and
 * use in source and binary forms, with or without modification, are permitted
 * provided that the following conditions are met: 1. Redistributions of source
 * code must retain the above copyright notice, this list of conditions and the
 * following disclaimer. 2. Redistributions in binary form must reproduce the
 * above copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the distribution.
 * THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESSED OR
 * IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
 * EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
 * OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
 * OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
 * ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 * TypeScript port (c) 2026 Gregor Heinrich. See NOTICE for the pinned source.
 */
/** Required CokusRandom subset: uint32, uniform and bounded integer draws. */
export class CokusRandom {
  private state=new Uint32Array(624);
  private cursor=624;
  constructor(seed=4357){this.setSeed(seed);}
  setSeed(seed:number):void {
    if(!Number.isInteger(seed)||seed<0||seed>0xffffffff)throw new RangeError("Seed must be an unsigned 32-bit integer");
    let x=(seed|1)>>>0;this.state[0]=x;
    for(let i=1;i<624;i++){x=Math.imul(x,69069)>>>0;this.state[i]=x;}this.cursor=624;
  }
  nextUnsignedInt():number {
    if(this.cursor===624){
      for(let i=0;i<624;i++){
        const mix=(this.state[i]!&0x80000000)|(this.state[(i+1)%624]!&0x7fffffff);
        this.state[i]=(this.state[(i+397)%624]!^(mix>>>1)^((mix&1)?0x9908b0df:0))>>>0;
      }this.cursor=0;
    }
    let y=this.state[this.cursor++]!;y^=y>>>11;y^=(y<<7)&0x9d2c5680;y^=(y<<15)&0xefc60000;return (y^(y>>>18))>>>0;
  }
  nextDouble():number{return this.nextUnsignedInt()/0x100000000;}
  nextInt(bound:number):number {if(!Number.isInteger(bound)||bound<1||bound>0x7fffffff)throw new RangeError("Invalid random integer bound");return Math.floor(bound*this.nextDouble());}
}
