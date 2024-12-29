import type { Express } from "express";
import { db } from "@db";
import { devices } from "@db/schema";
import { eq } from "drizzle-orm";
import RemarkableAPI from "remarkable-tablet-api";

export function setupRemarkable(app: Express) {
  app.post("/api/device/register", async (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const { oneTimeCode } = req.body;
      console.log(`Registering device for user ${req.user.id} with code: ${oneTimeCode}`);

      // Initialize Remarkable client
      const remarkable = new RemarkableAPI();

      // Register device with Remarkable
      const deviceToken = await remarkable.register(oneTimeCode);
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

    const remarkable = new RemarkableAPI();
    await remarkable.setToken(deviceToken);

    // Convert the file to PDF if it's not already
    let pdfContent = file.content;
    if (file.contentType !== 'application/pdf') {
      // For now, we assume the content is already in PDF format
      // In the future, we can add conversion logic here
      console.log(`File ${file.filename} is not PDF, conversion may be needed`);
    }

    // Upload the document
    await remarkable.uploadPDF(file.filename, pdfContent);

    console.log(`Successfully uploaded ${file.filename} to Remarkable`);
    return true;
  } catch (error) {
    console.error(`Error uploading file to Remarkable:`, error);
    throw error;
  }
}