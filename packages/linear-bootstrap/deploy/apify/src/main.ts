import { Actor } from "apify";
import { createHttpApp } from "@toolwright-adk/linear-bootstrap/http";

await Actor.init();

const input = (await Actor.getInput()) as Record<string, string> | null;
if (input?.LINEAR_API_KEY) {
  process.env.LINEAR_API_KEY = input.LINEAR_API_KEY;
}

const app = createHttpApp();

// Apify readiness probe
app.get("/", (req, res) => {
  if (req.headers["x-apify-container-server-readiness-probe"]) {
    res.end("ok\n");
    return;
  }
  res.status(404).end();
});

const PORT = parseInt(process.env.APIFY_CONTAINER_PORT ?? "3000");
app.listen(PORT);
