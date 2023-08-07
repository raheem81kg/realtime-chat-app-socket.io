import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 3000,
        proxy: {
            "/graphql": {
                target: "https://realtime-chat-app-raheem81kg.vercel.app:5000/graphql",
                changeOrigin: true,
                secure: true,
                ws: false,
            },
            "/socket.io": {
                target: "https://realtime-chat-app-gxyp.onrender.com",
                changeOrigin: true,
                secure: true,
                ws: true,
            },
        },
    },
});
