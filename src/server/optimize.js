
const fs = require('fs')
const Path = require('path')
const { createHash } = require('crypto')
const { build } = require('esbuild')
const { normalizePath } = require('./utils')

const config = {
  optimizeDeps: {
    cacheDir: 'node_modules/.vite/deps'
  }
}
const lockfiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']

async function runOptimize () {
  optimizeDeps(config, true)
}

/**
 * ！！！预构建的核心函数 optimizeDeps
 * @param { Object } config 用户的 vite 配置 
 * @param { Boolean } force 是否强制重新启动 
 * @param {*} asCommand 
 * @param { Object } newDeps 预构建时新传入的依赖
 * @returns
 * 
 * 主要做了以下五件事：
 * 1. 生成当前依赖的构建信息，判断是否需要重新构建
 * 2. 构建依赖
 * 3. 扁平化嵌套的依赖
 * 4. 解析用户依赖优化配置，调用esbuild构建文件，并存入cacheDir
 * 5. 存放本次构建信息并返回
 */

async function optimizeDeps (config, force, asCommand, newDeps) {
  const {optimizeDeps: { cacheDir }} = config
  // 根据当前的 confing，以及描述依赖信息的 lockfiles 文件，生成当前依赖的 hash 值
  let code
  for(let lockfile of lockfiles) {
    if(fs.existsSync(lockfile)) {
      const content = fs.readFileSync(lockfile, 'utf-8')
      code += content
    }
  }
  const hash = getHash(code)
  const metadata = {
    hash,
    browserHash: hash,
    optimized: {
    },
    chunks: {}
  }

  if(fs.existsSync(cacheDir) && !force) {
    // 有缓存文件夹 => 构建过，判断hash值
    console.log('有缓存文件夹 => 构建过')
    let preData
    try {
      preData = require(Path.resolve(cacheDir, '_metadata.json'))
      if(preData && preData.hash === metadata.hash) {
        console.log('启用缓存')
        return preData
      } else {
        console.log('缓存失效')
        emptyDir(cacheDir)
      }
    } catch (err) {
      console.log(err)
    }
  } else {
    // 第一次预构建
    console.log('第一次预构建')
    fs.mkdirSync(cacheDir, { recursive: true })
    fs.writeFileSync(Path.join(cacheDir, 'package.json'), '{"type":"module"}')
    fs.writeFileSync(Path.join(cacheDir, '_metadata.json'), JSON.stringify(metadata))
  }

  let deps
  if (!newDeps) {
    //	借助esbuild扫描源码，获取依赖
    // ;({ deps, missing } = await scanImports(config))
    await scanImports(config)
  } else {
    deps = newDeps
    // missing = {}
  }
}

/**
 * 打包主函数 scanImports
 * 1. 读取入口文件配置，获取入口文件
 * 2. 创建插件容器，整合 esbuild 插件
 * 3. **整合esbuildScanPlugin插件和外部插件，打包**
 * 4. 返回 deps 和 missing
 */
async function scanImports(config) {
  // const entries = [Path.resolve(process.cwd(), 'example/main.js')]
  const entries = [Path.resolve(process.cwd(), 'node_modules/vue/dist/vue.runtime.esm-browser.js')]
  console.log('开始打包')
  // const plugin = esbuildScanPlugin(config, container, deps, missing, entries)
  await Promise.all(entries.map((entry) => build({
    absWorkingDir: process.cwd(),
    write: true,
    entryPoints: [entry],
    bundle: true,
    outdir: 'dist',
    sourcemap: true,
    format: 'esm',
    logLevel: 'error',
    // plugins: [esbuildScanPlugin()],
    // ...esbuildOptions
  })))
}

function getHash(text) {
  return createHash('sha256').update(text).digest('hex').substring(0, 8);
}

function emptyDir(path) {
  const files = fs.readdirSync(path);
  files.forEach(file => {
    const filePath = `${path}/${file}`;
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      emptyDir(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  })
}

/**
 * esbuild 插件
 * build.onResolve：自定义esbuild 如何进行路径解析
 * build.onLoad： 自定义esbuild 如何进行解析文件内容
 * 
 */
const htmlTypesRE = /\.(html|vue|svelte|astro)$/;
function esbuildScanPlugin() {
  const seen = new Map()
  const resolve = async (id, importer, options) => {
    const key = id + (importer && Path.dirname(importer))
    console.log('id::::', id)
    console.log('importer::::',importer)
    console.log('key::::', key)
    // if (seen.has(key)) {
    //   return seen.get(key);
    // }
    // const resolved = await container.resolveId(id, importer && normalizePath(importer), {
    //   ...options,
    //   scan: true
    // })
    // const res = resolved?.id;
    // seen.set(key, res);
    // return res;
  }
  return {
    name: 'vite:dep-scan',
    setup(build) {
      // 解析html类型文件
      // path: 引入的模块
      // importer：哪个文件引入了模块
      build.onResolve({filter: htmlTypesRE}, async ({ path, importer }) => {
        await resolve(path, importer);
      })
      build.onResolve( {filter: /^[\w@][^:]/}, async ({ path, importer }) => {
        await resolve(path, importer)
      })
    }
  }
}

exports.runOptimize = runOptimize
exports.optimizeDeps = optimizeDeps
