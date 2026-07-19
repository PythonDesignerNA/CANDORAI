import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});

// Keep individual requests from hanging longer than 30 s — this fires before
// Replit's reverse-proxy timeout and lets us return a clean 504 instead of
// receiving an opaque 502 on the client side.
server.timeout = 30_000;         // socket idle timeout per request
server.headersTimeout = 31_000;  // must be > timeout
server.keepAliveTimeout = 5_000; // recycle idle keep-alive sockets quickly
