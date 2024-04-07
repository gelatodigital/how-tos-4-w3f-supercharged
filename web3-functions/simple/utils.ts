import ky from "ky"; // we recommend using ky as axios doesn't support fetch by default

export interface SendmailOptions {
  apikey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}

// Function to send email alerts using SendGrid
export async function sendmail(options: SendmailOptions) {
  try {
    await ky.post("https://api.sendgrid.com/v3/mail/send", {
      headers: {
        Authorization: `Bearer ${options.apikey}`,
        "Content-Type": "application/json",
      },
      json: {
        personalizations: [{ to: [{ email: options.to }] }],
        from: { email: options.from },
        subject: options.subject,
        content: [{ type: "text/plain", value: options.text }],
      },
    });
    console.log("Email sent successfully.");
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

