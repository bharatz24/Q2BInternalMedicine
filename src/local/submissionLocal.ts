/**
 * Submissions — what backs the Nursing-local pieces of `quoteApi.ts`
 * (`patchSubmissionDetails`, `postAttestation` — see that file's header for
 * why those have no real `ins` endpoint to call instead). `questionsApi.ts`
 * calls the real `ins` question-tree endpoints now, not this file.
 *
 * A submission is one applicant's journey through the wizard: the practice
 * inputs, the quote those inputs priced to, the underwriting answers, the
 * attestation, and the workflow status that gates the later steps.
 *
 * WHAT IS NOT STORED HERE
 * -----------------------
 * The SSN. It never touches browser storage at all — it is sent once in the
 * `POST /auth/signup` body and otherwise stays in memory for the session
 * only (see `physicianProfileStore`). Everything else a refresh genuinely needs
 * is persisted (in `sessionStorage` — see `src/local/db.ts`) so reloading on
 * /payment doesn't dump the user back to the landing page, which is the
 * behaviour the copied UI already expects.
 */

import { TABLES, findAll, findOne, insert, update } from "@/local/db";
import { nextInvoiceNumber, nextPolicyNumber } from "@/local/ids";
import { respond, respondError } from "@/local/latency";
import { currentAccount } from "@/local/authLocal";
import {
  isFreeTextQuestionType,
  isYesNoQuestionType,
  isYesOption,
} from "@/modules/Quote/api/questionsApi";
import { POLICY_STATUS } from "@/modules/Payment/utils/policyStatus";

const asId = (submissionId: any): number => Number(submissionId);

/** The stored row for a submission id, or null. */
export function findSubmission(submissionId: any) {
  const id = asId(submissionId);
  if (!Number.isFinite(id)) return null;
  return findOne(TABLES.SUBMISSIONS, (s) => s.id === id);
}

/** Every submission belonging to the signed-in account, newest first. */
export function listSubmissionsForCurrentAccount() {
  const account = currentAccount();
  if (!account) return [];
  return findAll(TABLES.SUBMISSIONS, (s) => s.accountId === account.id)
    .slice()
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/**
 * Ensure a local shadow row exists for a submission id before writing to it.
 *
 * Submission creation is real (`quoteApi.postInsuredSubmission` → `ins`), so
 * every submission id this app writes against is one `ins` assigned — the
 * Nursing-local `createSubmission` (and its local rating engine / static
 * question tree) was not carried into this portal, so nothing else inserts a
 * row for it. Without this, the first local-only write against a real
 * submission — `patchSubmissionDetails`/`postAttestation`, see `quoteApi.ts`'s
 * header for why those stay local — hit `update()`'s "no row matched" branch
 * and 404'd. `patchSubmissionDetails` is no longer called from anywhere (its
 * only caller, the deleted `/credentials` step's Continue button, is gone),
 * so this shadow now only backstops `postAttestation`. Mirrors the account
 * shadow pattern (`authLocal.syncAccountShadow`): the first local write is
 * what creates the row, keyed by the real id.
 */
function ensureSubmissionShadow(submissionId: any) {
  const id = asId(submissionId);
  if (findOne(TABLES.SUBMISSIONS, (s) => s.id === id)) return;
  const account = currentAccount();
  insert(TABLES.SUBMISSIONS, {
    id,
    accountId: account?.id ?? null,
    quotenumber: "",
    policynumber: "",
    invoiceNumber: "",
    policyStatus: POLICY_STATUS.OPEN_ORDER,
    workflowStatus: "Open",
    createdAt: new Date().toISOString(),
    questionGroups: [],
    attestation: null,
    payment: null,
  });
}

/**
 * Merge changes into a stored submission.
 *
 * @param {number|string} submissionId
 * @param {object} patch
 * @returns {Promise<object>} raw shaped like `OrderDetailsResponse`
 */
export async function patchSubmission(submissionId: any, patch: any = {}) {
  const id = asId(submissionId);
  ensureSubmissionShadow(id);
  const updated = update(TABLES.SUBMISSIONS, (s) => s.id === id, patch);
  if (!updated) return respondError("That order no longer exists.", 404);
  return respond(toOrderDetailsDto(updated));
}

/**
 * Full order details for a submission.
 *
 * @returns {Promise<object|null>} raw shaped like `OrderDetailsResponse`
 */
export async function getOrderDetails(submissionId: any) {
  const row = findSubmission(submissionId);
  if (!row) return respond(null);
  return respond(toOrderDetailsDto(row));
}

/** @returns {Promise<object|null>} raw shaped like `PolicyInfoResponse` */
export async function getPolicyInfo(submissionId: any) {
  const row = findSubmission(submissionId);
  if (!row) return respond(null);
  const account = findOne(TABLES.ACCOUNTS, (a) => a.id === row.accountId);
  return respond({
    policyNumber: row.policynumber || row.quotenumber,
    effectiveDate: row.effectiveDate,
    expirationDate: row.expirationDate,
    useremail: account?.email || "",
    amount: Number(row.amounts?.total?.display || 0),
    insuredName: insuredNameFor(row, account),
  });
}

/** Record the signed attestation and advance the order to SIGNED. */
export async function recordAttestation(submissionId: any, attestation?: any) {
  return patchSubmission(submissionId, {
    attestation: {
      printedName: attestation?.printedName || "",
      signedAt: attestation?.signedAt || new Date().toISOString(),
      accepted: Boolean(attestation?.accepted),
    },
    policyStatus: POLICY_STATUS.SIGNED,
    workflowStatus: "Signed",
  });
}

/**
 * Mark the order paid. This is the status the binder/invoice step gates on —
 * payment and binding are two distinct steps in the workflow, exactly as in
 * the hosted app: PAID means the money is in, POLICY_ACTIVE means the binder
 * has been issued.
 */
export async function markSubmissionPaid(submissionId: any) {
  const row = findSubmission(submissionId);
  if (!row) return respondError("That order no longer exists.", 404);
  if (row.policyStatus === POLICY_STATUS.POLICY_ACTIVE) {
    return respond(toOrderDetailsDto(row));
  }
  return patchSubmission(submissionId, {
    policyStatus: POLICY_STATUS.PAID,
    workflowStatus: "Pay",
    paidAt: new Date().toISOString(),
  });
}

/** Issue the policy + invoice numbers, moving the order to POLICY_ACTIVE. */
export async function bindSubmission(submissionId: any) {
  const row = findSubmission(submissionId);
  if (!row) return respondError("That order no longer exists.", 404);
  if (row.policynumber) {
    // Already bound. The hosted API answered a repeat generate with a 409, and
    // BinderInvoicePage has a branch for exactly that, so match it.
    return respondError("Binder and invoice have already been generated.", 409);
  }
  return patchSubmission(submissionId, {
    policynumber: nextPolicyNumber(),
    invoiceNumber: nextInvoiceNumber(),
    policyStatus: POLICY_STATUS.POLICY_ACTIVE,
    workflowStatus: "Policy Active",
    boundAt: new Date().toISOString(),
  });
}

/** Display name for the insured, falling back through what we know. */
function insuredNameFor(row: any, account: any) {
  const fromNurse = [row.nurse?.firstName, row.nurse?.lastName].filter(Boolean).join(" ").trim();
  if (fromNurse) return fromNurse;
  const fromAccount = [account?.firstname, account?.lastname].filter(Boolean).join(" ").trim();
  return fromAccount || account?.email || "";
}

/** Stored row -> the `OpenOrderDetailsDto` shape the pages consume. */
export function toOpenOrderDto(row: any) {
  return {
    id: row.id,
    submission: row.id,
    effectiveDate: row.effectiveDate,
    retroDate: "",
    coverageLimitTitle: row.coverageLimitTitle || "",
    retrolimitTitle: "",
    premium: Number(row.amounts?.premium?.display || 0),
    taxtotal: Number(row.amounts?.tax?.display || 0),
    feestotal: Number(row.amounts?.fees?.display || 0),
    total: Number(row.amounts?.total?.display || 0),
    ratingPolicyBound: Boolean(row.policynumber),
    expiredDate: row.expirationDate,
    invoiceNumber: row.invoiceNumber || "",
    practicezipcode: row.zip || "",
    hoursPerWeek: row.hoursPerWeek ?? "",
    workFlowStatus: row.workflowStatus || "",
    specialityTitle: row.governingSpecialityLabel || "",
    specialitiesMasterId: 0,
  };
}

/** Stored row -> the `OrderDetailsResponse` shape the pages consume. */
export function toOrderDetailsDto(row: any) {
  const account = findOne(TABLES.ACCOUNTS, (a) => a.id === row.accountId);
  const groups: any[] = row.questionGroups || [];
  const allQuestions: any[] = groups.flatMap((g: any) => g.questions || []);
  const answered = allQuestions.filter((q: any) =>
    (q.options || []).some(
      (o: any) => o.answerValue != null && String(o.answerValue).trim() !== "",
    ),
  );
  const questionRequired = computeQuestionRequired(groups);
  const limitLabel = row.coverageLimitTitle || "";

  return {
    submissionId: row.id,
    insuredId: row.accountId,
    isentity: false,
    companyname: "",
    insuredfirstname: row.nurse?.firstName || account?.firstname || "",
    insuredlastname: row.nurse?.lastName || account?.lastname || "",
    insureddob: row.nurse?.dateOfBirth || "",
    licenseNumber: row.credentials?.licenses?.[0]?.licenseNumber || "",
    npiNumber: "",
    workflowstatus: row.workflowStatus || "",
    // premium/tax/fees/total is the PA portal's own rating-result shape. A
    // shadow row carries no amounts, so these stay 0 — the real figures come
    // from `ins`'s `/insured/order`.
    ratingResponse: {
      id: row.id,
      practicezipcode: row.zip || "",
      effectiveDate: row.effectiveDate,
      expirationDate: row.expirationDate,
      retroDate: "",
      coverageLimitTitle: limitLabel,
      retroLimitTitle: "",
      premium: Number(row.amounts?.premium?.display || 0),
      tax: Number(row.amounts?.tax?.display || 0),
      fees: Number(row.amounts?.fees?.display || 0),
      total: Number(row.amounts?.total?.display || 0),
      specialtyTitle: row.governingSpecialityLabel || "",
      practiceLocation: row.st || "",
      practiceCity: row.territory || "",
      currentprior: "Claims made",
    },
    contactResponse: {
      id: row.accountId,
      firstname: row.nurse?.firstName || account?.firstname || "",
      lastname: row.nurse?.lastName || account?.lastname || "",
      email: row.nurse?.email || account?.email || "",
      contactnumber: row.nurse?.cellPhone || row.nurse?.homePhone || account?.phone || "",
      isprimary: true,
    },
    locationResponse: row.nurse?.homeAddress?.address1
      ? {
          address1: row.nurse.homeAddress.address1,
          address2: row.nurse.homeAddress.address2 || "",
          city: row.nurse.homeAddress.city || "",
          state: row.nurse.homeAddress.state || "",
          zipcode: row.nurse.homeAddress.zip || "",
        }
      : null,
    year: 0,
    exclusionList: [],
    requiredItemList: [],
    noteList: [],
    planLocatoins: [],
    groupQuestionsDto: [],
    questionsAttemptedTotal: answered.length,
    questionsGrandTotal: allQuestions.length,
    iswriteaccess: true,
    ispolicyactive: row.policyStatus === POLICY_STATUS.POLICY_ACTIVE,
    totalClaims: 0,
    quotenumber: row.quotenumber || "",
    policynumber: row.policynumber || "",
    policyStatus: row.policyStatus || POLICY_STATUS.OPEN_ORDER,
    questionRequired,
  };
}

/**
 * Whether a required underwriting question is still outstanding.
 *
 * Must match UnderwritingPage: Show-target follow-ups (every §VIII "give
 * details" textbox, and §VII's claims-count question) start hidden and only
 * become required once a Yes answer reveals them. Counting them while hidden
 * is what produced "Please answer all required questions before proceeding"
 * after the user had already answered every visible Yes/No with No.
 */
function computeQuestionRequired(groups: any) {
  if (!Array.isArray(groups) || groups.length === 0) return false;

  const allQuestions: any[] = groups.flatMap((g: any) => g.questions || []);
  const masterToSub = new Map<string, any>();
  for (const q of allQuestions) {
    if (q?.questionId != null) masterToSub.set(String(q.questionId), q.id);
  }

  const resolveMasterIds = (masterIds: any) => {
    const out: any[] = [];
    for (const mid of Array.isArray(masterIds) ? masterIds : []) {
      const sid = masterToSub.get(String(mid));
      if (sid != null) out.push(sid);
    }
    return out;
  };

  // Every Show target starts hidden — same seed as resolveVisibilityTargets.
  const showTargets = new Set();
  for (const q of allQuestions) {
    for (const o of q.options || []) {
      for (const sid of resolveMasterIds(o.showQuestions)) showTargets.add(sid);
    }
  }

  const isAnswered = (q: any) =>
    (q.options || []).some(
      (o: any) => o.answerValue != null && String(o.answerValue).trim() !== "",
    );

  // Live answer map from saved option.answerValue (option id for Yes/No).
  const answers: Record<string, any> = {};
  for (const q of allQuestions) {
    const answeredOpts = (q.options || []).filter(
      (o: any) => o.answerValue != null && String(o.answerValue).trim() !== "",
    );
    if (answeredOpts.length === 0) continue;
    answers[String(q.id)] = isFreeTextQuestionType(q.questionType)
      ? String(answeredOpts[0].answerValue)
      : String(answeredOpts[0].id);
  }

  // Apply Hide/Show from answered choice options (displayOrder order).
  const hidden = new Set(showTargets);
  const ordered = [...allQuestions].sort((a, b) => (a?.displayOrder ?? 0) - (b?.displayOrder ?? 0));
  for (const q of ordered) {
    if (hidden.has(q.id)) continue;
    if (isFreeTextQuestionType(q.questionType)) continue;
    const ans = answers[String(q.id)];
    if (ans == null) continue;
    const opt = (q.options || []).find((o: any) => String(o.id) === String(ans));
    if (!opt) continue;
    for (const sid of resolveMasterIds(opt.hideQuestions)) hidden.add(sid);
    for (const sid of resolveMasterIds(opt.showQuestions)) hidden.delete(sid);
  }

  // Same follow-up rule UnderwritingPage uses: free-text boxes only gate once
  // a visible Yes/No is answered Yes.
  const anyYes = ordered.some((q) => {
    if (hidden.has(q.id)) return false;
    if (!isYesNoQuestionType(q.questionType)) return false;
    const ans = answers[String(q.id)];
    if (ans == null) return false;
    const opt = (q.options || []).find((o: any) => String(o.id) === String(ans));
    return Boolean(opt) && isYesOption(opt);
  });

  return allQuestions.some((q) => {
    if (!q.isRequired) return false;
    if (hidden.has(q.id)) return false;
    if (isFreeTextQuestionType(q.questionType) && !anyYes) return false;
    return !isAnswered(q);
  });
}

/** Stored row -> the `SubmissionDetails` shape the dashboard list renders. */
export function toSubmissionDetails(row: any) {
  const account = findOne(TABLES.ACCOUNTS, (a) => a.id === row.accountId);
  const isActive = row.policyStatus === POLICY_STATUS.POLICY_ACTIVE;
  return {
    submissionid: row.id,
    policynumber: row.policynumber || "",
    effectivedate: row.effectiveDate,
    expireddate: row.expirationDate,
    retrodate: "",
    balance: Number(row.amounts?.total?.display || 0),
    statusname: isActive ? "Policy Active" : row.workflowStatus || "Open",
    policystatus: row.policyStatus || POLICY_STATUS.OPEN_ORDER,
    isopenorder: row.policyStatus === POLICY_STATUS.OPEN_ORDER,
    ispolicyactive: isActive,
    practicezipcode: row.zip || "",
    filterstatus: isActive ? "Policy Active" : "Open",
    speciality: row.governingSpecialityLabel || "",
    insuredName: insuredNameFor(row, account),
    quotenumber: row.quotenumber || "",
  };
}
