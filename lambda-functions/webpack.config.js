const path = require('path');
const slsw = require('serverless-webpack');
const nodeExternals = require('webpack-node-externals');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: slsw.lib.webpack.isLocal ? 'development' : 'production',
  entry: slsw.lib.entries,
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  output: {
    libraryTarget: 'commonjs2',
    path: path.join(__dirname, '.webpack'),
    filename: '[name].js',
  },
  optimization: {
    minimize: true,
    usedExports: true,
    sideEffects: false,
  },
  externals: [
    // Layer에 있는 모듈들은 external로 처리
    'playwright-core',
    'playwright-aws-lambda',
    'lambdafs',
    'aws-sdk',
    '@aws-sdk',
    nodeExternals({
      // Prisma client는 번들에 포함
      allowlist: ['@prisma/client', /^@prisma/]
    })
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true,
            experimentalWatchApi: true,
          }
        },
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.join(__dirname, 'node_modules/.prisma/client'),
          to: path.join(__dirname, '.webpack/service/node_modules/.prisma/client'),
        },
        {
          from: path.join(__dirname, 'prisma/schema.prisma'),
          to: path.join(__dirname, '.webpack/service/prisma/schema.prisma'),
        },
      ],
    }),
  ],
};