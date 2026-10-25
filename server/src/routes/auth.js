import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function createAuthRouter({ store, secret, authenticate }) {
  const router = Router();

  router.post("/register", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    if (name.length < 2 || name.length > 80 || !emailPattern.test(email) || typeof password !== "string" || password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({ error: "Enter a name, valid email, and password between 8 and 72 characters." });
    }

    if (await store.findUserByEmail(email)) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await store.createUser({ name, email, passwordHash });
    if (!user) return res.status(409).json({ error: "An account with that email already exists." });

    const token = jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, secret, { expiresIn: "8h" });
    return res.status(201).json({ token, user: publicUser(user) });
  });

  router.post("/login", async (req, res) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body?.password;
    const user = await store.findUserByEmail(email);
    if (!user || typeof password !== "string" || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    const token = jwt.sign({ sub: user.id, role: user.role, name: user.name, email: user.email }, secret, { expiresIn: "8h" });
    return res.json({ token, user: publicUser(user) });
  });

  router.get("/me", authenticate, async (req, res) => {
    return res.json({ user: { id: req.user.sub, name: req.user.name, email: req.user.email, role: req.user.role } });
  });

  return router;
}
