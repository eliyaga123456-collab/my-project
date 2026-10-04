import { ButtonLink } from "@/components/ui";
import { SiteHeader } from "@/components/site/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto grid min-h-[60dvh] max-w-md place-items-center px-4 text-center">
        <div className="animate-ink-in">
          <p className="grad-text font-display text-7xl font-extrabold">404</p>
          <h1 className="mt-2 text-2xl font-bold">Nothing here. Yet.</h1>
          <p className="mt-2 text-muted">That page doesn&apos;t exist, or the link has changed.</p>
          <ButtonLink href="/" className="mt-6">Back home</ButtonLink>
        </div>
      </main>
    </>
  );
}
