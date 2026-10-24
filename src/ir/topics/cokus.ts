/* SPDX-License-Identifier: LGPL-2.0-or-later
 *
 * Cokus MT19937 from David Blei's lda-c, via knowceans CokusRandom.
 * Java adaptation: Gregor Heinrich. TypeScript adaptation: Freshmind 4, 2026.
 * See NOTICE for pinned sources and licenses/LICENSE-LGPL-2.0 for the full license.
 *
 * Upstream cokus.c notice:
 * This is the ``Mersenne Twister'' random number generator MT19937, which
 * generates pseudorandom integers uniformly distributed in 0..(2^32 - 1)
 * starting from any odd seed in 0..(2^32 - 1).  This version is a recode
 * by Shawn Cokus (Cokus@math.washington.edu) on March 8, 1998 of a version by
 * Takuji Nishimura (who had suggestions from Topher Cooper and Marc Rieffel in
 * July-August 1997).
 *
 * Effectiveness of the recoding (on Goedel2.math.washington.edu, a DEC Alpha
 * running OSF/1) using GCC -O3 as a compiler: before recoding: 51.6 sec. to
 * generate 300 million random numbers; after recoding: 24.0 sec. for the same
 * (i.e., 46.5% of original time), so speed is now about 12.5 million random
 * number generations per second on this machine.
 *
 * According to the URL <http://www.math.keio.ac.jp/~matumoto/emt.html>
 * (and paraphrasing a bit in places), the Mersenne Twister is ``designed
 * with consideration of the flaws of various existing generators,'' has
 * a period of 2^19937 - 1, gives a sequence that is 623-dimensionally
 * equidistributed, and ``has passed many stringent tests, including the
 * die-hard test of G. Marsaglia and the load test of P. Hellekalek and
 * S. Wegenkittl.''  It is efficient in memory usage (typically using 2506
 * to 5012 bytes of static data, depending on data type sizes, and the code
 * is quite short as well).  It generates random numbers in batches of 624
 * at a time, so the caching and pipelining of modern systems is exploited.
 * It is also divide- and mod-free.
 *
 * This library is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Library General Public License as published by
 * the Free Software Foundation (either version 2 of the License or, at your
 * option, any later version).  This library is distributed in the hope that
 * it will be useful, but WITHOUT ANY WARRANTY, without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See
 * the GNU Library General Public License for more details.  You should have
 * received a copy of the GNU Library General Public License along with this
 * library; if not, write to the Free Software Foundation, Inc., 59 Temple
 * Place, Suite 330, Boston, MA 02111-1307, USA.
 *
 * The code as Shawn received it included the following notice:
 *
 *   Copyright (C) 1997 Makoto Matsumoto and Takuji Nishimura.  When
 *   you use this, send an e-mail to <matumoto@math.keio.ac.jp> with
 *   an appropriate reference to your work.
 *
 * It would be nice to CC: <Cokus@math.washington.edu> when you write.
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
