import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, type User } from "@db/schema.js";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { sendVerificationEmail } from "./sendgrid.js";
import fetch from "node-fetch";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64,
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// Extend Express.User with our User type, excluding the password field
type SafeUser = Omit<User, "password">;
declare global {
  namespace Express {
    interface User extends SafeUser {}
  }
}

interface RecaptchaResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json() as RecaptchaResponse;
    if (!data.success) {
      console.error('reCAPTCHA verification failed:', data["error-codes"]);
    }
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  app.use(
    session({
      secret: process.env.REPL_ID || "remarkable-email-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000,
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
      },
      async (email, password, done) => {
        try {
          console.log(`Attempting login for email: ${email}`);
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            console.log(`No user found for email: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          const isMatch = await crypto.compare(password, user.password);
          if (!isMatch) {
            console.log(`Invalid password for email: ${email}`);
            return done(null, false, { message: "Invalid email or password" });
          }

          if (!user.emailValidated) {
            console.log(`Email not verified for user: ${email}`);
            return done(null, false, { message: "Please verify your email address first" });
          }

          const { password: _, ...userWithoutPassword } = user;
          console.log(`Successful login for email: ${email}`);
          return done(null, userWithoutPassword);
        } catch (err) {
          console.error("Login error:", err);
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user with id: ${id}`);
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
          emailValidated: users.emailValidated,
          createdAt: users.createdAt,
          verificationToken: users.verificationToken,
          verificationTokenExpiry: users.verificationTokenExpiry,
        })
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log(`No user found for id: ${id}`);
        return done(null, false);
      }

      console.log(`Successfully deserialized user: ${user.email}`);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Received registration request:", req.body);
      const { email, password, recaptchaToken } = req.body;

      // Verify reCAPTCHA token
      if (!recaptchaToken) {
        console.log('Registration failed: No reCAPTCHA token provided');
        return res.status(400).send("Please complete the reCAPTCHA verification");
      }

      const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
      if (!isValidRecaptcha) {
        console.log('Registration failed: Invalid reCAPTCHA token');
        return res.status(400).send("reCAPTCHA verification failed");
      }

      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser) {
        console.log(`Registration failed: Email already exists: ${email}`);
        return res.status(400).send("Email already registered");
      }

      const hashedPassword = await crypto.hash(password);

      // Insert new user with explicit null values for new columns
      const [user] = await db.insert(users)
        .values({
          email,
          password: hashedPassword,
          emailValidated: false,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .returning();

      if (!user) {
        console.error("User creation failed - no user returned");
        throw new Error("Failed to create user");
      }

      console.log("Created user:", { id: user.id, email: user.email });

      try {
        // Send verification email
        await sendVerificationEmail(email, user.id);
        console.log(`Verification email sent to: ${email}`);
      } catch (emailError) {
        console.error("Failed to send verification email:", emailError);
        // Continue with registration but inform the user about email issues
        return res.status(200).json({
          message: "Registration successful but verification email failed to send. Please try again later.",
          requiresVerification: true,
          emailError: true
        });
      }

      console.log(`Successfully registered user: ${email}`);
      res.status(200).json({
        message: "Registration successful. Please check your email to verify your account.",
        requiresVerification: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Received login request:", { email: req.body.email });

    passport.authenticate(
      "local",
      (err: Error, user: Express.User, info: IVerifyOptions) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }
        if (!user) {
          console.log("Login failed:", info.message);
          return res.status(400).send(info.message);
        }
        req.login(user, (err) => {
          if (err) {
            console.error("Session creation error:", err);
            return next(err);
          }
          console.log(`Login successful for user: ${user.email}`);
          return res.json(user);
        });
      },
    )(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    const userEmail = req.user?.email;
    console.log(`Logout request for user: ${userEmail}`);

    req.logout(() => {
      console.log(`Successfully logged out user: ${userEmail}`);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      console.log(`Retrieved user data for: ${req.user.email}`);
      return res.json(req.user);
    }
    console.log("Unauthorized access attempt to /api/user");
    res.status(401).send("Not authenticated");
  });
}