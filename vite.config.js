import { env } from "node:process";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const cesiumSource = "node_modules/cesium/Build/Cesium";
const cesiumStaticDir = "cesiumStatic";
const base = env.PAGES_BASE_PATH || "/";

// https://vitejs.dev/config/
export default defineConfig({
  base,
  define: {
    CESIUM_BASE_URL: JSON.stringify(`${base}${cesiumStaticDir}/`),
  },
  plugins: [
    // Copy Cesium Assets, Widgets, and Workers to a static directory.
    // If you need to add your own static files to your project, use the `public` directory
    // and other options listed here: https://vitejs.dev/guide/assets.html#the-public-directory
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumStaticDir },
        { src: `${cesiumSource}/Workers`, dest: cesiumStaticDir },
        { src: `${cesiumSource}/Assets`, dest: cesiumStaticDir },
        { src: `${cesiumSource}/Widgets`, dest: cesiumStaticDir },
      ],
    }),
  ],
});
