function send(res, source, mime) {
  res.setHeader("Content-Type", mime);
  res.end(source);
}

function sendJS(res, source) {
  send(res, source, "application/javascript");
}

function normalizePath(path) {
  return path.replace(/\\/g, '/')
}

exports.send = send;
exports.sendJS = sendJS;
exports.normalizePath = normalizePath
