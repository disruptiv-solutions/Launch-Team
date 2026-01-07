const COMPANY_LEGAL_NAME = "[Launchbox, Inc.]";
const COMPANY_CONTACT_EMAIL = "[legal@yourdomain.com]";
const COMPANY_ADDRESS = "[Company Address]";
const EFFECTIVE_DATE = "[Effective Date]";

export const metadata = {
  title: "Privacy Policy",
  description: "Launchbox privacy policy.",
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

export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-neutral-300">
          Effective: <span className="font-semibold text-neutral-200">{EFFECTIVE_DATE}</span>
        </p>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm leading-relaxed text-neutral-300">
          <p className="font-semibold text-neutral-200">{COMPANY_LEGAL_NAME} (“Launchbox,” “we,” “us,” or “our”)</p>
          <p>
            This Privacy Policy explains how we collect, use, disclose, and protect information when you use the
            Launchbox platform and related services (the “Service”). This is a general SaaS privacy policy drafted to
            match the current product behavior and intended white‑label model; it is not legal advice.
          </p>
        </div>
      </header>

      <Section title="1. How to read this (white‑label model)">
        <p>
          Launchbox supports white‑label “Operators” who run their own branded experience on the Service. Depending on
          configuration, an Operator may control the relationship with end users (including pricing and billing) and may
          be responsible for additional privacy disclosures.
        </p>
        <p>
          Unless we say otherwise, this Privacy Policy describes Launchbox’s practices when Launchbox acts as a service
          provider/processor to Operators and when Launchbox provides the platform directly.
        </p>
      </Section>

      <Section title="2. Information we collect">
        <p className="font-semibold text-neutral-200">A. Information you provide</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="font-semibold text-neutral-200">User Content:</span> messages, prompts, files you upload,
            and any other content you submit to the Service. In the current app, message content may be stored as part
            of session history.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Documents:</span> content you save as a “Document” from a
            conversation.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Operator/Admin inputs:</span> agent/system prompts, team
            configuration, and other admin settings where enabled.
          </li>
        </ul>

        <p className="pt-2 font-semibold text-neutral-200">B. Files and attachment metadata</p>
        <p>
          When you upload a file, we collect the file itself and related metadata such as file name, MIME type, file
          size, a storage path, and a download URL.
        </p>

        <p className="pt-2 font-semibold text-neutral-200">C. Automatically collected information</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="font-semibold text-neutral-200">Device and usage data:</span> typical server/app logs (e.g.,
            request timestamps, performance metrics, error logs). The exact fields depend on hosting and configuration.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Cookies/local storage:</span> the current app does not
            appear to implement third‑party analytics in this code snapshot; however, we may use essential storage for
            basic functionality and preferences.
          </li>
        </ul>

        <p className="pt-2 font-semibold text-neutral-200">D. Payment information (Stripe Connect)</p>
        <p>
          If you purchase a subscription from an Operator, payments are processed via Stripe Connect. In an
          operator‑branded billing model, Launchbox typically does not receive full payment card numbers; Stripe handles
          payment processing. We may receive limited payment‑related information (e.g., subscription status, last 4,
          billing state, transaction IDs) depending on the Connect configuration.
        </p>
      </Section>

      <Section title="3. How we use information">
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="font-semibold text-neutral-200">Provide the Service:</span> operate the app, store sessions
            and documents, and enable features configured by Operators.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">AI features:</span> send prompts and relevant context to AI
            providers to generate outputs, detect tasks, and produce summaries.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Security and integrity:</span> prevent abuse, debug issues,
            and enforce policies.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Support:</span> respond to requests, troubleshoot, and
            communicate about the Service.
          </li>
        </ul>
      </Section>

      <Section title="4. AI processing and file handling">
        <p>
          The Service includes AI features. When you submit a prompt or upload a file, we may transmit relevant inputs
          to an AI provider to process your request. In the current app implementation:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Chat requests may include your message text, session context, and attachment URLs.</li>
          <li>
            For certain file types (e.g., PDF/DOCX/TXT/CSV), the Service may extract text (best‑effort) and include that
            extracted text as additional context for the model.
          </li>
          <li>Task detection and summarization send message content to the AI provider.</li>
        </ul>
        <p>
          <span className="font-semibold text-neutral-200">Important:</span> do not upload sensitive personal information
          (e.g., health data, government IDs, passwords, payment card numbers) unless you and the Operator have
          explicitly enabled a compliant workflow.
        </p>
      </Section>

      <Section title="5. Where data is stored">
        <p>
          The current app stores data using Firebase services (Google Cloud):
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="font-semibold text-neutral-200">Firestore:</span> sessions/messages (including attachment
            metadata), documents, tasks, summaries, teams, and agent prompt configuration.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Firebase Storage:</span> uploaded files/attachments.
          </li>
        </ul>
      </Section>

      <Section title="6. How we share information">
        <p className="font-semibold text-neutral-200">We may share information with:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <span className="font-semibold text-neutral-200">AI providers:</span> to process AI requests (e.g., OpenAI).
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Cloud infrastructure vendors:</span> to host data and files
            (e.g., Firebase/Google Cloud).
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Payments processors:</span> Stripe and Stripe Connect for
            billing and subscriptions.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Operators (white‑label admins):</span> if you use an
            Operator’s branded experience, the Operator may be able to access content and metadata within their
            environment, subject to their own policies and settings.
          </li>
          <li>
            <span className="font-semibold text-neutral-200">Legal/safety:</span> if required by law, to protect users,
            enforce agreements, or respond to lawful requests.
          </li>
        </ul>
      </Section>

      <Section title="7. Data retention">
        <p>
          We retain information for as long as necessary to provide the Service, comply with legal obligations, resolve
          disputes, enforce agreements, and support Operators. Retention periods may vary based on Operator settings and
          your usage (e.g., sessions, saved documents, and stored attachments).
        </p>
        <p>
          If you need deletion, contact us or the Operator (if applicable). Deleting a session or document may not
          automatically delete all derived data (e.g., cached or summarized content) unless explicitly implemented for
          your environment.
        </p>
      </Section>

      <Section title="8. Security">
        <p>
          We use reasonable administrative, technical, and organizational measures designed to protect information.
          However, no security measures are perfect; we cannot guarantee absolute security.
        </p>
      </Section>

      <Section title="9. Your choices and rights">
        <p>
          Depending on where you live, you may have rights to access, correct, delete, or export your information, or to
          object to certain processing. If you use a white‑label Operator experience, you may need to contact the
          Operator first because they may control your account and content for their environment.
        </p>
        <p>
          To make a request, contact <span className="font-semibold text-neutral-200">{COMPANY_CONTACT_EMAIL}</span>.
        </p>
      </Section>

      <Section title="10. International transfers">
        <p>
          We and our service providers may process and store information in the United States and other countries. If
          you access the Service from outside the United States, you understand that your information may be transferred
          to and processed in jurisdictions that may have different data protection laws.
        </p>
      </Section>

      <Section title="11. Children’s privacy">
        <p>
          The Service is not intended for children under 13 (or under 16 in certain jurisdictions). We do not knowingly
          collect personal information from children. If you believe a child has provided us personal information,
          contact us.
        </p>
      </Section>

      <Section title="12. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. If we make material changes, we will take reasonable
          steps to provide notice (e.g., by posting the updated policy and updating the effective date).
        </p>
      </Section>

      <Section title="13. Contact">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="font-semibold text-neutral-200">{COMPANY_LEGAL_NAME}</p>
          <p>{COMPANY_ADDRESS}</p>
          <p>
            Email: <span className="font-semibold text-neutral-200">{COMPANY_CONTACT_EMAIL}</span>
          </p>
        </div>
      </Section>
    </article>
  );
}

