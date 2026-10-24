/* SPDX-License-Identifier: Apache-2.0; Copyright (c) 2026 Gregor Heinrich. */
import type {SearchField,SearchQuery} from "./types.js";
type Token={value:string;quoted:boolean};
const fields=new Set(["content","label","hint","id","type","tag"]);
/** Bounded subset of the reference parser; unsupported syntax fails explicitly. */
export function parseSearchQuery(input:string):SearchQuery|null {
  if(typeof input!=="string"||input.length>4096)throw new TypeError("Query must be at most 4096 characters");
  const tokens:Token[]=[];let i=0;
  while(i<input.length){
    if(/\s/u.test(input[i]!)){i++;continue;}
    const c=input[i]!;
    if('():'.includes(c)){tokens.push({value:c,quoted:false});i++;continue;}
    if(c==='"'){
      const end=input.indexOf('"',i+1);if(end<0)throw new SyntaxError("Unclosed query phrase");
      tokens.push({value:input.slice(i+1,end),quoted:true});i=end+1;continue;
    }
    let end=i;while(end<input.length&&!/[\s():"]/u.test(input[end]!))end++;
    const value=input.slice(i,end);
    if(/[?~^\[\]{}\\+!&|]/u.test(value)||value.startsWith("-")||value.includes("*")&&!/^[^*]+\*$/.test(value))throw new SyntaxError("Unsupported query syntax");
    tokens.push({value,quoted:false});i=end;
  }
  if(!tokens.length)return null;
  let p=0,depth=0;
  const at=(s:string)=>tokens[p]?.value===s&&!tokens[p]?.quoted;
  const atom=():SearchQuery=>{
    if(++depth>32)throw new SyntaxError("Query nesting exceeds 32");
    let result:SearchQuery;
    if(at("NOT")){p++;result={kind:"not",child:atom()};}
    else if(at("(")){p++;result=or();if(!at(")"))throw new SyntaxError("Missing closing parenthesis");p++;}
    else {
      let field:SearchField="content";
      if(tokens[p+1]?.value===":"&&!tokens[p+1]?.quoted){
        const name=tokens[p++]!;p++;if(name.quoted||!fields.has(name.value))throw new SyntaxError("Unknown query field");field=name.value as SearchField;
      }
      const token=tokens[p++];if(!token||!token.quoted&&["AND","OR","NOT","(",")",":"].includes(token.value)||!token.value.trim())throw new SyntaxError("Expected a query term");
      const prefix=!token.quoted&&token.value.endsWith("*");
      if(prefix&&["id","type","tag"].includes(field))throw new SyntaxError("Exact fields do not support prefix expansion");
      result={kind:"term",field,value:prefix?token.value.slice(0,-1):token.value,phrase:token.quoted,prefix};
    }
    depth--;return result;
  };
  const and=():SearchQuery=>{let q=atom();while(at("AND")||at("NOT")){if(at("AND"))p++;q={kind:"and",left:q,right:atom()};}return q;};
  const or=():SearchQuery=>{let q=and();while(p<tokens.length&&!at(")")){if(at("OR"))p++;q={kind:"or",left:q,right:and()};}return q;};
  const query=or();if(p!==tokens.length)throw new SyntaxError("Unexpected closing parenthesis");return query;
}
