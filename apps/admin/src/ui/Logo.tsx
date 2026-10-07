/** The EAR admin logo. Both artworks are rendered; CSS shows the one that matches the active theme. */
export function Logo({ className = "", alt = "EAR admin" }: { className?: string; alt?: string }) {
  const base = import.meta.env.BASE_URL;
  return (
    <span className={`logo ${className}`}>
      <img className="logo-dark" src={`${base}brand/ear-admin.webp`} alt={alt} decoding="async" />
      <img className="logo-light" src={`${base}brand/ear-admin-light.webp`} alt="" aria-hidden decoding="async" />
    </span>
  );
}
