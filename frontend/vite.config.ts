import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig(({ mode }) => {
  // Carrega variáveis do arquivo .env na raiz do monorepo
  const env = loadEnv(mode, path.resolve(__dirname, ".."), "");
  const backendPort = env.PORT || env.BACKEND_PORT || "3005";
  const backendTarget =
    env.BACKEND_URL ||
    env.VITE_BACKEND_URL ||
    `http://localhost:${backendPort}`;

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      allowedHosts: [
        "localhost",
        "9428-2804-d47-5a0d-cc00-9496-7c7f-a2d7-3859.ngrok-free.app",
      ],
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              if (res && !res.headersSent) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    success: false,
                    error: {
                      code: "BACKEND_OFFLINE",
                      message: `Backend não está respondendo em ${backendTarget}. Verifique se o servidor NestJS está ativo na porta ${backendPort}.`,
                    },
                  }),
                );
              }
            });
          },
        },
      },
    },
  };
});
