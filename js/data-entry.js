let currentRecords = [];
let editingIndex = null;
let currentEditingDate = null;

// Initialize with today's date
document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().split("T")[0];
  // console.log(new Date());
  console.log(today);
  document.getElementById("date").value = today;
  showRecords();
});

function addRecord() {
  const date = document.getElementById("date").value;
  const member = document.getElementById("member").value;
  const products = parseInt(document.getElementById("products").value);
  const quality = parseInt(document.getElementById("quality").value);
  const note = document.getElementById("note").value.trim();
  const errors = parseInt(document.getElementById("errors").value);
  const errorCategory =
    document.getElementById("errorCategory").value == "null"
      ? null
      : document.getElementById("errorCategory").value;
  const errorDescription =
    document.getElementById("note").value.trim().length > 0 ? note : null;
  const dailyScore = calculateDailyScore(products, quality, errors);
  console.log(dailyScore);

  // Validate inputs
  if (!date) {
    alert("Please select the date");
    return;
  }

  if (isNaN(products) || products < 0) {
    alert("Please enter a valid number of products");
    return;
  }

  if (isNaN(quality) || quality < 1 || quality > 10) {
    alert("Quality rating must be between 1 and 10");
    return;
  }

  if (isNaN(errors) || errors < 0) {
    alert("Please enter a valid number of errors");
    return;
  }

  // Check if the record already exists
  const existingRecord = currentRecords.find(
    (rec) => rec.date === date && rec.member === member
  );
  if (existingRecord) {
    const confirmUpdate = confirm(
      `Record for ${member} already exists for this employee, do you want to update it?`
    );
    if (confirmUpdate) {
      currentRecords = currentRecords.filter(
        (rec) => !(rec.date === date && rec.member === member)
      );
      currentRecords.push({
        date,
        member,
        products,
        quality,
        errors,
        errorCategory,
        errorDescription,
        dailyScore,
      });
      editingIndex = null;
      currentEditingDate = null;
      showRecords();
      clearForm();
      console.log(currentRecords);
      return;
    }

    return;
  }

  // Check if the date is in the future
  if (editingIndex !== null && currentEditingDate === date) {
    // Update existing record
    currentRecords[editingIndex] = {
      date,
      member,
      products,
      quality,
      errors,
      errorCategory,
      errorDescription,
      dailyScore,
    };
  } else {
    // Add new record
    currentRecords.push({
      date,
      member,
      products,
      quality,
      errors,
      errorCategory,
      errorDescription,
      dailyScore,
    });
  }

  editingIndex = null;
  currentEditingDate = null;
  showRecords();
  clearForm();
  console.log(currentRecords);
}

function editRecord(index) {
  const confirmLayer = document.getElementById("overlay-edit");
  confirmLayer.style.display = "flex";
  const confirmButton = document.getElementById("confirmEdit");
  const cancelButton = document.getElementById("cancelEdit");

  confirmButton.onclick = function () {
    // Store original date before editing
    const record = currentRecords[index];
    currentEditingDate = record.date;

    document.getElementById("date").value = record.date;
    document.getElementById("member").value = record.member;
    document.getElementById("products").value = record.products;
    document.getElementById("quality").value = record.quality;
    document.getElementById("errors").value = record.errors;
    document.getElementById("errorCategory").value = record.errorCategory;
    document.getElementById("note").value = record.errorDescription || "";

    editingIndex = index;
    document.getElementById("addButton").textContent = "Update Record";

    // Highlight the record being edited
    showRecords();

    // Scroll to form
    document.getElementById("date").scrollIntoView({ behavior: "smooth" });
    confirmLayer.style.display = "none";
  };
  cancelButton.onclick = function () {
    confirmLayer.style.display = "none";
    return;
  };
}

function deleteRecord(index) {
  const confirmLayer = document.getElementById("overlay-deletion");
  confirmLayer.style.display = "flex";
  const confirmButton = document.getElementById("confirmDelete");
  const cancelButton = document.getElementById("cancelDelete");

  confirmButton.onclick = function () {
    currentRecords.splice(index, 1);
    showRecords();
    confirmLayer.style.display = "none";
  };
  cancelButton.onclick = function () {
    confirmLayer.style.display = "none";
  };
}

function showRecords() {
  const output = document.getElementById("output");

  if (currentRecords.length === 0) {
    output.innerHTML = `
                    <div class="empty-state">
                        <img src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM3ZjhjOGQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBjbGFzcz0ibHVjaWRlIGx1Y2lkZS1jbGlwYm9hcmQtbGlzdCI+PHBhdGggZD0iTTggMTJoLjAxIi8+PHBhdGggZD0iTTEyIDEyaC4wMSIvPjxwYXRoIGQ9Ik0xNiAxMmguMDEiLz48cGF0aCBkPSJNOCA4aC4wMSIvPjxwYXRoIGQ9Ik0xMiA4aC4wMSIvPjxwYXRoIGQ9Ik0xNiA4aC4wMSIvPjxwYXRoIGQ9Ik04IDE2aC4wMSIvPjxwYXRoIGQ9Ik0xMiAxNmguMDEiLz48cGF0aCBkPSJNMTYgMTZoLjAxIi8+PHJlY3QgeD0iNCIgeT0iNCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiByeD0iMiIgcnk9IjIiLz48L3N2Zz4=" alt="No data">
                        <h3>No Records Added</h3>
                        <p>Start adding performance records using the form above</p>
                    </div>
                `;
    return;
  }

  // Group records by date
  const recordsByDate = {};
  currentRecords.forEach((record, index) => {
    if (!recordsByDate[record.date]) {
      recordsByDate[record.date] = [];
    }
    recordsByDate[record.date].push({ ...record, originalIndex: index });
  });

  // Display records grouped by date
  let html = "";
  for (const date in recordsByDate) {
    html += `
                    <div class="day-records">
                        <div class="day-header">
                            <span>${formatDate(date)}</span>
                            <span>${recordsByDate[date].length} Record${
      recordsByDate[date].length > 1 ? "s" : ""
    }</span>
                        </div>
                  
                `;

    recordsByDate[date].forEach((record) => {
      const isEditing = editingIndex === record.originalIndex;
      html += `
                        <div class="record ${
                          isEditing ? "editing" : ""
                        }" data-index="${record.originalIndex}">
                            <div class="record-actions">
                                <button class="btn-warning" onclick="editRecord(${
                                  record.originalIndex
                                })">
                                    <span>Edit</span>
                                </button>
                                <button class="btn-danger" onclick="deleteRecord(${
                                  record.originalIndex
                                })">
                                    <span>Delete</span>
                                </button>
                            </div>
                            <div class="record-info">
                                <div>
                                    <span>Employee</span>
                                    <span>${record.member}</span>
                                </div>
                                <div>
                                    <span>Products</span>
                                    <span>${record.products}</span>
                                </div>
                                <div>
                                    <span>Quality</span>
                                    <span>${record.quality}/10</span>
                                </div>
                                <div>
                                    <span>Errors</span>
                                    <span>${record.errors}</span>
                                </div>
                                 <div>
                                    <span>Error Category</span>
                                    <span>${
                                      record?.errorCategory
                                        ? record.errorCategory
                                        : "null"
                                    }</span>
                                </div>
                                <div>
                                    <span>Error Description</span>
                                    <span>${
                                      record?.errorDescription
                                        ? record.errorDescription
                                        : "null"
                                    }</span>
                                </div>
                            </div>
                        </div>
                    `;
    });

    html += `</div>`;
  }

  output.innerHTML = html;
}

function clearForm() {
  document.getElementById("products").value = "";
  document.getElementById("quality").value = "";
  document.getElementById("errors").value = "";
  document.getElementById("addButton").textContent = "Add Record";
  document.getElementById("errorCategory").value = "none";
  document.getElementById("note").value = "";

  // Reset to today's date if not editing
  if (editingIndex === null) {
    const today = new Date().toISOString().split("T")[0];
    document.getElementById("date").value = today;
  }
}

function downloadJSON() {
  if (currentRecords.length === 0) {
    alert("No records to download!");
    return;
  }

  // Get the most common date for filename
  const dateCounts = {};
  currentRecords.forEach((rec) => {
    dateCounts[rec.date] = (dateCounts[rec.date] || 0) + 1;
  });

  const mostCommonDate = Object.keys(dateCounts).reduce((a, b) =>
    dateCounts[a] > dateCounts[b] ? a : b
  );

  const fileName = `Employee-Performance-${mostCommonDate}.json`;
  const blob = new Blob([JSON.stringify(currentRecords, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function handleFileUpload(files) {
  if (files.length === 0) return;
  const overlay = document.getElementById("overlay-upload");
  const confirmButton = document.getElementById("confirmUpload");
  const cancelButton = document.getElementById("cancelUpload");

  overlay.style.display = "flex";
  confirmButton.addEventListener("click", () => {
    const file = files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          currentRecords = data;
          if (currentRecords.length > 0) {
            document.getElementById("date").value = currentRecords[0].date;
          }
          showRecords();
          // alert(
          //   `Successfully loaded ${data.length} record${
          //     data.length > 1 ? "s" : ""
          //   }`
          // );
        } else {
          alert("Invalid file format: Must contain an array of records");
        }
      } catch (error) {
        alert("Error reading file: " + error.message);
      }
    };

    reader.readAsText(file);
    overlay.style.display = "none";
  });
  cancelButton.addEventListener("click", () => {
    overlay.style.display = "none";
    return;
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

// function calculateDailyScore(products, quality, errors) {
//   const productsWeight = 0.4;
//   const qualityWeight = 0.5;
//   const errorsWeight = 0.1;

//   const productsScore = products * productsWeight;
//   const qualityScore = quality * qualityWeight;
//   const errorsScore = -(errors * errorsWeight);

//   const totalScore = Math.max(0, productsScore + qualityScore + errorsScore);

//   return Math.min(100, totalScore);
// }
function calculateDailyScore(products, quality, errors) {
  const qualityWeight = 0.5;
  const errorsWeight = 0.1;
  const baseWeight = 0.4;

  const maxQuality = 10;

  if (products === 0) return 0;

  const qualityPerProduct = quality / maxQuality;
  const errorPenaltyPerProduct = errors / products;

  const scorePerProduct =
    baseWeight +
    qualityPerProduct * qualityWeight -
    errorPenaltyPerProduct * errorsWeight;

  const rawScore = scorePerProduct * products;

  // Ensure the score is not negative
  const maxScorePerProduct = baseWeight + 1 * qualityWeight - 0 * errorsWeight;
  const maxPossibleScore = maxScorePerProduct * products;

  const percentageScore = (rawScore / maxPossibleScore) * 100;

  return Math.round(Math.max(0, Math.min(100, percentageScore)));
}

// update placeholder for note-field
const noteField = document.getElementById("note");
const memberField = document.getElementById("member");
const qualityField = document.getElementById("quality");
memberField.addEventListener("change", function () {
  console.log(memberField.value);
  noteField.placeholder = `write a helpful note to support ${memberField.value} in enhancing their performance.`;
  qualityField.placeholder = `Rate ${memberField.value}'s Quality from 1 to 10, be honest`;
  noteField.value = "";
  qualityField.value = "";
});
