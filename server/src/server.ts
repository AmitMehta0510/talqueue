import "shared/config/loadEnv";
import app from "./app";
import http from "http";

import { initializeSocket } from "modules/chat/socket";

const PORT = process.env.PORT || 5000;

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(PORT, () => {

  console.log(
    `Server is running on port ${PORT}`
  );
});