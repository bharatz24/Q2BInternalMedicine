/**
 * Profile API surface. Talks to INS-SERVICE for real.
 */
import axios from "axios";
import { apiUrl, logApiError } from "@/shared/services/config";
import {
  ContactResponse,
  InsureWithLocationUpdatedRequest,
  LocationMasterResponse,
  PrimaryInsuredDataDto,
} from "@/shared/dtos";

/**
 * `GET /insured/details` returns `PrimaryInsuredDataDto` (firstname, lastname,
 * companyname, insuredtype, gender, `dob` as "MM/dd/yyyy", email,
 * licenseNumber, npiNumber) — NOT the id/username/abbreviation shape.
 */
export const fetchInsuredDetails = async (): Promise<PrimaryInsuredDataDto> => {
  try {
    const response = await axios.get(apiUrl("/insured/details"), { withCredentials: true });
    return new PrimaryInsuredDataDto(response.data);
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

export const fetchInsuredContacts = async (): Promise<ContactResponse[]> => {
  try {
    const response = await axios.get(apiUrl("/insured/contacts"), { withCredentials: true });
    return Array.isArray(response.data)
      ? response.data.map((c: any) => new ContactResponse(c))
      : [];
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 404) return [];
    logApiError(error);
    throw error;
  }
};

export const fetchInsuredLocations = async (): Promise<LocationMasterResponse[]> => {
  try {
    const response = await axios.get(apiUrl("/insured/locations"), { withCredentials: true });
    return Array.isArray(response.data)
      ? response.data.map((l: any) => new LocationMasterResponse(l))
      : [];
  } catch (error) {
    logApiError(error);
    throw error;
  }
};

/** Update the insured master + location together. */
export const putInsuredWithLocation = async (
  payload: Partial<InsureWithLocationUpdatedRequest>,
): Promise<any> => {
  try {
    const request = new InsureWithLocationUpdatedRequest(payload as Record<string, any>);
    const response = await axios.put(apiUrl("/insured/with-location"), request, {
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    logApiError(error);
    throw error;
  }
};
