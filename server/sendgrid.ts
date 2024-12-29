import type { Express } from "express";
import { db } from "@db";
import { users, devices } from "@db/schema";
import { eq } from "drizzle-orm";
import { uploadToRemarkable } from "./remarkable";

export function setupSendGrid(app: Express) {
  app.post("/api/webhook/email", async (req, res) => {
    try {
      const { to, from, subject, html, attachments } = req.body;

      // Parse the delivery email to get username and user ID
      const [username, userId] = to.split('@')[0].split('.');
      
      // Verify user exists and email is validated
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user || !user.emailValidated) {
        return res.status(400).send("Invalid delivery address or unverified email");
      }

      // Get user's device
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.userId, user.id))
        .limit(1);

      if (!device || !device.registered) {
        return res.status(400).send("No registered device found");
      }

      // Handle attachments or convert HTML to PDF
      if (attachments && attachments.length > 0) {
        for (const attachment of attachments) {
          await uploadToRemarkable(device.deviceToken, attachment);
        }
      } else {
        // Convert HTML to PDF and upload
        const pdfBuffer = await convertHtmlToPdf(html);
        await uploadToRemarkable(device.deviceToken, {
          filename: `${subject || 'Email'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      }

      res.json({ message: "Document processed successfully" });
    } catch (error) {
      console.error("Error processing email:", error);
      res.status(500).send("Error processing email");
    }
  });
}

async function convertHtmlToPdf(html: string): Promise<Buffer> {
  // Implementation of HTML to PDF conversion
  // This would typically use a library like puppeteer or wkhtmltopdf
  // For now, we'll return a placeholder
  return Buffer.from("PDF content");
}
