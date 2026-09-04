import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// En production (ex: hébergement Plesk), le serveur sert aussi le frontend
// buildé (copié dans dist/public à côté du bundle serveur).
if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "public",
  );
  app.use(["/admin", "/inscription"], (_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });
  app.use(express.static(publicDir));
  // SPA fallback : toute route non-API renvoie index.html
  app.get(/^\/(?!api(\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
}

export default app;
