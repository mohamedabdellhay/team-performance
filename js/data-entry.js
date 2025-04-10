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
  const errors = parseInt(document.getElementById("errors").value);

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

  if (editingIndex !== null && currentEditingDate === date) {
    // Update existing record
    currentRecords[editingIndex] = { date, member, products, quality, errors };
  } else {
    // Add new record
    currentRecords.push({ date, member, products, quality, errors });
  }

  editingIndex = null;
  currentEditingDate = null;
  showRecords();
  clearForm();
}

function editRecord(index) {
  const record = currentRecords[index];

  // Store original date before editing
  currentEditingDate = record.date;

  document.getElementById("date").value = record.date;
  document.getElementById("member").value = record.member;
  document.getElementById("products").value = record.products;
  document.getElementById("quality").value = record.quality;
  document.getElementById("errors").value = record.errors;

  editingIndex = index;
  document.getElementById("addButton").textContent = "Update Record";

  // Highlight the record being edited
  showRecords();

  // Scroll to form
  document.getElementById("date").scrollIntoView({ behavior: "smooth" });
}

function deleteRecord(index) {
  if (confirm("Are you sure you want to delete this record?")) {
    currentRecords.splice(index, 1);
    showRecords();
  }
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
        alert(
          `Successfully loaded ${data.length} record${
            data.length > 1 ? "s" : ""
          }`
        );
      } else {
        alert("Invalid file format: Must contain an array of records");
      }
    } catch (error) {
      alert("Error reading file: " + error.message);
    }
  };

  reader.readAsText(file);
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

function calculateDailyScore(products, quality, errors) {
  const productsWeight = 0.4;
  const qualityWeight = 0.5;
  const errorsWeight = 0.1;

  const productsScore = products * productsWeight;
  const qualityScore = quality * qualityWeight;
  const errorsScore = -(errors * errorsWeight);

  const totalScore = Math.max(0, productsScore + qualityScore + errorsScore);

  return Math.min(100, totalScore);
}
