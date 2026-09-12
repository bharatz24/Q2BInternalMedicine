import { formatSubmissionListDate } from "@/shared/utils/format";
import { fmtDate } from "@/shared/utils/dateHelpers";
import { formatUsd } from "./decimal";
import { deriveHoursFactorFromIlf, deriveHoursWorkedFromIlf } from "./ilfHelpers";
import { buildSignupQuestionSaveRequest } from "@/modules/Quote/api/questionsApi";

/**
 * Build the real `POST /insured/submission` request body — matches `ins`'s
 * `InsuredOrderRequest` exactly (`zipcode`, `effectiveDate`,
 * `coverageilfdlfid`, `hoursperweek`, `parttimeFulltimeFactor`, `year`,
 * `speciality`, `claims`), the same contract `Q2BNfy`'s
 * `buildSubmissionRequest` builds from. Every rating-driving field is read
 * from the REAL `POST /auth/quotedata` response (`ilfDlfResponse`, i.e.
 * `ilfDlfStore.current`) — not from any local table — because `ins`
 * validates `speciality`/`zipcode`/`coverageilfdlfid` server-side against
 * its own data before it will create the submission.
 *
 * `questionSaveRequest` bundles the master-tree "License, Scope & Practice"
 * answers collected on `/practice` (before a submission exists) — same
 * mechanism as `Q2BNfy`'s `ClassificationPage`, now that `ins` has a real
 * nursing question master to resolve those ids against.
 *
 * `coverageLimitId` / `retroDate` come from the Home Page "Instant estimate"
 * card's limit picker + retro field (persisted on `ilfDlfStore`). The
 * submission is created against the limit the user actually saw priced — not
 * always the state default — and `retroDate` rides along when they set a
 * custom one (`ins`'s `InsuredOrderRequest.retroDate` is optional and
 * defaults to the effective date when omitted).
 *
 * Used by `RegistrationPage` (signup flow).
 */
export function buildSubmissionRequest({
  zip,
  effectiveDate,
  ilfDlfResponse,
  coverageLimitId,
  retroDate,
  visitedQuestionGroups,
  questionGroupsWithIds,
  questionAnswers,
  impactAnswers,
  hiddenQuestionIds,
}: any) {
  const visitedNames = new Set(
    (visitedQuestionGroups || []).map((n: any) => String(n).trim().toLowerCase()),
  );
  const visitedGroups = (questionGroupsWithIds || []).filter((g: any) =>
    visitedNames.has(
      String(g?.groupName || "")
        .trim()
        .toLowerCase(),
    ),
  );
  const questionSaveRequest = buildSignupQuestionSaveRequest(
    visitedGroups,
    questionAnswers,
    impactAnswers,
    hiddenQuestionIds,
  );
  // The limit the user selected on the Home Page card, else the state
  // default from `/auth/quotedata`.
  const resolvedCoverageIlfDlfId =
    Number(coverageLimitId) > 0 ? Number(coverageLimitId) : Number(ilfDlfResponse.defaultIlfDlf);
  // Only send retroDate when the user set a custom one — `ins` defaults it
  // to the effective date otherwise (and rejects a retro after effective).
  const retro = fmtDate(retroDate || "");
  return {
    zipcode: zip,
    effectiveDate: fmtDate(effectiveDate),
    coverageilfdlfid: resolvedCoverageIlfDlfId,
    ...(retro ? { retroDate: retro } : {}),
    hoursperweek: deriveHoursWorkedFromIlf(ilfDlfResponse),
    parttimeFulltimeFactor: deriveHoursFactorFromIlf(ilfDlfResponse),
    year: Number(ilfDlfResponse.defaultyear),
    speciality: Number(ilfDlfResponse.defaultSurgery),
    claims: Number(ilfDlfResponse.defaultClaims || 0),
    ...(questionSaveRequest ? { questionSaveRequest } : {}),
  };
}

export function parsePositiveSubmissionId(v: any) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Submission id from signup / InsuredAuthToken response. */
export function submissionIdFromSignupResponse(resp: any) {
  if (!resp || typeof resp !== "object") return null;
  const direct = parsePositiveSubmissionId(resp.submissionId ?? resp.submissionid);
  if (direct) return direct;
  const o0 = Array.isArray(resp.openOrders) ? resp.openOrders[0] : null;
  return parsePositiveSubmissionId(o0?.submissionid);
}

/** Submission id from POST /insured/submission (OpenOrderDetailsDto). */
export function submissionIdFromOpenOrderDto(dto: any) {
  if (!dto || typeof dto !== "object") return null;
  return parsePositiveSubmissionId(dto.submission ?? dto.submissionId);
}

export function isInsuredSessionPayload(data: any) {
  if (data == null || typeof data !== "object") return false;
  return data.id != null || data.username != null || data.name != null;
}

export function primaryLocationFromList(list: any) {
  if (!Array.isArray(list) || list.length === 0) return null;
  return list.find((l: any) => l?.isprimary) || list[0];
}

export function googleDataFromResponse(payload: any) {
  if (!payload || typeof payload !== "object") return { firstname: "", lastname: "", email: "" };
  const firstname = payload.firstname ?? payload.firstName ?? payload.first_name;
  const lastname = payload.lastname ?? payload.lastName ?? payload.last_name;
  const email = payload.email ?? payload.username;
  return {
    firstname: firstname != null ? String(firstname) : "",
    lastname: lastname != null ? String(lastname) : "",
    email: email != null ? String(email) : "",
  };
}

/**
 * Policy documents (COI, Binder, full policy) may only be downloaded once a
 * policy has actually been issued — i.e. its workflow status resolves to
 * "Policy Active" (in force / endorsement / processing) or "Policy Inactive"
 * (cancelled / expired / declined). Every earlier status — Open, Priced, Pay,
 * Pending Review, Binding Policy, etc. — blocks download.
 */
export function canDownloadPolicyDocuments(s: any) {
  const status = policyStatusGroup(s).toLowerCase();
  return status === "policy active" || status === "policy inactive";
}

/**
 * Why the policy documents are locked, for display next to them — `null` once
 * they can be downloaded. Without it the greyed-out buttons look broken.
 */
export function policyDocumentsLockedReason(s: any): string | null {
  if (canDownloadPolicyDocuments(s)) return null;
  const status = policyStatusGroup(s);
  return `Available once your policy is issued${status ? ` (current status: ${status})` : ""}.`;
}

// `ins` sends the WorkflowStatus group label ("Pay", "Binding Policy",
// "Policy Active", …) as `statusname` on dashboard rows and as
// `workflowstatus` on `/insured/order`.
function policyStatusGroup(s: any): string {
  return (
    s?.statusname ||
    s?.policystatus ||
    s?.filterstatus ||
    s?.workFlowStatus ||
    s?.workflowstatus ||
    ""
  )
    .toString()
    .trim();
}

export function mapSubmissionToPolicyCard(s: any) {
  const num =
    s.policynumber || s.quotenumber || (s.submissionid != null ? `#${s.submissionid}` : "—");
  const statusLabel = s.statusname || s.policystatus || (s.ispolicyactive ? "Active" : "Inactive");
  const eff = formatSubmissionListDate(s.effectivedate);
  const exp = formatSubmissionListDate(s.expireddate);
  // Retroactive date is intentionally NOT surfaced here: the
  // `/dashboard/submissions` response (`SubmissionDetails`) carries no retro
  // date field at all — it's only available per-policy from `/insured/order`
  // (`ratingResponse.retroDate`), which the "View details" page reads.
  // `s.balance` is the JPQL projection of `SingleRating.total` — the all-in
  // policy total (premium + tax + fees), not an outstanding balance.
  const total =
    s.balance != null && s.balance !== "" && Number.isFinite(Number(s.balance))
      ? formatUsd(Number(s.balance))
      : "—";
  const zipState = s.practicezipcode || "—";
  // `s.speciality` is `speciality.title` from the projection.
  const speciality = s.speciality || "—";
  const isActive = Boolean(s.ispolicyactive);
  return { num, statusLabel, eff, exp, total, zipState, speciality, isActive };
}
