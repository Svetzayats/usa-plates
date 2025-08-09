/* eslint-disable no-console */
const path = require("path");
const express = require("express");
const compression = require("compression");

function createServer() {
  const app = express();
  const rootDir = __dirname;

  app.use(compression());

  function setCustomCacheControl(res, filePath) {
    if (filePath.endsWith("sw.js")) {
      res.setHeader("Cache-Control", "no-store");
    } else {
      res.setHeader("Cache-Control", "public, max-age=0, must-revalidate");
    }
  }

  app.use(
    express.static(rootDir, {
      setHeaders: setCustomCacheControl,
      extensions: ["html"],
    })
  );

  app.get("*", function handleFallback(_req, res) {
    res.sendFile(path.join(rootDir, "index.html"));
  });

  return app;
}

function start() {
  const port = process.env.PORT ? Number(process.env.PORT) : 5173;
  const host = process.env.HOST || "0.0.0.0";
  const app = createServer();
  app.listen(port, host, function onListen() {
    console.log(`Server running at http://${host}:${port}`);
  });
}

if (require.main === module) {
  start();
}

module.exports = { createServer };
