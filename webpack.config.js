const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlInlineScriptPlugin = require("html-inline-script-webpack-plugin");
const HtmlInlineCSSWebpackPlugin = require("html-inline-css-webpack-plugin").default;
const webpack = require("webpack");


module.exports = {
  mode: "production",
  entry: ["webpack-hot-middleware/client", "./src/index.js"],
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
    publicPath: "/",
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
        },
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          {
            loader: "css-loader",
            options: {
              importLoaders: 1,
            },
          },
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                plugins: [
                  [
                    "postcss-url",
                    {
                      url: "inline",
                      maxSize: Infinity,
                      fallback: "url-loader",
                      encodeType: "base64",
                    },
                  ],
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: Infinity
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
      inject: "body",
    }),
    new HtmlInlineCSSWebpackPlugin(),
    new HtmlInlineScriptPlugin(),
    new webpack.HotModuleReplacementPlugin(),
  ],
  optimization: {
    minimize: true,
  }
};
