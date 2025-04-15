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
  addEmployeeExportButtons();
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
  // Validate input
  if (!filteredRecords || filteredRecords.length === 0) {
    console.warn("No records to display");
    return;
  }

  // Group data by employee
  const employees = [...new Set(filteredRecords.map((r) => r.member))].sort();

  // Color palette for consistent coloring across charts
  const colorPalette = [
    "#e74c3c",
    "#3498db",
    "#f39c12",
    "#2ecc71",
    "#9b59b6",
    "#1abc9c",
    "#d35400",
    "#34495e",
  ];

  // Prepare data for charts
  const employeeData = {};

  employees.forEach((emp) => {
    const empRecords = filteredRecords.filter((r) => r.member === emp);
    const recordCount = empRecords.length;

    employeeData[emp] = {
      totalProducts: empRecords.reduce((sum, r) => sum + r.products, 0),
      avgQuality:
        empRecords.reduce((sum, r) => sum + r.quality, 0) / recordCount,
      totalErrors: empRecords.reduce((sum, r) => sum + r.errors, 0),
      avgScore:
        empRecords.reduce((sum, r) => {
          return sum + (r.products * r.quality) / Math.max(r.errors, 1);
        }, 0) / recordCount,
      recordCount,
    };
  });

  // Get sorted dates for trend chart
  const dates = [...new Set(filteredRecords.map((r) => r.date))].sort(
    (a, b) => new Date(a) - new Date(b)
  );

  // Destroy existing charts if they exist
  const charts = [
    productivityChart,
    qualityChart,
    errorChart,
    trendChart,
    dailyScoreChart,
  ];

  charts.forEach((chart) => {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }
  });

  // Helper function to create chart config
  const createChartConfig = (elementId, type, labels, datasets, options) => {
    return new Chart(document.getElementById(elementId), {
      type,
      data: { labels, datasets },
      options,
    });
  };

  // Productivity Chart (Bar)
  productivityChart = createChartConfig(
    "productivityChart",
    "bar",
    employees,
    [
      {
        label: "Total Products",
        data: employees.map((emp) => employeeData[emp].totalProducts),
        backgroundColor: "#3498db",
        borderColor: "#2980b9",
        borderWidth: 1,
      },
    ],
    {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const emp = context.label;
              const data = employeeData[emp];
              return `Avg: ${(data.totalProducts / data.recordCount).toFixed(
                1
              )} per day`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Number of Products" },
        },
      },
    }
  );

  // Quality Chart (Horizontal Bar)
  qualityChart = createChartConfig(
    "qualityChart",
    "bar",
    employees,
    [
      {
        label: "Average Quality Score",
        data: employees.map((emp) => employeeData[emp].avgQuality),
        backgroundColor: "#2ecc71",
        borderColor: "#27ae60",
        borderWidth: 1,
      },
    ],
    {
      indexAxis: "y",
      responsive: true,
      scales: {
        x: {
          beginAtZero: true,
          max: 10,
          title: { display: true, text: "Quality Rating (1-10)" },
        },
      },
    }
  );

  // Error Chart (Pie)
  errorChart = createChartConfig(
    "errorChart",
    "pie",
    employees,
    [
      {
        label: "Error Distribution",
        data: employees.map((emp) => employeeData[emp].totalErrors),
        backgroundColor: colorPalette,
        borderWidth: 1,
      },
    ],
    {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              return `Percentage: ${((context.raw / total) * 100).toFixed(1)}%`;
            },
          },
        },
      },
    }
  );

  // Trend Chart (Line)
  const trendDatasets = employees.map((emp, i) => ({
    label: emp,
    data: dates.map((date) => {
      const record = filteredRecords.find(
        (r) => r.member === emp && r.date === date
      );
      return record ? record.products : null;
    }),
    borderColor: colorPalette[i % colorPalette.length],
    backgroundColor: colorPalette[i % colorPalette.length],
    tension: 0.3,
    fill: false,
    pointRadius: 4,
    pointHoverRadius: 6,
  }));

  trendChart = createChartConfig("trendChart", "line", dates, trendDatasets, {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          afterLabel: (context) => {
            const record = filteredRecords.find(
              (r) =>
                r.member === context.dataset.label && r.date === context.label
            );
            return record
              ? `Quality: ${record.quality}\nErrors: ${record.errors}`
              : "";
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: "Number of Products" },
      },
      x: {
        title: { display: true, text: "Date" },
      },
    },
  });

  // Daily Score Chart
  const allEmployees = [...new Set(allRecords.map((d) => d.member))];
  const allDates = [...new Set(allRecords.map((d) => d.date))].sort(
    (a, b) => new Date(a) - new Date(b)
  );

  const dailyScoreDatasets = allEmployees.map((employee, i) => {
    const employeeData = allRecords.filter((d) => d.member === employee);
    const scores = allDates.map((date) => {
      const record = employeeData.find((d) => d.date === date);
      return record ? Math.max(0, record.dailyScore - 5) : 0;
    });

    return {
      label: employee,
      data: scores,
      borderColor: colorPalette[i % colorPalette.length],
      backgroundColor: colorPalette[i % colorPalette.length],
      tension: 0.3,
      fill: false,
      pointRadius: 4,
      pointHoverRadius: 6,
    };
  });

  dailyScoreChart = new Chart(
    document.getElementById("dailyScoreChart").getContext("2d"),
    {
      type: "line",
      data: {
        labels: allDates,
        datasets: dailyScoreDatasets,
      },
      options: {
        responsive: true,
        plugins: {
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
            title: { display: true, text: "Score" },
            ticks: { stepSize: 5 },
          },
          x: {
            title: { display: true, text: "Date" },
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

// function exportEmployeeMonthlyReports() {
//   if (!allRecords || allRecords.length === 0) {
//     alert("No data available to export");
//     return;
//   }

//   // Group records by employee
//   const employees = [...new Set(allRecords.map((r) => r.member))];

//   employees.forEach((employee) => {
//     // Filter records for this employee
//     const employeeRecords = allRecords.filter((r) => r.member === employee);

//     // Group by month
//     const monthlyData = {};
//     employeeRecords.forEach((record) => {
//       const date = new Date(record.date);
//       const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
//         .toString()
//         .padStart(2, "0")}`;

//       if (!monthlyData[monthYear]) {
//         monthlyData[monthYear] = [];
//       }
//       monthlyData[monthYear].push(record);
//     });

//     // Create a workbook for each month
//     Object.entries(monthlyData).forEach(([month, records]) => {
//       // Create workbook
//       const wb = XLSX.utils.book_new();

//       // Prepare worksheet data
//       const wsData = [
//         ["Employee Performance Report"],
//         [`Employee: ${employee}`],
//         [`Month: ${month}`],
//         [], // empty row
//         [
//           "Date",
//           "Products",
//           "Quality",
//           "Errors",
//           "Daily Score",
//           "Error Categories",
//           "Error Descriptions",
//         ],
//       ];

//       // Add records
//       records.forEach((record) => {
//         wsData.push([
//           record.date,
//           record.products,
//           record.quality,
//           record.errors,
//           record.dailyScore,
//           record.errorCategory.join(", "),
//           record.errorDescription.join(", "),
//         ]);
//       });

//       // Add summary row
//       wsData.push([]); // empty row
//       wsData.push([
//         "Monthly Totals/Averages",
//         records.reduce((sum, r) => sum + r.products, 0),
//         records.reduce((sum, r) => sum + r.quality, 0) / records.length,
//         records.reduce((sum, r) => sum + r.errors, 0),
//         records.reduce((sum, r) => sum + r.dailyScore, 0) / records.length,
//         "",
//         "",
//       ]);

//       // Create worksheet
//       const ws = XLSX.utils.aoa_to_sheet(wsData);

//       // Add worksheet to workbook
//       XLSX.utils.book_append_sheet(wb, ws, "Performance");

//       // Generate file name
//       const fileName = `${employee}_Performance_${month}.xlsx`;

//       // Export to Excel
//       XLSX.writeFile(wb, fileName);
//     });
//   });

//   alert(`Exported ${employees.length} employee reports successfully!`);
// }

// Add this to your initializeDashboard() function
function addEmployeeExportButtons() {
  const employeeContainer = document.getElementById("employeeExportButtons");
  employeeContainer.innerHTML = ""; // Clear existing buttons

  const employees = [...new Set(allRecords.map((r) => r.member))].sort();

  employees.forEach((employee) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-sm btn-outline-primary m-1";
    btn.style.color = "#000";
    btn.innerHTML = `<i class="fas fa-download"></i> ${employee}`;
    btn.onclick = () => exportEmployeeData(employee);
    employeeContainer.appendChild(btn);
  });
}

// Individual employee export function
function exportEmployeeData(employee) {
  const employeeRecords = allRecords.filter((r) => r.member === employee);

  if (employeeRecords.length === 0) {
    alert(`No data found for ${employee}`);
    return;
  }

  // Group by month
  const monthlyData = {};
  employeeRecords.forEach((record) => {
    const date = new Date(record.date);
    const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = [];
    }
    monthlyData[monthYear].push(record);
  });

  const wb = XLSX.utils.book_new();

  Object.entries(monthlyData).forEach(([month, records]) => {
    const headerRows = 5; // Number of header rows before data starts
    const firstDataRow = headerRows + 1;
    const lastDataRow = headerRows + records.length;

    const wsData = [
      ["Employee Performance Report"],
      [`Employee: ${employee}`],
      [`Period: ${month}`],
      [],
      [
        "Date",
        "Products",
        "Quality",
        "Errors",
        "Daily Score",
        "Error Categories",
        "Error Descriptions",
      ],
    ];

    // Add records
    records.forEach((record) => {
      wsData.push([
        record.date,
        record.products,
        record.quality,
        record.errors,
        record.dailyScore,
        record.errorCategory?.join(", ") || "",
        record.errorDescription?.join(", ") || "",
      ]);
    });

    // Add summary with dynamic formulas
    wsData.push(
      [],
      [
        "TOTALS/AVERAGES",
        { f: `SUM(B${firstDataRow}:B${lastDataRow})` }, // Dynamic SUM formula
        { f: `AVERAGE(C${firstDataRow}:C${lastDataRow})` }, // Dynamic AVERAGE formula
        { f: `SUM(D${firstDataRow}:D${lastDataRow})` },
        { f: `AVERAGE(E${firstDataRow}:E${lastDataRow})` },
        "",
        "",
      ]
    );

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Formatting
    ws["A1"].s = { font: { bold: true, sz: 16 } };
    // ... (rest of your formatting code)

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      month.length > 7 ? month.substring(0, 7) : month
    );
  });

  XLSX.writeFile(wb, `${employee}_Performance_Report.xlsx`);
}
