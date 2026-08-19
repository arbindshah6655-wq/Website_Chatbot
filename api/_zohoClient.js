import axios from "axios";

// Same approach as the lead-agent project: a self-client OAuth app scoped to
// the Outsourcing Mate Zoho CRM org. Uses the refresh token you already generated.

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedToken;
  }

  const { data } = await axios.post(
    `${process.env.ZOHO_ACCOUNTS_DOMAIN}/oauth/v2/token`,
    null,
    {
      params: {
        refresh_token: process.env.ZOHO_REFRESH_TOKEN,
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    }
  );

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedToken;
}

async function zohoRequest(method, path, body) {
  const token = await getAccessToken();
  const url = `${process.env.ZOHO_API_DOMAIN}/crm/v6${path}`;

  const { data } = await axios({
    method,
    url,
    data: body,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
    },
  });

  return data;
}

export async function createLead(lead) {
  const payload = {
    data: [
      {
        Last_Name: lead.lastName || lead.fullName || "Website chat lead",
        First_Name: lead.firstName,
        Email: lead.email,
        Phone: lead.phone,
        Company: lead.company,
        Lead_Source: "Website Chatbot",
        Description: lead.summary || "",
        Service_Interested_In: lead.serviceInterest,
        Lead_Status: "New - Chat Qualified",
      },
    ],
  };

  const result = await zohoRequest("POST", "/Leads", payload);
  return result.data[0].details.id;
}

export async function addNote(leadId, title, content) {
  const payload = { data: [{ Note_Title: title, Note_Content: content }] };
  return zohoRequest("POST", `/Leads/${leadId}/Notes`, payload);
}

export async function createSpecialistTask(leadId, summary) {
  const payload = {
    data: [
      {
        Subject: "Follow up with website chat lead",
        Description: summary,
        Who_Id: leadId,
        Status: "Not Started",
        Priority: "High",
      },
    ],
  };
  return zohoRequest("POST", "/Tasks", payload);
}
