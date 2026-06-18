import "shared/config/loadEnv";
import app from "./app";
import http from "http";

import { initializeSocket } from "modules/chat/socket";
import { checkElasticsearchHealth } from "services/elasticClient";
import { initElasticsearchIndices } from "services/elasticIndexManager";

const PORT = process.env.PORT || 5000;

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(PORT, async () => {

  console.log(
    `Server is running on port ${PORT}`
  );
  const isHealthy = await checkElasticsearchHealth();
  if (isHealthy) {
    await initElasticsearchIndices();
  } else {
    console.warn("Skipping Elasticsearch index initialization because health check failed.");
  }
});