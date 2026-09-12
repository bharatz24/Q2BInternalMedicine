// Originally generated from weborder.json (OpenAPI). Hand-edited since —
// e.g. `InsuredAuthSessionResponse` was extended to read `name`,
// `username`, `firstname`, `lastname` which the backend ships but the spec
// schema omits. If you re-run scripts/gen-dtos.py, re-apply those fields
// (and update the spec to match) before committing.
// Domain: auth

import { OpenOrdersResponse } from "./insured.dto";

export class InsuredAuthSessionResponse {
  declare type: string;
  declare id: number;
  declare submissionId: number;
  declare openOrders: OpenOrdersResponse[];
  declare abbreviation: string;
  declare refreshTokenExpirationTime: number;
  declare name: string;
  declare username: string;
  declare firstname: string;
  declare lastname: string;
  constructor(raw: Record<string, any> = {}) {
    this.type = raw.type ?? "";
    this.id = raw.id ?? 0;
    this.submissionId = raw.submissionId ?? 0;
    this.openOrders = Array.isArray(raw.openOrders)
      ? raw.openOrders.map((x) => new OpenOrdersResponse(x))
      : [];
    this.abbreviation = raw.abbreviation ?? "";
    this.refreshTokenExpirationTime = raw.refreshTokenExpirationTime ?? 0;
    this.name = raw.name ?? "";
    this.username = raw.username ?? "";
    this.firstname = raw.firstname ?? "";
    this.lastname = raw.lastname ?? "";
  }
}

export class InsuredAuthToken {
  declare type: string;
  declare id: number;
  declare submissionId: number;
  declare openOrders: OpenOrdersResponse[];
  declare abbreviation: string;
  declare refreshTokenExpirationTime: number;
  constructor(raw: Record<string, any> = {}) {
    this.type = raw.type ?? "";
    this.id = raw.id ?? 0;
    this.submissionId = raw.submissionId ?? 0;
    this.openOrders = Array.isArray(raw.openOrders)
      ? raw.openOrders.map((x) => new OpenOrdersResponse(x))
      : [];
    this.abbreviation = raw.abbreviation ?? "";
    this.refreshTokenExpirationTime = raw.refreshTokenExpirationTime ?? 0;
  }
}

/**
 * SSP web-order login. **username** is the insured email. **password** must
 * satisfy the regex: at least 6 characters, uppercase, lowercase, digit, and
 * special character (@$!%*?&).
 */
export class InsuredLoginRequest {
  declare username: string;
  declare password: string;
  constructor(raw: Record<string, any> = {}) {
    this.username = raw.username ?? ""; // Insured email address (used as username).
    this.password = raw.password ?? ""; // Account password. Min 6 characters; must include upper and lower case, a digit, and a spec...
  }
}

/**
 * Google ID token for SSP sign-in (`POST .../auth/sign-in-with-google`).
 */
export class GoogleTokenRequest {
  declare googletoken: string;
  constructor(raw: Record<string, any> = {}) {
    this.googletoken = raw.googletoken ?? ""; // Google ID token (JWT) from client sign-in.
  }
}

export class GoogleTokenResponse {
  declare clientId: string;
  constructor(raw: Record<string, any> = {}) {
    this.clientId = raw.clientId ?? "";
  }
}

export class GoogleDataResponse {
  declare firstname: string;
  declare lastname: string;
  declare email: string;
  constructor(raw: Record<string, any> = {}) {
    this.firstname = raw.firstname ?? "";
    this.lastname = raw.lastname ?? "";
    this.email = raw.email ?? "";
  }
}

/**
 * Validate password-reset link token (`POST .../auth/password/change`).
 */
export class ChangePasswordRequest {
  declare token: string;
  constructor(raw: Record<string, any> = {}) {
    this.token = raw.token ?? ""; // Password-reset token from email link.
  }
}

export class ChangePasswordResponse {
  declare valid: boolean;
  declare email: string;
  constructor(raw: Record<string, any> = {}) {
    this.valid = raw.valid ?? false;
    this.email = raw.email ?? "";
  }
}

/**
 * Forgot password (`POST .../auth/password/forgot`). **404** if email not
 * registered.
 */
export class ForgotPasswordRequest {
  declare email: string;
  declare clientId: string;
  constructor(raw: Record<string, any> = {}) {
    this.email = raw.email ?? ""; // Insured account email (username).
    this.clientId = raw.clientId ?? ""; // Optional broker/client identifier for email template routing.
  }
}

/**
 * Complete password reset (`POST .../auth/password/update`).
 */
export class UpdatePasswordRequest {
  declare token: string;
  declare newpassword: string;
  constructor(raw: Record<string, any> = {}) {
    this.token = raw.token ?? ""; // Password-reset token from email link.
    this.newpassword = raw.newpassword ?? ""; // New password (6–128 characters). Must include upper and lower case, a digit, and a special...
  }
}

export class UpdatePasswordResponse {
  declare updated: boolean;
  constructor(raw: Record<string, any> = {}) {
    this.updated = raw.updated ?? false;
  }
}

export class MessageResponse {
  declare code: number;
  declare message: string;
  constructor(raw: Record<string, any> = {}) {
    this.code = raw.code ?? 0;
    this.message = raw.message ?? "";
  }
}

export class BrokersResponse {
  declare id: number;
  declare name: string;
  declare brokerspecialities: SpecialityIdAndClientUrl[];
  declare brokerAbbrivation: string;
  declare brokerProfile: string[];
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.name = raw.name ?? "";
    this.brokerspecialities = Array.isArray(raw.brokerspecialities)
      ? raw.brokerspecialities.map((x) => new SpecialityIdAndClientUrl(x))
      : [];
    this.brokerAbbrivation = raw.brokerAbbrivation ?? "";
    this.brokerProfile = Array.isArray(raw.brokerProfile) ? raw.brokerProfile : [];
  }
}

export class SpecialityMasterResponse {
  declare id: number;
  declare title: string;
  declare abbreviation: string;
  declare specialitiesCategory: string;
  declare description: string;
  declare speiclaityRandomCode: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.title = raw.title ?? "";
    this.abbreviation = raw.abbreviation ?? "";
    this.specialitiesCategory = raw.specialitiesCategory ?? "";
    this.description = raw.description ?? "";
    this.speiclaityRandomCode = raw.speiclaityRandomCode ?? "";
  }
}

export class SpecialitiesCategoryResponse {
  declare id: number;
  declare name: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.name = raw.name ?? "";
  }
}

export class SpecialityIdAndClientUrl {
  declare id: number;
  declare speiclaityRandomCode: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.speiclaityRandomCode = raw.speiclaityRandomCode ?? "";
  }
}

export class SpecialityFactorTypeResponse {
  declare id: number;
  declare factortype: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.factortype = raw.factortype ?? "";
  }
}

export class ZipcodeDetailsRespose {
  declare st: string;
  declare county: string;
  declare state: string;
  declare city: string;
  declare defense: string;
  constructor(raw: Record<string, any> = {}) {
    this.st = raw.st ?? "";
    this.county = raw.county ?? "";
    this.state = raw.state ?? "";
    this.city = raw.city ?? "";
    this.defense = raw.defense ?? "";
  }
}
