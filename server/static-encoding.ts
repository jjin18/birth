/** Respect q=0 exclusions and prefer Brotli only when equally acceptable. */
export function acceptedEncodings(header: string): ('br'|'gzip')[] {
  const values = new Map<string,number>();
  for (const item of header.toLowerCase().split(',')) {
    const [name,...parameters] = item.trim().split(';');
    const q = parameters.map(p=>p.trim()).find(p=>p.startsWith('q='));
    const weight = q ? Number(q.slice(2)) : 1;
    values.set(name,Number.isFinite(weight)&&weight>=0&&weight<=1?weight:0);
  }
  const quality = (name:string)=>values.get(name)??values.get('*')??0;
  return (['br','gzip'] as const).filter(name=>quality(name)>0).sort((a,b)=>quality(b)-quality(a));
}
