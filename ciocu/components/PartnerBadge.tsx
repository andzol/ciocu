// Partner / directory badges, bottom-left. Deliberately self-contained and trivial to pull: delete
// this file, its <PartnerBadge /> line in app/page.tsx, and the .partner-badge rules in globals.css.
//
// Nothing else in the app should reach into it, and it should never grow logic — it's a placement,
// not a feature.

export default function PartnerBadge() {
  return (
    <div className="partner-badge" aria-label="Featured on">
      <a
        href="https://daniellaunches.com"
        target="_blank"
        // target="_blank" hands the opened page a window.opener handle back to us, which lets it
        // redirect this tab (reverse tabnabbing). noreferrer also keeps our URL out of their logs.
        rel="noopener noreferrer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- third-party badge, served by them */}
        <img
          src="https://daniellaunches.com/badge-dark.svg"
          alt="Featured on DanielLaunches"
          width={220}
          height={48}
        />
      </a>
    </div>
  );
}
