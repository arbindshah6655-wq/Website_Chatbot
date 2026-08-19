import Anthropic from "@anthropic-ai/sdk";
import { createLead, addNote, createSpecialistTask } from "./_zohoClient.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are the website chat assistant for Outsourcing Mate, an Australian-run offshore
outsourcing company (with a Nepal-based team) that helps businesses - mainly finance and mortgage
brokerages - by providing:
- Loan Processing Officer / Broker Support (end-to-end loan processing, faster settlements)
- Credit Analysis (borrower profile assessment, financial review, compliance-ready)
- Admin Support (back-office support from application to settlement)
- Performance Marketing (paid ads, SEO, social, lead gen, email/SMS campaigns)
- Technology Support (websites, apps, CRMs, custom software integration)

Your two jobs, blended naturally into one conversation:
1. Answer visitor questions about these services helpfully and honestly, in a friendly, concise,
   consultative tone - a few sentences at a time, not long paragraphs.
2. Work out, over the course of the conversation, who they are and what they need, so a specialist can
   follow up. You need: their name, company name, email or phone, which service(s) they're interested in,
   and roughly what their timeline or team size looks like. Don't interrogate them with a rigid checklist -
   weave the questions into the conversation naturally, one at a time, in whatever order fits.

Once you have their name, a way to contact them (email or phone), and which service they're interested in,
call the submit_lead tool with everything you've gathered. You don't need every field filled to call it -
just those three are required, the rest are bonus. After calling it, thank them and let them know a
specialist will be in touch soon.

Never quote prices or make commitments about turnaround times - that's for the specialist to confirm.`;

const SUBMIT_LEAD_TOOL = {
  name: "submit_lead",
  description:
    "Submit the visitor's details once you have their name, contact info, and service interest, so a specialist can follow up.",
  input_schema: {
    type: "object",
    properties: {
      firstName: { type: "string" },
      lastName: { type: "string" },
      company: { type: "string" },
      email: { type: "string" },
      phone: { type: "string" },
      serviceInterest: {
        type: "string",
        description:
          "Which service(s) they're interested in, e.g. 'Credit Analysis' or 'Loan Processing + Marketing'",
      },
      summary: {
        type: "string",
        description: "2-3 sentence summary of what they need and any context useful for the specialist.",
      },
    },
    required: ["firstName", "email", "serviceInterest"],
  },
};

export default async function handler(req, res) {
  // CORS: the widget is loaded from the WordPress domain, calling this API on a
  // different (Vercel) domain, so these headers are required.
  res.setHeader("Access-Control-Allow-Origin", process.env.ALLOWED_ORIGIN || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "message is required" });
  }

  try {
    const messages = [...history, { role: "user", content: message }];

    let response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      tools: [SUBMIT_LEAD_TOOL],
      messages,
    });

    let leadCreated = false;

    // If Claude decided it has enough info, it calls submit_lead instead of (or alongside) replying.
    const toolUse = response.content.find((b) => b.type === "tool_use");

    if (toolUse && toolUse.name === "submit_lead") {
      const lead = toolUse.input;

      const transcript = messages
        .map((m) => `${m.role === "user" ? "Visitor" : "Agent"}: ${typeof m.content === "string" ? m.content : ""}`)
        .join("\n");

      const leadId = await createLead(lead);
      await addNote(leadId, "Website chat transcript", transcript);
      await createSpecialistTask(leadId, lead.summary || "Visitor qualified via website chatbot.");
      leadCreated = true;

      // Send the tool result back so Claude can produce the final friendly confirmation message.
      messages.push({ role: "assistant", content: response.content });
      messages.push({
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: "Lead saved successfully. A specialist has been notified.",
          },
        ],
      });

      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        tools: [SUBMIT_LEAD_TOOL],
        messages,
      });
    }

    const replyText = response.content.find((b) => b.type === "text")?.text ?? "";

    messages.push({ role: "assistant", content: replyText });

    res.status(200).json({
      reply: replyText,
      history: messages,
      leadCreated,
    });
  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
