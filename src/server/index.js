const http = require("http");
const serve = require("serve-handler");
const url = require("url");
const fs = require("fs");
const path = require("path");
const ws = require("ws");
const { createFileWatcher } = require("./fileWatcher");
const handleVue = require("./vueMiddleware");
const { rewriteModules, handleModule } = require("./moduleMiddleware");
const { sendJS } = require("./utils");
const { runOptimize } = require('./optimize')

// 拦截不同类型的请求
const hmrProxy = fs.readFileSync(path.resolve(__dirname, "./hmrProxy.js"));
const server = http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  if (pathname === "/__hmrProxy") {
    sendJS(res, hmrProxy);
  } else if (pathname.endsWith(".vue")) {
    handleVue(req, res);
  } else if (pathname.endsWith(".js")) {
    // js 处理
    // 1. 改写相对路径，改为相对于根目录的路径
    // 2. 模块处理,改为 node_modules 的模块
    const p = path.join(process.cwd(), pathname);
    let content = fs.readFileSync(p, "utf8");
    content = rewriteModules(content);
    sendJS(res, content);
  } else if (/@modules\//.test(pathname)) {
    // 裸模块
    handleModule(req, res);
  } else {
    serve(req, res);
  }
});

// websocket 监听文件变动
const wss = new ws.WebSocketServer({ port: 8080 });
const sockets = new Set();
wss.on("connection", (socket) => {
  sockets.add(socket);
  socket.send(JSON.stringify({ type: "connect" }));
  socket.on("close", () => {
    sockets.delete(socket);
  });
});
createFileWatcher((payload) =>
  sockets.forEach((s) => s.send(JSON.stringify(payload)))
);

let isOptimized = false;
const listen = server.listen.bind(server)
server.listen = async function (port, ...args) {
  if (!isOptimized) {
    try {
      // 调用 所有插件的 buildStart 钩子函数
      // await container.buildStart({});
      await runOptimize()
      isOptimized = true
    } catch (e) {
      server.emit("error", e)
      return
    }
  }
  return listen(port, ...args);
};

server.listen(3000, () => {
  console.log("Running at http://localhost:3000");
});
