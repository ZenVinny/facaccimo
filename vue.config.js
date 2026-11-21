const webpack = require('webpack');
const FAST = process.env.FAST === '1';

module.exports = {
  publicPath: './',
  outputDir: 'dist',
  productionSourceMap: false,
  lintOnSave: false,
  configureWebpack: {
    resolve: {
      fallback: {
        http: false,
        https: false,
        stream: false,
        url: false,
        querystring: false,
        zlib: false,
        path: false,
        fs: false,
        crypto: false,
        os: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
      },
    },
    optimization: {
      minimize: !FAST,
    },
    plugins: [
      // webpack 5 dropped the Node.js polyfills; isomorphic-git and
      // @isomorphic-git/lightning-fs still rely on the Buffer global.
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
    ],
  },
};
