# Q2BInternalMedicine

Internal Medicine malpractice quote-to-bind portal for DPL RRG (MD, DO, PA, NP, CRNA,
CNM and other providers — DPL Q3; all rate on SP_14). React SPA,
cloned from `../Q2BNursing` and talking to the real `ins` INS-SERVICE (WebOrder API,
`/api/weborder/v1`) exactly like Nursing does — auth, speciality lookup, live pricing,
submission creation, the question tree, DocuSign, Stripe, documents.

**Plan of record:** `../internal_medicine_q2b.plan.md` (question spec, tree rules R1–R8,
decisions D1–D9, backend steps B1–B6). Source requirement: DPL Short Application
Rev 08-31-26. Read the plan before changing a page that renders the question tree.

Everything in Q2BNursing's `CLAUDE.md` about TypeScript, react-query, error handling,
accessibility, styling, CI and Netlify applies unchanged here.

## What differs from Q2BNursing

- **One designation** — `src/modules/Quote/data/designations.js`:
  Internal Medicine → speciality-master code **SP_14**. The landing / step-0 page
  auto-selects it; there is no speciality chip grid.
- **Nursing's local engine was not carried over** — no `nursingRatingService`, rate
  tables, `nursingQuestions.js`, `nursingSpecialities.js` or `useLocalQuoteRecompute`.
  Every price is the real `ilfDlfStore` / `/auth/quotedata`. The landing's Continue no
  longer waits for a local quote (that gate would never clear for SP_14).
- **Question tree comes from `ins`** (SP_14's `question_group_lookup` rows, loaded by the
  admin Question Lookup import — plan §6/§7). Groups, in save order:
  1 `License, Scope & Practice` (`/practice`, sent with submission create),
  2 `Previous Insurance` + 3 `Claims Information` (`/previous-insurance`),
  4 `Underwriting` (`/underwriting`). `ins` refuses to save a group while a
  lower-ordered one is incomplete, and "complete" means every _visible_ question has an
  answer — hence the rules below.
- `/practice` (`PracticeDetailsPage`): employer field only if an Employer Information
  group exists; primary + secondary specialty % must total 100 when both are shown;
  hours rate-note regex matches "practice hours per week". No document attachments —
  CV / COI / loss runs come through Q3's `Requirement Items` impacts.
- `/register` (`RegistrationPage`): DOB and medical license number required
  (`licenseNumber` rides `POST /auth/signup`); "Primary practice address" / "Primary
  contact number"; **refuses to create a submission unless the `/practice` group was
  visited and answered** (both the form path and the signed-in path) — sends the user
  back to `/practice`.
- `/underwriting` (`UnderwritingPage`): renders every Visibility-visible question in
  `displayOrder` (follow-ups are Show targets of their own Yes); Q23 and Remarks show
  without any Yes. Optional Q29 documents attachment.
- `buildSignupQuestionSaveRequest` (`questionsApi.ts`) sends `""` for a visible blank
  free-text question so group 1 counts as complete in `ins`.
- `physicianProfileStore` (renamed from `nurseProfileStore`) gained `licenseNumber`.
- `cvStore` holds one in-memory file per document slot (`cv`, `coi`, `lossRuns`,
  `licensingDocs`); `shared/components/AttachmentField.tsx` renders them. **Nothing is
  uploaded** — the carrier gets these through `Requirement Items` impacts on the tree
  (plan D6).

## Backend dependencies (not in this repo)

- SP_14 must be `ssp_enable=1` in the active group, with rates — otherwise the landing
  estimate fails and the wizard stops there (plan B1).
- The SP_14 question tree must be imported (plan B3/B4) — until then `/practice` shows no
  questions and Continue stays disabled.
- The signed application is `reportservices` `ancillary-physician.jrxml`, chosen when
  `DefaultSpecialities.resolveAncillaryType("SP_14")` returns `Physician` (plan B6,
  branch `feature/internal-medicine-q2b` in `ins` and `reportservices`).

## Ports

Runs on **4500** (Nfy 4200, Student 4201 / 5174, Nursing 4400).

## Known gaps

- Marketing copy still written for nurses: `ArticlesPage.tsx` article list and
  `hubData.ts` testimonials — need DPL / marketing content, not engineering rewrites.
- Legal modal text (About / Terms / Privacy) was re-scoped to Internal Medicine
  physicians; DPL must approve it.
- DPL's warranty / fraud-warning page is missing from the Rev 08-31-26 PDF (plan §11).

## Out of scope for this repo

Changes to `ins`, `reportservices`, `docusign-service` or seeding data — those live in
their own repos (see the plan). Policy servicing.
