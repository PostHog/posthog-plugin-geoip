import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import builtins from 'rollup-plugin-node-builtins'
import pkg from './package.json'
import json from '@rollup/plugin-json'

const extensions = ['.js', '.jsx', '.ts', '.tsx']

export default [
    {
        input: './src/index.ts',
        output: {
            file: pkg.main,
            format: 'cjs',
        },
        plugins: [
            builtins(),
            json(),
            // Allows node_modules resolution
            nodeResolve({
                extensions,
            }),
            // Allow bundling cjs modules. Rollup doesn't understand cjs
            commonjs({
                include: 'node_modules/**',
            }),
            // Compile TypeScript/JavaScript files
            typescript({
                include: ['*.ts', '**/*.ts'],
            }),
        ],
    },
]
