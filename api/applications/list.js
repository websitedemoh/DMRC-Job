const { handleOptions, sendJson } = require("../_cashfree");
const { createSignedUrl, listApplications } = require("../_applications");

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "GET") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  const password = request.query.password;

  if (adminPassword && password !== adminPassword) {
    return sendJson(response, 401, { error: "Invalid admin password." });
  }

  if (!adminPassword) {
    return sendJson(response, 500, { error: "ADMIN_PASSWORD is not configured." });
  }

  const applications = await listApplications();
  const withLinks = await Promise.all(applications.map(async (application) => ({
    ...application,
    fileLinks: {
      photo: await createSignedUrl(application.files?.photo),
      marksheet: await createSignedUrl(application.files?.marksheet),
      aadhar: await createSignedUrl(application.files?.aadhar),
      categoryCertificate: await createSignedUrl(application.files?.categoryCertificate)
    }
  })));

  return sendJson(response, 200, {
    ok: true,
    applications: withLinks
  });
};
