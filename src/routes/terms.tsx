import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms and privacy — EstateOps" },
      { name: "description", content: "How EstateOps works and how your data is used." },
    ],
  }),
  component: TermsPage,
});

// Draft wording: it needs the business's review before the signup page goes live.
const SECTIONS = [
  {
    title: "Your account",
    body: "You are responsible for your account and for the people you add to it. Keep your password private.",
  },
  {
    title: "Your data",
    body: "The buildings, tenants and payments you enter belong to you. We use them only to run the service, and you can download a copy from the Export data page.",
  },
  {
    title: "Tenant information",
    body: "You must have the right to store the tenant details you enter, including ID numbers and phone numbers.",
  },
  {
    title: "Subscriptions",
    body: "A paid plan renews only when an invoice is paid. Support staff may view your account, without changing it, to help with a problem, and each visit is recorded.",
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-3xl font-semibold">Terms and privacy</h1>
        <div className="mt-8 space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </section>
          ))}
        </div>
        <Link to="/admin/signup" className="mt-8 inline-block text-sm underline">
          Back to sign up
        </Link>
      </div>
    </div>
  );
}
