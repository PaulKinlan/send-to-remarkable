import type { Express } from "express";
import { db } from "@db";
import { devices } from "@db/schema";
import { eq } from "drizzle-orm";

// This would typically use rmapi-js, but we'll mock it for now
const remarkableApi = {
  register: async (code: string) => {
    // Mock registration
    return {
      deviceToken: "mock-device-token-" + Math.random().toString(36).slice(2)
    };
  },
  upload: async (token: string, file: any) => {
    // Mock upload
    console.log("Uploading to device:", token, file);
    return true;
  }
};

export function setupRemarkable(app: Express) {
  app.post("/api/device/register", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { oneTimeCode } = req.body;

      // Register device with Remarkable
      const { deviceToken } = await remarkableApi.register(oneTimeCode);

      // Save device token
      await db.insert(devices).values({
        userId: req.user.id,
        deviceToken,
        oneTimeCode,
        registered: true
      });

      res.json({ message: "Device registered successfully" });
    } catch (error) {
      console.error("Error registering device:", error);
      res.status(500).send("Error registering device");
    }
  });
}

export async function uploadToRemarkable(deviceToken: string, file: {
  filename: string;
  content: Buffer;
  contentType: string;
}) {
  return remarkableApi.upload(deviceToken, file);
}