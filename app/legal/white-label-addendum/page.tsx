const PLATFORM_COMPANY_LEGAL_NAME = "[Launchbox, Inc.]";
const PLATFORM_CONTACT_EMAIL = "[legal@yourdomain.com]";
const EFFECTIVE_DATE = "[Effective Date]";

export const metadata = {
  title: "White-Label Operator Addendum",
  description: "Operator addendum and end-user disclosures for white-label deployments.",
};

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-extrabold tracking-tight text-neutral-100">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-neutral-300">
        {children}
      </div>
    </section>
  );
};

const Callout = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <p className="text-sm font-extrabold text-neutral-100">{title}</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-300">
        {children}
      </div>
    </div>
  );
};

export default function WhiteLabelAddendumPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">
          White‑Label Operator Addendum
        </h1>
        <p className="text-sm text-neutral-300">
          Effective: <span className="font-semibold text-neutral-200">{EFFECTIVE_DATE}</span>
        </p>
        <p className="text-sm leading-relaxed text-neutral-300">
          This addendum is intended for Operators who run a white‑label experience on the Launchbox platform and for
          end‑user disclosures that must be shown within Operator environments. It is a template aligned to the current
          product behavior and intended Stripe Connect Express model; it is not legal advice.
        </p>
      </header>

      <Callout title="Quick summary (how this is written)">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Operators set pricing and sell access to their end users. Billing is expected to be processed via{" "}
            <span className="font-semibold text-neutral-200">Stripe Connect Express</span>.
          </li>
          <li>
            The preferred white‑label posture is{" "}
            <span className="font-semibold text-neutral-200">operator‑branded receipts/statement descriptors</span>.
          </li>
          <li>
            This template is drafted primarily for{" "}
            <span className="font-semibold text-neutral-200">Operator as Merchant of Record</span> (typical for Direct
            Charges), and includes a short contingency clause if configuration changes.
          </li>
        </ul>
      </Callout>

      <Section title="1. Definitions">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="font-semibold text-neutral-200">“Platform”</span> means the Launchbox service operated by{" "}
            {PLATFORM_COMPANY_LEGAL_NAME}.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">“Operator”</span> means the business/customer who configures
            and brands a white‑label experience.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">“End User”</span> means a user who accesses the Service via
            an Operator environment.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">“Operator Environment”</span> means the Operator-branded
            workspace, including its content, community, events, courses, and AI features enabled by the Operator.
          </li>
        </ul>
      </Section>

      <Section title="2. Roles and responsibilities">
        <p className="font-semibold text-neutral-200">A. Operator responsibilities</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            Provide End Users with clear terms and a privacy policy that apply to the Operator Environment (including
            pricing, refunds, and community rules).
          </li>
          <li>
            Ensure the Operator Environment’s content, prompts, and workflows comply with applicable law and do not
            violate third‑party rights.
          </li>
          <li>
            Provide first‑line support to End Users for Operator-managed offerings (pricing, access, and Operator content).
          </li>
          <li>
            Prohibit End Users from submitting sensitive personal information unless the Operator has a compliant legal
            basis and appropriate safeguards.
          </li>
        </ul>

        <p className="pt-2 font-semibold text-neutral-200">B. Platform responsibilities</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Provide and maintain the Platform software and its core infrastructure.</li>
          <li>
            Process End User inputs through AI providers as needed to deliver AI features (chat, summaries, task
            extraction), and store sessions and uploaded files in the Platform’s cloud storage providers.
          </li>
          <li>Respond to Platform-level issues (outages, bugs) and operator support requests.</li>
        </ul>
      </Section>

      <Section title="3. Billing model (Stripe Connect Express)">
        <p className="font-semibold text-neutral-200">A. Operator as Merchant of Record (primary model)</p>
        <p>
          Where configured as Direct Charges (typical for Connect Express), End Users purchase from the Operator, and the
          Operator is the merchant of record. The Operator is responsible for taxes, refunds/chargebacks, and consumer
          disclosures required for the Operator’s jurisdiction.
        </p>
        <p className="font-semibold text-neutral-200">B. Contingency: Platform as Merchant of Record</p>
        <p>
          If the Platform is configured to charge End Users on the Platform account (e.g., Destination Charges or another
          model) and transfer funds to Operators, the Platform may be the merchant of record and may require different
          disclosures, refund handling, tax configuration, and support flows. Operators agree to cooperate with
          reasonable changes required by the billing configuration.
        </p>
      </Section>

      <Section title="4. Data handling (controller/processor summary)">
        <p>
          The Platform stores sessions/messages, documents, tasks, summaries, team configuration, and uploaded attachments
          (and associated metadata). AI requests may transmit End User prompts and relevant context to AI providers.
        </p>
        <p>
          <span className="font-semibold text-neutral-200">Typical allocation:</span> the Operator is the “controller”
          for End User accounts/content within the Operator Environment; the Platform is a “processor/service provider”
          that processes data on the Operator’s behalf to provide the Platform. This can vary by configuration.
        </p>
      </Section>

      <Section title="5. Prohibited content and compliance">
        <p>Operators must not enable or encourage use of the Platform for:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Illegal activities, fraud, or deceptive practices.</li>
          <li>Malware, phishing, credential harvesting, or security exploitation.</li>
          <li>Infringing content or unauthorized scraping of personal data.</li>
          <li>
            Processing of sensitive categories (health data, biometrics, children’s data, government IDs) without an
            explicit compliant program and prior written approval from the Platform.
          </li>
        </ul>
      </Section>

      <Section title="6. End‑user disclosure blocks (copy/paste)">
        <Callout title="A. “Who you’re buying from” disclosure (billing)">
          <p>
            You are purchasing access from <span className="font-semibold text-neutral-200">[Operator Legal Name]</span>.
            Your receipt/statement descriptor will show the Operator’s brand. Payments are processed by Stripe.
          </p>
        </Callout>

        <Callout title="B. “Platform provider” disclosure">
          <p>
            The Operator Environment is powered by Launchbox, a software platform operated by{" "}
            <span className="font-semibold text-neutral-200">{PLATFORM_COMPANY_LEGAL_NAME}</span>. Launchbox provides the
            underlying software and infrastructure; the Operator provides the branded experience, pricing, and
            community/content.
          </p>
        </Callout>

        <Callout title="C. AI processing disclosure (important)">
          <p>
            This service includes AI features. When you submit prompts or upload files, your input (and relevant context
            such as session history and attachment URLs, and in some cases extracted file text) may be sent to third‑party
            AI providers to generate outputs, summaries, or detected tasks.
          </p>
          <p>
            Do not submit sensitive personal information (e.g., health data, government IDs, passwords, payment card
            numbers) unless explicitly instructed by the Operator for a compliant workflow.
          </p>
        </Callout>
      </Section>

      <Section title="7. Contact">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm leading-relaxed text-neutral-300">
          <p>
            Platform questions:{" "}
            <span className="font-semibold text-neutral-200">{PLATFORM_CONTACT_EMAIL}</span>
          </p>
          <p>Operator billing/support questions: [Operator Support Email]</p>
        </div>
      </Section>
    </article>
  );
}

