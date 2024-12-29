import type { Express } from "express";
import { db } from "@db";
import { users, devices } from "@db/schema";
import { eq } from "drizzle-orm";
import { uploadToRemarkable } from "./remarkable";
import sgMail from "@sendgrid/mail";
import puppeteer from "puppeteer";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable is required");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailWebhookBody {
  to: string;
  from: string;
  subject?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string;  // Base64 encoded content
    contentType: string;
  }>;
}

export function setupSendGrid(app: Express) {
  app.post("/api/webhook/email", async (req, res) => {
    console.log("Received email webhook:", JSON.stringify(req.body, null, 2));

    try {
      const { to, from, subject, html, attachments } = req.body as EmailWebhookBody;

      if (!to || !from) {
        console.error("Missing required fields in webhook payload");
        return res.status(400).send("Missing required fields");
      }

      // Parse the delivery email to get username and user ID
      const [emailPrefix] = to.split('@');
      const [username, userId] = emailPrefix.split('.');

      if (!username || !userId) {
        console.error(`Invalid delivery address format: ${to}`);
        return res.status(400).send("Invalid delivery address format");
      }

      // Verify user exists and email is validated
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(userId)))
        .limit(1);

      if (!user || !user.emailValidated) {
        console.error(`Invalid user or unverified email: ${to}`);
        return res.status(400).send("Invalid delivery address or unverified email");
      }

      // Get user's device
      const [device] = await db
        .select()
        .from(devices)
        .where(eq(devices.userId, user.id))
        .limit(1);

      if (!device || !device.registered) {
        console.error(`No registered device found for user: ${user.id}`);
        return res.status(400).send("No registered device found");
      }

      // Process attachments if present
      if (attachments && attachments.length > 0) {
        console.log(`Processing ${attachments.length} attachments`);
        for (const attachment of attachments) {
          const content = Buffer.from(attachment.content, 'base64');
          await uploadToRemarkable(device.deviceToken, {
            filename: attachment.filename,
            content,
            contentType: attachment.contentType
          });
        }
      } else if (html) {
        // Convert HTML to PDF if no attachments
        console.log("Converting HTML content to PDF");
        const pdfBuffer = await convertHtmlToPdf(html);
        await uploadToRemarkable(device.deviceToken, {
          filename: `${subject || 'Email'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        });
      } else {
        console.error("No content to process");
        return res.status(400).send("No content to process");
      }

      console.log("Successfully processed email for user:", user.id);
      res.json({ message: "Document processed successfully" });
    } catch (error) {
      console.error("Error processing email:", error);
      res.status(500).send("Error processing email");
    }
  });
}

async function convertHtmlToPdf(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}