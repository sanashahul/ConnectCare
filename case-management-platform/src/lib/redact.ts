// Best-effort scrubbing of free text before it leaves our servers (AI requests).
// It is a safety net, not a guarantee: staff are also told not to type identifying details.

export function redactIdentifiers(text: string, knownNames: string[] = []): string {
  let out = text;
  for (const name of knownNames) {
    const n = name.trim();
    if (n.length < 2) continue;
    out = out.replace(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "[name]");
  }
  return out
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[ssn]")
    .replace(/(\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, "[phone]")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "[date]")
    .replace(/\b(19|20)\d{2}-\d{2}-\d{2}\b/g, "[date]")
    .replace(/\b\d{5,}\b/g, "[number]")
    .replace(/\b\d+\s+[A-Z][a-z]+\s+(St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Way|Ct)\b\.?/g, "[address]");
}
