const openApplyForm = document.getElementById("openApplyForm");
const applyFormLinks = document.querySelectorAll(".apply-form-link");
const closeApplyForm = document.getElementById("closeApplyForm");
const applicationModal = document.getElementById("application-modal");
const applicationForm = document.getElementById("dmrcApplicationForm");
const categoryInput = document.getElementById("category");
const feeAmount = document.getElementById("feeAmount");
const ackBox = document.getElementById("acknowledgementBox");
const ackNumber = document.getElementById("ackNumber");
const downloadPdf = document.getElementById("downloadPdf");
const photoInput = document.getElementById("candidatePhoto");
const marksheetInput = document.getElementById("marksheetFile");
const aadharInput = document.getElementById("aadharFile");
const categoryCertificateInput = document.getElementById("categoryCertificateFile");
const categoryCertificateHint = document.getElementById("categoryCertificateHint");

const servicesByCode = {
  OBC_CATEGORY: {
    name: "OBC Category",
    amount: 350
  },
  GEN_CATEGORY: {
    name: "GEN Category",
    amount: 400
  },
  ST_CATEGORY: {
    name: "ST Category",
    amount: 250
  },
  SC_CATEGORY: {
    name: "SC Category",
    amount: 250
  }
};

const apiBaseUrl = (window.DMRC_API_BASE_URL || "").replace(/\/$/, "");
const isGithubPages = window.location.hostname.endsWith("github.io");
const maxUploadSizeBytes = 5 * 1024 * 1024;

let uploadedPhoto = null;
let uploadedMarksheet = null;
let uploadedAadhar = null;
let uploadedCategoryCertificate = null;
let submittedData = null;

function getApiUrl(path) {
  if (apiBaseUrl) {
    return `${apiBaseUrl}${path}`;
  }

  if (isGithubPages) {
    throw new Error("Payment backend is not available on GitHub Pages. Please open the Vercel deployment or set DMRC_API_BASE_URL to your backend URL.");
  }

  return path;
}

async function readJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (!contentType.includes("application/json")) {
    throw new Error("Payment backend did not return JSON. Please make sure the Vercel backend is deployed and reachable.");
  }

  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(getApiUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Payment request failed.");
  }

  return data;
}

async function getJson(url) {
  const response = await fetch(getApiUrl(url));
  const data = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.error || "Payment request failed.");
  }

  return data;
}

function formatCurrency(amount) {
  return `\u20b9${amount} INR`;
}

function openModal() {
  applicationModal.classList.add("is-open");
  applicationModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  applicationModal.classList.remove("is-open");
  applicationModal.setAttribute("aria-hidden", "true");
}

function updateFee() {
  const service = servicesByCode[`${categoryInput.value}_CATEGORY`];
  feeAmount.textContent = service ? formatCurrency(service.amount) : "Select category";
  updateCategoryCertificateRequirement();
}

function requiresCategoryCertificate(category) {
  return ["SC", "ST", "OBC"].includes(String(category || "").toUpperCase());
}

function updateCategoryCertificateRequirement() {
  const isRequired = requiresCategoryCertificate(categoryInput.value);

  categoryCertificateInput.required = isRequired;
  categoryCertificateHint.textContent = isRequired
    ? "Required for selected category."
    : "Optional for GEN category.";
}

function createAcknowledgementNumber() {
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(100000 + Math.random() * 900000);
  return `DMRC-${datePart}-${randomPart}`;
}

function createSlipNumber(prefix) {
  const datePart = new Date().toISOString().slice(2, 10).replaceAll("-", "");
  const randomPart = Math.floor(100000000 + Math.random() * 900000000);
  return `${prefix}${datePart}${randomPart}`;
}

function formatReceiptDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    hour12: true
  }).format(value);
}

function formatDateOfBirth(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(Number(year), Number(month) - 1, Number(day))).replaceAll("/", "-");
}

function getFormData() {
  const category = categoryInput.value;
  const serviceCode = `${category}_CATEGORY`;
  const service = servicesByCode[serviceCode];

  return {
    acknowledgement: createAcknowledgementNumber(),
    name: document.getElementById("candidateName").value.trim(),
    father: document.getElementById("fatherName").value.trim(),
    post: document.getElementById("postName").value.trim(),
    category,
    serviceCode,
    serviceName: service ? service.name : "",
    mobile: document.getElementById("mobileNumber").value.trim(),
    email: document.getElementById("emailId").value.trim(),
    dob: document.getElementById("dateOfBirth").value,
    address: document.getElementById("permanentAddress").value.trim(),
    fee: service ? service.amount : 0,
    photo: uploadedPhoto,
    marksheet: uploadedMarksheet,
    aadhar: uploadedAadhar,
    categoryCertificate: uploadedCategoryCertificate
  };
}

function fillPrintableForm(data) {
  document.getElementById("printAck").textContent = data.acknowledgement;
  document.getElementById("printAckInline").textContent = data.acknowledgement;
  document.getElementById("printName").textContent = data.name;
  document.getElementById("printFather").textContent = data.father;
  document.getElementById("printPost").textContent = data.post;
  document.getElementById("printCategory").textContent = data.category;
  document.getElementById("printService").textContent = data.serviceName;
  document.getElementById("printFee").textContent = formatCurrency(data.fee);
  document.getElementById("printMobile").textContent = data.mobile;
  document.getElementById("printEmail").textContent = data.email;
  document.getElementById("printDob").textContent = formatDateOfBirth(data.dob);
  document.getElementById("printAddress").textContent = data.address;
  document.getElementById("printTransaction").textContent = data.transactionNo;
  document.getElementById("printTransactionDate").textContent = data.transactionDate;
  document.getElementById("printBankRef").textContent = data.bankRefNo;
  document.getElementById("printReceiptNo").textContent = data.receiptNo;
}

function showPaidApplication(data) {
  submittedData = data;
  fillPrintableForm(submittedData);
  ackNumber.textContent = submittedData.acknowledgement;
  ackBox.hidden = false;
  applicationForm.querySelector(".pay-now-btn").textContent = `Paid \u20b9${submittedData.fee}`;
}

function readFileForUpload(input, label) {
  const file = input.files[0];

  if (!file) {
    throw new Error(`Please upload ${label}.`);
  }

  const allowed = file.type.startsWith("image/") || file.type === "application/pdf";

  if (!allowed) {
    throw new Error(`${label} must be an image or PDF file.`);
  }

  if (file.size > maxUploadSizeBytes) {
    throw new Error(`${label} must be 5 MB or smaller.`);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: reader.result
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${label}.`));
    reader.readAsDataURL(file);
  });
}

async function saveApplication(data) {
  const savedApplication = await postJson("/api/applications/save", {
    acknowledgement: data.acknowledgement,
    name: data.name,
    father: data.father,
    post: data.post,
    category: data.category,
    serviceCode: data.serviceCode,
    serviceName: data.serviceName,
    mobile: data.mobile,
    email: data.email,
    dob: data.dob,
    address: data.address,
    fee: data.fee,
    files: {
      photo: data.photo,
      marksheet: data.marksheet,
      aadhar: data.aadhar,
      categoryCertificate: data.categoryCertificate
    }
  });

  return {
    ...data,
    applicationId: savedApplication.applicationId,
    acknowledgement: savedApplication.acknowledgement
  };
}

async function openPaymentCheckout(data) {
  if (!window.Cashfree) {
    throw new Error("Cashfree checkout could not load. Please check your internet connection.");
  }

  const savedData = await saveApplication(data);
  const order = await postJson("/api/cashfree/create-order", {
    amount: savedData.fee,
    acknowledgement: savedData.acknowledgement,
    applicationId: savedData.applicationId,
    post: savedData.post,
    category: savedData.category,
    serviceCode: savedData.serviceCode,
    serviceName: savedData.serviceName,
    customer: {
      name: savedData.name,
      email: savedData.email,
      phone: savedData.mobile
    }
  });

  const cashfree = Cashfree({
    mode: order.mode
  });

  await cashfree.checkout({
    paymentSessionId: order.paymentSessionId,
    redirectTarget: "_modal"
  });

  const statusData = await getJson(`/api/cashfree/order-status?order_id=${encodeURIComponent(order.orderId)}`);

  if (statusData.orderStatus !== "PAID") {
    throw new Error("Payment is not completed yet. Please complete the payment and try again.");
  }

  const submittedAt = new Date();

  return {
    ...savedData,
    orderId: order.orderId,
    paymentStatus: statusData.orderStatus,
    transactionNo: order.orderId,
    transactionDate: formatReceiptDate(submittedAt),
    bankRefNo: createSlipNumber("BRN"),
    receiptNo: createSlipNumber("REC")
  };
}

openApplyForm.addEventListener("click", (event) => {
  event.preventDefault();
  openModal();
});

applyFormLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openModal();
  });
});

document.querySelectorAll("[data-category]").forEach((button) => {
  button.addEventListener("click", () => {
    categoryInput.value = button.dataset.category;
    updateFee();
    openModal();
  });
});

closeApplyForm.addEventListener("click", closeModal);

applicationModal.addEventListener("click", (event) => {
  if (event.target === applicationModal) {
    closeModal();
  }
});

categoryInput.addEventListener("change", updateFee);
updateFee();

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!applicationForm.reportValidity()) {
    return;
  }

  const payButton = applicationForm.querySelector(".pay-now-btn");
  const originalButtonText = payButton.textContent;

  payButton.disabled = true;
  payButton.textContent = "Saving Application...";

  try {
    uploadedPhoto = await readFileForUpload(photoInput, "candidate photo");
    uploadedMarksheet = await readFileForUpload(marksheetInput, "marksheet");
    uploadedAadhar = await readFileForUpload(aadharInput, "Aadhar card");
    uploadedCategoryCertificate = categoryCertificateInput.files[0]
      ? await readFileForUpload(categoryCertificateInput, "category certificate")
      : null;

    const applicationData = getFormData();
    payButton.textContent = "Opening Payment...";
    const paidApplication = await openPaymentCheckout(applicationData);
    showPaidApplication(paidApplication);
  } catch (error) {
    alert(error.message);
    payButton.textContent = originalButtonText;
  } finally {
    payButton.disabled = false;
  }
});

downloadPdf.addEventListener("click", () => {
  if (!submittedData) {
    return;
  }

  fillPrintableForm(submittedData);
  window.print();
});
