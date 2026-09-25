import { spawnSync } from 'node:child_process';
import { mkdir,cp,readFile,rm } from 'node:fs/promises';
import { resolve,join,sep } from 'node:path';
import { build } from 'esbuild';
import { checkAssets } from './asset-check.mjs';
import { versionAssets, precompress } from './prepare-static.mjs';
const root=process.cwd(),dist=resolve(root,'dist');
const target=process.argv.includes('--sites')?'sites':'railway';
await checkAssets();
await versionAssets();
const result=spawnSync(process.execPath,['node_modules/next/dist/bin/next','build'],{stdio:'inherit',env:process.env});
if(result.status!==0)process.exit(result.status||1);
for(const directory of ['client','server','railway','.openai']){const target=resolve(dist,directory);if(!target.startsWith(dist+sep))throw Error('Invalid build directory');await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true})}
await cp(join(root,'out'),join(dist,'client'),{recursive:true});
await precompress(join(dist,'client'));
if(target==='sites'){
 await build({entryPoints:['worker/index.ts'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true});
 await cp('.openai/hosting.json','dist/.openai/hosting.json');
 await cp('drizzle','dist/.openai/drizzle',{recursive:true});
 const config=JSON.parse(await readFile('dist/.openai/hosting.json','utf8'));
 if(config.static||config.d1!=='DB')throw Error('Shared fortunes require the DB Worker binding.');
}else{
 await build({entryPoints:['server/railway.ts'],outfile:'dist/railway/server.mjs',bundle:true,format:'esm',platform:'node',target:'node24',minify:true,external:['sharp']});
}
console.log(`${target} runtime and audited static assets built.`);
