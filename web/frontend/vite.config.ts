import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
    // Served from the domain root normally. A GitHub Pages project site lives
    // under /<repo>/ instead, so the Pages workflow sets BASE_PATH to that.
    base: process.env.BASE_PATH || "/",
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5173,
    },
});
