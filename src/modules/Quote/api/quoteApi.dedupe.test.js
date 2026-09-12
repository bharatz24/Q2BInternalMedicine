import { afterEach, describe, expect, it, vi } from "vitest";

// Regression test for Bug 1 (Q2B_NURSING_BUGFIX_PLAN.md): a single
// "Create account & start application" click must never open two
// submissions. `RegistrationPage` has two paths that can each fire a
// create in the same tick; `postInsuredSubmission` collapses concurrent
// identical creates onto one request as the last line of defence.

const post = vi.fn();
vi.mock("axios", () => ({
  default: { post: (...args) => post(...args) },
}));

// Keep the intentional rejection in the third case out of the test log —
// `quoteApi` routes errors through `logApiError`, which `console.error`s in
// dev. `apiUrl` still needs to work, so spread the real module.
vi.mock("@/shared/services/config", async (importOriginal) => ({
  ...(await importOriginal()),
  logApiError: vi.fn(),
}));

const RATING_PAYLOAD = {
  zipcode: "92653",
  effectiveDate: "01/01/2027",
  coverageilfdlfid: 10,
  hoursperweek: "40",
  parttimeFulltimeFactor: 1,
  year: 1,
  speciality: 5,
  claims: 0,
};

const load = async () => (await import("./quoteApi")).postInsuredSubmission;

afterEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe("postInsuredSubmission — concurrent-create dedupe", () => {
  it("fires ONE request when both register paths create the same quote at once", async () => {
    let resolvePost;
    post.mockImplementation(
      () =>
        new Promise((res) => {
          resolvePost = () => res({ data: { submission: 4321 } });
        }),
    );
    const postInsuredSubmission = await load();

    const a = postInsuredSubmission({ ...RATING_PAYLOAD });
    const b = postInsuredSubmission({ ...RATING_PAYLOAD });

    resolvePost();
    const [ra, rb] = await Promise.all([a, b]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(ra.submission).toBe(4321);
    expect(rb.submission).toBe(4321);
  });

  it("does not dedupe a later create once the first has settled", async () => {
    post.mockResolvedValue({ data: { submission: 1 } });
    const postInsuredSubmission = await load();

    await postInsuredSubmission({ ...RATING_PAYLOAD });
    await postInsuredSubmission({ ...RATING_PAYLOAD });

    expect(post).toHaveBeenCalledTimes(2);
  });

  it("still fires the failed request's key again after a rejection clears it", async () => {
    post
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ data: { submission: 9 } });
    const postInsuredSubmission = await load();

    await expect(postInsuredSubmission({ ...RATING_PAYLOAD })).rejects.toThrow("boom");
    const ok = await postInsuredSubmission({ ...RATING_PAYLOAD });

    expect(ok.submission).toBe(9);
    expect(post).toHaveBeenCalledTimes(2);
  });
});
