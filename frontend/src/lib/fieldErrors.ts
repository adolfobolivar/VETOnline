/** Maps a FastAPI/Pydantic 422 body ({"detail": [{"loc": ["body", field], "msg": ...}, ...]})
 * to a field-name -> message record. Shared by every form since the shape is the same
 * regardless of which fields a given schema validates. */
export function parseFieldErrors(body: unknown): Record<string, string> {
  const errors: Record<string, string> = {};
  if (
    typeof body === "object" &&
    body !== null &&
    "detail" in body &&
    Array.isArray((body as { detail: unknown }).detail)
  ) {
    for (const item of (body as { detail: unknown[] }).detail) {
      if (
        typeof item === "object" &&
        item !== null &&
        "loc" in item &&
        Array.isArray((item as { loc: unknown }).loc)
      ) {
        const loc = (item as { loc: unknown[] }).loc;
        const field = loc[loc.length - 1];
        const type = (item as { type?: string }).type;
        const msg = (item as { msg?: string }).msg;
        if (typeof field === "string") {
          errors[field] = friendlyMessage(field, type, msg);
        }
      }
    }
  }
  return errors;
}

function friendlyMessage(field: string, type: string | undefined, msg: string | undefined): string {
  // design-mockup.html's own example text for this exact case (UC-003/006 telephone field).
  if (field === "telephone" && type === "string_pattern_mismatch") {
    return "Telephone must be exactly 10 digits.";
  }
  if (type === "missing" || type === "string_too_short") {
    return "This field is required.";
  }
  return msg ?? "This field is invalid.";
}
