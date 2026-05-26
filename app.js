const openApplyForm = document.getElementById("openApplyForm");
const closeApplyForm = document.getElementById("closeApplyForm");
const applicationModal = document.getElementById("application-modal");
const applicationForm = document.getElementById("dmrcApplicationForm");
const categoryInput = document.getElementById("category");
const feeAmount = document.getElementById("feeAmount");
const ackBox = document.getElementById("acknowledgementBox");
const ackNumber = document.getElementById("ackNumber");
const downloadPdf = document.getElementById("downloadPdf");
const photoInput = document.getElementById("candidatePhoto");

const feeByCategory = {
  SC: 250,
  ST: 250,
  OBC: 350,
  GEN: 400
};

const apiBaseUrl = (window.DMRC_API_BASE_URL || "").replace(/\/$/, "");
const isGithubPages = window.location.hostname.endsWith("github.io");

let uploadedPhoto = "";
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

function openModal() {
  applicationModal.classList.add("is-open");
  applicationModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  applicationModal.classList.remove("is-open");
  applicationModal.setAttribute("aria-hidden", "true");
}

function updateFee() {
  const fee = feeByCategory[categoryInput.value];
  feeAmount.textContent = fee ? `Rs ${fee}` : "Select category";
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

  return {
    acknowledgement: createAcknowledgementNumber(),
    name: document.getElementById("candidateName").value.trim(),
    father: document.getElementById("fatherName").value.trim(),
    post: document.getElementById("postName").value.trim(),
    category,
    mobile: document.getElementById("mobileNumber").value.trim(),
    email: document.getElementById("emailId").value.trim(),
    dob: document.getElementById("dateOfBirth").value,
    address: document.getElementById("permanentAddress").value.trim(),
    fee: feeByCategory[category],
    photo: uploadedPhoto
  };
}

function fillPrintableForm(data) {
  document.getElementById("printAck").textContent = data.acknowledgement;
  document.getElementById("printAckInline").textContent = data.acknowledgement;
  document.getElementById("printName").textContent = data.name;
  document.getElementById("printFather").textContent = data.father;
  document.getElementById("printPost").textContent = data.post;
  document.getElementById("printCategory").textContent = data.category;
  document.getElementById("printFee").textContent = `Rs ${data.fee}`;
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
  applicationForm.querySelector(".pay-now-btn").textContent = `Paid Rs ${submittedData.fee}`;
}

async function openPaymentCheckout(data) {
  if (!window.Cashfree) {
    throw new Error("Cashfree checkout could not load. Please check your internet connection.");
  }

  const order = await postJson("/api/cashfree/create-order", {
    amount: data.fee,
    acknowledgement: data.acknowledgement,
    post: data.post,
    category: data.category,
    customer: {
      name: data.name,
      email: data.email,
      phone: data.mobile
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
    ...data,
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

closeApplyForm.addEventListener("click", closeModal);

applicationModal.addEventListener("click", (event) => {
  if (event.target === applicationModal) {
    closeModal();
  }
});

categoryInput.addEventListener("change", updateFee);

photoInput.addEventListener("change", () => {
  const file = photoInput.files[0];

  if (!file) {
    uploadedPhoto = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    uploadedPhoto = reader.result;
  };
  reader.readAsDataURL(file);
});

applicationForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!applicationForm.reportValidity()) {
    return;
  }

  if (!uploadedPhoto) {
    alert("Please upload candidate photo.");
    return;
  }

  const payButton = applicationForm.querySelector(".pay-now-btn");
  const originalButtonText = payButton.textContent;
  const applicationData = getFormData();

  payButton.disabled = true;
  payButton.textContent = "Opening Payment...";

  try {
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
