// src/services/emailService.js
import AWS from "aws-sdk";

// SES is already configured via AWS.config.update(...) in your main file
const ses = new AWS.SES({ apiVersion: "2010-12-01" });

/**
 * Send a simple transactional email via SES.
 * @param {string} to      – recipient email address
 * @param {string} subject – email subject
 * @param {string} body    – plain-text body (can be HTML if wrapped properly)
 */
export async function sendEmail({ to, subject, body }) {
  const params = {
    Source: `noreply@${process.env.MAIL_FROM_DOMAIN}`, // e.g. 'noreply@beautifyinterior.com'
    Destination: {
      ToAddresses: [to],
    },
    Message: {
      Subject: { Data: subject },
      Body: {
        Text: { Data: body },
        /* If you want HTML:
        Html: { Data: '<h1>…</h1>' }
        */
      },
    },
  };

  try {
    const result = await ses.sendEmail(params).promise();
    return result; // you can inspect MessageId, etc.
  } catch (err) {
    console.error("SES sendEmail error", err);
    throw err;
  }
}
