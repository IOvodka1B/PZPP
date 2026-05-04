const VISITOR_COOKIE = "ab_visitor_id";
const LEGACY_VISITOR_COOKIE = "funnel_visitor_id";
const ASSIGNMENT_COOKIE = "ab_assignments";

function hashString(input) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function pickVariantByWeight(variants, seedSource) {
  const total = variants.reduce((sum, variant) => sum + Number(variant.trafficWeight || 0), 0);
  if (total <= 0) return variants[0];

  const seed = hashString(seedSource) % total;
  let cursor = seed;
  for (const variant of variants) {
    cursor -= Number(variant.trafficWeight || 0);
    if (cursor < 0) return variant;
  }
  return variants[variants.length - 1];
}

export function parseAssignmentCookie(raw) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed) return parsed;
  } catch {
    return {};
  }
  return {};
}

export function serializeAssignmentCookie(assignments) {
  return JSON.stringify(assignments);
}

export function getVisitorCookieNames() {
  return { VISITOR_COOKIE, LEGACY_VISITOR_COOKIE, ASSIGNMENT_COOKIE };
}
