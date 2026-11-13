import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";
import { emailFrom } from "@/lib/env";

export type OutboundMessage = {
  to: string;
  subject: string;
  body: string;
};

/**
 * Email is the only channel that sends today.
 * WhatsApp and SMS can be added by implementing MessageChannel and
 * registering the channel in getChannels() when its credentials exist.
 * Call sites use notify() and do not need to change.
 *
 * Example:
 *   class WhatsAppChannel implements MessageChannel {
 *     readonly id = "whatsapp" as const;
 *     async send(message: OutboundMessage) {
 *       // Call the provider with message.to and message.body.
 *     }
 *   }
 */
export interface MessageChannel {
  readonly id: "email" | "whatsapp" | "sms";
  send(message: OutboundMessage): Promise<void>;
}

class EmailChannel implements MessageChannel {
  readonly id = "email" as const;

  async send(message: OutboundMessage): Promise<void> {
    let error: string | undefined;
    if (process.env.SMTP_HOST) {
      try {
        const port = Number(process.env.SMTP_PORT || 587);
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: process.env.SMTP_SECURE === "true" || port === 465,
          auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            : undefined,
        });
        await transporter.sendMail({
          from: emailFrom(),
          to: message.to,
          subject: message.subject,
          text: message.body,
        });
      } catch (caught) {
        error = caught instanceof Error ? caught.message : "Email could not be sent.";
        console.error("SMTP send failed", error);
      }
    } else {
      console.info(`[email] To: ${message.to} | ${message.subject}`);
    }

    await prisma.emailMessage.create({
      data: {
        toAddress: message.to,
        subject: message.subject,
        body: message.body,
        channel: this.id,
        error,
      },
    });
  }
}

export function getChannels(): MessageChannel[] {
  const channels: MessageChannel[] = [new EmailChannel()];
  return channels;
}

export async function notify(message: OutboundMessage): Promise<void> {
  for (const channel of getChannels()) {
    await channel.send(message);
  }
}

export async function notifyAdmins(subject: string, body: string): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", disabled: false },
    select: { email: true },
  });
  const recipients = new Set(admins.map((admin) => admin.email.toLowerCase()));
  const extra = process.env.NOTIFY_EMAIL?.trim().toLowerCase();
  if (extra) recipients.add(extra);
  for (const to of recipients) {
    await notify({ to, subject, body });
  }
}
