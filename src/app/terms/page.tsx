import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - ConvertIQ',
  description: 'ConvertIQ\'s Terms of Service - Legal terms and conditions for using our platform.',
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="prose prose-gray max-w-none">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
        
        <p className="text-lg text-gray-600 mb-8">
          Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            By accessing or using ConvertIQ's website analysis and conversion optimization service ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Description of Service</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            ConvertIQ provides website analysis, conversion optimization recommendations, and performance tracking services. Our Service includes:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Automated website scanning and analysis</li>
            <li>AI-powered marketing and conversion recommendations</li>
            <li>Performance tracking and reporting</li>
            <li>Domain management and verification</li>
            <li>Customer support and guidance</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. User Accounts</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            To use our Service, you must create an account. You agree to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Promptly update account information as needed</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Notify us immediately of any unauthorized use</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Acceptable Use</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            You agree to use the Service only for lawful purposes and in accordance with these Terms. You may not:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Submit websites for malicious or unauthorized analysis purposes</li>
            <li>Use the Service to analyze illegal, harmful, or offensive content</li>
            <li>Attempt to reverse engineer, hack, or compromise our systems</li>
            <li>Share your account credentials with others</li>
            <li>Use the Service to compete with or harm our business</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Abuse our support system or staff</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Subscription and Billing</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Our Service operates on a subscription basis with different plan tiers:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li><strong>Basic Plan:</strong> Limited features with basic website analysis</li>
            <li><strong>Pro Plan:</strong> Enhanced features with multiple domain support and advanced analytics</li>
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4 mb-4">
            Billing terms:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Subscriptions are billed monthly or annually as selected</li>
            <li>Payments are processed securely through our payment provider</li>
            <li>Fees are non-refundable except where required by law</li>
            <li>We may change pricing with 30 days' notice</li>
            <li>Unpaid accounts may be suspended or terminated</li>
          </ul>
        </section>


        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The Service, including all content, features, and functionality, is owned by ConvertIQ and protected by copyright, trademark, and other intellectual property laws. You retain ownership of your website content, but grant us permission to analyze it for the purposes of providing our Service.
          </p>
          <p className="text-gray-700 leading-relaxed">
            Our analysis reports and recommendations are provided for your use only and may not be redistributed or resold without our permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data and Privacy</h2>
          <p className="text-gray-700 leading-relaxed">
            Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you consent to the collection and use of information as described in our Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Service Availability</h2>
          <p className="text-gray-700 leading-relaxed">
            We strive to maintain high service availability but cannot guarantee uninterrupted access. We may suspend or modify the Service for maintenance, updates, or other operational reasons. We are not liable for any downtime or service interruptions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Disclaimers</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            The Service is provided "as is" without warranties of any kind. We disclaim all warranties, express or implied, including but not limited to:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>Merchantability and fitness for a particular purpose</li>
            <li>Accuracy or completeness of analysis results</li>
            <li>Achievement of specific conversion improvements</li>
            <li>Compatibility with all website platforms</li>
            <li>Uninterrupted or error-free operation</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Limitation of Liability</h2>
          <p className="text-gray-700 leading-relaxed">
            To the maximum extent permitted by law, ConvertIQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or use, arising out of or relating to your use of the Service, regardless of the theory of liability.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Indemnification</h2>
          <p className="text-gray-700 leading-relaxed">
            You agree to defend, indemnify, and hold harmless ConvertIQ from and against any claims, damages, obligations, losses, liabilities, costs, or debt arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Termination</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Either party may terminate your account at any time:
          </p>
          <ul className="list-disc pl-6 text-gray-700 space-y-2">
            <li>You may cancel your subscription at any time through your account settings</li>
            <li>We may terminate accounts for violation of these Terms</li>
            <li>We may discontinue the Service with reasonable notice</li>
            <li>Upon termination, your access to the Service ends immediately</li>
            <li>Certain provisions of these Terms survive termination</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Governing Law</h2>
          <p className="text-gray-700 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of Australia, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in Australia.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Changes to Terms</h2>
          <p className="text-gray-700 leading-relaxed">
            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Severability</h2>
          <p className="text-gray-700 leading-relaxed">
            If any provision of these Terms is held to be invalid or unenforceable, the remaining provisions shall remain in full force and effect. The invalid provision shall be replaced with a valid provision that most closely reflects the original intent.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Contact Information</h2>
          <p className="text-gray-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact our support team through the in-app support system or email us at the contact information provided on our website.
          </p>
        </section>
      </div>
    </div>
  )
}