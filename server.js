import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import chatHandler from "./api/chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/chat", (req, res) => chatHandler(req, res));
app.options("/api/chat", (req, res) => chatHandler(req, res));

app.get("/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Chatbot server listening on port ${port}`);
});
