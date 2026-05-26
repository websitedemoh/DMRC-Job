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

let uploadedPhoto = "";
let submittedData = null;

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
  document.getElementById("printDob").textContent = data.dob;
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

function completeDemoPayment(data) {
  const submittedAt = new Date();

  return {
    ...data,
    orderId: `DEMO-${Date.now()}`,
    paymentStatus: "SUBMITTED",
    transactionNo: createSlipNumber("TXN"),
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
  payButton.textContent = "Submitting Application...";

  try {
    const paidApplication = completeDemoPayment(applicationData);
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
