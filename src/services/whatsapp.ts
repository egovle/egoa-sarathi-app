
'use server';

// import twilio from 'twilio';

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

// const client = twilio(accountSid, authToken);

export async function sendWhatsAppMessage(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  // if (!accountSid || !authToken || !fromNumber) {
  //   console.error('Twilio credentials are not configured in .env file.');
  //   return { success: false, error: 'Twilio service is not configured.' };
  // }

  // if (!to.startsWith('whatsapp:')) {
  //     to = `whatsapp:${to}`;
  // }

  // try {
  //   await client.messages.create({
  //     from: fromNumber,
  //     to: to,
  //     body: body,
  //   });
  //   console.log(`WhatsApp message sent to ${to}`);
  //   return { success: true };
  // } catch (error: any) {
  //   console.error(`Failed to send WhatsApp message: ${error.message}`);
  //   return { success: false, error: error.message };
  // }
  console.log('WhatsApp functionality is temporarily disabled.');
  return { success: true };
}
