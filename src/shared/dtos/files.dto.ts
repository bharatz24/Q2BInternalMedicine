// Derived from weborder.json (OpenAPI). Now hand-maintained (no generator in
// this repo). Domain: files. Each class copies fields from an untyped API
// response (`raw`) with safe defaults; `declare` lines are type-only.

export class FileDetails {
  declare id: number;
  declare fileid: string;
  declare size: number;
  declare name: string;
  declare type: string;
  declare parentid: string;
  declare description: string;
  declare istrace: boolean;
  declare isallowdelete: boolean;
  declare fileTaggingMappings: FileTaggingMapping[];
  declare createdDate: string;
  declare lastModifiedDate: string;
  declare userAbbrivation: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.fileid = raw.fileid ?? "";
    this.size = raw.size ?? 0;
    this.name = raw.name ?? "";
    this.type = raw.type ?? "";
    this.parentid = raw.parentid ?? "";
    this.description = raw.description ?? "";
    this.istrace = raw.istrace ?? false;
    this.isallowdelete = raw.isallowdelete ?? false;
    this.fileTaggingMappings = Array.isArray(raw.fileTaggingMappings)
      ? raw.fileTaggingMappings.map((x) => new FileTaggingMapping(x))
      : [];
    this.createdDate = raw.createdDate ?? "";
    this.lastModifiedDate = raw.lastModifiedDate ?? "";
    this.userAbbrivation = raw.userAbbrivation ?? "";
  }
}

export class FileDetailsResponse {
  declare id: number;
  declare fileid: string;
  declare size: number;
  declare name: string;
  declare type: string;
  declare fileDetailsid: number;
  declare createdDate: string;
  declare createdBy: string;
  declare userAbbrivation: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.fileid = raw.fileid ?? "";
    this.size = raw.size ?? 0;
    this.name = raw.name ?? "";
    this.type = raw.type ?? "";
    this.fileDetailsid = raw.fileDetailsid ?? 0;
    this.createdDate = raw.createdDate ?? "";
    this.createdBy = raw.createdBy ?? "";
    this.userAbbrivation = raw.userAbbrivation ?? "";
  }
}

export class FileTaggingMapping {
  declare id: number;
  declare masterTag: string;
  declare name: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.masterTag = raw.masterTag ?? "";
    this.name = raw.name ?? "";
  }
}

/**
 * Rename a required-item file (`PUT /api/weborder/v1/files/{id}/rename`).
 * Path `{id}` is module id; body identifies the file row.
 */
export class UpdateFileRequest {
  declare fileid: string;
  declare filename: string;
  constructor(raw: Record<string, any> = {}) {
    this.fileid = raw.fileid ?? ""; // File record id to rename.
    this.filename = raw.filename ?? ""; // New display filename.
  }
}

/**
 * Multipart upload for required-item files (`POST
 * /api/weborder/v1/files/upload`). Form field names match property names;
 * **submissionid** required.
 */
export class UploadFileRequest {
  declare file: string[];
  declare submissionid: number;
  declare itemid: number;
  constructor(raw: Record<string, any> = {}) {
    this.file = Array.isArray(raw.file) ? raw.file : []; // One or more files (part name `file`)
    this.submissionid = raw.submissionid ?? 0; // Required-items module id / submission context id (numeric string).
    this.itemid = raw.itemid ?? 0; // Required-items module id (numeric).
  }
}

export class UploadFileResponse {
  declare fileDetails: FileDetails[];
  declare submodulefiles: FileDetailsResponse[];
  declare fileCount: number;
  declare moduleFileCount: number;
  constructor(raw: Record<string, any> = {}) {
    this.fileDetails = Array.isArray(raw.fileDetails)
      ? raw.fileDetails.map((x) => new FileDetails(x))
      : [];
    this.submodulefiles = Array.isArray(raw.submodulefiles)
      ? raw.submodulefiles.map((x) => new FileDetailsResponse(x))
      : [];
    this.fileCount = raw.fileCount ?? 0;
    this.moduleFileCount = raw.moduleFileCount ?? 0;
  }
}

export class NotesDto {
  declare id: number;
  declare description: string;
  constructor(raw: Record<string, any> = {}) {
    this.id = raw.id ?? 0;
    this.description = raw.description ?? "";
  }
}
