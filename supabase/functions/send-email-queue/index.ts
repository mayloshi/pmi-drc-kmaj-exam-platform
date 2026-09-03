type EmailQueueRow = {
  id: string;
  to_email: string;
  subject: string;
  payload_json: {
    body?: string;
    html?: string;
  } | null;
};

type EmailQueueRequest = {
  id?: string;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/+$/, "");
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY");
const resendApiKey = Deno.env.get("RESEND_API_KEY");
const mailFrom = Deno.env.get("MAIL_FROM") || "k.majuscule@pmi-drcongo.org";
const batchSize = Number(Deno.env.get("EMAIL_BATCH_SIZE") || "20");
const cronSecret = Deno.env.get("EMAIL_QUEUE_CRON_SECRET");

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

async function readRequestBody(request: Request) {
  try {
    return await request.json() as EmailQueueRequest;
  } catch {
    return {};
  }
}

Deno.serve(async (request) => {
  try {
    if (!cronSecret) return jsonResponse({ error: "EMAIL_QUEUE_CRON_SECRET is missing." }, 500);
    if (request.headers.get("x-email-queue-secret") !== cronSecret) {
      return jsonResponse({ error: "Unauthorized email queue trigger." }, 401);
    }

    const body = await readRequestBody(request);
    const requestedId = body.id?.trim();
    if (requestedId && !/^[0-9a-f-]{36}$/i.test(requestedId)) {
      return jsonResponse({ error: "Invalid email queue id." }, 400);
    }

    const queued = await supabaseFetch<EmailQueueRow[]>(
      requestedId
        ? `/rest/v1/email_queue?select=id,to_email,subject,payload_json&id=eq.${encodeURIComponent(requestedId)}&status=eq.queued&limit=1`
        : `/rest/v1/email_queue?select=id,to_email,subject,payload_json&status=eq.queued&order=created_at.asc&limit=${batchSize}`,
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

    return jsonResponse({ processed: results.length, targeted: Boolean(requestedId), results });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown function error" }, 500);
  }
});
