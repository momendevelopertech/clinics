// Multi-channel communications library
// Dependencies: npm install twilio nodemailer
import nodemailer from "nodemailer";
import twilio, { Twilio } from "twilio";
import { logServerError } from "@/lib/safe-logger";

export const approvedCampaignTemplates = {
  welcome: {
    key: "welcome",
    channel: "whatsapp",
    name: "Welcome message",
    body: "Hello {patientName}, welcome to {clinicName}. We are happy to support your care journey. Reply STOP to opt out.",
  },
  post_visit: {
    key: "post_visit",
    channel: "whatsapp",
    name: "Post-visit follow-up",
    body: "Hello {patientName}, thank you for visiting {clinicName}. We hope your visit went well. Please reply if you need follow-up care or any assistance.",
  },
  chronic_care: {
    key: "chronic_care",
    channel: "whatsapp",
    name: "Chronic care check-in",
    body: "Hello {patientName}, this is a reminder from {clinicName} to check in on your care plan and confirm your next follow-up appointment.",
  },
} as const;

export function resolveApprovedCampaignTemplate(triggerType?: string | null, fallbackName?: string) {
  const key = triggerType && triggerType in approvedCampaignTemplates ? triggerType : "welcome";
  const template = approvedCampaignTemplates[key as keyof typeof approvedCampaignTemplates];

  return {
    ...template,
    name: fallbackName && !fallbackName.trim() ? template.name : (fallbackName || template.name),
  };
}

export function renderApprovedCampaignTemplate(
  triggerType: string | null | undefined,
  patientName: string,
  clinicName: string,
  fallbackName?: string,
) {
  const template = resolveApprovedCampaignTemplate(triggerType, fallbackName);
  return template.body
    .replace(/\{patientName\}/g, patientName)
    .replace(/\{clinicName\}/g, clinicName)
    .replace(/\{campaignName\}/g, template.name);
}

// Twilio Configuration - lazy initialization to avoid build errors
let twilioClient: Twilio | null = null;

function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID) {
    try {
      twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
      );
    } catch (error) {
      logServerError("Failed to initialize Twilio", error);
      return null;
    }
  }
  return twilioClient;
}

// SendGrid/Email Configuration
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER || "test@gmail.com",
    pass: process.env.EMAIL_PASSWORD || "test",
  },
});

export async function sendSMS(phoneNumber: string, message: string) {
  try {
    const client = getTwilioClient();
    if (!client) {
      return {
        success: false,
        messageId: null,
        error: "Twilio not configured",
      };
    }
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });
    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    };
  } catch (error) {
    logServerError("SMS send failed", error);
    throw error;
  }
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
) {
  try {
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });
    return {
      success: true,
      messageId: result.messageId,
      status: "sent",
    };
  } catch (error) {
    logServerError("Email send failed", error);
    throw error;
  }
}

export async function sendWhatsApp(
  phoneNumber: string,
  message: string,
  mediaUrl?: string,
) {
  try {
    const client = getTwilioClient();
    if (!client) {
      return {
        success: false,
        messageId: null,
        status: "failed",
        error: "Twilio not configured",
      };
    }
    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phoneNumber}`,
      ...(mediaUrl && { mediaUrl: [mediaUrl] }),
    });
    return {
      success: true,
      messageId: result.sid,
      status: result.status,
    };
  } catch (error) {
    logServerError("WhatsApp send failed", error);
    throw error;
  }
}

// Template rendering
export function renderAppointmentReminder(
  patientName: string,
  appointmentTime: Date,
  providerName: string,
  joinUrl?: string | null,
) {
  const time = appointmentTime.toLocaleString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return {
    sms: `Hi ${patientName}, reminder: you have an appointment with ${providerName} on ${time}. Reply CONFIRM to confirm or CANCEL to cancel.${joinUrl ? ` Join online: ${joinUrl}` : ""}`,
    whatsapp: `Hi ${patientName}, reminder: you have an appointment with ${providerName} on ${time}. Reply CONFIRM to confirm or CANCEL to cancel.${joinUrl ? ` Join online: ${joinUrl}` : ""}`,
    email: `
      <h2>Appointment Reminder</h2>
      <p>Hi ${patientName},</p>
      <p>This is a reminder about your upcoming appointment:</p>
      <ul>
        <li><strong>Provider:</strong> ${providerName}</li>
        <li><strong>Date & Time:</strong> ${time}</li>
        ${joinUrl ? `<li><strong>Join online:</strong> <a href="${joinUrl}">${joinUrl}</a></li>` : ""}
      </ul>
      <p>Please reply if you need to reschedule.</p>
    `,
  };
}

export function renderCampaignMessage(
  patientName: string,
  campaignName: string,
  content: string,
) {
  return {
    sms: `Hi ${patientName}, ${content}`,
    email: `
      <h2>${campaignName}</h2>
      <p>Hi ${patientName},</p>
      <p>${content}</p>
    `,
  };
}
