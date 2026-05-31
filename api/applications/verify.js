const { getJsonBody, handleOptions, sendJson } = require("../_cashfree");
const { updateApplicationVerification } = require("../_applications");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const body = getJsonBody(request);
  const password = String(request.query.password || body.password || "");

  if (adminPassword && password !== adminPassword) {
    return sendJson(response, 401, { error: "Invalid admin password." });
  }

  if (!adminPassword) {
    return sendJson(response, 500, { error: "ADMIN_PASSWORD is not configured." });
  }

  const applicationId = String(body.applicationId || "").trim();

  if (!applicationId) {
    return sendJson(response, 400, { error: "applicationId is required." });
  }

  const updated = await updateApplicationVerification(applicationId, {
    status: body.status,
    remarks: body.remarks,
    verifiedBy: body.verifiedBy
  });

  if (!updated) {
    return sendJson(response, 404, { error: "Application not found." });
  }

  return sendJson(response, 200, {
    ok: true,
    applicationId: updated.applicationId,
    verification: updated.verification
  });
};
