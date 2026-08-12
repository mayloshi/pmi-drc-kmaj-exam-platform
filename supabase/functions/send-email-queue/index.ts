type EmailQueueRow = {
  id: string;
  to_email: string;
  subject: string;
  payload_json: {
    body?: string;
    html?: string;
  } | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const mailFrom = Deno.env.get("MAIL_FROM") || "k.majuscule@pmi-drcongo.org";
const batchSize = Number(Deno.env.get("EMAIL_BATCH_SIZE") || "20");

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function supabaseFetch<T>(path: string, init: RequestInit = {}) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase environment is not configured.");
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || response.statusText);
  return text ? JSON.parse(text) as T : [] as T;
}

async function updateEmail(id: string, patch: Record<string, unknown>) {
  return supabaseFetch(`/rest/v1/email_queue?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

async function sendWithResend(row: EmailQueueRow) {
  if (!resendApiKey) throw new Error("RESEND_API_KEY is missing.");
  const body = row.payload_json?.body || "";
  const html = row.payload_json?.html;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mailFrom,
      to: [row.to_email],
      subject: row.subject,
      text: body,
      ...(html ? { html } : {}),
    }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || response.statusText);
  return text ? JSON.parse(text) : {};
}

Deno.serve(async () => {
  try {
    const queued = await supabaseFetch<EmailQueueRow[]>(
      `/rest/v1/email_queue?select=id,to_email,subject,payload_json&status=eq.queued&order=created_at.asc&limit=${batchSize}`,
    );
    const results: Array<{ id: string; status: "sent" | "failed"; detail?: unknown }> = [];

    for (const row of queued) {
      try {
        const detail = await sendWithResend(row);
        await updateEmail(row.id, {
          status: "sent",
          sent_at: new Date().toISOString(),
          payload_json: { ...(row.payload_json || {}), resend: detail },
        });
        results.push({ id: row.id, status: "sent", detail });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown email error";
        await updateEmail(row.id, {
          status: "failed",
          payload_json: { ...(row.payload_json || {}), error: message },
        });
        results.push({ id: row.id, status: "failed", detail: message });
      }
    }

    return jsonResponse({ processed: results.length, results });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown function error" }, 500);
  }
});
