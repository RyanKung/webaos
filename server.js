const express = require("express");
const webpack = require("webpack");
const path = require("path");
const webpackConfig = require("./webpack.config");
const webpackDevMiddleware = require("webpack-dev-middleware");
const webpackHotMiddleware = require("webpack-hot-middleware");

const app = express();
const compiler = webpack(webpackConfig);

app.use(
  webpackDevMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    stats: { colors: true },
  }),
);

app.use(webpackHotMiddleware(compiler));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
