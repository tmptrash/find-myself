import { defineConfig } from "vite";

const kaplayCongrats = () => {
    return {
        name: "vite-plugin-kaplay-hello",
        buildEnd() {
            const line =
                "---------------------------------------------------------";
            const msg = `🦖 Awesome pal! Send your game to us:\n\n💎 Discord: https://discord.com/invite/aQ6RuQm3TF \n💖 Donate to KAPLAY: https://opencollective.com/kaplay\n\ (you can disable this msg on vite.config)`;

            process.stdout.write(`\n${line}\n${msg}\n${line}\n`);
        },
    };
};

export default defineConfig({
    // index.html out file will start with a relative path for script
    base: "./",
    publicDir: "assets",
    //
    // Dev server: Kaplay is patched in node_modules
    // (scripts/apply-kaplay-performance-patch.js), and Vite does not watch
    // node_modules — a server left running kept serving the Kaplay it read
    // at its start, without the patches made since (the game then ran its
    // new code on an old engine). Kaplay's own folder is watched, so a
    // re-patched Kaplay reloads the page.
    //
    server: {
        port: 3001,
        watch: {
            ignored: ["!**/node_modules/kaplay/**"],
        },
    },
    //
    // Dev server: keep deps debuggable.
    // - exclude `kaplay` from Vite's pre-bundling so the browser loads
    //   node_modules/kaplay/dist/kaplay.mjs directly. That file is minified
    //   but ships a `kaplay.mjs.map` sourcemap next to it, which DevTools
    //   resolves automatically — so Sources tab shows the original
    //   TypeScript source and breakpoints work as expected.
    // - keep sourcemaps for any other deps Vite still pre-bundles.
    //
    optimizeDeps: {
        exclude: ["kaplay"],
        rolldownOptions: {
            output: {
                sourcemap: true,
            },
        },
    },
    build: {
        // disable this for low bundle sizes
        sourcemap: true,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("/node_modules/kaplay/")) return "kaplay";
                },
            },
        },
    },
    plugins: [
        // Disable messages removing this line
        kaplayCongrats(),
    ],
});