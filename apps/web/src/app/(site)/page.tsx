import type { Metadata } from "next";
import { Ban, Bell, ChevronRight, Filter, Inbox, Link2, MessageCircleQuestion, ShieldCheck, Send, Share2 } from "lucide-react";
import { BrandImage, ButtonLink, Sparkles } from "@/components/ui";
import { getT } from "@/i18n/server";
import { gradTag, rich } from "@/lib/rich";
import { InboxPreview } from "@/components/landing/InboxPreview";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { absolute: t("site.meta.landingTitle") } };
}

const steps = [
  { icon: Link2, title: "site.landing.step1Title", body: "site.landing.step1Body" },
  { icon: Send, title: "site.landing.step2Title", body: "site.landing.step2Body" },
  { icon: Share2, title: "site.landing.step3Title", body: "site.landing.step3Body" }
] as const;

const features = [
  { icon: MessageCircleQuestion, title: "site.landing.f1Title", body: "site.landing.f1Body" },
  { icon: Link2, title: "site.landing.f2Title", body: "site.landing.f2Body" },
  { icon: Inbox, title: "site.landing.f3Title", body: "site.landing.f3Body" },
  { icon: Filter, title: "site.landing.f4Title", body: "site.landing.f4Body" },
  { icon: Ban, title: "site.landing.f5Title", body: "site.landing.f5Body" },
  { icon: Bell, title: "site.landing.f6Title", body: "site.landing.f6Body" }
] as const;

export default async function Landing() {
  const { t } = await getT();
  return (
    <>
      <section className="grain relative isolate">
        <Sparkles />
        <div className="blob animate-drift -top-24 left-1/2 -z-10 size-[26rem] -translate-x-1/2" style={{ background: "linear-gradient(135deg,var(--grad-1),var(--grad-2))" }} />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pb-16 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pt-20">
          <div className="stagger">
            <div className="relative mb-1 inline-block isolate"><span className="hero-halo" aria-hidden /><BrandImage width={236} height={160} priority className="animate-float h-auto w-48 select-none drop-shadow-[0_18px_40px_color-mix(in_srgb,var(--grad-2)_40%,transparent)] sm:w-60" /></div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/60 px-3.5 py-1.5 text-xs font-semibold text-muted backdrop-blur">
              <ShieldCheck className="size-3.5 text-success" aria-hidden /> {t("site.landing.badge")}
            </p>
            <p className="mt-4 font-display text-sm font-bold tracking-wide text-muted">
              <bdi dir="ltr">EAR<span className="grad-text" aria-hidden="true">*</span> &middot; {t("common.brand.full")}</bdi>
              <span className="sr-only"> ({t("common.brand.dedicationSr")})</span>
            </p>
            <h1 className="mt-5 text-[2.6rem] font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
              {rich(t("site.landing.title"), gradTag)}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
              {t("site.landing.lead")}
            </p>
            <div className="mt-8 flex flex-col gap-3 xs:flex-row">
              <ButtonLink href="/install" size="lg">{t("common.nav.getTheApp")} <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden /></ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">{t("site.landing.free")}</p>
          </div>
          <InboxPreview />
        </div>
      </section>

      <section aria-labelledby="how" className="reveal mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <h2 id="how" className="text-3xl font-extrabold sm:text-4xl">{t("site.landing.howTitle")}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="veil veil-glow p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full bg-raised text-primary shadow-[0_0_0_1px_var(--border),0_6px_18px_-6px_var(--grad-2)]"><s.icon className="size-5" aria-hidden /></span>
                <span className="font-display text-5xl font-extrabold text-line" aria-hidden>{i + 1}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold">{t(s.title)}</h3>
              <p className="mt-1.5 text-muted">{t(s.body)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="features" className="reveal mx-auto max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <h2 id="features" className="text-3xl font-extrabold sm:text-4xl">{t("site.landing.featuresTitle")}</h2>
        <p className="mt-2 max-w-2xl text-muted">{t("site.landing.featuresLead")}</p>
        <ul className="mt-8 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <li key={f.title} className="veil veil-glow flex gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary/15 text-secondary"><f.icon className="size-5" aria-hidden /></span>
              <div>
                <h3 className="text-lg font-bold">{t(f.title)}</h3>
                <p className="text-muted">{t(f.body)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="reveal mx-auto mt-20 max-w-6xl px-4 sm:mt-28 sm:px-6">
        <div className="glow-border grain relative overflow-hidden rounded-xl p-8 text-center sm:p-14">
          <div className="blob -left-10 -top-10 size-60" style={{ background: "#ff7440" }} />
          <div className="blob -bottom-16 -right-10 size-64" style={{ background: "var(--grad-3)" }} />
          <Sparkles className="!z-0" />
          <h2 className="relative text-3xl font-extrabold sm:text-5xl">{t("site.landing.ctaTitle")}</h2>
          <p className="relative mx-auto mt-3 max-w-lg text-muted">{t("site.landing.ctaBody")}</p>
          <ButtonLink href="/install" size="lg" className="relative mt-7">{t("common.nav.getTheApp")}</ButtonLink>
        </div>
      </section>
    </>
  );
}
