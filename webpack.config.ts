import * as path from 'path';
import fs from 'fs';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCSSExtractPlugin from 'mini-css-extract-plugin';
import Server from 'webpack-dev-server';
import { setup as setupServer, config as serverConfig } from './src/server/setup';

// Creamos la carpeta donde se van a guardar los archivos de los estudiantes
if (!fs.existsSync(serverConfig.directory)) fs.mkdirSync(serverConfig.directory);

// Definimos la ruta a la carpeta que contiene tus archivos estáticos
const publicPath = path.resolve(__dirname, 'public');

// Now we need to build the testbench entries (script files) and the pages (URL)
const testbenchDirs = fs
  .readdirSync(path.resolve(__dirname, './testbenches')) // Read files and folders in testbench folder
  .map((dir) => path.resolve(__dirname, './testbenches', dir)) // Get absolute path
  .filter((dir) => fs.lstatSync(dir).isDirectory()); // Filter directories

const testbenchEntries = testbenchDirs.reduce((entries: any, entryDir) => {
  const entryName = path.parse(entryDir).base;
  return {
    ...entries,
    [entryName]: path.resolve(entryDir, './main.ts'),
  };
}, {});

const testbenchesPages = testbenchDirs.map((entryDir) => {
  const entryName = path.parse(entryDir).base;
  return new HtmlWebpackPlugin({
    template: path.resolve(entryDir, './index.html'),
    filename: entryName + '.html',
    chunks: [entryName],
    minify: true,
  });
});

const config: any = {
  entry: {
    app: path.resolve(__dirname, './src/main.ts'),
    ...testbenchEntries,
  },
  mode: 'development',
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, './dist'),
  },
  devtool: 'source-map',
  plugins: [
    new MiniCSSExtractPlugin(),

    // Main app
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, './src/index.html'),
      chunks: ['app'],
      minify: true,
    }),

    // Testbenches
    ...testbenchesPages,
  ],
  module: {
    rules: [
      // HTML
      {
        test: /\.(html)$/,
        use: ['html-loader'],
      },

      // JS
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },

      // TS
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ['ts-loader'],
      },

      // CSS
      {
        test: /\.css$/,
        use: [MiniCSSExtractPlugin.loader, 'css-loader'],
      },

      // Images
      {
        test: /\.(jpg|png|gif|svg)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/images/[hash][ext]',
        },
      },

      // Fonts
      {
        test: /\.(ttf|eot|woff|woff2)$/,
        type: 'asset/resource',
        generator: {
          filename: 'assets/fonts/[hash][ext]',
        },
      },

      // To import any file (e.g. shaders) as text
      {
        test: /\.(frag|vert)$/,
        loader: 'raw-loader',
        options: {
          esModule: false,
        },
      },
    ],
  },
  devServer: {
    static: {
      directory: publicPath,
      publicPath: '/public',
    },

    // Setup server endpoints
    setupMiddlewares: (middlewares: any, devServer: Server) => {
      setupServer(devServer);
      return middlewares;
    },
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      fs: false,
    },
  },
};

export default config;
