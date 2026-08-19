# Outsourcing Mate website chatbot

A chat bubble for the website that answers visitor questions about your services and, once it has a
name, contact info, and service interest, automatically creates the lead in Zoho CRM and a follow-up
task for a specialist.

## What's in here

- `api/chat.js` - the backend. Talks to Claude, decides when enough info has been gathered, and creates
  the Zoho lead/task at that point.
- `api/_zohoClient.js` - reuses the same Zoho credentials you already set up for the lead-agent project.
- `public/widget.js` - the chat bubble itself. One script tag, no build step, works on any website
  including WordPress.

## Deploying the backend (Vercel - mostly clicking, minimal terminal)

1. Go to https://vercel.com and sign up/log in (GitHub login is easiest).
2. Put this `website-chatbot` folder into a GitHub repository (Vercel can also deploy by dragging the
   folder in via their CLI, but the GitHub route needs the least terminal work).
3. In Vercel, click **Add New → Project**, select the repository, and click **Deploy**.
4. Before or after the first deploy, go to the project's **Settings → Environment Variables** and add
   everything from `.env.example` with your real values (same Zoho credentials as before, plus your
   Anthropic API key). Redeploy after adding them if it already deployed once.
5. Once deployed, Vercel gives you a URL like `https://website-chatbot-yourname.vercel.app`. Your chat
   endpoint is `https://website-chatbot-yourname.vercel.app/api/chat`.

## Embedding the widget in WordPress

1. In `public/widget.js`, nothing needs editing - the API URL is set from the page itself (see step 3).
2. In WordPress admin, install a small plugin like "Insert Headers and Footers" (or use your theme's
   footer script option if it has one).
3. Add this snippet to the footer, replacing the URL with your actual Vercel URL from above:
   ```html
   <script>window.OM_CHAT_API_URL = "https://website-chatbot-yourname.vercel.app/api/chat";</script>
   <script src="https://website-chatbot-yourname.vercel.app/widget.js"></script>
   ```
4. Save, then visit the live site - a chat bubble should appear in the bottom-right corner.

## Zoho custom fields needed

Same as the lead-agent project, plus one more in the Leads module: `Service_Interested_In` (text).

## Testing before going live

Open the deployed `/api/chat` in a separate browser tab first to make sure it doesn't error, then test
the widget on a staging page. Have a real conversation with it - ask it a services question, then give it
a name/email/service interest, and confirm a new lead shows up in Zoho with a follow-up task attached.
