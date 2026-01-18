import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import AuthLayout from '@/components/layouts/AuthLayout';

const TermsAndConditions = () => {
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
            Terms and Conditions
          </h1>
          <p className="text-gray-500 text-sm mb-6 sm:mb-8">
            Last updated: January 2026
          </p>

          <div className="space-y-6 text-gray-700 text-sm sm:text-base leading-relaxed">
            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                1. Agreement to Terms
              </h2>
              <p>
                By accessing or using the PickFirst platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                2. Description of Service
              </h2>
              <p>
                PickFirst is an off-market property platform that connects property buyers with real estate agents. We provide a marketplace for exclusive, off-market property listings and facilitate communication between parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                3. User Accounts
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for maintaining the security of your account credentials.</li>
                <li>You must be at least 18 years old to use our Service.</li>
                <li>One person or entity may not maintain more than one account.</li>
                <li>You are responsible for all activities that occur under your account.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                4. User Types
              </h2>
              <p className="mb-2">Our platform supports two types of users:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li><strong>Property Buyers:</strong> Individuals seeking to purchase properties through our platform.</li>
                <li><strong>Real Estate Agents:</strong> Licensed professionals who list and manage property listings.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                5. Agent Obligations
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Agents must hold a valid real estate license in their operating jurisdiction.</li>
                <li>All property listings must be accurate and not misleading.</li>
                <li>Agents must have proper authorisation to list properties on our platform.</li>
                <li>Agents are responsible for compliance with all applicable real estate laws and regulations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                6. Buyer Obligations
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Buyers must provide accurate information regarding their property search criteria.</li>
                <li>Buyers agree to conduct themselves professionally when communicating with agents.</li>
                <li>Buyers understand that property availability and pricing are subject to change.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                7. Subscription and Payments
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Certain features of our Service require a paid subscription.</li>
                <li>Subscription fees are billed in advance on a recurring basis.</li>
                <li>You may cancel your subscription at any time through your account settings.</li>
                <li>Refunds are provided in accordance with our refund policy and applicable law.</li>
                <li>We reserve the right to modify pricing with reasonable notice.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                8. Intellectual Property
              </h2>
              <p>
                All content on the PickFirst platform, including text, graphics, logos, and software, is the property of PickFirst or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our express written permission.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                9. Prohibited Conduct
              </h2>
              <p className="mb-2">You agree not to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Use the Service for any unlawful purpose.</li>
                <li>Post false, misleading, or fraudulent content.</li>
                <li>Harass, abuse, or harm other users.</li>
                <li>Attempt to gain unauthorised access to our systems.</li>
                <li>Interfere with the proper functioning of the Service.</li>
                <li>Scrape or collect user data without permission.</li>
                <li>Use automated systems to access the Service without our consent.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                10. Disclaimer of Warranties
              </h2>
              <p>
                The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy of property listings or the conduct of other users. We are not a party to any transaction between buyers and agents and do not guarantee the completion of any property transaction.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                11. Limitation of Liability
              </h2>
              <p>
                To the maximum extent permitted by law, PickFirst shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service. Our total liability shall not exceed the amount paid by you for the Service in the twelve months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                12. Indemnification
              </h2>
              <p>
                You agree to indemnify and hold harmless PickFirst, its officers, directors, employees, and agents from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                13. Termination
              </h2>
              <p>
                We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our discretion. Upon termination, your right to use the Service will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                14. Governing Law
              </h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of Australia. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of Australia.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                15. Changes to Terms
              </h2>
              <p>
                We may modify these Terms at any time. We will notify users of material changes via email or through the Service. Your continued use of the Service after changes constitutes acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                16. Contact Us
              </h2>
              <p>
                If you have any questions about these Terms, please contact us at{' '}
                <a
                  href="mailto:info@pickfirst.com.au"
                  className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                >
                  info@pickfirst.com.au
                </a>
              </p>
            </section>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default TermsAndConditions;
