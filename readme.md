# mini-vite

学习 vite 的运行机制，核心原理

## 本地开发 dev

> 变化 v1.0 => v2.0
 - koa => http + connect
 - rollup 的 commonjs 插件 => esbuild

### 一、预构建
  - 目的：`兼容性`、`性能`、`缓存`
  - 主要流程
  
   1. 在server启动成功之前进行依赖预构建。
   2. 读取用户的package-lock.json，yarn.lock，pnpm-lock.yaml，生成depHash。
   3. 读取上次文件缓存的预构建文件信息，如果有，则将获取到的hash和上一步的depHash进行比较，一样则返回，否则重新构建。没有缓存或设置force参数，则重新构建。
   4. 利用esbuild，对项目文件进行扫描，获取到项目依赖。
   5. 利用esbuild，将项目依赖的模块化方式转化成es module方式。
   6. 将转换的模块存入cacheDir（默认是node_module/.vite)。
   7. 前端请求资源时，判断请求资源是否为依赖（即bare import），如果是则替换为缓存文件路径，加载相应文件。
   8. 启动服务后，每当引入新的依赖，则重新进行依赖构建。执行2，3，4，5过程。

  ```js
    启动服务，改写http linten 方法
              ↓    
    optimizeDeps：预构建入口函数
              ↓
    cachedMetadata：判断缓存是否过期或更新了(未过期直接返回使用)
              ↓
    discoverProjectDependencies：寻找项目依赖
        → scanImport(构建依赖项，返回deps和missing)
            → esbuildScanPlugin(！esbuild插件，通过对不同类型的文件进行处理，最后得出需构建的依赖项)
              ↓
    runOptimizeDeps：打包依赖项，输出缓存文件
        → getProcessingDepsCacheDir(初始化依赖缓存文件夹)
        → depsInfo(遍历 depsInfo 依赖信息，进行打包)
  ```

  - 重难点：
    - 核心打包插件: `esbuildDepPlugin`
    - 插件管理容器：`PluginContainer`
    - 模块图：ModuleGraph

![](https://images.vrm.cn/ox/2022/10/26/预构建.png)


### 二、请求拦截和改写
  - hmrproxy
    首次解析 .vue 文件时候，vite 会注入改类型请求，用于获取`服务端`写好的热更新相关js
  - 裸模块处理
    - 改写模块名,如 `vue => /@module/vue`
    - 然后发起 `/@module/vue` 请求后就会去 `node_module` 中找相应模块
    - 找模块下 `package.json` 的 `module` 字段得到真正源文件地址，引入
  - js
    - 相对路径：统一改为相对项目根路径的地址
  - vue：利用`@vue/compiler-sfc`对 vue 文件进行词法语法解析
    - template：生成render函数
    - script
    - style

裸模块解析插件：`es-module-lexer` `magic-string`

```js
.vue 文件的首次解析，是没有 type 参数的

vite 会 做一次文件改写，将 template、script、style 三大模块 分成不同 type 的请求
```

### 三、热更新
  - 服务端
    - 建立 `ws` 连接，利用 `chokidar` 监听文件变化
    - 利用 vue-sfc 对文件生成 ast 树，如有缓存，对比前后的 ast 树
    - 对变化进行分类，并推送消息给客户端
      - reload：`script` 变化，即 `setup` 函数变化，需重新加载组件
      - rerender：`template` 变化，即 `render` 函数变化，需重新渲染
      - full-reload：非 vue 文件变化，如js资源文件变化,则刷新页面
  - 客户端（**客户端的逻辑代码是在解析.vue 文件的时候，注入一段请求js文件的代码，通过客户端发起请求后得到**）
    - 建立连接
    - 收到消息，确定变化类型，做出相应变化(利用vue 挂到全局的 `__VUE_HMR_RUNTIME__` 方法，可以reload 或者 rerender 组件)


## 线上打包 build

> rollup
