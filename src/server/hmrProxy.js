// This file runs in the browser.
const socket = new WebSocket(`ws://localhost:8080`)

// Listen for messages
socket.addEventListener('message', ({ data }) => {
  const { type, path, index } = JSON.parse(data)
  switch (type) {
    case 'connected':
      console.log(`[vds] connected.`)
      break
    case 'reload':
      import(`${path}?t=${Date.now()}`).then(m => {
        __VUE_HMR_RUNTIME__.reload(path, m.default)
        console.log(`[vds][hmr] ${path} reloaded.`)
      })
      break
    case 'rerender':
      import(`${path}?type=template&t=${Date.now()}`).then(m => {
        __VUE_HMR_RUNTIME__.rerender(path, m.render)
        console.log(`[vds][hmr] ${path} template rerender.`)
      })
      break
    case 'update-style':
      import(`${path}?type=style&index=${index}&t=${Date.now()}`).then(m => {
        // TODO style hmr
      })
      break
    case 'full-reload':
      location.reload()
  }
})

// ping server
socket.addEventListener('close', () => {
  console.log(`[vds] server connection lost. polling for restart...`)
  setInterval(() => {
    new WebSocket(`ws://localhost:8080`).addEventListener('open', () => {
      location.reload()
    })
  }, 1000)
})
