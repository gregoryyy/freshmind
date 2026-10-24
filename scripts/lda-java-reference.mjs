// Read-only audit of the separately available Java reference. Generated code stays in a temporary directory.
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const run=promisify(execFile),root=new URL('../',import.meta.url),reference=new URL('../knowceans/knowceans-ilda/src/org/knowceans/',root);
const gibbs=await readFile(new URL('topics/simple/LdaGibbs.java',reference),'utf8'),random=await readFile(new URL('util/CokusRandom.java',reference),'utf8');
const sha=s=>createHash('sha256').update(s).digest('hex');
assert.equal(sha(gibbs),'8d098e7377840203ec757c5b926ca6ee4aa3243e933e0b2a4d642ec56a5460ed');
assert.equal(sha(random),'bb553def52d76f80c77bee1949024d35daca8443fc79dfd7c8ad9e206a90af1a');
const dir=await mkdtemp(join(tmpdir(),'fm4-lda-reference-'));
try {
  // Retain the original constructor and sampler methods; stub diagnostic-only demo dependencies.
  await writeFile(join(dir,'LdaGibbs.java'),'import java.util.*;\npublic class LdaGibbs { static TopicMatrixPanel vis;\n'+gibbs.slice(gibbs.indexOf('\tprivate int[][] w;'))+
    '\nclass TopicMatrixPanel {void setTopics(int[][] n){}}\nclass StopWatch {static int lap(){return 0;}}\nclass Vectors {static String print(double[] x){return "";}}\n');
  await writeFile(join(dir,'CokusRandom.java'),random.replace('package org.knowceans.util;',''));
  await writeFile(join(dir,'Reference.java'),String.raw`import java.util.*;import java.lang.reflect.*;import java.io.*;
public class Reference {
 static Object get(Object o,String f)throws Exception{Field x=o.getClass().getDeclaredField(f);x.setAccessible(true);return x.get(o);}
 public static void main(String[] args)throws Exception{
  if(args[0].equals("random")){CokusRandom r=new CokusRandom(4357);for(int i=0;i<10000;i++)System.out.println(r.nextUnsignedInt());return;}
  LdaGibbs g=new LdaGibbs(new int[][]{{0,0,1},{1,2},{}, {2,2,0}},new int[][]{{0,2,2}},3,3,.1,.01,new CokusRandom(4357));
  PrintStream out=System.out;System.setOut(new PrintStream(OutputStream.nullOutputStream()));g.init();g.run(7);
  Field rf=LdaGibbs.class.getDeclaredField("rand");rf.setAccessible(true);rf.set(g,new CokusRandom(4357));g.initq();g.runq(5);System.setOut(out);
  out.print("{\"documentTopicCounts\":"+Arrays.deepToString((int[][])get(g,"nmk"))+",\"topicTermCounts\":"+Arrays.deepToString((int[][])get(g,"nkt"))+",\"topicTotals\":"+Arrays.toString((int[])get(g,"nk"))+",\"assignments\":"+Arrays.deepToString((int[][])get(g,"z"))+",\"queryCounts\":"+Arrays.deepToString((int[][])get(g,"nmkq"))+",\"perplexity\":"+g.ppx()+"}");
 }
}`);
  await run('javac',['CokusRandom.java','LdaGibbs.java','Reference.java'],{cwd:dir});
  const draws=(await run('java',['Reference','random'],{cwd:dir})).stdout;
  const chain=JSON.parse((await run('java',['Reference','chain'],{cwd:dir})).stdout);
  const expected=JSON.parse(await readFile(new URL('tests/fixtures/lda-java-reference.json',root),'utf8'));
  assert.equal(sha(draws),expected.random10000Sha256);
  for(const [key,value] of Object.entries(chain))assert.deepEqual(value,expected[key],key);
  process.stdout.write('Java LDA reference matches: 10000 random draws, training counts/assignments, query counts and perplexity.\n');
} finally {await rm(dir,{recursive:true,force:true});}
