const { sendJS } = require('./utils')
const fs = require('fs')
const path = require('path')

// 裸模快地址重写 vue=>@modules/vue
function rewriteModules(content) {
  let reg = / from ['"](.*)['"]/g;
  return content.replace(reg, (s1, s2) => {
    // 相对路径地址直接返回不处理
    if (s2.startsWith(".") || s2.startsWith("./") || s2.startsWith("../")) {
      return s1;
    } else {
      // 裸模块
      return `from '/@modules/${s2}'`;
    }
  });
}

function handleModule(req, res) {
  const moduleName = req.url.slice(10)
  const moduleFolder = path.join(process.cwd(), "/node_modules", moduleName)
  // 读取 node_module 下该模块 package.json 文件的 module字段
  const modulePackageJson = require(moduleFolder + "/package.json").module
  // 最终相对地址
  const filePath = path.join(moduleFolder, modulePackageJson);
  const readFile = fs.readFileSync(filePath, "utf8");
  sendJS(res, rewriteModules(readFile))
}

exports.rewriteModules = rewriteModules;
exports.handleModule = handleModule

