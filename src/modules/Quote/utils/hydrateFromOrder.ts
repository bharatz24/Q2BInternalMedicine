/**
 * Rehydrate in-memory quote/practice stores from a loaded order.
 *
 * `quoteResultStore` is memory-only. After dashboard Resume (or a refresh
 * that only restored `flowSubmissionId`), the Payment / Review pages still
 * need the full rate breakdown — otherwise every line renders as "—".
 *
 * Unlike the student program, this quote can't be safely recomputed from
 * scratch on rehydrate — designation, speciality, scope-of-practice and
 * claims count all live in stores/answers that may not have loaded yet. So
 * this reconstructs a `quote`-shaped object directly from the saved order's
 * `ratingResponse` instead of re-running `nursingRatingService`. That DTO
 * already carries exactly `premium`/`tax`/`fees`/`total` (the PA portal's
 * own rating-result shape — see `nursingRatingService.js`'s header), so this
 * round-trips cleanly with no fields to drop.
 */
import practiceStore from "@/modules/Quote/store/practiceStore";
import quoteResultStore from "@/modules/Quote/store/quoteResultStore";
import physicianProfileStore from "@/modules/Quote/store/physicianProfileStore";
import insuredProfileStore from "@/shared/store/insuredProfileStore";
import { amount } from "@/modules/Quote/utils/decimal";
import { toMdY } from "@/shared/utils/dateHelpers";

/**
 * @param order  OrderDetailsResponse-like payload (loose casing — kept `any`)
 */
export function hydrateStoresFromOrder(order: any): void {
  if (!order) return;

  const rating = order.ratingResponse || null;
  const eff = String(rating?.effectiveDate || "").trim();
  const exp = String(rating?.expirationDate || "").trim();

  if (eff) {
    if (practiceStore.effectiveDate !== eff) practiceStore.effectiveDate = eff;
    if (!quoteResultStore.quote) {
      quoteResultStore.quote = {
        designation: practiceStore.designation,
        governingSpecialityCode: null,
        governingSpecialityLabel: rating?.specialtyTitle || "",
        state: rating?.practiceLocation || "",
        st: rating?.practiceLocation || "",
        territory: rating?.practiceCity || "",
        effectiveDate: eff,
        expirationDate: exp || eff,
        limitTierId: null,
        coverageLimit: rating?.coverageLimitTitle || "",
        amounts: {
          premium: amount(String(rating?.premium ?? 0)),
          tax: amount(String(rating?.tax ?? 0)),
          fees: amount(String(rating?.fees ?? 0)),
          total: amount(String(rating?.total ?? 0)),
        },
        groupId: null,
      };
    }
  }

  // Applicant fields used by Payment / Review summaries — only fill blanks so
  // in-progress edits aren't clobbered when the order refresh races a form.
  const contact = order.contactResponse || {};
  const profile = insuredProfileStore.insuredProfile || {};
  const sessionEmail = String(profile.email || profile.username || "").trim();
  const first = String(
    order.insuredfirstname || contact.firstname || profile.firstname || "",
  ).trim();
  const last = String(order.insuredlastname || contact.lastname || profile.lastname || "").trim();
  const email = String(
    contact.email || (sessionEmail.includes("@") ? sessionEmail : "") || "",
  ).trim();
  const phone = String(
    contact.contactnumber || contact.phone || profile.contactnumber || profile.phone || "",
  ).trim();

  const dob = toMdY(order.insureddob);

  // `physicianProfileStore` is the single identity store (docs/ARCHITECTURE.md) — the
  // review / payment contact summary reads it directly via `useQuoteSnapshot`.
  if (first && !physicianProfileStore.firstName) physicianProfileStore.firstName = first;
  if (last && !physicianProfileStore.lastName) physicianProfileStore.lastName = last;
  if (email && !physicianProfileStore.email) physicianProfileStore.email = email;
  if (phone && !physicianProfileStore.cellPhone) physicianProfileStore.cellPhone = phone;
  if (dob && !physicianProfileStore.dateOfBirth) physicianProfileStore.dateOfBirth = dob;

  const loc = order.locationResponse;
  if (loc?.address1 && !physicianProfileStore.homeAddress?.address1) {
    physicianProfileStore.homeAddress = {
      address1: loc.address1 || "",
      address2: loc.address2 || "",
      city: loc.city || "",
      state: loc.state || "",
      zip: loc.zipcode || loc.zip || "",
    };
  }
}
