import { createContext, useContext, useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { ORANGE, ORANGE_BG, RED } from "@/shared/constants";
import { labelBase } from "@/shared/utils/styles";

/**
 * Form field shell: label, optional required mark, hint, control, and error.
 *
 * The label is now programmatically associated with the control it wraps
 * (REACT_FRONTEND_AUDIT.md §5 blocker). `Field` mints an id, renders
 * `<label htmlFor>`, and publishes the id + `aria-describedby` (hint/error)
 * + `aria-invalid` + `aria-required` through context; `TextInput`,
 * `PasswordInput` and any raw `<input>/<select>/<textarea>` pick them up with
 * `useFieldControlProps()`.
 */

interface FieldControl {
  controlId: string;
  describedBy?: string;
  invalid: boolean;
  required: boolean;
}

const FieldControlContext = createContext<FieldControl | null>(null);

/**
 * Publishes the id / ARIA wiring to descendant controls. Used by `Field` and
 * by other label+control wrappers that aren't `Field` (e.g. the landing
 * calculator's `CalcField`).
 */
export const FieldControlProvider = FieldControlContext.Provider;

/** Mint a stable control id + derived hint/error ids for a label+control pair. */
export function useControlIds(opts: { hint?: boolean; error?: boolean; htmlFor?: string }) {
  const uid = useId();
  const controlId = opts.htmlFor || `field-${uid}`;
  const hintId = opts.hint ? `${controlId}-hint` : undefined;
  const errorId = opts.error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  return { controlId, hintId, errorId, describedBy };
}

/**
 * Spread onto a form control to inherit the id / ARIA wiring from the
 * enclosing `<Field>`. Returns an empty object when used outside a `<Field>`.
 */
export function useFieldControlProps(): {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
} {
  const ctx = useContext(FieldControlContext);
  if (!ctx) return {};
  return {
    id: ctx.controlId,
    "aria-describedby": ctx.describedBy,
    "aria-invalid": ctx.invalid ? true : undefined,
    "aria-required": ctx.required ? true : undefined,
  };
}

interface FieldProps {
  label: ReactNode;
  badge?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
  /** Override the generated control id (rare — e.g. to match an external label). */
  htmlFor?: string;
}

export const Field = ({
  label,
  badge,
  required,
  hint,
  error,
  children,
  style: extra,
  htmlFor,
}: FieldProps) => {
  const uid = useId();
  const controlId = htmlFor || `field-${uid}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const ctx: FieldControl = {
    controlId,
    describedBy,
    invalid: Boolean(error),
    required: Boolean(required),
  };

  return (
    <div style={{ marginBottom: 14, ...extra }}>
      <label htmlFor={controlId} style={labelBase}>
        {label}
        {required && (
          <span style={{ color: RED, marginLeft: 4 }} aria-hidden="true">
            *
          </span>
        )}
        {badge && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: ORANGE,
              background: ORANGE_BG,
              padding: "2px 8px",
              borderRadius: 10,
              marginLeft: 6,
              verticalAlign: "middle",
            }}
          >
            {badge}
          </span>
        )}
      </label>
      {hint && (
        <div
          id={hintId}
          style={{
            fontSize: 11,
            color: "#595959",
            marginBottom: 6,
            lineHeight: 1.4,
            marginTop: -2,
          }}
        >
          {hint}
        </div>
      )}
      <FieldControlContext.Provider value={ctx}>{children}</FieldControlContext.Provider>
      {error && (
        <div
          id={errorId}
          role="alert"
          style={{ fontSize: 11, color: "#b00020", marginTop: 4, lineHeight: 1.4 }}
        >
          {error}
        </div>
      )}
    </div>
  );
};
