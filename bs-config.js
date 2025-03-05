module.exports = {
  server: {
    baseDir: "website"
  },
  port: 3000,
  https: false,
  // rewriteRules: [
  //   {
  //     match: /^\/$/,
  //     replace: 'index.html'
  //   }
  // ],
  serveStatic: [{
    route: '/files',
    dir: 'website/files'
  }],
  // startPath: '/index.html'
}
