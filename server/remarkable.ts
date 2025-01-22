import type { Express } from "express";
import { db } from "@db";
import { devices } from "@db/schema.js";
import { eq } from "drizzle-orm";
import {
  register,
  remarkable,
  UploadEntry,
} from "rmapi-js/dist/rmapi-js.esm.min.js";
import { generate } from "random-words";

function generateEmailIdentifier(): string {
  const words = generate({ exactly: 5, join: "-" });
  return `${words}@in.sendvia.me`;
}

export function setupRemarkable(app: Express) {
  app.delete("/api/device/:id", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Unauthorized");
    }

    try {
      await db.delete(devices).where(eq(devices.id, parseInt(req.params.id)));
      res.json({ message: "Device deleted successfully" });
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).send("Error deleting device");
    }
  });

  // Get registered devices for the authenticated user
  app.get("/api/devices", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const userDevices = await db
        .select({
          id: devices.id,
          emailId: devices.emailId,
          registered: devices.registered,
          createdAt: devices.createdAt,
        })
        .from(devices)
        .where(eq(devices.userId, req.user.id));

      res.json(userDevices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).send("Error fetching devices");
    }
  });

  // Re-register an existing device with a new one-time code
  app.post("/api/device/reregister", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { oneTimeCode, deviceId } = req.body;
      console.log(
        `Re-registering device ${deviceId} for user ${req.user.id} with code: ${oneTimeCode}`,
      );

      // Get the existing device
      const [existingDevice] = await db
        .select()
        .from(devices)
        .where(eq(devices.id, deviceId))
        .limit(1);

      if (!existingDevice) {
        return res.status(404).send("Device not found");
      }

      // Register new device with Remarkable
      const deviceToken = await register(oneTimeCode);
      console.log(`Device re-registered successfully with token: ${deviceToken}`);

      // Update device token
      await db
        .update(devices)
        .set({
          deviceToken,
          oneTimeCode,
          registered: true,
        })
        .where(eq(devices.id, deviceId));

      res.json({
        message: "Device re-registered successfully",
        emailId: existingDevice.emailId,
      });
    } catch (error) {
      console.error("Error re-registering device:", error);
      res.status(500).send("Error re-registering device");
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
        emailId,
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
    content: ArrayBuffer;
    contentType: string;
  },
) {
  try {
    let { content, filename, contentType } = file;
    console.log(`Uploading file ${filename} to Remarkable`);

    // Create a new API instance with the device token
    const api = await remarkable(deviceToken);

    let result: UploadEntry;

    if (contentType === "application/pdf") {
      // Upload the document using the API instance
      result = await api.uploadPdf(filename, content);
    } else if (file.contentType === "application/epub+zip") {
      result = await api.uploadEpub(filename, content);
    } else {
      console.log(`File ${file.filename} is not PDF, conversion may be needed`);
      return false;
    }
    if (!result) {
      throw new Error(`Upload failed`);
    }

    console.log(`Successfully uploaded ${file.filename} to Remarkable`);
    return true;
  } catch (error) {
    console.error(`Error uploading file to Remarkable:`, error);
    throw error;
  }
}