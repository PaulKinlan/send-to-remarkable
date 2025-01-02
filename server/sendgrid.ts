import type { Express, Request } from "express";
import addresses, { ParsedMailbox } from "email-addresses";
import { db } from "@db/index.js";
import { users, devices } from "@db/schema.js";
import { eq, and } from "drizzle-orm";
import { uploadToRemarkable } from "./remarkable.js";
import sgMail from "@sendgrid/mail";
import puppeteer from "puppeteer";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import multer, { Multer } from "multer";
import crypto from "crypto";

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable is required");
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const upload = multer({ storage: multer.memoryStorage() });

interface EmailWebhookBody {
  to: string;
  from: string;
  subject?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded content
    contentType: string;
  }>;
}

// Generate a random verification token
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function toArrayBuffer(buffer: Buffer) {
  const arrayBuffer = new ArrayBuffer(buffer.length);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i];
  }
  return arrayBuffer;
}

// Send verification email
export async function sendVerificationEmail(
  userEmail: string,
  userId: number,
): Promise<void> {
  const verificationToken = generateVerificationToken();
  const verificationTokenExpiry = new Date();
  verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // Token expires in 24 hours

  // Update user with verification token
  await db
    .update(users)
    .set({
      verificationToken,
      verificationTokenExpiry,
    })
    .where(eq(users.id, userId));

  const verificationLink = `${process.env.APP_URL || "http://localhost:5000"}/api/verify-email?token=${verificationToken}`;

  const msg = {
    to: userEmail,
    from: "noreply@sendvia.me", // Update this to your verified sender
    subject: "Verify your email address",
    html: `
      <div>
        <h1>Welcome to remarkable-email!</h1>
        <p>Please verify your email address by clicking the link below:</p>
        <p><a href="${verificationLink}">Verify Email Address</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't create this account, you can safely ignore this email.</p>
      </div>
    `,
  };

  await sgMail.send(msg);
}

export function setupSendGrid(app: Express) {
  // Verify email endpoint
  app.get("/api/verify-email", async (req, res) => {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).send("Invalid verification token");
    }

    try {
      // Find user with matching token that hasn't expired
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.verificationToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).send("Invalid or expired verification token");
      }

      if (
        user.verificationTokenExpiry &&
        new Date() > new Date(user.verificationTokenExpiry)
      ) {
        return res.status(400).send("Verification token has expired");
      }

      // Update user as verified
      await db
        .update(users)
        .set({
          emailValidated: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(users.id, user.id));

      // Redirect to frontend with success message
      res.redirect("/?verified=true");
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).send("Error verifying email");
    }
  });

  // Existing email webhook endpoint
  app.post("/api/webhook/email", upload.any(), async (req: Request, res) => {
    console.log("Received email webhook:", JSON.stringify(req.body, null, 2));

    try {
      const { to, from, subject, html } = req.body as EmailWebhookBody;

      if (!to || !from) {
        console.error("Missing required fields in webhook payload");
        return res.status(400).send("Missing required fields");
      }

      const fromAddr = addresses.parseOneAddress(from) as ParsedMailbox;
      if (!fromAddr) {
        console.error(`Invalid from email address: ${from}`);
        return res.status(400).send("Invalid from address or unverified email");
      }

      const toAddr = addresses.parseOneAddress(to) as ParsedMailbox;
      if (!toAddr) {
        console.error(`Invalid from email address: ${to}`);
        return res.status(400).send("Invalid address or unverified email");
      }

      const fromAddress = fromAddr.address;
      const toAddress = toAddr.address;

      // Verify user exists and email is validated
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(eq(users.email, fromAddress), eq(users.emailValidated, true)),
        )
        .limit(1);

      if (!user || !user.emailValidated) {
        console.error(`Invalid user or unverified email: ${from}`);
        return res
          .status(400)
          .send("Invalid delivery address or unverified email");
      }

      // Get user's device
      const [device] = await db
        .select()
        .from(devices)
        .where(and(eq(devices.userId, user.id), eq(devices.emailId, toAddress)))
        .limit(1);

      if (!device || !device.registered) {
        console.error(
          `No registered device found for user: ${user.id} with address ${to}`,
        );
        return res.status(400).send("No registered device found");
      }

      console.log(req.files);
      const attachments = req.files as Express.Multer.File[];

      // Process attachments if present
      if (
        attachments &&
        attachments.length > 0 &&
        "attachment-info" in req.body
      ) {
        const validFilenames: string[] = Object.values(
          JSON.parse(req.body["attachment-info"]) as {
            [field: string]: { filename: string };
          },
        ).map((info) => info.filename);

        console.log(`Valid filenames: ${validFilenames}`);

        console.log(`Processing ${attachments.length} attachments`);
        for (const attachment of attachments) {
          console.log(`Processing attachment: ${attachment.originalname}`);
          if (validFilenames.indexOf(attachment.originalname) > -1) {
            const content = toArrayBuffer(attachment.buffer);
            await uploadToRemarkable(device.deviceToken, {
              filename: attachment.originalname,
              content,
              contentType: attachment.mimetype,
            });
          }
        }
      } else if (html) {
        // Convert HTML to PDF if no attachments
        console.log("Converting HTML content to PDF");
        const pdfBuffer = await convertHtmlToPdf(html);
        await uploadToRemarkable(device.deviceToken, {
          filename: `${subject || "Email"}.pdf`,
          content: toArrayBuffer(pdfBuffer),
          contentType: "application/pdf",
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
  // find path to crhomium
  const { stdout: chromiumPath } = await promisify(exec)("which chromium");

  console.log(chromiumPath);

  const browser = await puppeteer.launch({
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: chromiumPath.trim(),
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
