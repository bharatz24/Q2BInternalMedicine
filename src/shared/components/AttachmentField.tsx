import { useId } from "react";
import { RED } from "@/shared/constants";
import { useStore } from "@/shared/store/useStore";
import cvStore, { ACCEPTED_DOC_EXTENSIONS, type DocSlot } from "@/modules/Quote/store/cvStore";

interface AttachmentFieldProps {
  slot: DocSlot;
  label: string;
  hint?: string;
}

/**
 * One document attachment (a native file input with its own `<label>` —
 * no Nursing/Nfy/Student component existed to reuse). The file lives in
 * `cvStore` memory only; see that store's header for why nothing is
 * persisted or uploaded. Optional by design: the carrier requests these
 * through the submission's requirement items, not this field.
 */
export function AttachmentField({ slot, label, hint }: AttachmentFieldProps) {
  const inputId = useId();
  // Primitive selectors only (see `useStore`'s header).
  const fileName = useStore(cvStore, (s) => s.metaFor(slot)?.name ?? "");
  const sizeLabel = useStore(cvStore, (s) => s.metaFor(slot)?.sizeLabel ?? "");
  const error = useStore(cvStore, (s) => s.errorFor(slot) ?? "");

  return (
    <div style={{ marginBottom: 12 }}>
      <label
        htmlFor={inputId}
        style={{ display: "block", fontSize: 12, fontWeight: 500, color: "#333", marginBottom: 4 }}
      >
        {label}
      </label>
      {hint && (
        <div style={{ fontSize: 11, color: "#595959", marginBottom: 6, lineHeight: 1.4 }}>
          {hint}
        </div>
      )}
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_DOC_EXTENSIONS}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) cvStore.attach(slot, file);
          // Reset so re-picking the same file still fires onChange.
          e.target.value = "";
        }}
        style={{ fontSize: 12, fontFamily: "var(--font-body)" }}
      />
      {fileName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#333",
            marginTop: 6,
          }}
        >
          <span>
            Attached: <strong>{fileName}</strong>
            {sizeLabel ? ` (${sizeLabel})` : ""}
          </span>
          <button
            type="button"
            onClick={() => cvStore.detach(slot)}
            style={{
              background: "none",
              border: 0,
              padding: 0,
              font: "inherit",
              fontSize: 12,
              color: RED,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        </div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 11, color: RED, marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
