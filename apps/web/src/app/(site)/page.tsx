import type { Metadata } from "next";
import { Ban, Bell, ChevronRight, Filter, Inbox, Link2, MessageCircleQuestion, ShieldCheck, Send, Share2 } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { InboxPreview } from "@/components/landing/InboxPreview";

export const metadata: Metadata = { title: { absolute: "EAR — let people say what they really think" } };

const steps = [
  { icon: Link2, title: "Get your link", body: "Pick a username and your personal link is live in seconds. Drop it in your bio, stories or group chats." },
  { icon: Send, title: "Receive anonymous messages", body: "Anyone with the link can write to you without an account. You never see who, and we never claim to." },
  { icon: Share2, title: "Reply & share", body: "Answer privately or turn a message into a beautiful share card. You decide what goes public." }
];

const features = [
  { icon: MessageCircleQuestion, title: "Anonymous Q&A", body: "Set your own prompt and let curiosity do the rest." },
  { icon: Link2, title: "Personal link", body: "One memorable link, plus extra links to see which channel works." },
  { icon: Inbox, title: "Inbox", body: "Inbox, Filtered and Archived keep things calm and organised." },
  { icon: Filter, title: "Moderation", body: "Layered filters hold harassment before it reaches you, with hidden words you control." },
  { icon: Ban, title: "Block & report", body: "Block an anonymous source or report a message in two taps." },
  { icon: Bell, title: "Notifications", body: "In-app, push and email, each one yours to switch on or off." }
];

export default function Landing() {
  return (
    <>
      <section className="grain relative isolate">
        <div className="blob animate-drift -top-24 left-1/2 -z-10 size-[26rem] -translate-x-1/2" style={{ background: "linear-gradient(135deg,#ff7440,#b24cff)" }} />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-20">
          <div className="stagger">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs font-semibold text-muted backdrop-blur">
              <ShieldCheck className="size-3.5 text-success" aria-hidden /> Kind by design. Safe by default.
            </p>
            <p className="mt-4 font-display text-sm font-bold tracking-wide text-muted">
              EAR<span className="grad-text" aria-hidden="true">*</span> &middot; Eliya&apos;s Anonymous Replies
              <span className="sr-only"> (dedicated to Liron)</span>
            </p>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              Let people say what they <span className="grad-text">really think</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
              Share one personal link. Receive honest, anonymous messages. Reply on your terms, with filters and controls that put you in charge.
            </p>
            <div className="mt-8 flex flex-col gap-3 xs:flex-row">
              <ButtonLink href="/signup" size="lg">Create your profile <ChevronRight className="size-4" aria-hidden /></ButtonLink>
              <ButtonLink href="/login" size="lg" variant="outline">I already have a link</ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">Free to start. No account needed to send a message.</p>
          </div>
          <InboxPreview />
        </div>
      </section>

      <section aria-labelledby="how" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <h2 id="how" className="text-3xl font-extrabold sm:text-4xl">How it works</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="veil p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-raised text-primary"><s.icon className="size-5" aria-hidden /></span>
                <span className="font-display text-5xl font-extrabold text-line" aria-hidden>{i + 1}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold">{s.title}</h3>
              <p className="mt-1.5 text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features" className="mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <h2 id="features" className="text-3xl font-extrabold sm:text-4xl">Everything you need, nothing you don&apos;t</h2>
        <p className="mt-2 max-w-2xl text-muted">Built around one idea: honesty works best when people feel safe on both sides of the message.</p>
        <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary/15 text-secondary"><f.icon className="size-5" aria-hidden /></span>
              <div>
                <h3 className="text-lg font-bold">{f.title}</h3>
                <p className="text-muted">{f.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
        <div className="grain relative overflow-hidden rounded-xl border border-line bg-surface p-8 text-center sm:p-14">
          <div className="blob -left-10 -top-10 size-60" style={{ background: "#ff7440" }} />
          <div className="blob -bottom-16 -right-10 size-64" style={{ background: "#6d62f2" }} />
          <h2 className="relative text-3xl font-extrabold sm:text-5xl">What&apos;s on your mind&rsquo;s other side?</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-muted">Create your link in under a minute. Pause it, filter it or delete it any time.</p>
          <ButtonLink href="/signup" size="lg" className="relative mt-7">Get your link</ButtonLink>
        </div>
      </section>
    </>
  );
}
