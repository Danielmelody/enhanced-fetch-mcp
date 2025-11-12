export default {
  esbuild: {
    format: "esm",
    platform: "node",
    target: "node18",
    external: [
      "playwright",
      "playwright-core",
      "playwright-core/*",
      "chromium-bidi",
      "chromium-bidi/*",
      "cpu-features",
      "ssh2",
      "fsevents"
    ],
    loader: {
      ".node": "file"
    }
  }
};
