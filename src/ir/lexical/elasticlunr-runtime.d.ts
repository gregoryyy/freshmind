interface Index {
  pipeline: { reset(): void };
  addField(field: string): Index;
  setRef(field: string): Index;
  saveDocument(save: boolean): Index;
  addDoc(document: Record<string, string | string[]>): void;
  search(query: string, configuration: {fields: Record<string, {boost: number; bool: "OR" | "AND"; expand: boolean}>}): {ref: string; score: number}[];
}
export default function elasticlunr(): Index;
