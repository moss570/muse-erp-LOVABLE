import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
};

interface ResendInboundEmail {
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: string; // base64 encoded (some Resend versions)
    data?: string; // base64 encoded (newer Resend versions)
    id?: string; // attachment id (when only metadata is provided)
    content_type: string;
    content_disposition?: string;
    content_id?: string;
  }>;
  headers?: Record<string, string>;
}

// Helper to decode both standard and URL-safe base64 from Resend
function base64ToUint8Array(base64: string): Uint8Array {
  // Convert URL-safe base64 to standard base64
  let standardBase64 = base64
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  // Add padding if needed
  while (standardBase64.length % 4) {
    standardBase64 += '=';
  }
  
  // Decode using standard atob
  const binaryString = atob(standardBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function uint8ToBase64(bytes: Uint8Array): string {
  // Convert bytes to base64 in chunks to avoid call stack limits
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function fetchResendAttachment(options: {
  emailId: string;
  attachmentId: string;
  apiKey: string;
}): Promise<{ bytes: Uint8Array; base64: string } | null> {
  const { emailId, attachmentId, apiKey } = options;

  // Resend endpoint (see: https://resend.com/docs/api-reference/emails/retrieve-received-email-attachment)
  const url = `https://api.resend.com/emails/receiving/${emailId}/attachments/${attachmentId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Failed to fetch Resend attachment:", res.status, text);
    return null;
  }

  // The response may include a temporary download_url OR base64 content.
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    console.error("Resend attachment response was not JSON");
    return null;
  }

  const downloadUrl: string | undefined =
    json?.download_url || json?.data?.download_url;
  const base64: string | undefined = json?.content || json?.data?.content;

  if (downloadUrl) {
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      console.error("Failed to download attachment from download_url:", fileRes.status);
      await fileRes.text();
      return null;
    }
    const buf = new Uint8Array(await fileRes.arrayBuffer());
    return { bytes: buf, base64: uint8ToBase64(buf) };
  }

  if (base64) {
    const bytes = base64ToUint8Array(base64);
    return { bytes, base64 };
  }

  console.error("Resend attachment response missing download_url/content");
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("inbound-po-webhook function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Optional: Verify webhook signature if secret is configured
    if (webhookSecret) {
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");

      if (!svixId || !svixTimestamp || !svixSignature) {
        console.warn("Missing Svix headers - skipping signature verification");
      }
      // Note: Full signature verification would require the Svix library
      // For now, we log the headers for debugging
      console.log("Webhook headers:", { svixId, svixTimestamp });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload = await req.json();

    console.log("Received webhook payload type:", payload.type);

    // Handle Resend inbound email webhook
    if (payload.type === "email.received") {
      const email: ResendInboundEmail = payload.data;

      const emailId: string | null =
        payload?.data?.id || payload?.data?.email_id || payload?.data?.message_id || null;
      
      console.log("Processing inbound email:", {
        from: email.from,
        subject: email.subject,
        attachments: email.attachments?.length || 0,
      });

      // Check if there are PDF attachments
      const pdfAttachments = email.attachments?.filter(
        (att) => att.content_type === "application/pdf"
      ) || [];

      if (pdfAttachments.length === 0) {
        console.log("No PDF attachments found, skipping");
        return new Response(
          JSON.stringify({ success: true, message: "No PDF attachments to process" }),
          { headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Process each PDF attachment
      for (const attachment of pdfAttachments) {
        console.log("Processing PDF:", attachment.filename);
        
        // Resend may use 'content' or 'data' for the base64 payload
        const base64Content = attachment.content || attachment.data;
        const attachmentId = attachment.id;
        
        let resolvedBytes: Uint8Array | null = null;
        let resolvedBase64: string | null = null;

        if (base64Content) {
          console.log("Attachment content length:", base64Content.length);
          resolvedBase64 = base64Content;
          resolvedBytes = base64ToUint8Array(base64Content);
        } else {
          console.warn(
            "Attachment content not included in webhook payload; attempting to fetch from Resend API. Keys:",
            Object.keys(attachment)
          );

          if (!resendApiKey) {
            console.error("RESEND_API_KEY not configured; cannot fetch attachment content");
            continue;
          }
          if (!emailId) {
            console.error("Missing email id in webhook payload; cannot fetch attachment content");
            continue;
          }
          if (!attachmentId) {
            console.error("Missing attachment id in webhook payload; cannot fetch attachment content");
            continue;
          }

          const fetched = await fetchResendAttachment({
            emailId,
            attachmentId,
            apiKey: resendApiKey,
          });
          if (!fetched) continue;

          resolvedBytes = fetched.bytes;
          resolvedBase64 = fetched.base64;
        }

        // Generate a unique filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const sanitizedFilename = attachment.filename.replace(/[^a-zA-Z0-9.-]/g, "_");
        const storagePath = `${timestamp}_${sanitizedFilename}`;

        if (!resolvedBytes || !resolvedBase64) {
          console.error("Failed to resolve attachment bytes/base64");
          continue;
        }
        const pdfBytes = resolvedBytes;
        
        const { error: uploadError } = await supabase.storage
          .from("incoming-purchase-orders")
          .upload(storagePath, pdfBytes, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          console.error("Failed to upload PDF:", uploadError);
          continue;
        }

        console.log("PDF uploaded to storage:", storagePath);

        // Create pending purchase order record
        const { data: pendingPO, error: insertError } = await supabase
          .from("pending_purchase_orders")
          .insert({
            email_from: email.from,
            email_subject: email.subject,
            email_message_id: payload.data.message_id || null,
            pdf_storage_path: storagePath,
            pdf_filename: attachment.filename,
            status: "pending",
            extraction_status: "pending",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Failed to create pending PO record:", insertError);
          continue;
        }

        console.log("Created pending PO record:", pendingPO.id);

        // Trigger extraction asynchronously
        try {
          const extractResponse = await fetch(
            `${supabaseUrl}/functions/v1/extract-po-pdf`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                pdfBase64: resolvedBase64,
                mimeType: "application/pdf",
              }),
            }
          );

          const extractResult = await extractResponse.json();

          if (extractResult.success) {
            // Update the pending PO with extracted data
            await supabase
              .from("pending_purchase_orders")
              .update({
                raw_extracted_data: extractResult.data,
                extraction_status: "completed",
              })
              .eq("id", pendingPO.id);

            console.log("Extraction completed for PO:", pendingPO.id);

            // Try to match customer
            if (extractResult.data.customer_name) {
              const { data: matchedCustomers } = await supabase
                .from("customers")
                .select("id, name")
                .ilike("name", `%${extractResult.data.customer_name}%`)
                .limit(1);

              if (matchedCustomers && matchedCustomers.length > 0) {
                await supabase
                  .from("pending_purchase_orders")
                  .update({
                    matched_customer_id: matchedCustomers[0].id,
                    customer_confidence: 0.8,
                  })
                  .eq("id", pendingPO.id);

                console.log("Matched customer:", matchedCustomers[0].name);
              }
            }
          } else {
            await supabase
              .from("pending_purchase_orders")
              .update({
                extraction_status: "failed",
                extraction_error: extractResult.error,
              })
              .eq("id", pendingPO.id);

            console.error("Extraction failed:", extractResult.error);
          }
        } catch (extractError) {
          console.error("Error calling extraction function:", extractError);
          const errorMessage = extractError instanceof Error ? extractError.message : "Unknown error";
          await supabase
            .from("pending_purchase_orders")
            .update({
              extraction_status: "failed",
              extraction_error: errorMessage,
            })
            .eq("id", pendingPO.id);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Processed ${pdfAttachments.length} PDF attachment(s)` 
        }),
        { headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Handle other webhook types or unknown payloads
    console.log("Unhandled webhook type:", payload.type);
    return new Response(
      JSON.stringify({ success: true, message: "Webhook received" }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in inbound-po-webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
