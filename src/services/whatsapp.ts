
'use server';

import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER; // Should be like 'whatsapp:+14155238886' for sandbox

// This will be undefined if credentials are not in .env, disabling the client
const client = accountSid && authToken ? twilio(accountSid, authToken) : undefined;

export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  if (!client || !fromNumber) {
    console.warn('Twilio credentials are not fully configured in .env file. SMS notifications are disabled.');
    // Return success to avoid breaking notification flows. The feature is just off.
    return { success: true };
  }

  // Ensure 'to' number is in E.164 format and has the whatsapp: prefix
  if (!to.startsWith('whatsapp:')) {
      if (!to.startsWith('+')) {
          to = `+${to}`;
      }
      to = `whatsapp:${to}`;
  }

  try {
    await client.messages.create({
      from: fromNumber,
      to: to,
      body: body,
    });
    console.log(`WhatsApp message sent to ${to}`);
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to send WhatsApp message to ${to}: ${error.message}`);
    // Return success to not break user-facing flows, but log the error.
    return { success: true, error: error.message };
  }
}
