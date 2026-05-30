const { handleOptions, sendJson } = require("../_cashfree");
const { saveApplicationRecord } = require("../_applications");

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb"
    }
  }
};

module.exports = async function handler(request, response) {
  if (handleOptions(request, response)) {
    return;
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  try {
    const application = await saveApplicationRecord(request.body || {});

    return sendJson(response, 200, {
      ok: true,
      applicationId: application.applicationId,
      acknowledgement: application.acknowledgement,
      paymentStatus: application.paymentStatus
    });
  } catch (error) {
    return sendJson(response, 400, { error: error.message });
  }
};
