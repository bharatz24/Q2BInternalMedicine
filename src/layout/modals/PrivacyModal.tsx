import ModalShell from "./ModalShell";
import Section from "./Section";

export default function PrivacyModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Privacy policy" onClose={onClose}>
      <div style={{ fontSize: 11, color: "#595959", marginBottom: 12 }}>
        Last updated: April 12, 2026
      </div>
      <Section title="1. Who we are">
        <p style={{ marginBottom: 12 }}>
          SelectFirst Insurance Services ("we," "us," "our") operates this Quote-to-Bind portal on
          behalf of Doctors Professional Liability Risk Retention Group (DPL RRG). This privacy
          policy describes how we collect, use, disclose, and protect the personal information of
          individuals who use this portal to apply for professional liability insurance.
        </p>
      </Section>
      <Section title="2. Information we collect">
        <p style={{ marginBottom: 6 }}>
          We collect the following categories of personal information during the application
          process:
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Identifiers:</strong> Name, Social Security number, email address, phone number,
          mailing address, date of birth, zip code.
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Professional information:</strong> Medical degree and specialty, practice details,
          procedures performed, and medical licence numbers.
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Underwriting information:</strong> Responses to underwriting questions, claims
          history, prior acts coverage status, retro dates — including, where applicable,
          disclosures about license actions, DEA status, and mental-health or substance-treatment
          history asked on the application form.
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Financial information:</strong> Payment card data is collected by our payment
          processor (Stripe) and is never stored on our servers.
        </p>
        <p style={{ marginBottom: 12 }}>
          <strong>Electronic signature data:</strong> Typed name signatures, timestamp, IP address,
          and browser information at the time of signing.
        </p>
      </Section>
      <Section title="2a. A note on sensitive fields">
        <p style={{ marginBottom: 12 }}>
          Your Social Security number is optional. When you provide it, it is sent over an encrypted
          connection and stored only on your policy record with the carrier — it is never written to
          this device's storage, so if you refresh before finishing your application you will be
          asked for it again. Your date of birth is handled the same way. Documents you attach in
          the portal (CV, certificate of insurance, loss runs, disposition documents) stay in this
          browser session only and are not uploaded — your underwriter requests them separately. The
          free-text explanations you give to application questions are transmitted to and retained
          by the carrier as part of your application.
        </p>
      </Section>
      <Section title="3. How we use your information">
        <p style={{ marginBottom: 6 }}>
          We use personal information for the following purposes: to evaluate your application for
          professional liability insurance; to generate quotes and bind policies; to communicate
          with you about your application, policy, or account; to comply with legal, regulatory, and
          audit requirements; to detect and prevent fraud; and to improve our services.
        </p>
        <p style={{ marginBottom: 12 }}>
          We do not sell your personal information to third parties.
        </p>
      </Section>
      <Section title="4. How we share your information">
        <p style={{ marginBottom: 12 }}>
          We share personal information only as necessary to process your insurance application:
          with DPL RRG (the carrier) for underwriting and policy issuance; with our policy
          administration system (IMS) for record-keeping; with Stripe for payment processing; with
          our CRM (Zoho) for customer service; and with regulatory authorities as required by law.
          We may also share information with reinsurers and auditors as necessary for the operation
          of the insurance program.
        </p>
      </Section>
      <Section title="5. Data retention">
        <p style={{ marginBottom: 12 }}>
          We retain application records, policy documents, and e-signature audit trails for a
          minimum of five (5) years after the expiration or cancellation of the policy, or as
          required by the most restrictive applicable state law, whichever is longer. Payment card
          data is not retained by us; it is processed and stored by Stripe in compliance with
          PCI-DSS.
        </p>
      </Section>
      <Section title="6. Data security">
        <p style={{ marginBottom: 12 }}>
          We implement administrative, technical, and physical safeguards to protect personal
          information. All data is encrypted in transit (TLS/SSL) and at rest. Access to personal
          information is restricted to authorized personnel on a need-to-know basis. Payment
          processing is handled by Stripe, a PCI-DSS Level 1 certified processor.
        </p>
      </Section>
      <Section title="7. Your rights">
        <p style={{ marginBottom: 6 }}>
          <strong>All applicants:</strong> You may request access to, correction of, or deletion of
          your personal information by contacting us at privacy@selectfirstinsurance.com or (888)
          959-9456.
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>California residents (CCPA/CPRA):</strong> You have the right to know what
          personal information we collect and how it is used; the right to delete your personal
          information (subject to legal retention requirements); the right to opt out of the sale of
          personal information (we do not sell personal information); and the right to
          non-discrimination for exercising your privacy rights. To exercise these rights, contact
          us at privacy@selectfirstinsurance.com or call (888) 959-9456.
        </p>
        <p style={{ marginBottom: 12 }}>
          <strong>Electronic consent withdrawal:</strong> If you consented to conduct this
          transaction electronically, you may withdraw that consent at any time by contacting us at
          privacy@selectfirstinsurance.com or (888) 959-9456. Withdrawal of electronic consent may
          require us to process your application via paper forms, which may delay issuance.
        </p>
      </Section>
      <Section title="8. Cookies and tracking">
        <p style={{ marginBottom: 12 }}>
          This portal may use essential cookies for session management and security. We may use
          analytics tools to understand portal usage and improve the application experience. We do
          not use tracking technologies for advertising purposes. For more information or to opt
          out, contact us at privacy@selectfirstinsurance.com.
        </p>
      </Section>
      <Section title="9. Children's privacy">
        <p style={{ marginBottom: 12 }}>
          This portal is intended for licensed healthcare providers who are 18 years of age or
          older. We do not knowingly collect personal information from individuals under 18.
        </p>
      </Section>
      <Section title="10. Changes to this policy">
        <p style={{ marginBottom: 12 }}>
          We may update this privacy policy from time to time. The "Last updated" date at the top of
          this policy indicates when it was last revised. Continued use of the portal after changes
          constitutes acceptance of the revised policy.
        </p>
      </Section>
      <Section title="11. Contact us">
        <p style={{ marginBottom: 6 }}>SelectFirst Insurance Services</p>
        <p style={{ marginBottom: 6 }}>Email: privacy@selectfirstinsurance.com</p>
        <p style={{ marginBottom: 6 }}>Phone: (888) 959-9456</p>
      </Section>
    </ModalShell>
  );
}
