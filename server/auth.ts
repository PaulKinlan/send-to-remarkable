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
      const { email, password } = req.body;

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

      await db.insert(users).values({
        email,
        password: hashedPassword,
        emailValidated: false,
      });

      console.log(`Successfully registered user: ${email}`);
      res.status(200).send("Registration successful");
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
