/**
 * Quote module service layer — wraps the Quote API with business logic and
 * friendly error messages.
 *
 * The live ILF/DLF fetch is gone with the backend: territory and speciality
 * are resolved locally, and the rate comes from `nursingRatingService`
 * (pure, synchronous, no service layer needed).
 */
import * as quoteApi from "@/modules/Quote/api/quoteApi";
import * as questionsApi from "@/modules/Quote/api/questionsApi";

const friendly = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback;

export const createSubmission = async (payload: any) => {
  try {
    return await quoteApi.postInsuredSubmission(payload);
  } catch (error) {
    throw new Error(friendly(error, "Could not create your order. Please try again."));
  }
};

export const loadOrder = async (submissionId: string | number) => {
  try {
    return await quoteApi.fetchInsuredOrderDetails(submissionId);
  } catch (error) {
    throw new Error(friendly(error, "Could not load order details."));
  }
};

export const loadPolicyInfo = async (submissionId: string | number) => {
  try {
    return await quoteApi.fetchPolicyInfo(submissionId);
  } catch (error) {
    throw new Error(friendly(error, "Could not load policy info."));
  }
};

/** Save the applicant + training-program details onto the submission. */
export const saveSubmissionDetails = async (submissionId: string | number, patch: any) => {
  try {
    return await quoteApi.patchSubmissionDetails(submissionId, patch);
  } catch (error) {
    throw new Error(friendly(error, "Could not save your details. Please try again."));
  }
};

/** Re-price the submission after a rating input changes. */
export const updateRatingInputs = async (submissionId: string | number, changes: any) => {
  try {
    return await quoteApi.putSubmissionRatingInputs(submissionId, changes);
  } catch (error) {
    throw new Error(friendly(error, "Could not update your coverage details."));
  }
};

/** Record the signed attestation, replacing the DocuSign envelope callback. */
export const recordAttestation = async (submissionId: string | number, attestation: any) => {
  try {
    return await quoteApi.postAttestation(submissionId, attestation);
  } catch (error) {
    throw new Error(friendly(error, "Could not record your attestation."));
  }
};

export const loadSubmissionQuestions = async (submissionId: string | number, opts?: any) => {
  try {
    return await questionsApi.fetchSubmissionQuestions(submissionId, opts);
  } catch (error) {
    throw new Error(friendly(error, "Could not load submission questions."));
  }
};

export const saveAnswers = async (payload: any) => {
  try {
    return await questionsApi.saveSubmissionQuestionAnswers(payload);
  } catch (error) {
    throw new Error(friendly(error, "Could not save your answers."));
  }
};
