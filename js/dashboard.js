// Global variables
let allRecords = [];
let filteredRecords = [];
let productivityChart, qualityChart, errorChart, trendChart, dailyScoreChart;
let currentSort = { column: "date", direction: "desc" };
let currentPage = 1;
const recordsPerPage = 10;

// Initialize file input
document
  .getElementById("fileInput")
  .addEventListener("change", handleFileUpload);

function handleFileUpload(event) {
  const files = event.target.files;
  if (files.length === 0) return;

  document.getElementById(
    "fileInfo"
  ).textContent = `${files.length} file(s) selected`;

  allRecords = []; // Reset existing data
  const readers = [];

  // Process each file
  Array.from(files).forEach((file) => {
    const reader = new FileReader();
    readers.push(reader);

    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          // Add filename to each record for tracking
          const recordsWithSource = data.map((record) => ({
            ...record,
            dailyScore: calculateDailyScore(
              record.products,
              record.quality,
              record.errors
            ),
            _sourceFile: file.name,
          }));
          allRecords = allRecords.concat(recordsWithSource);

          // If all files are processed, update dashboard
          if (readers.every((r) => r.readyState === 2)) {
            initializeDashboard();
          }
        } else {
          alert(`File "${file.name}" doesn't contain valid array data`);
        }
      } catch (error) {
        alert(`Error parsing file "${file.name}": ${error.message}`);
      }
    };

    reader.readAsText(file);
  });
}

function initializeDashboard() {
  // Set default date range
  const dates = allRecords.map((r) => r.date).sort();
  if (dates.length > 0) {
    document.getElementById("dateFrom").value = dates[0];
    document.getElementById("dateTo").value = dates[dates.length - 1];
  }

  // Populate employee filter
  const employeeSelect = document.getElementById("employeeFilter");
  const employees = [...new Set(allRecords.map((r) => r.member))].sort();
  employees.forEach((emp) => {
    const option = document.createElement("option");
    option.value = emp;
    option.textContent = emp;
    employeeSelect.appendChild(option);
  });

  applyFilters();
}

function applyFilters() {
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;
  const employee = document.getElementById("employeeFilter").value;
  const qualityMin = document.getElementById("qualityFilter").value;
  const maxErrors = document.getElementById("errorsFilter").value;

  filteredRecords = allRecords.filter((record) => {
    // Date filter
    if (dateFrom && record.date < dateFrom) return false;
    if (dateTo && record.date > dateTo) return false;

    // Employee filter
    if (employee && record.member !== employee) return false;

    // Quality filter
    if (qualityMin && record.quality < parseInt(qualityMin)) return false;

    // Errors filter
    if (maxErrors && record.errors > parseInt(maxErrors)) return false;

    return true;
  });

  currentPage = 1; // Reset to first page when filters change
  updateDashboard();
}

function updateDashboard() {
  if (filteredRecords.length === 0) {
    // Clear everything if no records
    document.getElementById("summaryCards").innerHTML =
      '<div class="summary-card">No data available</div>';
    document.querySelector("#performanceTable tbody").innerHTML =
      '<tr><td colspan="7">No records found</td></tr>';
    document.getElementById("pagination").innerHTML = "";
    return;
  }

  updateSummaryCards();
  updateCharts();
  sortAndUpdateTable();
}

function updateSummaryCards() {
  const summaryCards = document.getElementById("summaryCards");
  summaryCards.innerHTML = "";

  // Calculate summary metrics
  const totalEmployees = [...new Set(filteredRecords.map((r) => r.member))]
    .length;
  const totalProducts = filteredRecords.reduce((sum, r) => sum + r.products, 0);
  const avgQuality = (
    filteredRecords.reduce((sum, r) => sum + r.quality, 0) /
    filteredRecords.length
  ).toFixed(1);
  const totalErrors = filteredRecords.reduce((sum, r) => sum + r.errors, 0);
  const errorRate =
    totalProducts > 0 ? ((totalErrors / totalProducts) * 100).toFixed(1) : 0;

  // Performance score calculation (custom formula)
  const avgScore = (
    filteredRecords.reduce((sum, r) => {
      return sum + (r.products * r.quality) / (r.errors || 1);
    }, 0) / filteredRecords.length
  ).toFixed(1);

  // Create summary cards
  const summaries = [
    { value: filteredRecords.length, label: "Records", icon: "📊" },
    { value: totalEmployees, label: "Employees", icon: "👥" },
    { value: totalProducts, label: "Products", icon: "🛠️" },
    { value: avgQuality, label: "Avg Quality", icon: "⭐" },
    { value: totalErrors, label: "Total Errors", icon: "❌" },
    { value: `${errorRate}%`, label: "Error Rate", icon: "📉" },
    { value: avgScore, label: "Avg Score", icon: "🏆" },
    { value: filteredRecords[0]._sourceFile, label: "Source File", icon: "📁" },
  ];

  summaries.forEach((summary) => {
    const card = document.createElement("div");
    card.className = "summary-card";
    card.innerHTML = `
                    <div style="font-size: 24px; margin-bottom: 5px;">${summary.icon}</div>
                    <div class="summary-value">${summary.value}</div>
                    <div class="summary-label">${summary.label}</div>
                `;
    summaryCards.appendChild(card);
  });
}

function updateCharts() {
  // Group data by employee
  const employees = [...new Set(filteredRecords.map((r) => r.member))].sort();

  // Prepare data for charts
  const employeeProducts = {};
  const employeeQuality = {};
  const employeeErrors = {};
  const employeeScores = {};

  employees.forEach((emp) => {
    const empRecords = filteredRecords.filter((r) => r.member === emp);
    employeeProducts[emp] = empRecords.reduce((sum, r) => sum + r.products, 0);
    employeeQuality[emp] =
      empRecords.reduce((sum, r) => sum + r.quality, 0) / empRecords.length;
    employeeErrors[emp] = empRecords.reduce((sum, r) => sum + r.errors, 0);
    employeeScores[emp] =
      empRecords.reduce((sum, r) => {
        return sum + (r.products * r.quality) / (r.errors || 1);
      }, 0) / empRecords.length;
  });

  // Get sorted dates for trend chart
  const dates = [...new Set(filteredRecords.map((r) => r.date))].sort();

  // Destroy existing charts if they exist
  [
    productivityChart,
    qualityChart,
    errorChart,
    trendChart,
    dailyScoreChart,
  ].forEach((chart) => {
    if (chart) chart.destroy();
  });

  // Productivity Chart (Bar)
  productivityChart = new Chart(document.getElementById("productivityChart"), {
    type: "bar",
    data: {
      labels: employees,
      datasets: [
        {
          label: "Total Products",
          data: employees.map((emp) => employeeProducts[emp]),
          backgroundColor: "#3498db",
          borderColor: "#2980b9",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const emp = context.label;
              return `Avg: ${(
                employeeProducts[emp] /
                filteredRecords.filter((r) => r.member === emp).length
              ).toFixed(1)} per day`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Products",
          },
        },
      },
    },
  });

  // Quality Chart (Horizontal Bar)
  qualityChart = new Chart(document.getElementById("qualityChart"), {
    type: "bar",
    data: {
      labels: employees,
      datasets: [
        {
          label: "Average Quality Score",
          data: employees.map((emp) => employeeQuality[emp]),
          backgroundColor: "#2ecc71",
          borderColor: "#27ae60",
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          max: 10,
          title: {
            display: true,
            text: "Quality Rating (1-10)",
          },
        },
      },
    },
  });

  // Error Chart (Pie)
  errorChart = new Chart(document.getElementById("errorChart"), {
    type: "pie",
    data: {
      labels: employees,
      datasets: [
        {
          label: "Error Distribution",
          data: employees.map((emp) => employeeErrors[emp]),
          backgroundColor: [
            "#e74c3c",
            "#f39c12",
            "#3498db",
            "#2ecc71",
            "#9b59b6",
            "#1abc9c",
            "#d35400",
            "#34495e",
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const emp = context.label;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.raw / total) * 100).toFixed(1);
              return `Percentage: ${percentage}%`;
            },
          },
        },
      },
    },
  });

  // Trend Chart (Line)
  const trendData = {};
  employees.forEach((emp) => {
    trendData[emp] = dates.map((date) => {
      const record = filteredRecords.find(
        (r) => r.member === emp && r.date === date
      );
      return record ? record.products : null;
    });
  });

  trendChart = new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels: dates,
      datasets: employees.map((emp, i) => ({
        label: emp,
        data: trendData[emp],
        borderColor: [
          "#e74c3c",
          "#3498db",
          "#f39c12",
          "#2ecc71",
          "#9b59b6",
          "#1abc9c",
          "#d35400",
          "#34495e",
        ][i % 8],
        backgroundColor: [
          "#e74c3c",
          "#3498db",
          "#f39c12",
          "#2ecc71",
          "#9b59b6",
          "#1abc9c",
          "#d35400",
          "#34495e",
        ][i % 8],
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
      })),
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const record = filteredRecords.find(
                (r) =>
                  r.member === context.dataset.label && r.date === context.label
              );
              if (record) {
                return `Quality: ${record.quality}\nErrors: ${record.errors}`;
              }
              return "";
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Number of Products",
          },
        },
        x: {
          title: {
            display: true,
            text: "Date",
          },
        },
      },
    },
  });

  // get employees names
  const employeesNames = [...new Set(allRecords.map((d) => d.member))];

  // get all records
  const labels = [...new Set(allRecords.map((d) => d.date))]; // unique dates
  labels.sort((a, b) => new Date(a) - new Date(b)); // sort dates

  // get all records
  const datasets = employeesNames.map((employee, i) => {
    const employeeData = allRecords.filter((d) => d.member === employee);
    const employeeScores = labels.map((date) => {
      const record = employeeData.find((d) => d.date === date);
      return record ? record.dailyScore : 0;
    });

    return {
      label: employee,
      data: employeeScores,
      borderColor: [
        "#e74c3c",
        "#3498db",
        "#f39c12",
        "#2ecc71",
        "#9b59b6",
        "#1abc9c",
        "#d35400",
        "#34495e",
      ][i % 8],
      backgroundColor: [
        "#e74c3c",
        "#3498db",
        "#f39c12",
        "#2ecc71",
        "#9b59b6",
        "#1abc9c",
        "#d35400",
        "#34495e",
      ][i % 8],
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointBackgroundColor: getRandomColor(),
    };
  });

  // get random color
  function getRandomColor(alpha = 1) {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(
      color.slice(3, 5),
      16
    )}, ${parseInt(color.slice(5, 7), 16)}, ${alpha})`;
  }

  // create daily score chart
  dailyScoreChart = new Chart(
    document.getElementById("dailyScoreChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: false,
          },
          legend: {
            display: true,
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `Score: ${ctx.raw}`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Score",
            },
          },
          x: {
            title: {
              display: true,
              text: "Date",
            },
          },
        },
      },
    }
  );
}

function sortTable(column) {
  // Toggle sort direction if same column clicked again
  if (currentSort.column === column) {
    currentSort.direction = currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    currentSort = { column, direction: "asc" };
  }

  sortAndUpdateTable();
}

function sortAndUpdateTable() {
  const tableBody = document.querySelector("#performanceTable tbody");
  tableBody.innerHTML = "";

  // Clear all sort indicators
  document.querySelectorAll("#performanceTable th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  // Set sort indicator on current column
  const headerCells = document.querySelectorAll("#performanceTable th");
  const columnIndex = [
    "date",
    "member",
    "products",
    "quality",
    "errors",
    "score",
    "status",
  ].indexOf(currentSort.column);
  if (columnIndex >= 0) {
    const currentHeader = headerCells[columnIndex];
    currentHeader.classList.add(`sort-${currentSort.direction}`);
  }

  // Sort records
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valueA, valueB;

    switch (currentSort.column) {
      case "date":
        valueA = new Date(a.date);
        valueB = new Date(b.date);
        break;
      case "member":
        valueA = a.member.toLowerCase();
        valueB = b.member.toLowerCase();
        break;
      case "products":
        valueA = a.products;
        valueB = b.products;
        break;
      case "quality":
        valueA = a.quality;
        valueB = b.quality;
        break;
      case "errors":
        valueA = a.errors;
        valueB = b.errors;
        break;
      case "score":
        valueA = (a.products * a.quality) / (a.errors || 1);
        valueB = (b.products * b.quality) / (b.errors || 1);
        break;
      default:
        return 0;
    }

    if (currentSort.direction === "asc") {
      return valueA > valueB ? 1 : -1;
    } else {
      return valueA < valueB ? 1 : -1;
    }
  });

  // Update pagination
  updatePagination(sortedRecords.length);

  // Get records for current page
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, endIndex);

  // Populate table with sorted records
  paginatedRecords.forEach((record) => {
    const row = document.createElement("tr");
    const score = (record.products * record.quality) / (record.errors || 1);
    let statusClass = "";
    let statusText = "";

    // Determine status based on performance
    if (record.quality >= 8 && record.errors <= 1) {
      statusClass = "badge-success";
      statusText = "Excellent";
    } else if (record.quality >= 6 && record.errors <= 3) {
      statusClass = "badge-warning";
      statusText = "Good";
    } else {
      statusClass = "badge-danger";
      statusText = "Needs Improvement";
    }

    row.innerHTML = `
                    <td>${record.date}</td>
                    <td>${record.member}</td>
                    <td>${record.products}</td>
                    <td>${record.quality}</td>
                    <td>${record.errors}</td>
                    <td>${score.toFixed(1)}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                `;

    tableBody.appendChild(row);
  });
}

function updatePagination(totalRecords) {
  const totalPages = Math.ceil(totalRecords / recordsPerPage);
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";

  if (totalPages <= 1) return;

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = "page-item";
  prevLi.innerHTML = `<a class="page-link" ${
    currentPage === 1 ? "disabled" : ""
  } onclick="changePage(${currentPage - 1})">Previous</a>`;
  pagination.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const li = document.createElement("li");
    li.className = "page-item";
    li.innerHTML = `<a class="page-link ${
      i === currentPage ? "active" : ""
    }" onclick="changePage(${i})">${i}</a>`;
    pagination.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = "page-item";
  nextLi.innerHTML = `<a class="page-link" ${
    currentPage === totalPages ? "disabled" : ""
  } onclick="changePage(${currentPage + 1})">Next</a>`;
  pagination.appendChild(nextLi);
}

function changePage(page) {
  if (page < 1 || page > Math.ceil(filteredRecords.length / recordsPerPage))
    return;
  currentPage = page;
  sortAndUpdateTable();
  window.scrollTo({
    top: document.getElementById("performanceTable").offsetTop - 20,
    behavior: "smooth",
  });
}

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

/*

[
    {
        "date": "2025-04-10",
        "member": "Khalid",
        "products": 30,
        "quality": 9,
        "errors": 9,
        "dailyScore": 91,
        "_sourceFile": "Employee-Performance-2025-04-10.json"
    },
    {
        "date": "2025-04-10",
        "member": "Sherif",
        "products": 33,
        "quality": 8,
        "errors": 9,
        "dailyScore": 86,
        "_sourceFile": "Employee-Performance-2025-04-10.json"
    },
    {
        "date": "2025-04-10",
        "member": "Gohary",
        "products": 34,
        "quality": 9,
        "errors": 1,
        "dailyScore": 94,
        "_sourceFile": "Employee-Performance-2025-04-10.json"
    },
    {
        "date": "2025-04-10",
        "member": "Lamees",
        "products": 28,
        "quality": 9,
        "errors": 2,
        "dailyScore": 94,
        "_sourceFile": "Employee-Performance-2025-04-10.json"
    },
    {
        "date": "2025-04-10",
        "member": "Shreen",
        "products": 30,
        "quality": 10,
        "errors": 0,
        "dailyScore": 100,
        "_sourceFile": "Employee-Performance-2025-04-10.json"
    }
]
*/

// function createEmployeePerformanceChart() {
//   // تجميع بيانات الموظفين
//   const employees = [...new Set(allRecords.map((record) => record.member))];

//   // إعداد بيانات لكل موظف
//   const datasets = employees.map((employee) => {
//     const employeeRecords = allRecords
//       .filter((r) => r.member === employee)
//       .sort((a, b) => new Date(a.date) - new Date(b.date));

//     return {
//       label: employee,
//       data: allRecords.map((record) =>
//         record.member === employee ? record.dailyScore : null
//       ),
//       borderColor: getEmployeeColor(employee),
//       backgroundColor: "rgba(255, 255, 255, 0.1)",
//       borderWidth: 2,
//       tension: 0.3,
//       pointRadius: 4,
//       pointHoverRadius: 6,
//       fill: false,
//     };
//   });

//   // إنشاء الرسم البياني
//   const ctx = document.getElementById("performanceChart").getContext("2d");
//   return new Chart(ctx, {
//     type: "line",
//     data: {
//       labels: allRecords.map((r) => r.date),
//       datasets: datasets,
//     },
//     options: {
//       responsive: true,
//       maintainAspectRatio: false,
//       plugins: {
//         title: {
//           display: true,
//           text: "Employee Performance Trends",
//           font: { size: 18 },
//         },
//         tooltip: {
//           callbacks: {
//             label: function (context) {
//               const record = allRecords.find(
//                 (r) =>
//                   r.member === context.dataset.label && r.date === context.label
//               );
//               return [
//                 `Employee: ${context.dataset.label}`,
//                 `Date: ${context.label}`,
//                 `Score: ${context.raw}`,
//                 `Products: ${record.products}`,
//                 `Quality: ${record.quality}/10`,
//                 `Errors: ${record.errors}`,
//               ];
//             },
//             footer: (context) => {
//               const score = context[0].raw;
//               if (score >= 90) return "🌟 Excellent Performance";
//               if (score >= 75) return "👍 Good Performance";
//               if (score >= 60) return "✔️ Average Performance";
//               return "⚠️ Needs Improvement";
//             },
//           },
//         },
//         legend: {
//           position: "top",
//           labels: {
//             boxWidth: 12,
//             padding: 20,
//             font: { size: 12 },
//           },
//         },
//       },
//       scales: {
//         y: {
//           beginAtZero: true,
//           max: 100,
//           title: {
//             display: true,
//             text: "Performance Score",
//             font: { weight: "bold" },
//           },
//           grid: {
//             color: "rgba(0, 0, 0, 0.05)",
//           },
//         },
//         x: {
//           title: {
//             display: true,
//             text: "Date",
//             font: { weight: "bold" },
//           },
//           grid: {
//             display: false,
//           },
//         },
//       },
//       interaction: {
//         intersect: false,
//         mode: "index",
//       },
//     },
//   });
// }

// // دالة مساعدة لإعطاء ألوان ثابتة لكل موظف
// function getEmployeeColor(employee) {
//   const colors = [
//     "#3498db",
//     "#e74c3c",
//     "#2ecc71",
//     "#f39c12",
//     "#9b59b6",
//     "#1abc9c",
//     "#d35400",
//     "#34495e",
//   ];
//   const index = [...new Set(allRecords.map((r) => r.member))].indexOf(employee);
//   return colors[index % colors.length];
// }
