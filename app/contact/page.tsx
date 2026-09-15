export default function Contact() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="text-4xl font-semibold tracking-tight">Contact & grievances</h1>
      <div className="mt-8 rounded-2xl border border-line bg-card p-7">
        <h2 className="font-semibold">Grievance officer</h2>
        <p className="num mt-2 text-[14px] text-muted">
          grievance@pathproof.in · responses within 72 hours
        </p>
        <h2 className="mt-6 font-semibold">Data deletion requests</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Email from the address you used, asking for deletion. We remove your profile, uploaded
          documents, and audit records, and confirm in writing.
        </p>
        <h2 className="mt-6 font-semibold">Corrections</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Spotted a value that does not match an official record? Write to us with the document and
          we will re-verify against the source and correct it.
        </p>
      </div>
    </div>
  );
}
