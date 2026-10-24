/* Freshmind. Apache-2.0. Copyright (c) 2026 Gregor Heinrich. */
import {mkdirSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {FreshGraph,FreshNode,FreshEdge,FreshmindDocument} from 'fm4/fm/model';
import {TypeRegistry,freshmind2014Configuration} from 'fm4/fm/config/core';
import {serializeDocument} from 'fm4/fm/io';
export const searchThemes=[
  {id:'layout',author:'mira',name:'Mira Vega',tag:'visual search',x:-350,y:-130,
    description:'Graph layout geometry uses spring forces, repulsion and readable network neighborhoods. Visual graph browsing preserves local structure and spatial context.',
    papers:[
      ['Spring neighborhoods','Spring forces arrange graph vertices. Repulsion separates neighbors while graph layout geometry retains readable network structure.'],
      ['Local geometry','Graph drawing balances spring attraction and repulsion. Geometry and spatial neighborhoods guide network browsing.'],
      ['Readable maps','Readable graph layout aligns vertices and labels. Spring forces and geometric distances preserve neighborhood context.'],
      ['Motion and forces','Graph springs create motion. Repulsion and damping stabilize spatial graph layout while local neighborhoods remain recognizable.'],
      ['Browsing structure','Visual network browsing explores local graph structure. Geometric spring layout preserves context around neighboring vertices.'],
      ['Graph lenses','A spatial lens expands a graph neighborhood. Spring layout and repulsion supply graph geometry before viewing transforms.']
    ]},
  {id:'topics',author:'niko',name:'Niko Chen',tag:'topic models',x:0,y:190,
    description:'Probabilistic topic models describe documents with word distributions. Bayesian inference samples latent topics and retrieves text with semantic vocabulary.',
    papers:[
      ['Latent documents','Topic models represent documents as mixtures. Bayesian inference samples latent topics from word counts and document vocabulary.'],
      ['Words and probability','Probability distributions connect words and latent topics. Topic inference retrieves documents with shared semantic vocabulary.'],
      ['Sampling text','Gibbs sampling estimates Bayesian topic distributions. Documents share word vocabulary through latent text mixtures.'],
      ['Semantic retrieval','Document retrieval compares probabilistic topics. Text mixtures combine word evidence and Bayesian latent inference.'],
      ['Topic explanations','Word distributions explain latent document topics. Bayesian probability and vocabulary support interpretable text retrieval.'],
      ['Corpus mixtures','A text corpus contains document mixtures of latent topics. Word counts drive Bayesian inference and probability estimates.']
    ]},
  {id:'ecology',author:'elin',name:'Elin Rowan',tag:'forest ecology',x:350,y:-130,
    description:'Forest ecology studies habitat, plants and species diversity. Woodland field surveys measure trees, soil and ecological restoration across seasons.',
    papers:[
      ['Woodland surveys','Forest field surveys count plant species. Trees and soil describe woodland habitat and ecological diversity.'],
      ['Habitat restoration','Forest restoration supports habitat and species diversity. Woodland plants recover as soil and tree conditions improve.'],
      ['Seasonal plants','Seasonal field surveys describe forest plants. Ecological habitat and soil conditions shape woodland species diversity.'],
      ['Trees and soil','Trees connect forest soil and plant habitat. Field ecology measures woodland species and restoration diversity.'],
      ['Species diversity','Woodland habitat supports diverse plant species. Forest surveys connect ecology, soil and restoration.'],
      ['Ecological recovery','Forest restoration changes tree and plant communities. Habitat surveys measure ecological recovery and woodland species diversity.']
    ]}
];
/** Entirely fictional, deliberately separable topics with two cross-topic bridge documents. */
export function searchExample(){
  const graph=new FreshGraph(),add=(id,label,type,text,tags,x,y)=>{const n=new FreshNode(id,label,{type,annotation:{format:'text',text},data:{tags},position:{x,y}});graph.addNode(n);return n;};
  const root=add('library','Topic library','project','Collection root. Browse authors and their papers.',[],0,-40);
  const edge=(a,b,type,label)=>graph.addEdge(new FreshEdge(a,b,{id:`${a.getID()}:${b.getID()}`,type,label,length:110}));
  for(const theme of searchThemes){
    const author=add(theme.author,theme.name,'person',theme.description,[theme.tag],theme.x,theme.y);edge(root,author,'includes','researcher');
    theme.papers.forEach(([title,text],i)=>{const angle=(-Math.PI/2)+(i/6)*Math.PI*2,radius=130;const n=add(`${theme.id}-${i+1}`,title,'paper',text,[theme.tag],theme.x+Math.cos(angle)*radius,theme.y+Math.sin(angle)*radius);edge(author,n,'authored','wrote');});
  }
  const bridges=[['bridge-1','Topic maps','Graph layout organizes documents by latent topic mixtures. Bayesian text inference supplies word distributions; geometric spring forces and repulsion arrange the resulting graph.',-170,-330],
    ['bridge-2','Semantic neighborhoods','Visual graph browsing explores semantic documents. Topic probability distributions connect word vocabulary, while spring layout preserves geometric neighborhood structure.',170,-330]];
  for(const [id,label,text,x,y] of bridges){const paper=add(id,label,'paper',text,['visual search','topic models'],x,y);for(const author of ['mira','niko'])edge(graph.findNode(author),paper,'authored','wrote');}
  for(const [a,b] of [['layout-1','topics-2'],['topics-1','ecology-2'],['ecology-1','layout-2']])edge(graph.findNode(a),graph.findNode(b),'cites','cites');
  const config=structuredClone(freshmind2014Configuration);config.relationTypes.includes={label:'Contains',visual:'default'};
  const doc=new FreshmindDocument(new TypeRegistry(config),graph);doc.title='Fictional topic library';
  doc.data={example:'graph-search',provenance:'All people, papers, text and relations are fictional, authored for Freshmind 4. Three deliberately separated themes plus two layout/topic bridge documents. No legacy corpus or external resource extraction.'};
  doc.view={wholeGraph:true,focus:'library',radius:2,backlinks:true,moveToCenter:true,lenses:{zoom:1,hyperbolic:0,rotation:0,pan:{x:0,y:0}},canvas:{zoom:.8,pan:{x:0,y:0}}};return doc;
}
const relevant=theme=>[theme.author,...theme.papers.map((_,i)=>`${theme.id}-${i+1}`),...(theme.id==='ecology'?[]:['bridge-1','bridge-2'])];
export const searchCases=[
  {id:'layout-terms',kind:'terms',query:'spring layout',relevant:relevant(searchThemes[0])},
  {id:'layout-vocabulary',kind:'terms',query:'geometry repulsion',relevant:relevant(searchThemes[0])},
  {id:'topic-terms',kind:'terms',query:'latent topics',relevant:relevant(searchThemes[1])},
  {id:'topic-vocabulary',kind:'terms',query:'Bayesian vocabulary',relevant:relevant(searchThemes[1])},
  {id:'ecology-terms',kind:'terms',query:'forest species',relevant:relevant(searchThemes[2])},
  {id:'ecology-vocabulary',kind:'terms',query:'habitat soil',relevant:relevant(searchThemes[2])},
  ...searchThemes.map(theme=>({id:`${theme.id}-similarity`,kind:'similarity',query:`${theme.id}-1`,relevant:relevant(theme).filter(id=>id!==`${theme.id}-1`)}))
];
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){mkdirSync('examples/search',{recursive:true});writeFileSync('examples/search/topic-library.fm.yaml',serializeDocument(searchExample()));}
