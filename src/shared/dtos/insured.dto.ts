// Derived from weborder.json (OpenAPI). Now hand-maintained (no generator
// in this repo). Domain: insured. Each class copies fields from an untyped API
// response (`raw`) with safe defaults; `declare` lines are type-only.

import { NotesDto } from "./files.dto";
import { GroupQuestionsDto, SubmissionQuestionAnswersSaveRequest } from "./questions.dto";

/**
 * Body for POST /api/weborder/v1/insured/submission. Creates a new submission
 * (order) for the authenticated insured. All fields are required; zipcode
 * must be 5 digits; speciality, zipcode, and coverage ILF/DLF must exist and
 * be valid for the active group.
 */
export class InsuredOrderRequest {
  declare zipcode: string;
  declare effectiveDate: string;
  declare coverageilfdlfid: number;
  declare hoursperweek: string;
  declare parttimeFulltimeFactor: number;
  declare year: number;
  declare speciality: number;
  declare claims: number;
  declare questionSaveRequest: SubmissionQuestionAnswersSaveRequest | null;
  constructor(raw: Record<string, any> = {}) {
    this.zipcode = raw.zipcode ?? ""; // Practice or risk location ZIP code. Must be exactly 5 digits.
    this.effectiveDate = raw.effectiveDate ?? ""; // Policy effective date in MM/dd/yyyy format.
    this.coverageilfdlfid = raw.coverageilfdlfid ?? 0; // Coverage ILF/DLF identifier. Must be greater than 0.
    this.hoursperweek = raw.hoursperweek ?? ""; // Hours worked label resolved on the client from the HoursWorkedFactorLookup selection (e.g....
    this.parttimeFulltimeFactor = raw.parttimeFulltimeFactor ?? 0; // Part-time/full-time factor resolved on the client from the HoursWorkedFactorLookup selecti...
    this.year = raw.year ?? 0; // Policy year. Example: 1
    this.speciality = raw.speciality ?? 0; // Speciality identifier. Must be greater than 0.
    this.claims = raw.claims ?? 0; // Number of claims associated. Can be 0 or more.
    this.questionSaveRequest = raw.questionSaveRequest
      ? new SubmissionQuestionAnswersSaveRequest(raw.questionSaveRequest)
      : null;
  }
}

/**
 * SSP web-order signup payload. **Insured vs contact name:** `firstName` and
 * `lastName` are always the **primary contact** name. When `isEntity` is
 * `true`, the **insured** (account) name is `companyName` (required). When
 * `isEntity` is `false`, the insured is a person and the insured name is also
 * `firstName` + `lastName`. **`title`** is the primary **location** title
 * (also used for contact display name). **`clientUrl`** is optional; when
 * sent it must match an existing broker client URL, otherwise the API returns
 * 404. When omitted, the default broker from server configuration is used.
 * **Payment term** for the new insured is set from server configuration (not
 * supplied in this request). **`submissionRequest`** is optional: omit or
 * null to skip creating a submission at signup.
 */
export class InsuredRequest {
  declare isEntity: boolean;
  declare firstName: string;
  declare lastName: string;
  declare companyName: string;
  declare zipCode: string;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare email: string;
  declare contactNumber: string;
  declare password: string;
  declare title: string;
  declare submissionRequest: InsuredOrderRequest | null;
  declare clientUrl: string;
  declare licenseNumber: string;
  declare npiNumber: string;
  declare dob: string;
  declare ssn: string;
  constructor(raw: Record<string, any> = {}) {
    this.isEntity = raw.isEntity ?? false; // When true, insured is a business/entity — `companyName` is the **insured** name (required)...
    this.firstName = raw.firstName ?? ""; // Primary contact given name. Always required. For a person insured (`isEntity` false), this...
    this.lastName = raw.lastName ?? ""; // Primary contact family name. Always required. For a person insured (`isEntity` false), thi...
    this.companyName = raw.companyName ?? ""; // Entity insured legal or practice name. **Required** when `isEntity` is `true`. Not used wh...
    this.zipCode = raw.zipCode ?? ""; // Primary location ZIP code (US-style, 5 characters).
    this.address1 = raw.address1 ?? ""; // Primary location address line 1.
    this.address2 = raw.address2 ?? ""; // Primary location address line 2 (optional).
    this.city = raw.city ?? ""; // Primary location city.
    this.state = raw.state ?? ""; // Primary location state (code or name per client convention).
    this.email = raw.email ?? ""; // Login username; also used as unique account email.
    this.contactNumber = raw.contactNumber ?? ""; // Primary phone number for the insured contact.
    this.password = raw.password ?? ""; // Initial account password (stored hashed).
    this.title = raw.title ?? ""; // Title for the **primary location** (display name); also applied as the primary contact nam...
    this.submissionRequest = raw.submissionRequest
      ? new InsuredOrderRequest(raw.submissionRequest)
      : null;
    this.clientUrl = raw.clientUrl ?? ""; // Optional broker **client URL / token** used to resolve the assigning broker. When omitted,...
    this.licenseNumber = raw.licenseNumber ?? ""; // Medical license number (optional).
    this.npiNumber = raw.npiNumber ?? "";
    this.dob = raw.dob ?? ""; // Date of birth **MM/dd/yyyy** (optional, person insured only). Future dates rejected.
    this.ssn = raw.ssn ?? ""; // SSN / Tax Id (optional, person insured only). Stored on the insured record.
  }
}

export class InsuredDataResponse {
  declare id: number;
  declare username: string;
  declare email: string;
  declare abbreviation: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.username = raw.username ?? "";
    this.email = raw.email ?? "";
    this.abbreviation = raw.abbreviation ?? "";
  }
}

/**
 * Update authenticated insured profile (`PUT /api/weborder/v1/insured`).
 * `insuredtype` **Entity** or **person** (case-insensitive). **404** if
 * insured or payment term missing; **406** if email duplicate. Optional
 * **licenseNumber** (alphanumeric, max 40) and **npiNumber** (10 digits).
 */
export class InsureUpdatedRequest {
  declare firstname: string;
  declare lastname: string;
  declare companyname: string;
  declare insuredtype: string;
  declare gender: string;
  declare dob: string;
  declare industrycode: string;
  declare paymentterm: number;
  declare email: string;
  declare password: string;
  declare licenseNumber: string;
  declare npiNumber: string;
  constructor(raw: Record<string, any> = {}) {
    this.firstname = raw.firstname ?? ""; // First name (person) or contact first name.
    this.lastname = raw.lastname ?? ""; // Last name (person) or contact last name.
    this.companyname = raw.companyname ?? ""; // Company name when `insuredtype` is **Entity**.
    this.insuredtype = raw.insuredtype ?? ""; // **Entity** or **person** (case-insensitive).
    this.gender = raw.gender ?? ""; // Optional gender code.
    this.dob = raw.dob ?? ""; // Date of birth **MM/dd/yyyy**. Future dates are not allowed.
    this.industrycode = raw.industrycode ?? ""; // Six-digit industry code (optional).
    this.paymentterm = raw.paymentterm ?? 0; // Payment term lookup id.
    this.email = raw.email ?? ""; // Account email (username).
    this.password = raw.password ?? ""; // New password when changing (optional).
    this.licenseNumber = raw.licenseNumber ?? ""; // Medical license number (optional).
    this.npiNumber = raw.npiNumber ?? ""; // National Provider Identifier, 10 digits when provided (optional).
  }
}

/**
 * Update insured plus plan location/contact on a submission (`PUT
 * /api/weborder/v1/insured/with-location`). **Entity** vs **person** rules
 * match `insuredtype`; `locationId` / `contactId` must exist on
 * `submissionId`.
 */
export class InsureWithLocationUpdatedRequest {
  declare firstname: string;
  declare lastname: string;
  declare companyname: string;
  declare insuredtype: string;
  declare contactnumber: string;
  declare address1: string;
  declare address2: string;
  declare insureddob: string;
  declare ssn: string;
  declare licenseNumber: string;
  declare npiNumber: string;
  declare state: string;
  declare city: string;
  declare zipcode: string;
  declare isupdatemaster: boolean;
  declare locationId: number;
  declare contactId: number;
  declare submissionId: number;
  declare locationcategory: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.firstname = raw.firstname ?? ""; // Contact first name (person) or contact given name (entity).
    this.lastname = raw.lastname ?? ""; // Contact last name (person) or contact family name (entity).
    this.companyname = raw.companyname ?? ""; // Company name when `insuredtype` is **Entity**.
    this.insuredtype = raw.insuredtype ?? ""; // **Entity** or **person** (case-insensitive).
    this.contactnumber = raw.contactnumber ?? ""; // Phone (10–15 characters).
    this.address1 = raw.address1 ?? ""; // Plan location address line 1.
    this.address2 = raw.address2 ?? ""; // Address line 2 (optional).
    this.insureddob = raw.insureddob ?? ""; // Date of birth **MM/dd/yyyy** for person insured snapshots. Future dates are not allowed.
    this.ssn = raw.ssn ?? ""; // SSN / Tax Id (optional, person insured only).
    this.licenseNumber = raw.licenseNumber ?? ""; // Medical license number (optional).
    this.npiNumber = raw.npiNumber ?? ""; // National Provider Identifier, 10 digits when provided (optional).
    this.state = raw.state ?? ""; // State.
    this.city = raw.city ?? ""; // City.
    this.zipcode = raw.zipcode ?? ""; // 5-digit ZIP.
    this.isupdatemaster = raw.isupdatemaster ?? false; // Update insured master from body when true.
    this.locationId = raw.locationId ?? 0; // Plan location id on the submission.
    this.contactId = raw.contactId ?? 0; // Plan contact id on the submission.
    this.submissionId = raw.submissionId ?? 0; // Submission id.
    this.locationcategory = raw.locationcategory ?? false; // Location category flag.
  }
}

export class InsuredContactMasterResponse {
  declare id: number;
  declare firstname: string;
  declare lastname: string;
  declare email: string;
  declare contactnumber: string;
  declare isprimary: boolean;
  declare title: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.firstname = raw.firstname ?? "";
    this.lastname = raw.lastname ?? "";
    this.email = raw.email ?? "";
    this.contactnumber = raw.contactnumber ?? "";
    this.isprimary = raw.isprimary ?? false;
    this.title = raw.title ?? "";
  }
}

/**
 * Insured **master** contact (`POST /api/weborder/v1/insured/contacts`). Omit
 * `id` or use **0** to create; set `id` for update (must belong to insured).
 */
export class ContactRequest {
  declare id: number;
  declare title: string;
  declare firstname: string;
  declare lastname: string;
  declare email: string;
  declare contactnumber: string;
  declare isprimary: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Master contact id; omit or **0** for create.
    this.title = raw.title ?? ""; // Salutation or role title.
    this.firstname = raw.firstname ?? ""; // Given name.
    this.lastname = raw.lastname ?? ""; // Family name.
    this.email = raw.email ?? ""; // Email address.
    this.contactnumber = raw.contactnumber ?? ""; // Phone (10–15 characters).
    this.isprimary = raw.isprimary ?? false; // Primary contact flag.
  }
}

export class ContactResponse {
  declare id: number;
  declare firstname: string;
  declare lastname: string;
  declare email: string;
  declare contactnumber: string;
  declare isprimary: boolean;
  declare title: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.firstname = raw.firstname ?? "";
    this.lastname = raw.lastname ?? "";
    this.email = raw.email ?? "";
    this.contactnumber = raw.contactnumber ?? "";
    this.isprimary = raw.isprimary ?? false;
    this.title = raw.title ?? "";
  }
}

export class OrderContactResponse {
  declare id: number;
  declare firstname: string;
  declare lastname: string;
  declare email: string;
  declare contactnumber: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.firstname = raw.firstname ?? "";
    this.lastname = raw.lastname ?? "";
    this.email = raw.email ?? "";
    this.contactnumber = raw.contactnumber ?? "";
  }
}

/**
 * Insured **master** location (`POST /api/weborder/v1/insured/locations`).
 * Omit `id` or use **0** to create; set `id` for update (must belong to
 * insured).
 */
export class LocationRequest {
  declare id: number;
  declare title: string;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare isprimary: boolean;
  declare locationcategory: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Master location id; omit or **0** for create.
    this.title = raw.title ?? ""; // Location display title.
    this.address1 = raw.address1 ?? ""; // Address line 1.
    this.address2 = raw.address2 ?? ""; // Address line 2 (optional).
    this.city = raw.city ?? ""; // City.
    this.state = raw.state ?? ""; // State code or name.
    this.zipcode = raw.zipcode ?? ""; // 5-digit ZIP.
    this.isprimary = raw.isprimary ?? false; // Whether this is the primary master location.
    this.locationcategory = raw.locationcategory ?? false; // Location category flag passed through to persistence.
  }
}

export class LocationListResponse {
  declare id: number;
  declare title: string;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare isprimary: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
    this.address1 = raw.address1 ?? "";
    this.address2 = raw.address2 ?? "";
    this.city = raw.city ?? "";
    this.state = raw.state ?? "";
    this.zipcode = raw.zipcode ?? "";
    this.isprimary = raw.isprimary ?? false;
  }
}

export class LocationMasterResponse {
  declare id: number;
  declare title: string;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare isprimary: boolean;
  declare locationcategory: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
    this.address1 = raw.address1 ?? "";
    this.address2 = raw.address2 ?? "";
    this.city = raw.city ?? "";
    this.state = raw.state ?? "";
    this.zipcode = raw.zipcode ?? "";
    this.isprimary = raw.isprimary ?? false;
    this.locationcategory = raw.locationcategory ?? false;
  }
}

export class OrderLocationResponse {
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare locationId: number;
  declare locationTitle: string;
  constructor(raw: Record<string, any> = {}) {
    this.address1 = raw.address1 ?? "";
    this.address2 = raw.address2 ?? "";
    this.city = raw.city ?? "";
    this.state = raw.state ?? "";
    this.zipcode = raw.zipcode ?? "";
    this.locationId = raw.locationId ?? 0;
    this.locationTitle = raw.locationTitle ?? "";
  }
}

/**
 * Add insured master locations to a submission as plan locations, optionally
 * removing existing plan locations first.
 */
export class AddLocationRequest {
  declare submissionid: number;
  declare addLocationsIds: number[];
  declare removeLocationsIds: number[];
  constructor(raw: Record<string, any> = {}) {
    this.submissionid = raw.submissionid ?? 0; // Submission id (must belong to the caller)
    this.addLocationsIds = Array.isArray(raw.addLocationsIds) ? raw.addLocationsIds : []; // Insured **master** location ids to attach as plan locations (each must exist for the insur...
    this.removeLocationsIds = Array.isArray(raw.removeLocationsIds) ? raw.removeLocationsIds : []; // Optional **plan** location ids to remove first (same rules as `DELETE .../locations/plan`)...
  }
}

/**
 * Update a **plan** (submission) location (`PUT
 * /api/weborder/v1/insured/locations/plan`). Submission must belong to the
 * authenticated insured.
 */
export class PlanLocationRequest {
  declare id: number;
  declare submissionId: number;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare isupdatemaster: boolean;
  declare locationcategory: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0; // Plan location row id.
    this.submissionId = raw.submissionId ?? 0; // Owning submission id.
    this.address1 = raw.address1 ?? ""; // Address line 1.
    this.address2 = raw.address2 ?? ""; // Address line 2 (optional).
    this.city = raw.city ?? ""; // City.
    this.state = raw.state ?? ""; // State (must exist in system).
    this.zipcode = raw.zipcode ?? ""; // 5-digit ZIP.
    this.isupdatemaster = raw.isupdatemaster ?? false; // When true, propagate changes to insured master location.
    this.locationcategory = raw.locationcategory ?? false; // Location category flag.
  }
}

export class PlanLocationsResponse {
  declare id: number;
  declare title: string;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare locationId: number;
  declare isprimary: boolean;
  declare isremoved: boolean;
  declare isapproved: boolean;
  declare locationcategory: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
    this.address1 = raw.address1 ?? "";
    this.address2 = raw.address2 ?? "";
    this.city = raw.city ?? "";
    this.state = raw.state ?? "";
    this.zipcode = raw.zipcode ?? "";
    this.locationId = raw.locationId ?? 0;
    this.isprimary = raw.isprimary ?? false;
    this.isremoved = raw.isremoved ?? false;
    this.isapproved = raw.isapproved ?? false;
    this.locationcategory = raw.locationcategory ?? false;
  }
}

export class OrderDetailsResponse {
  declare submissionId: number;
  declare insuredId: number;
  declare isentity: boolean;
  declare companyname: string;
  declare insuredfirstname: string;
  declare insuredlastname: string;
  declare insureddob: string;
  declare licenseNumber: string;
  declare npiNumber: string;
  declare workflowstatus: string;
  declare ratingResponse: OrderRatingResponse | null;
  declare contactResponse: OrderContactResponse | null;
  declare locationResponse: OrderLocationResponse | null;
  declare year: number;
  declare exclusionList: ExclusionResponse[];
  declare requiredItemList: RequiredItemResponse[];
  declare noteList: NotesDto[];
  declare planLocatoins: PlanLocationsResponse[];
  declare groupQuestionsDto: GroupQuestionsDto[];
  declare questionsAttemptedTotal: number;
  declare questionsGrandTotal: number;
  declare iswriteaccess: boolean;
  declare ispolicyactive: boolean;
  declare totalClaims: number;
  declare quotenumber: string;
  declare policynumber: string;
  declare policyStatus: string;
  declare questionRequired: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.submissionId = raw.submissionId ?? 0;
    this.insuredId = raw.insuredId ?? 0;
    this.isentity = raw.isentity ?? false;
    this.companyname = raw.companyname ?? "";
    this.insuredfirstname = raw.insuredfirstname ?? "";
    this.insuredlastname = raw.insuredlastname ?? "";
    this.insureddob = raw.insureddob ?? "";
    this.licenseNumber = raw.licenseNumber ?? "";
    this.npiNumber = raw.npiNumber ?? "";
    this.workflowstatus = raw.workflowstatus ?? "";
    this.ratingResponse = raw.ratingResponse ? new OrderRatingResponse(raw.ratingResponse) : null;
    this.contactResponse = raw.contactResponse
      ? new OrderContactResponse(raw.contactResponse)
      : null;
    this.locationResponse = raw.locationResponse
      ? new OrderLocationResponse(raw.locationResponse)
      : null;
    this.year = raw.year ?? 0;
    this.exclusionList = Array.isArray(raw.exclusionList)
      ? raw.exclusionList.map((x) => new ExclusionResponse(x))
      : [];
    this.requiredItemList = Array.isArray(raw.requiredItemList)
      ? raw.requiredItemList.map((x) => new RequiredItemResponse(x))
      : [];
    this.noteList = Array.isArray(raw.noteList) ? raw.noteList.map((x) => new NotesDto(x)) : [];
    this.planLocatoins = Array.isArray(raw.planLocatoins)
      ? raw.planLocatoins.map((x) => new PlanLocationsResponse(x))
      : [];
    this.groupQuestionsDto = Array.isArray(raw.groupQuestionsDto)
      ? raw.groupQuestionsDto.map((x) => new GroupQuestionsDto(x))
      : [];
    this.questionsAttemptedTotal = raw.questionsAttemptedTotal ?? 0;
    this.questionsGrandTotal = raw.questionsGrandTotal ?? 0;
    this.iswriteaccess = raw.iswriteaccess ?? false;
    this.ispolicyactive = raw.ispolicyactive ?? false;
    this.totalClaims = raw.totalClaims ?? 0;
    this.quotenumber = raw.quotenumber ?? "";
    this.policynumber = raw.policynumber ?? "";
    this.policyStatus = raw.policyStatus ?? "";
    this.questionRequired = raw.questionRequired ?? false;
  }
}

export class OrderSummaryDetailsResponse {
  declare isentity: boolean;
  declare companyname: string;
  declare insuredfirstname: string;
  declare insuredlastname: string;
  declare contactnumber: string;
  declare address1: string;
  declare address2: string;
  declare city: string;
  declare state: string;
  declare zipcode: string;
  declare orderDetailsResponse: OpenOrderDetailsDto | null;
  declare invoiceHeaderResponse: InvoiceHeaderResponse | null;
  declare coverageEndorsements: string[];
  declare workflowStatus: string;
  constructor(raw: Record<string, any> = {}) {
    this.isentity = raw.isentity ?? false;
    this.companyname = raw.companyname ?? "";
    this.insuredfirstname = raw.insuredfirstname ?? "";
    this.insuredlastname = raw.insuredlastname ?? "";
    this.contactnumber = raw.contactnumber ?? "";
    this.address1 = raw.address1 ?? "";
    this.address2 = raw.address2 ?? "";
    this.city = raw.city ?? "";
    this.state = raw.state ?? "";
    this.zipcode = raw.zipcode ?? "";
    this.orderDetailsResponse = raw.orderDetailsResponse
      ? new OpenOrderDetailsDto(raw.orderDetailsResponse)
      : null;
    this.invoiceHeaderResponse = raw.invoiceHeaderResponse
      ? new InvoiceHeaderResponse(raw.invoiceHeaderResponse)
      : null;
    this.coverageEndorsements = Array.isArray(raw.coverageEndorsements)
      ? raw.coverageEndorsements
      : [];
    this.workflowStatus = raw.workflowStatus ?? "";
  }
}

export class OrderRatingResponse {
  declare id: number;
  declare practicezipcode: string;
  declare effectiveDate: string;
  declare expirationDate: string;
  declare retroDate: string;
  declare coverageLimitId: number;
  declare retroLimitId: number;
  declare coverageLimitTitle: string;
  declare retroLimitTitle: string;
  declare premium: number;
  declare tax: number;
  declare fees: number;
  declare total: number;
  declare parttimeFulltimeFactor: number;
  declare specialtiesid: number;
  declare hoursPerWeekLookName: string;
  declare surgeryId: number;
  declare surgeryName: string;
  declare specialtyTitle: string;
  declare practiceLocation: string;
  declare practiceCity: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.practicezipcode = raw.practicezipcode ?? "";
    this.effectiveDate = raw.effectiveDate ?? "";
    this.expirationDate = raw.expirationDate ?? "";
    this.retroDate = raw.retroDate ?? "";
    this.coverageLimitId = raw.coverageLimitId ?? 0;
    this.retroLimitId = raw.retroLimitId ?? 0;
    this.coverageLimitTitle = raw.coverageLimitTitle ?? "";
    this.retroLimitTitle = raw.retroLimitTitle ?? "";
    this.premium = raw.premium ?? 0;
    this.tax = raw.tax ?? 0;
    this.fees = raw.fees ?? 0;
    this.total = raw.total ?? 0;
    this.parttimeFulltimeFactor = raw.parttimeFulltimeFactor ?? 0;
    this.specialtiesid = raw.specialtiesid ?? 0;
    this.hoursPerWeekLookName = raw.hoursPerWeekLookName ?? "";
    this.surgeryId = raw.surgeryId ?? 0;
    this.surgeryName = raw.surgeryName ?? "";
    this.specialtyTitle = raw.specialtyTitle ?? "";
    this.practiceLocation = raw.practiceLocation ?? "";
    this.practiceCity = raw.practiceCity ?? "";
  }
}

export class OpenOrderDetailsDto {
  declare id: number;
  declare submission: number;
  declare effectiveDate: string;
  declare retroDate: string;
  declare coverageLimitTitle: string;
  declare retrolimitTitle: string;
  declare premium: number;
  declare taxtotal: number;
  declare feestotal: number;
  declare total: number;
  declare ratingPolicyBound: boolean;
  declare expiredDate: string;
  declare invoiceNumber: string;
  declare practicezipcode: string;
  declare hoursPerWeek: string;
  declare workFlowStatus: string;
  declare specialityTitle: string;
  declare specialitiesMasterId: number;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.submission = raw.submission ?? 0;
    this.effectiveDate = raw.effectiveDate ?? "";
    this.retroDate = raw.retroDate ?? "";
    this.coverageLimitTitle = raw.coverageLimitTitle ?? "";
    this.retrolimitTitle = raw.retrolimitTitle ?? "";
    this.premium = raw.premium ?? 0;
    this.taxtotal = raw.taxtotal ?? 0;
    this.feestotal = raw.feestotal ?? 0;
    this.total = raw.total ?? 0;
    this.ratingPolicyBound = raw.ratingPolicyBound ?? false;
    this.expiredDate = raw.expiredDate ?? "";
    this.invoiceNumber = raw.invoiceNumber ?? "";
    this.practicezipcode = raw.practicezipcode ?? "";
    this.hoursPerWeek = raw.hoursPerWeek ?? "";
    this.workFlowStatus = raw.workFlowStatus ?? "";
    this.specialityTitle = raw.specialityTitle ?? "";
    this.specialitiesMasterId = raw.specialitiesMasterId ?? 0;
  }
}

export class OpenOrdersResponse {
  declare submissionid: number;
  declare speciality: string;
  declare effectiveDate: string;
  declare quotenumber: string;
  constructor(raw: Record<string, any> = {}) {
    this.submissionid = raw.submissionid ?? 0;
    this.speciality = raw.speciality ?? "";
    this.effectiveDate = raw.effectiveDate ?? "";
    this.quotenumber = raw.quotenumber ?? "";
  }
}

export class SubmissionDetails {
  declare submissionid: number;
  declare policynumber: string;
  declare effectivedate: string;
  declare expireddate: string;
  declare retrodate: string;
  declare balance: number;
  declare statusname: string;
  declare policystatus: string;
  declare isopenorder: boolean;
  declare ispolicyactive: boolean;
  declare practicezipcode: string;
  declare filterstatus: string;
  declare speciality: string;
  declare insuredName: string;
  declare quotenumber: string;
  constructor(raw: Record<string, any> = {}) {
    this.submissionid = raw.submissionid ?? 0;
    this.policynumber = raw.policynumber ?? "";
    this.effectivedate = raw.effectivedate ?? "";
    this.expireddate = raw.expireddate ?? "";
    this.retrodate = raw.retrodate ?? raw.retroDate ?? raw.retroactivedate ?? "";
    this.balance = raw.balance ?? 0;
    this.statusname = raw.statusname ?? "";
    this.policystatus = raw.policystatus ?? "";
    this.isopenorder = raw.isopenorder ?? false;
    this.ispolicyactive = raw.ispolicyactive ?? false;
    this.practicezipcode = raw.practicezipcode ?? "";
    this.filterstatus = raw.filterstatus ?? "";
    this.speciality = raw.speciality ?? "";
    this.insuredName = raw.insuredName ?? "";
    this.quotenumber = raw.quotenumber ?? "";
  }
}

export class PolicyInfoResponse {
  declare policyNumber: string;
  declare effectiveDate: string;
  declare expirationDate: string;
  declare useremail: string;
  declare amount: number;
  declare insuredName: string;
  constructor(raw: Record<string, any> = {}) {
    this.policyNumber = raw.policyNumber ?? "";
    this.effectiveDate = raw.effectiveDate ?? "";
    this.expirationDate = raw.expirationDate ?? "";
    this.useremail = raw.useremail ?? "";
    this.amount = raw.amount ?? 0;
    this.insuredName = raw.insuredName ?? "";
  }
}

export class CoverageClaimsResponse {
  declare id: number;
  declare title: string;
  declare type: string;
  declare incidentdate: string;
  declare filingdate: string;
  declare monthstofile: number;
  declare total: number;
  declare status: string;
  declare openstatus: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
    this.type = raw.type ?? "";
    this.incidentdate = raw.incidentdate ?? "";
    this.filingdate = raw.filingdate ?? "";
    this.monthstofile = raw.monthstofile ?? 0;
    this.total = raw.total ?? 0;
    this.status = raw.status ?? "";
    this.openstatus = raw.openstatus ?? false;
  }
}

export class ExclusionResponse {
  declare id: number;
  declare title: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
  }
}

export class RequiredItemResponse {
  declare id: number;
  declare title: string;
  declare received: boolean;
  declare status: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
    this.received = raw.received ?? false;
    this.status = raw.status ?? "";
  }
}

export class PrimaryInsuredDataDto {
  declare firstname: string;
  declare lastname: string;
  declare companyname: string;
  declare insuredtype: string;
  declare gender: string;
  declare dob: string;
  declare industrycode: string;
  declare paymenttermid: number;
  declare email: string;
  declare licenseNumber: string;
  declare npiNumber: string;
  declare ssn: string;
  constructor(raw: Record<string, any> = {}) {
    this.firstname = raw.firstname ?? "";
    this.lastname = raw.lastname ?? "";
    this.companyname = raw.companyname ?? "";
    this.insuredtype = raw.insuredtype ?? "";
    this.gender = raw.gender ?? "";
    this.dob = raw.dob ?? "";
    this.industrycode = raw.industrycode ?? "";
    this.paymenttermid = raw.paymenttermid ?? 0;
    this.email = raw.email ?? "";
    this.licenseNumber = raw.licenseNumber ?? "";
    this.npiNumber = raw.npiNumber ?? "";
    this.ssn = raw.ssn ?? ""; // SSN / Tax Id — mirrors `insured.taxid`.
  }
}

export class PaymentTermResponse {
  declare id: number;
  declare title: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
  }
}

export class InvoiceHeaderResponse {
  declare id: number;
  declare policynumber: string;
  declare invoicedate: string;
  declare effectivedate: string;
  declare paymentDays: number;
  declare invoiceamount: number;
  declare balance: number;
  declare balanceDue: number;
  declare appliedAmount: number;
  declare invoiceStatus: string;
  declare countAppliedAmount: number;
  declare totalPremium: number;
  declare totalFees: number;
  declare totalTaxes: number;
  declare totalCommission: number;
  declare paymentduedate: string;
  declare voided: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.policynumber = raw.policynumber ?? "";
    this.invoicedate = raw.invoicedate ?? "";
    this.effectivedate = raw.effectivedate ?? "";
    this.paymentDays = raw.paymentDays ?? 0;
    this.invoiceamount = raw.invoiceamount ?? 0;
    this.balance = raw.balance ?? 0;
    this.balanceDue = raw.balanceDue ?? 0;
    this.appliedAmount = raw.appliedAmount ?? 0;
    this.invoiceStatus = raw.invoiceStatus ?? "";
    this.countAppliedAmount = raw.countAppliedAmount ?? 0;
    this.totalPremium = raw.totalPremium ?? 0;
    this.totalFees = raw.totalFees ?? 0;
    this.totalTaxes = raw.totalTaxes ?? 0;
    this.totalCommission = raw.totalCommission ?? 0;
    this.paymentduedate = raw.paymentduedate ?? "";
    this.voided = raw.voided ?? false;
  }
}

export class SendToCloseResponse {
  declare policystatus: string;
  declare statusname: string;
  constructor(raw: Record<string, any> = {}) {
    this.policystatus = raw.policystatus ?? "";
    this.statusname = raw.statusname ?? "";
  }
}

export class DocuSignEmbeddedSigningResponse {
  declare signingUrl: string;
  declare envelopeId: string;
  declare signedCompleted: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.signingUrl = raw.signingUrl ?? ""; // DocuSign embedded signing ceremony URL
    this.envelopeId = raw.envelopeId ?? ""; // DocuSign envelope id
    this.signedCompleted = raw.signedCompleted ?? false;
  }
}
