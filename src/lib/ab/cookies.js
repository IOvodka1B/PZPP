import { cookies } from "next/headers";
import { getVisitorCookieNames, parseAssignmentCookie, serializeAssignmentCookie } from "./assignment";

function generateVisitorId() {
  return `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getVisitorIdFromCookies() {
  const cookieStore = await cookies();
  const { VISITOR_COOKIE, LEGACY_VISITOR_COOKIE } = getVisitorCookieNames();
  return cookieStore.get(VISITOR_COOKIE)?.value || cookieStore.get(LEGACY_VISITOR_COOKIE)?.value || null;
}

export async function getVariantAssignmentForTest(testId) {
  const cookieStore = await cookies();
  const { ASSIGNMENT_COOKIE } = getVisitorCookieNames();
  const assignments = parseAssignmentCookie(cookieStore.get(ASSIGNMENT_COOKIE)?.value || "");
  return assignments[testId] || null;
}

export function buildClientBootstrapScript(preselected) {
  const { VISITOR_COOKIE, LEGACY_VISITOR_COOKIE, ASSIGNMENT_COOKIE } = getVisitorCookieNames();
  const payload = JSON.stringify(preselected || {});
  return `(function(){var maxAge=60*60*24*365;function getCookie(name){var m=document.cookie.match(new RegExp('(?:^|; )'+name+'=([^;]*)'));return m?decodeURIComponent(m[1]):'';}function setCookie(name,value){document.cookie=name+'='+encodeURIComponent(value)+'; path=/; max-age='+maxAge+'; SameSite=Lax';}
if(!getCookie('${VISITOR_COOKIE}')){var id='${generateVisitorId()}';setCookie('${VISITOR_COOKIE}',id);if(!getCookie('${LEGACY_VISITOR_COOKIE}')){setCookie('${LEGACY_VISITOR_COOKIE}',id);}}
var existing=getCookie('${ASSIGNMENT_COOKIE}');var map={};try{if(existing){map=JSON.parse(existing)||{};}}catch(e){map={};}
var incoming=${payload};var changed=false;Object.keys(incoming).forEach(function(key){if(incoming[key]&&map[key]!==incoming[key]){map[key]=incoming[key];changed=true;}});
if(changed||!existing){setCookie('${ASSIGNMENT_COOKIE}',JSON.stringify(map));}})();`;
}

export function extractABFromRequestCookies(cookieHeader) {
  const { VISITOR_COOKIE, LEGACY_VISITOR_COOKIE, ASSIGNMENT_COOKIE } = getVisitorCookieNames();
  const raw = cookieHeader || "";
  const map = Object.fromEntries(
    raw
      .split(";")
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .map((chunk) => {
        const index = chunk.indexOf("=");
        if (index < 0) return [chunk, ""];
        return [chunk.slice(0, index), decodeURIComponent(chunk.slice(index + 1))];
      })
  );
  const visitorId = map[VISITOR_COOKIE] || map[LEGACY_VISITOR_COOKIE] || null;
  const assignments = parseAssignmentCookie(map[ASSIGNMENT_COOKIE] || "");
  return { visitorId, assignments, assignmentCookie: serializeAssignmentCookie(assignments) };
}
