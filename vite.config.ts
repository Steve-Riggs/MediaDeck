import { defineConfig } from 'vite';
import { resolve } from 'node:path';
export default defineConfig({ build:{ lib:{ entry:resolve(__dirname,'src/index.ts'), formats:['es'], fileName:()=> 'mediadeck.js' }, rollupOptions:{ output:{ inlineDynamicImports:true } }, sourcemap:true, emptyOutDir:true } });
