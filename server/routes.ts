import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { setupSendGrid } from "./sendgrid";
import { setupRemarkable } from "./remarkable";

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
