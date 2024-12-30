import type { Express } from "express";
import { db } from "@db";
import { devices } from "@db/schema.js";
import { eq } from "drizzle-orm";
import { register, remarkable } from "rmapi-js/dist/rmapi-js.esm.min.js";
import { generate } from "random-words";

// Define types for rmapi-js functions
type RmapiModule = {
  register: (code: string) => Promise<string>;
  remarkable: (token: string) => Promise<{
    uploadPdf: (
      filename: string,
      content: Buffer,
    ) => Promise<{
      ID: string;
      Version: number;
      Message: string;
      Success: boolean;
    }>;
  }>;
};

let rmapiModule: RmapiModule;

function generateEmailIdentifier(): string {
  const words = generate({ exactly: 5, join: '-' });
  return `${words}@in.sendvia.me`;
}

export function setupRemarkable(app: Express) {
  // Get registered devices for the authenticated user
  app.get("/api/devices", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userDevices = await db
        .select()
        .from(devices)
        .where(eq(devices.userId, req.user.id));

      res.json(userDevices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).send("Error fetching devices");
    }
  });

  app.post("/api/device/register", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { oneTimeCode } = req.body;
      console.log(
        `Registering device for user ${req.user.id} with code: ${oneTimeCode}`,
      );

      // Register device with Remarkable
      const deviceToken = await register(oneTimeCode);
      console.log(`Device registered successfully with token: ${deviceToken}`);

      // Generate unique email identifier
      const emailId = generateEmailIdentifier();
      console.log(`Generated email identifier: ${emailId}`);

      // Save device token and email identifier
      await db.insert(devices).values({
        userId: req.user.id,
        deviceToken,
        oneTimeCode,
        emailId,
        registered: true,
      });

      res.json({ 
        message: "Device registered successfully",
        emailId 
      });
    } catch (error) {
      console.error("Error registering device:", error);
      res.status(500).send("Error registering device");
    }
  });
}

export async function uploadToRemarkable(
  deviceToken: string,
  file: {
    filename: string;
    content: Buffer;
    contentType: string;
  },
) {
  try {
    console.log(`Uploading file ${file.filename} to Remarkable`);

    // Create a new API instance with the device token
    const api = await remarkable(deviceToken);

    // Convert the file to PDF if it's not already
    let pdfContent = file.content;
    if (file.contentType !== "application/pdf") {
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