"use client";

import { useEffect, useRef, useState } from "react";

interface Field {
  name: string;
  value: string | number;
}

interface Props {
  /** The server action that performs the delete. */
  action: (formData: FormData) => void | Promise<void>;
  /** Hidden fields the action needs (e.g. id, from). */
  fields: Field[];
  /** Button label, e.g. "Delete". */
  label?: string;
  /** Modal heading, e.g. "Delete schedule entry?". */
  title: string;
  /** One-line explanation of what will be removed. */
  message: string;
  /** Button styling — defaults to the small danger button. */
  className?: string;
}

/**
 * A Delete button that never fires immediately: it opens a modal asking
 * Yes / Cancel first. Used by the admin and faculty tables.
 */
export default function ConfirmDelete({
  action,
  fields,
  label = "Delete",
  title,
  message,
  className = "btn btn-small btn-danger",
}: Props) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus Cancel on open so Enter never confirms by accident.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  // Escape closes the modal.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-message"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="modal-title">{title}</h3>
            <p id="modal-message">{message}</p>

            <div className="modal-actions">
              <button
                ref={cancelRef}
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <form action={action}>
                {fields.map((f) => (
                  <input key={f.name} type="hidden" name={f.name} value={f.value} />
                ))}
                <button type="submit" className="btn btn-danger">
                  Yes, delete
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
