import { OFFICIAL_DMRC_URL, SITE_DISCLAIMER } from "@/lib/constants";

export function DisclaimerCard() {
  return (
    <section className="rounded-lg border border-amber-300 bg-amber-50 p-5 text-amber-950">
      <h2 className="text-base font-black">Read before continuing</h2>
      <p className="mt-2 leading-7">{SITE_DISCLAIMER}</p>
      <a
        href={OFFICIAL_DMRC_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex rounded-md border border-amber-400 bg-white px-4 py-2 text-sm font-bold text-amber-950 transition hover:bg-amber-100"
      >
        Visit official DMRC website
      </a>
    </section>
  );
}
