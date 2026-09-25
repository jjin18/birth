import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const {code}=await transform(await readFile(new URL('../lib/fortunes.ts',import.meta.url),'utf8'),{loader:'ts',format:'esm'});
export const {fortunes,genericFortuneIds,personalFortuneIds,jokeFortuneIds,activeFortuneIds,removedFortuneIds,isVisibleFortune,fortuneKindForOpening,fortunePoolSize:total}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
