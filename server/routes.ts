import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth.js";
import { setupSendGrid } from "./sendgrid.js";
import { setupRemarkable } from "./remarkable.js";

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Setup SendGrid webhook
  setupSendGrid(app);

  // Setup Remarkable device registration
  setupRemarkable(app);

  const httpServer = createServer(app);
  return httpServer;
}
