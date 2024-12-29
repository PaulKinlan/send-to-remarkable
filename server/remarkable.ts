import type { Express } from "express";
import { db } from "@db/index.js";
import { devices } from "@db/schema.js";
import { eq } from "drizzle-orm";

// Define types for rmapi-js functions
type RmapiModule = {
  register: (code: string) => Promise<string>;
  remarkable: (token: string) => Promise<{
    uploadPdf: (filename: string, content: Buffer) => Promise<{
      ID: string;
      Version: number;
      Message: string;
      Success: boolean;
    }>;
  }>;
};

let rmapiModule: RmapiModule;

// Initialize rmapi-js module
async function initRmapi() {
  try {
    rmapiModule = await import('rmapi-js');
    console.log('Successfully loaded rmapi-js module');
  } catch (error) {
    console.error('Failed to load rmapi-js module:', error);
    throw error;
  }
}

export function setupRemarkable(app: Express) {
  // Initialize rmapi-js when setting up routes
  initRmapi().catch(console.error);

  app.post("/api/device/register", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { oneTimeCode } = req.body;
      console.log(`Registering device for user ${req.user.id} with code: ${oneTimeCode}`);

      // Register device with Remarkable
      const deviceToken = await rmapiModule.register(oneTimeCode);
      console.log(`Device registered successfully with token: ${deviceToken}`);

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
  try {
    console.log(`Uploading file ${file.filename} to Remarkable`);

    // Create a new API instance with the device token
    const api = await rmapiModule.remarkable(deviceToken);

    // Convert the file to PDF if it's not already
    let pdfContent = file.content;
    if (file.contentType !== 'application/pdf') {
      // For now, we assume the content is already in PDF format
      // In the future, we can add conversion logic here
      console.log(`File ${file.filename} is not PDF, conversion may be needed`);
    }

    // Upload the document using the API instance
    const result = await api.uploadPdf(file.filename, pdfContent);

    if (!result.Success) {
      throw new Error(`Upload failed: ${result.Message}`);
    }

    console.log(`Successfully uploaded ${file.filename} to Remarkable`);
    return true;
  } catch (error) {
    console.error(`Error uploading file to Remarkable:`, error);
    throw error;
  }
}