const fs = require('fs')
const url = require('url')
const path = require('path')
const qs = require('querystring')
// const { parseSFC } = require('./parseSFC')
const compilerSFC = require('@vue/compiler-sfc');
const compilerDOM  = require('@vue/compiler-dom')
const { rewriteModules } = require('./moduleMiddleware')
const { sendJS } = require('./utils')

module.exports = (req, res) => {
  const parsed = url.parse(req.url, true)
  const query = parsed.query

  const filename = path.join(process.cwd(), parsed.pathname.slice(1))
  let content = fs.readFileSync(filename, "utf8");

  // 解析sfc
  const ast = compilerSFC.parse(content)

  if (!query.type) {
    // 注入热更新代码，后面可根据配置改为可选项
    let code = `import '/__hmrProxy'`

    // TODO use more robust rewrite
    if (ast.descriptor.script) {
      code += ast.descriptor.script.content.replace(
        `export default`,
        'const script ='
      )
      code += `\nexport default script`
      code = rewriteModules(code)
    }
    if (ast.descriptor.template) {
      code += `\nimport { render } from ${JSON.stringify(
        parsed.pathname + `?type=template${query.t ? `&t=${query.t}` : ``}`
      )}`
      code += `\nscript.render = render`
    }
    if (ast.descriptor.style) {
      // TODO
    }
    code += `\nscript.__hmrId = ${JSON.stringify(parsed.pathname)}`
    code += `\ntypeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(script.__hmrId, script)`
    return sendJS(res, code)
  }

  if (query.type === 'template') {
    const render = compilerDOM.compile(ast.descriptor.template.content, { mode: 'module' }).code
    
    return sendJS(res, rewriteModules(render))
  }

  if (query.type === 'style') {
    // TODO
    return
  }

  // TODO custom blocks
}
