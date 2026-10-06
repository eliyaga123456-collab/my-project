import nodemailer from "nodemailer";
import type { Config } from "../config";
import type { Db } from "../db/client";
import { emailOutbox } from "../db/schema";

export interface EmailMessage { to: string; subject: string; text: string }
export interface EmailTransport { send(m: EmailMessage): Promise<void> }

/** Persists emails to `email_outbox` (dev/test; also lets the E2E suite read verification links). */
class OutboxTransport implements EmailTransport {
  constructor(private db: Db) {}
  async send(m: EmailMessage) { await this.db.insert(emailOutbox).values({ toEmail: m.to, subject: m.subject, bodyText: m.text }); }
}
class LogTransport implements EmailTransport {
  async send(m: EmailMessage) { console.log(`[email] to=${m.to} subject=${m.subject}`); }
}
class SmtpTransport implements EmailTransport {
  private t;
  constructor(url: string, private from: string) { this.t = nodemailer.createTransport(url); }
  async send(m: EmailMessage) { await this.t.sendMail({ from: this.from, to: m.to, subject: m.subject, text: m.text }); }
}

/** Sends through an HTTPS email API; throws on any non-2xx so callers/logs see delivery failures. */
class HttpApiTransport implements EmailTransport {
  constructor(private kind: "brevo" | "resend", private key: string, private from: string) {}
  private parsedFrom() {
    const m = /^(.*?)\s*<(.+)>$/.exec(this.from);
    return { name: (m?.[1] ?? "").replace(/^"|"$/g, "") || "EAR", email: m?.[2] ?? this.from };
  }
  async send(m: EmailMessage) {
    const f = this.parsedFrom();
    const res = this.kind === "brevo"
      ? await fetch("https://api.brevo.com/v3/smtp/email", { method: "POST", headers: { "api-key": this.key, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ sender: f, to: [{ email: m.to }], subject: m.subject, textContent: m.text }) })
      : await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: JSON.stringify({ from: this.from, to: [m.to], subject: m.subject, text: m.text }) });
    if (!res.ok) throw new Error(`email ${this.kind} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
}

export function createEmailTransport(config: Config, db: Db): EmailTransport {
  if (config.EMAIL_TRANSPORT === "smtp") {
    if (!config.SMTP_URL) throw new Error("SMTP_URL is required when EMAIL_TRANSPORT=smtp");
    return new SmtpTransport(config.SMTP_URL, config.EMAIL_FROM);
  }
  if (config.EMAIL_TRANSPORT === "brevo" || config.EMAIL_TRANSPORT === "resend") {
    if (!config.EMAIL_API_KEY) throw new Error("EMAIL_API_KEY is required when EMAIL_TRANSPORT=brevo|resend");
    return new HttpApiTransport(config.EMAIL_TRANSPORT, config.EMAIL_API_KEY, config.EMAIL_FROM);
  }
  return config.EMAIL_TRANSPORT === "log" ? new LogTransport() : new OutboxTransport(db);
}

import type { Lang } from "../i18n";
import { HE_EMAILS } from "../i18n/he";

const EN_EMAILS = {
  verify: (url: string) => ({ subject: "Confirm your EAR email", text: `Welcome to EAR!\n\nConfirm your email to unlock publishing answers:\n${url}\n\nThis link expires in 24 hours. If you didn't sign up, you can ignore this email.` }),
  reset: (url: string) => ({ subject: "Reset your EAR password", text: `Someone (hopefully you) asked to reset your password:\n${url}\n\nThis link expires in 1 hour and works once. If it wasn't you, ignore this email — your password is unchanged.` }),
  passwordChanged: () => ({ subject: "Your EAR password was changed", text: "Your password was just changed and other devices were signed out. If this wasn't you, reset your password immediately." }),
  accountDeleted: () => ({ subject: "Your EAR account was deleted", text: "Your EAR account and all of its data were permanently deleted. If you didn't do this, contact support right away." })
};

/** Localised transactional emails. */
export const emails = {
  verify: (url: string, lang: Lang = "en") => (lang === "he" ? HE_EMAILS : EN_EMAILS).verify(url),
  reset: (url: string, lang: Lang = "en") => (lang === "he" ? HE_EMAILS : EN_EMAILS).reset(url),
  passwordChanged: (lang: Lang = "en") => (lang === "he" ? HE_EMAILS : EN_EMAILS).passwordChanged(),
  accountDeleted: (lang: Lang = "en") => (lang === "he" ? HE_EMAILS : EN_EMAILS).accountDeleted()
};
