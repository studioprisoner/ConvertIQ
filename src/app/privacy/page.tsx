import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - ConvertIQ",
  description:
    "ConvertIQ's Privacy Policy - How we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Privacy Policy
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Last updated:{" "}
          {new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Introduction
          </h2>
          <p className="text-gray-700 leading-relaxed">
            ConvertIQ ("we," "our," or "us") is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our website analysis and
            conversion optimisation service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Information We Collect
          </h2>

          <h3 className="text-xl font-medium text-gray-900 mb-3">
            Personal Information
          </h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>Email address (for account creation and communication)</li>
            <li>Name (for personalization and account management)</li>
            <li>Profile information you choose to provide</li>
            <li>
              Billing information (processed securely through our payment
              processor)
            </li>
          </ul>

          <h3 className="text-xl font-medium text-gray-900 mb-3">
            Website Analysis Data
          </h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>URLs you submit for analysis</li>
            <li>Publicly available website content and metadata</li>
            <li>Technical performance metrics</li>
            <li>Website structure and design elements</li>
          </ul>

          <h3 className="text-xl font-medium text-gray-900 mb-3">
            Usage Information
          </h3>
          <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
            <li>How you interact with our service</li>
            <li>Feature usage patterns</li>
            <li>Error logs and diagnostic information</li>
            <li>Device and browser information</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            How We Use Your Information
          </h2>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide and improve our website analysis services</li>
            <li>Generate personalized recommendations and reports</li>
            <li>Communicate with you about your account and service updates</li>
            <li>Process payments and manage subscriptions</li>
            <li>Provide customer support</li>
            <li>Ensure security and prevent fraud</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Information Sharing and Disclosure
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            We do not sell, trade, or rent your personal information to third
            parties. We may share your information in the following
            circumstances:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>
              <strong>Service Providers:</strong> With trusted third-party
              services that help us operate our platform (payment processing,
              email delivery, hosting)
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law or to
              protect our rights and safety
            </li>
            <li>
              <strong>Business Transfers:</strong> In connection with a merger,
              acquisition, or sale of assets
            </li>
            <li>
              <strong>Consent:</strong> With your explicit consent for other
              purposes
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Data Security
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We implement industry-standard security measures to protect your
            information, including encryption, secure data transmission, and
            access controls. However, no method of transmission over the
            internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Data Retention
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We retain your personal information for as long as necessary to
            provide our services, comply with legal obligations, resolve
            disputes, and enforce our agreements. You can request deletion of
            your account and associated data at any time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Your Rights
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Depending on your location, you may have the following rights
            regarding your personal information:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Access and review your personal information</li>
            <li>Correct or update inaccurate information</li>
            <li>Delete your personal information</li>
            <li>Restrict or object to certain processing</li>
            <li>Data portability (receive your data in a structured format)</li>
            <li>Withdraw consent where processing is based on consent</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Cookies and Tracking
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We use cookies and similar technologies to enhance your experience,
            analyze usage, and provide personalized content. You can control
            cookie preferences through your browser settings, though some
            features may not function properly if cookies are disabled.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Third-Party Services
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our service integrates with third-party services for enhanced
            functionality:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>
              <strong>AI Analysis:</strong> We use Anthropic's Claude AI service
              to generate website analysis and recommendations
            </li>
            <li>
              <strong>Payment Processing:</strong> Polar handles subscription
              billing and payment processing
            </li>
            <li>
              <strong>Email Services:</strong> Resend manages transactional
              emails
            </li>
            <li>
              <strong>Support System:</strong> Linear manages support tickets
              and customer communications
            </li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            These services have their own privacy policies, and we encourage you
            to review them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            International Data Transfers
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Your information may be transferred to and processed in countries
            other than your own. We ensure appropriate safeguards are in place
            to protect your information in accordance with applicable data
            protection laws.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Children's Privacy
          </h2>
          <p className="text-gray-700 leading-relaxed">
            Our service is not intended for individuals under the age of 18. We
            do not knowingly collect personal information from children under
            18. If we become aware that we have collected such information, we
            will take steps to delete it promptly.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Changes to This Privacy Policy
          </h2>
          <p className="text-gray-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify
            you of any material changes by posting the new Privacy Policy on
            this page and updating the "Last updated" date. Your continued use
            of our service after such changes constitutes acceptance of the
            updated policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Contact Us
          </h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about this Privacy Policy or our privacy
            practices, please contact our support team through the in-app
            support system or email us at the contact information provided on
            our website.
          </p>
        </section>
      </div>
    </div>
  );
}
