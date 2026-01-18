import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AuthLayout from '@/components/layouts/AuthLayout';

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout>
      <div className="w-full max-w-4xl mx-auto py-4 sm:py-8 md:py-12 px-3 sm:px-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 sm:mb-6 hover:bg-amber-50 hover:text-amber-700 text-gray-600 transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-white/90 backdrop-blur-lg rounded-2xl border border-amber-200/50 shadow-2xl shadow-amber-100/30 p-6 sm:p-8 md:p-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm mb-6 sm:mb-8">
            Last updated: January 2026
          </p>

          <div className="space-y-6 text-gray-700 text-sm sm:text-base leading-relaxed">
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                1. Introduction
              </h2>
              <p>
                PickFirst ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. By using our Service, you consent to the practices described herein.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                2. Information We Collect
              </h2>
              <h3 className="font-medium text-gray-800 mb-2">Personal Information</h3>
              <p className="mb-3">When you create an account or use our Service, we may collect:</p>
              <ul className="list-disc list-inside space-y-2 ml-2 mb-4">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number</li>
                <li>Organisation/business name (for agents)</li>
                <li>Property preferences and search criteria</li>
                <li>Payment information (processed securely via third-party providers)</li>
              </ul>

              <h3 className="font-medium text-gray-800 mb-2">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and location data</li>
                <li>Usage data (pages visited, features used, time spent)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                3. How We Use Your Information
              </h2>
              <p className="mb-2">We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Provide, maintain, and improve our Service</li>
                <li>Process transactions and send related information</li>
                <li>Connect buyers with agents and facilitate property inquiries</li>
                <li>Send you notifications about properties matching your criteria</li>
                <li>Respond to your comments, questions, and support requests</li>
                <li>Send promotional communications (with your consent)</li>
                <li>Monitor and analyse usage patterns and trends</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                4. Sharing Your Information
              </h2>
              <p className="mb-2">We may share your information in the following circumstances:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>With Agents/Buyers:</strong> To facilitate property inquiries and transactions between parties on our platform.</li>
                <li><strong>Service Providers:</strong> With third-party vendors who assist us in operating our Service (payment processing, email delivery, analytics).</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights, safety, or the rights of others.</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
              </ul>
              <p className="mt-3">
                We do not sell your personal information to third parties for their marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                5. Data Security
              </h2>
              <p>
                We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                6. Data Retention
              </h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide you services. We will retain and use your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                7. Your Rights
              </h2>
              <p className="mb-2">Depending on your location, you may have the right to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Object to or restrict processing of your information</li>
                <li>Request portability of your data</li>
                <li>Withdraw consent where processing is based on consent</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us at{' '}
                <a
                  href="mailto:info@pickfirst.com.au"
                  className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                >
                  info@pickfirst.com.au
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                8. Cookies and Tracking
              </h2>
              <p className="mb-3">
                We use cookies and similar tracking technologies to enhance your experience. These include:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Essential Cookies:</strong> Required for the Service to function properly.</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Service.</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences.</li>
              </ul>
              <p className="mt-3">
                You can control cookies through your browser settings. Note that disabling certain cookies may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                9. Third-Party Links
              </h2>
              <p>
                Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                10. Children's Privacy
              </h2>
              <p>
                Our Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                11. International Data Transfers
              </h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place to protect your information in accordance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                12. Australian Privacy Principles
              </h2>
              <p>
                We comply with the Australian Privacy Principles (APPs) contained in the Privacy Act 1988 (Cth). If you are an Australian resident, you have specific rights regarding your personal information under Australian law.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                13. Changes to This Policy
              </h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                14. Contact Us
              </h2>
              <p>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200/50">
                <p className="font-medium text-gray-800">PickFirst</p>
                <p>
                  Email:{' '}
                  <a
                    href="mailto:info@pickfirst.com.au"
                    className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                  >
                    info@pickfirst.com.au
                  </a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default PrivacyPolicy;
