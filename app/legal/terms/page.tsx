const COMPANY_LEGAL_NAME = "[Launchbox, Inc.]";
const COMPANY_CONTACT_EMAIL = "[legal@yourdomain.com]";
const COMPANY_ADDRESS = "[Company Address]";
const EFFECTIVE_DATE = "[Effective Date]";

export const metadata = {
  title: "Terms of Service",
  description: "Launchbox terms of service.",
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

export default function TermsOfServicePage() {
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
        <p className="text-sm text-neutral-300">
          Effective: <span className="font-semibold text-neutral-200">{EFFECTIVE_DATE}</span>
        </p>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4 text-sm leading-relaxed text-neutral-300">
          <p className="font-semibold text-neutral-200">
            These Terms of Service (“Terms”) are between {COMPANY_LEGAL_NAME} (“Launchbox,” “we,” “us,” or “our”) and you.
          </p>
          <p>
            They govern your access to and use of the Launchbox platform, including AI features and any related services
            (the “Service”). If you are using a white‑label Operator’s branded version of the Service, additional terms
            from that Operator may apply.
          </p>
        </div>
      </header>

      <Section title="1. Who we are (and the white‑label model)">
        <p>
          Launchbox provides software that Operators can configure and brand. Operators may offer access to end users
          under their own brand. In those cases, the Operator may set pricing, manage subscriptions, and provide support
          for their community/product. Launchbox provides the underlying platform.
        </p>
      </Section>

      <Section title="2. Eligibility and accounts">
        <p>
          You must be able to form a binding contract with Launchbox to use the Service. You are responsible for your
          use of the Service and for maintaining the confidentiality of any account access, device access, or links that
          provide access to your content.
        </p>
        <p>
          The current Service may evolve over time. Some features may require authentication, verified email, or other
          onboarding steps depending on Operator configuration.
        </p>
      </Section>

      <Section title="3. The Service (including AI features)">
        <p>
          The Service may include chat-based workflows, document creation, task extraction, summaries, file uploads, and
          other operator-enabled modules. AI features generate outputs based on inputs you provide and other context.
        </p>
        <p>
          <span className="font-semibold text-neutral-200">AI outputs are not professional advice.</span> Outputs may be
          inaccurate, incomplete, or outdated. You are responsible for evaluating outputs before relying on them,
          including for legal, financial, medical, or safety‑critical uses.
        </p>
      </Section>

      <Section title="4. Your content and permissions">
        <p className="font-semibold text-neutral-200">A. Your content</p>
        <p>
          You retain your rights in content you submit to the Service, including prompts, messages, files, and other
          materials (“User Content”). You represent and warrant that you have all rights necessary to submit User
          Content and grant the rights described in these Terms.
        </p>

        <p className="pt-2 font-semibold text-neutral-200">B. License to operate the Service</p>
        <p>
          You grant Launchbox and its service providers a non-exclusive, worldwide license to host, store, reproduce,
          process, transmit, and display User Content solely to provide, maintain, and improve the Service, including to
          process requests using AI providers and to store session history, documents, and attachments.
        </p>

        <p className="pt-2 font-semibold text-neutral-200">C. Feedback</p>
        <p>
          If you provide feedback, suggestions, or ideas, you grant Launchbox a perpetual, irrevocable, worldwide,
          royalty‑free license to use them without restriction.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Use the Service for illegal, harmful, or abusive activities.</li>
          <li>Upload or process content that violates others’ rights (including IP and privacy rights).</li>
          <li>
            Attempt to bypass security, rate limits, or restrictions; probe, scan, or test vulnerabilities without
            permission.
          </li>
          <li>Interfere with or disrupt the Service or systems.</li>
          <li>Use the Service to develop or distribute malware or to conduct phishing or fraud.</li>
          <li>
            Submit sensitive personal information (e.g., health data, government IDs, passwords, payment card numbers)
            unless you and the Operator have enabled a compliant workflow.
          </li>
        </ul>
      </Section>

      <Section title="6. Files, storage, and content handling">
        <p>
          The Service may allow you to upload files. Uploaded files may be stored with our cloud storage providers and
          may be processed to extract text (best‑effort) for AI context. You are responsible for your uploads and for
          ensuring you have permission to upload and process the content.
        </p>
      </Section>

      <Section title="7. Payments, subscriptions, and tokens (Operator + platform)">
        <p className="font-semibold text-neutral-200">A. Operator billing (Stripe Connect Express)</p>
        <p>
          If you purchase access through a white‑label Operator, the Operator sets pricing and is generally responsible
          for subscriptions, refunds (if any), and customer support. Payments are processed through Stripe Connect.
        </p>
        <p>
          <span className="font-semibold text-neutral-200">Merchant of record:</span> As configured, the Operator’s name
          may appear on receipts/credit card statements. Depending on Stripe Connect configuration, either the Operator
          or Launchbox may be the merchant of record. If you have questions about billing, contact the Operator first.
        </p>

        <p className="pt-2 font-semibold text-neutral-200">B. Token-based usage</p>
        <p>
          The Service may use a token system to align AI usage costs with subscription tiers and usage. Token rules,
          allocations, and overage pricing (if any) may vary by Operator and plan and may change over time. Tokens do not
          have cash value and are not redeemable for money unless required by law.
        </p>
      </Section>

      <Section title="8. Suspension and termination">
        <p>
          We may suspend or terminate access to the Service if we reasonably believe you violated these Terms, used the
          Service in a way that creates risk or legal exposure, or if required by law. Operators may also suspend or
          terminate end‑user access within their environment.
        </p>
      </Section>

      <Section title="9. Third‑party services">
        <p>
          The Service relies on third‑party services (e.g., cloud infrastructure, AI providers, payment processors). Your
          use of those third‑party services may be subject to their terms and privacy policies.
        </p>
      </Section>

      <Section title="10. Disclaimers">
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, LAUNCHBOX DISCLAIMS
          ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, AND NON‑INFRINGEMENT.
        </p>
        <p>
          We do not warrant that the Service will be uninterrupted, secure, error‑free, or that AI outputs will be
          accurate or reliable.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, LAUNCHBOX WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
          CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL, ARISING OUT OF OR
          RELATED TO YOUR USE OF THE SERVICE.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, LAUNCHBOX’S TOTAL LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE WILL
          NOT EXCEED THE AMOUNT PAID BY YOU TO LAUNCHBOX FOR THE SERVICE IN THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO
          THE CLAIM (OR $100 IF YOU HAVE NOT PAID LAUNCHBOX).
        </p>
      </Section>

      <Section title="12. Indemnification">
        <p>
          You agree to indemnify and hold harmless Launchbox and its affiliates, officers, directors, employees, and
          agents from and against claims, liabilities, damages, losses, and expenses (including reasonable attorneys’
          fees) arising from your User Content or your use of the Service in violation of these Terms.
        </p>
      </Section>

      <Section title="13. Governing law and venue (Delaware)">
        <p>
          These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles.
          You agree that any dispute arising from or relating to these Terms or the Service will be brought exclusively
          in the state or federal courts located in Delaware, and you consent to personal jurisdiction in those courts.
        </p>
      </Section>

      <Section title="14. Changes to the Service or Terms">
        <p>
          We may modify the Service and these Terms from time to time. If we make material changes, we will take
          reasonable steps to provide notice (e.g., posting updated Terms and updating the effective date). Your continued
          use of the Service after the effective date of updated Terms constitutes acceptance.
        </p>
      </Section>

      <Section title="15. Contact">
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

