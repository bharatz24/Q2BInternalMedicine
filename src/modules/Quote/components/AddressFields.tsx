import type { ReactNode } from "react";
import { Field } from "@/shared/components/Field";
import { TextInput } from "@/shared/components/TextInput";
import {
  isValidState,
  isValidZip,
  invalidMessage,
  VALIDATION_MSG,
} from "@/shared/utils/validators";

/**
 * Address block matching the paper application — street, city, state, ZIP.
 * Used for home, school, and hospital (the three address lines on the form).
 */
interface AddressValue {
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface AddressFieldsProps {
  label: ReactNode;
  value?: AddressValue | null;
  onChange: (field: string, value: string) => void;
  /** scopes the browser's autofill so the three blocks don't fill each other in */
  autoCompleteSection?: string;
  required?: boolean;
}

export function AddressFields({
  label,
  value,
  onChange,
  autoCompleteSection = "",
  required = true,
}: AddressFieldsProps) {
  const section = autoCompleteSection ? `section-${autoCompleteSection} ` : "";
  const v: AddressValue = value || {};
  const stateErr = invalidMessage(v.state, isValidState, VALIDATION_MSG.state);
  const zipErr = invalidMessage(v.zip, isValidZip, VALIDATION_MSG.zip);

  return (
    <>
      <Field label={label} required={required}>
        <TextInput
          value={v.address1 || ""}
          onChange={(x) => onChange("address1", x)}
          placeholder="Street address"
          autoComplete={`${section}address-line1`}
        />
      </Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Field label="City" required={required} style={{ flex: 2 }}>
          <TextInput
            value={v.city || ""}
            onChange={(x) => onChange("city", x)}
            placeholder="City"
            autoComplete={`${section}address-level2`}
          />
        </Field>
        <Field label="State" required={required} error={stateErr} style={{ flex: 1 }}>
          <TextInput
            value={v.state || ""}
            // Two-letter code, upper-cased as the user types so the stored
            // value is always comparable.
            onChange={(x) =>
              onChange(
                "state",
                x
                  .replace(/[^A-Za-z]/g, "")
                  .slice(0, 2)
                  .toUpperCase(),
              )
            }
            placeholder="CA"
            maxLength={2}
            pattern="[A-Za-z]{2}"
            title="Two-letter state code"
            autoComplete={`${section}address-level1`}
          />
        </Field>
        <Field label="ZIP" required={required} error={zipErr} style={{ flex: 1 }}>
          <TextInput
            value={v.zip || ""}
            onChange={(x) => onChange("zip", x.replace(/\D/g, "").slice(0, 5))}
            placeholder="92653"
            inputMode="numeric"
            maxLength={5}
            pattern="\d{5}"
            title="5-digit ZIP code"
            autoComplete={`${section}postal-code`}
          />
        </Field>
      </div>
    </>
  );
}

/** True when an address block has the fields a carrier would need. */
export function isAddressComplete(address: any) {
  const a = address || {};
  return Boolean(
    String(a.address1 || "").trim() &&
    String(a.city || "").trim() &&
    isValidState(a.state) &&
    isValidZip(a.zip),
  );
}
