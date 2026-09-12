import ModalShell from "./ModalShell";
import Section from "./Section";

export default function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Terms of service" onClose={onClose}>
      <div style={{ fontSize: 11, color: "#595959", marginBottom: 12 }}>
        Last updated: April 12, 2026
      </div>
      <Section title="1. Acceptance of terms">
        <p style={{ marginBottom: 12 }}>
          By creating an account and using the DPL RRG Quote-to-Bind portal ("Portal"), operated by
          SelectFirst Insurance Services ("SelectFirst," "we," "us"), you agree to be bound by these
          Terms of Service. If you do not agree to these terms, do not create an account or use the
          Portal.
        </p>
      </Section>
      <Section title="2. Portal purpose">
        <p style={{ marginBottom: 12 }}>
          The Portal enables internal medicine providers (MD, DO, PA, NP, CRNA, CNM and other) to
          apply for professional liability insurance issued by Doctors Professional Liability Risk
          Retention Group (DPL RRG). SelectFirst operates as the appointed agency and program
          manager for DPL RRG. The Portal facilitates quoting, application submission, electronic
          signature, payment, and policy binding.
        </p>
      </Section>
      <Section title="3. Eligibility">
        <p style={{ marginBottom: 12 }}>
          You must be a licensed healthcare provider (MD, DO, PA, NP, CRNA, CNM or other) practicing
          internal medicine and applying for coverage, and at least 18 years of age, to use this
          Portal. By submitting an application, you represent that you meet these eligibility
          requirements.
        </p>
      </Section>
      <Section title="4. Accuracy of information">
        <p style={{ marginBottom: 12 }}>
          You agree that all information provided in your application is true, complete, and
          accurate to the best of your knowledge. You understand that material misrepresentations or
          omissions may result in denial of coverage, rescission of the policy, or denial of claims.
          State-specific fraud warning language applicable to your state is presented during the
          application process and incorporated by reference into these terms.
        </p>
      </Section>
      <Section title="5. Account security">
        <p style={{ marginBottom: 12 }}>
          You are responsible for maintaining the confidentiality of your account credentials (email
          and password) and for all activity that occurs under your account. You agree to notify us
          immediately at support@selectfirstinsurance.com if you suspect unauthorized access to your
          account.
        </p>
      </Section>
      <Section title="6. Electronic transactions">
        <p style={{ marginBottom: 12 }}>
          By using the Portal, you consent to conduct insurance transactions electronically in
          accordance with the federal Electronic Signatures in Global and National Commerce Act
          (ESIGN Act) and applicable state Uniform Electronic Transactions Acts (UETA). Electronic
          signatures submitted through the Portal have the same legal effect as handwritten
          signatures. You may withdraw your consent to electronic transactions at any time by
          contacting us at privacy@selectfirstinsurance.com or (888) 959-9456, though withdrawal may
          require paper-based processing and may delay issuance.
        </p>
      </Section>
      <Section title="7. Payment terms">
        <p style={{ marginBottom: 12 }}>
          Payment is processed by Stripe, a PCI-DSS Level 1 certified payment processor. By
          submitting payment, you authorize the charge for the total amount shown on the payment
          screen, which includes the base premium, fees, and applicable state taxes. SelectFirst
          does not store credit card information.
        </p>
      </Section>
      <Section title="8. Cancellation and refund policy">
        <p style={{ marginBottom: 6 }}>
          <strong>Flat cancellation:</strong> You may cancel your policy before the policy effective
          date for a full refund of all premiums, fees, and taxes paid.
        </p>
        <p style={{ marginBottom: 6 }}>
          <strong>Pro-rata cancellation:</strong> After the policy effective date, the base premium
          is refundable on a pro-rata basis for the unexpired portion of the policy period, less a
          25% minimum earned premium. This means that 25% of the base premium is considered fully
          earned upon the policy effective date and is non-refundable, regardless of when the policy
          is canceled. The remaining 75% of the base premium is refundable proportionally based on
          the unused policy term. Fees are non-refundable after the policy effective date.
        </p>
        <p style={{ marginBottom: 12 }}>
          <strong>How to cancel:</strong> To cancel your policy, contact SelectFirst Insurance
          Services at support@selectfirstinsurance.com or (888) 959-9456. Cancellations are
          effective upon written confirmation.
        </p>
      </Section>
      <Section title="9. Risk Retention Group disclosure">
        <p style={{ marginBottom: 12 }}>
          DPL RRG is a Risk Retention Group chartered under the federal Liability Risk Retention Act
          (LRRA). This policy is issued by your risk retention group. Your risk retention group may
          not be subject to all of the insurance laws and regulations of your State. State insurance
          insolvency guaranty funds are not available for your risk retention group.
        </p>
      </Section>
      <Section title="10. Claims-made coverage">
        <p style={{ marginBottom: 12 }}>
          All policies issued through DPL RRG are claims-made policies. A claims-made policy covers
          only claims that are both (a) made against you during the policy period, and (b) arising
          from incidents that occurred on or after the policy's retroactive date. If you cancel or
          do not renew your policy, you may need to purchase an Extended Reporting Period (tail
          coverage) to maintain protection for incidents that occurred during the policy period but
          are reported after cancellation.
        </p>
      </Section>
      <Section title="11. Limitation of liability">
        <p style={{ marginBottom: 12 }}>
          SelectFirst provides the Portal as a technology platform to facilitate the insurance
          application process. SelectFirst is not the insurer; DPL RRG is the insurer. SelectFirst
          makes no guarantee that coverage will be approved or that any specific claim will be
          covered. To the maximum extent permitted by law, SelectFirst's liability for any claim
          arising from use of the Portal is limited to the amount of the fees paid.
        </p>
      </Section>
      <Section title="12. Dispute resolution">
        <p style={{ marginBottom: 12 }}>
          Any disputes arising from or relating to these Terms of Service or your use of the Portal
          shall be resolved through binding arbitration in accordance with the rules of the American
          Arbitration Association, conducted in the State of California. You agree to waive any
          right to a jury trial.
        </p>
      </Section>
      <Section title="13. Modifications">
        <p style={{ marginBottom: 12 }}>
          We reserve the right to modify these Terms of Service at any time. Changes will be posted
          on the Portal with an updated "Last updated" date. Continued use of the Portal after
          changes are posted constitutes your acceptance of the revised terms.
        </p>
      </Section>
      <Section title="14. Contact">
        <p style={{ marginBottom: 6 }}>SelectFirst Insurance Services</p>
        <p style={{ marginBottom: 6 }}>Email: support@selectfirstinsurance.com</p>
        <p style={{ marginBottom: 6 }}>Phone: (888) 959-9456</p>
      </Section>
    </ModalShell>
  );
}
