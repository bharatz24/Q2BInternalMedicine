import { describe, expect, it } from "vitest";
import { canDownloadPolicyDocuments, policyDocumentsLockedReason } from "./submission";

// `ins` sends the WorkflowStatus group label: `statusname` on dashboard rows,
// `workflowstatus` on `/insured/order`.
describe("policy document gate", () => {
  it("unlocks for issued policies, active or inactive", () => {
    expect(canDownloadPolicyDocuments({ statusname: "Policy Active" })).toBe(true);
    expect(canDownloadPolicyDocuments({ workflowstatus: "Policy Inactive" })).toBe(true);
    expect(policyDocumentsLockedReason({ statusname: "Policy Active" })).toBeNull();
  });

  it("explains the lock with the current status before the policy is issued", () => {
    expect(canDownloadPolicyDocuments({ statusname: "Pay" })).toBe(false);
    expect(policyDocumentsLockedReason({ statusname: "Pay" })).toBe(
      "Available once your policy is issued (current status: Pay).",
    );
    expect(policyDocumentsLockedReason({ workflowstatus: "Binding Policy" })).toBe(
      "Available once your policy is issued (current status: Binding Policy).",
    );
  });

  it("still explains the lock when no status is known", () => {
    expect(policyDocumentsLockedReason({})).toBe("Available once your policy is issued.");
  });
});
