/**
 * Employee Performance Dashboard
 * Features:
 * - File upload and JSON parsing
 * - Data filtering and sorting
 * - Interactive charts
 * - Paginated table view
 * - Data export functionality
 */

// Constants
const RECORDS_PER_PAGE = 10;
const COLOR_PALETTE = [
  "#e74c3c",
  "#3498db",
  "#f39c12",
  "#2ecc71",
  "#9b59b6",
  "#1abc9c",
  "#d35400",
  "#34495e",
];

// Dashboard State
const dashboardState = {
  allRecords: [],
  filteredRecords: [],
  currentSort: { column: "date", direction: "desc" },
  currentPage: 1,
  charts: {
    productivity: null,
    quality: null,
    error: null,
    trend: null,
    dailyScore: null,
  },
};

// DOM Elements
const domElements = {
  fileInput: document.getElementById("fileInput"),
  fileInfo: document.getElementById("fileInfo"),
  dateFrom: document.getElementById("dateFrom"),
  dateTo: document.getElementById("dateTo"),
  employeeFilter: document.getElementById("employeeFilter"),
  qualityFilter: document.getElementById("qualityFilter"),
  errorsFilter: document.getElementById("errorsFilter"),
  summaryCards: document.getElementById("summaryCards"),
  performanceTable: document.querySelector("#performanceTable tbody"),
  pagination: document.getElementById("pagination"),
  employeeExportButtons: document.getElementById("employeeExportButtons"),
};

// Initialize the dashboard
function initDashboard() {
  try {
    domElements.fileInput.addEventListener("change", handleFileUpload);
    console.log("Dashboard initialized successfully");
  } catch (error) {
    console.error("Dashboard initialization failed:", error);
    alert("Failed to initialize dashboard. Please check console for details.");
  }
}

// File upload handler
async function handleFileUpload(event) {
  try {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    domElements.fileInfo.textContent = `${files.length} file(s) selected`;
    dashboardState.allRecords = [];

    const fileProcessingPromises = Array.from(files).map((file) =>
      processFile(file).catch((error) => {
        console.error(`Error processing file ${file.name}:`, error);
        return null;
      })
    );

    const results = await Promise.all(fileProcessingPromises);
    const validRecords = results.flat().filter((record) => record !== null);

    if (validRecords.length > 0) {
      dashboardState.allRecords = validRecords;
      initializeDashboard();
    } else {
      throw new Error("No valid records found in uploaded files");
    }
  } catch (error) {
    console.error("File upload error:", error);
    alert(`Error processing files: ${error.message}`);
  }
}

// Process individual file
async function processFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          throw new Error("File doesn't contain valid array data");
        }

        const recordsWithMetadata = data.map((record) => ({
          ...record,
          dailyScore: calculateDailyScore(
            record.products,
            record.quality,
            record.errors
          ),
          _sourceFile: file.name,
          _score: (record.products * record.quality) / (record.errors || 1),
        }));

        resolve(recordsWithMetadata);
      } catch (parseError) {
        console.error(`Error parsing file ${file.name}:`, parseError);
        reject(
          new Error(`Invalid data in ${file.name}: ${parseError.message}`)
        );
      }
    };

    reader.onerror = () => {
      reject(new Error(`Error reading file ${file.name}`));
    };

    reader.readAsText(file);
  });
}

// Initialize dashboard components
function initializeDashboard() {
  try {
    setDefaultDateRange();
    populateEmployeeFilter();
    addEmployeeExportButtons();
    applyFilters();
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    alert(`Failed to initialize dashboard: ${error.message}`);
  }
}

// Set default date range
function setDefaultDateRange() {
  try {
    const dates = dashboardState.allRecords.map((r) => r.date).sort();
    if (dates.length > 0) {
      domElements.dateFrom.value = dates[0];
      domElements.dateTo.value = dates[dates.length - 1];
    }
  } catch (error) {
    console.error("Error setting date range:", error);
    throw new Error("Could not set default date range");
  }
}

// Populate employee filter dropdown
function populateEmployeeFilter() {
  try {
    const employeeSelect = domElements.employeeFilter;
    employeeSelect.innerHTML = '<option value="">All Employees</option>';

    const employees = [
      ...new Set(dashboardState.allRecords.map((r) => r.member)),
    ].sort();
    employees.forEach((emp) => {
      const option = document.createElement("option");
      option.value = emp;
      option.textContent = emp;
      employeeSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error populating employee filter:", error);
    throw new Error("Could not populate employee filter");
  }
}

// Apply filters to the data
function applyFilters() {
  try {
    const { dateFrom, dateTo, employeeFilter, qualityFilter, errorsFilter } =
      domElements;
    const qualityMin = parseInt(qualityFilter.value) || 0;
    const maxErrors = parseInt(errorsFilter.value) || Infinity;

    dashboardState.filteredRecords = dashboardState.allRecords.filter(
      (record) => {
        const dateValid =
          (!dateFrom.value || record.date >= dateFrom.value) &&
          (!dateTo.value || record.date <= dateTo.value);
        const employeeValid =
          !employeeFilter.value || record.member === employeeFilter.value;
        const qualityValid =
          !qualityFilter.value || record.quality >= qualityMin;
        const errorsValid = !errorsFilter.value || record.errors <= maxErrors;

        return dateValid && employeeValid && qualityValid && errorsValid;
      }
    );

    dashboardState.currentPage = 1;
    updateDashboard();
  } catch (error) {
    console.error("Error applying filters:", error);
    alert(`Failed to apply filters: ${error.message}`);
  }
}

// Update the entire dashboard
function updateDashboard() {
  try {
    if (dashboardState.filteredRecords.length === 0) {
      showNoDataMessage();
      return;
    }

    updateSummaryCards();
    updateCharts();
    sortAndUpdateTable();
  } catch (error) {
    console.error("Dashboard update error:", error);
    alert(`Failed to update dashboard: ${error.message}`);
  }
}

// Show no data message
function showNoDataMessage() {
  domElements.summaryCards.innerHTML =
    '<div class="summary-card">No data available</div>';
  domElements.performanceTable.innerHTML =
    '<tr><td colspan="7">No records found</td></tr>';
  domElements.pagination.innerHTML = "";
  destroyAllCharts();
}

// Destroy all existing charts
function destroyAllCharts() {
  Object.entries(dashboardState.charts).forEach(([key, chart]) => {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
      dashboardState.charts[key] = null;
    }
  });
}

// Update summary cards
function updateSummaryCards() {
  try {
    const { filteredRecords } = dashboardState;
    const summaryCards = domElements.summaryCards;
    summaryCards.innerHTML = "";

    const metrics = calculateSummaryMetrics(filteredRecords);
    const summaries = [
      { value: filteredRecords.length, label: "Records", icon: "📊" },
      { value: metrics.totalEmployees, label: "Employees", icon: "👥" },
      { value: metrics.totalProducts, label: "Products", icon: "🛠️" },
      { value: metrics.avgQuality, label: "Avg Quality", icon: "⭐" },
      { value: metrics.totalErrors, label: "Total Errors", icon: "❌" },
      { value: `${metrics.errorRate}%`, label: "Error Rate", icon: "📉" },
      { value: metrics.avgScore, label: "Avg Score", icon: "🏆" },
      {
        value: filteredRecords[0]._sourceFile,
        label: "Source File",
        icon: "📁",
      },
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
  } catch (error) {
    console.error("Error updating summary cards:", error);
    throw new Error("Could not update summary cards");
  }
}

// Calculate summary metrics
function calculateSummaryMetrics(records) {
  try {
    const totalEmployees = new Set(records.map((r) => r.member)).size;
    const totalProducts = records.reduce((sum, r) => sum + r.products, 0);
    const avgQuality = (
      records.reduce((sum, r) => sum + r.quality, 0) / records.length
    ).toFixed(1);
    const totalErrors = records.reduce((sum, r) => sum + r.errors, 0);
    const errorRate =
      totalProducts > 0 ? ((totalErrors / totalProducts) * 100).toFixed(1) : 0;
    const avgScore = (
      records.reduce((sum, r) => sum + r._score, 0) / records.length
    ).toFixed(1);

    return {
      totalEmployees,
      totalProducts,
      avgQuality,
      totalErrors,
      errorRate,
      avgScore,
    };
  } catch (error) {
    console.error("Error calculating metrics:", error);
    throw new Error("Could not calculate summary metrics");
  }
}

// Update all charts
function updateCharts() {
  try {
    destroyAllCharts();

    const employees = [
      ...new Set(dashboardState.filteredRecords.map((r) => r.member)),
    ].sort();
    const dates = [
      ...new Set(dashboardState.filteredRecords.map((r) => r.date)),
    ].sort();

    const employeeData = calculateEmployeeMetrics(employees);

    dashboardState.charts.productivity = createProductivityChart(
      employees,
      employeeData
    );
    dashboardState.charts.quality = createQualityChart(employees, employeeData);
    dashboardState.charts.error = createErrorChart(employees, employeeData);
    dashboardState.charts.trend = createTrendChart(dates, employees);
    dashboardState.charts.dailyScore = createDailyScoreChart();
  } catch (error) {
    console.error("Error updating charts:", error);
    throw new Error("Could not update charts");
  }
}

// Calculate metrics per employee
function calculateEmployeeMetrics(employees) {
  const result = {};

  employees.forEach((emp) => {
    const empRecords = dashboardState.filteredRecords.filter(
      (r) => r.member === emp
    );
    const recordCount = empRecords.length;

    result[emp] = {
      totalProducts: empRecords.reduce((sum, r) => sum + r.products, 0),
      avgQuality:
        empRecords.reduce((sum, r) => sum + r.quality, 0) / recordCount,
      totalErrors: empRecords.reduce((sum, r) => sum + r.errors, 0),
      avgScore: empRecords.reduce((sum, r) => sum + r._score, 0) / recordCount,
      recordCount,
    };
  });

  return result;
}

// Create productivity chart
function createProductivityChart(employees, employeeData) {
  const ctx = document.getElementById("productivityChart").getContext("2d");
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: employees,
      datasets: [
        {
          label: "Total Products",
          data: employees.map((emp) => employeeData[emp].totalProducts),
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
    },
  });
}

// Create quality chart
function createQualityChart(employees, employeeData) {
  const ctx = document.getElementById("qualityChart").getContext("2d");
  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: employees,
      datasets: [
        {
          label: "Average Quality Score",
          data: employees.map((emp) => employeeData[emp].avgQuality),
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
          title: { display: true, text: "Quality Rating (1-10)" },
        },
      },
    },
  });
}

// Create error chart
function createErrorChart(employees, employeeData) {
  const ctx = document.getElementById("errorChart").getContext("2d");
  return new Chart(ctx, {
    type: "pie",
    data: {
      labels: employees,
      datasets: [
        {
          label: "Error Distribution",
          data: employees.map((emp) => employeeData[emp].totalErrors),
          backgroundColor: COLOR_PALETTE,
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
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              return `Percentage: ${((context.raw / total) * 100).toFixed(1)}%`;
            },
          },
        },
      },
    },
  });
}

// Create trend chart
function createTrendChart(dates, employees) {
  const ctx = document.getElementById("trendChart").getContext("2d");

  const datasets = employees.map((emp, i) => ({
    label: emp,
    data: dates.map((date) => {
      const record = dashboardState.filteredRecords.find(
        (r) => r.member === emp && r.date === date
      );
      return record?.products > 0 ? record.products : null;
    }),
    borderColor: COLOR_PALETTE[i % COLOR_PALETTE.length],
    backgroundColor: COLOR_PALETTE[i % COLOR_PALETTE.length],
    tension: 0.3,
    fill: false,
    pointRadius: 4,
    pointHoverRadius: 6,
    spanGaps: true,
  }));

  return new Chart(ctx, {
    type: "line",
    data: { labels: dates, datasets },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: (context) => {
              const record = dashboardState.filteredRecords.find(
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
    },
  });
}

// Create daily score chart
function createDailyScoreChart() {
  try {
    // Get the canvas element and its parent
    const canvas = document.getElementById("dailyScoreChart");
    if (!canvas) {
      throw new Error("Daily score chart canvas not found");
    }

    // Clone the canvas parent to completely clear any existing chart
    const parent = canvas.parentNode;
    const newCanvas = canvas.cloneNode(true);
    parent.replaceChild(newCanvas, canvas);

    // Ensure any existing chart reference is properly destroyed
    if (dashboardState.charts.dailyScore) {
      try {
        dashboardState.charts.dailyScore.destroy();
      } catch (e) {
        console.warn("Error destroying previous chart:", e);
      }
      dashboardState.charts.dailyScore = null;
    }

    // Get the filtered employees and dates
    const filteredEmployees = [
      ...new Set(dashboardState.filteredRecords.map((d) => d.member)),
    ];
    const filteredDates = [
      ...new Set(dashboardState.filteredRecords.map((d) => d.date)),
    ].sort((a, b) => new Date(a) - new Date(b));

    // Create a color map for consistent employee colors
    const colorMap = createEmployeeColorMap();

    // Prepare datasets
    const datasets = filteredEmployees.map((employee, i) => {
      const employeeData = dashboardState.filteredRecords.filter(
        (d) => d.member === employee
      );

      const scores = filteredDates.map((date) => {
        const record = employeeData.find((d) => d.date === date);
        return record?.dailyScore > 0
          ? Math.max(0, record.dailyScore - 5)
          : null;
      });

      return {
        label: employee,
        data: scores,
        borderColor:
          colorMap[employee] || COLOR_PALETTE[i % COLOR_PALETTE.length],
        backgroundColor:
          colorMap[employee] || COLOR_PALETTE[i % COLOR_PALETTE.length],
        tension: 0.3,
        fill: false,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 2,
      };
    });

    // Create new chart on the fresh canvas
    dashboardState.charts.dailyScore = new Chart(newCanvas, {
      type: "line",
      data: {
        labels: filteredDates,
        datasets: datasets,
      },
      options: {
        responsive: true,
        spanGaps: true,
        plugins: {
          tooltip: {
            callbacks: {
              label: function (context) {
                const record = dashboardState.filteredRecords.find(
                  (r) =>
                    r.member === context.dataset.label &&
                    r.date === context.label
                );
                return record
                  ? [
                      `Employee: ${record.member}`,
                      `Date: ${record.date}`,
                      `Score: ${
                        record.dailyScore > 0 ? record.dailyScore - 5 : 0
                      }`,
                      `Products: ${record.products}`,
                      `Quality: ${record.quality}`,
                      `Errors: ${record.errors}`,
                    ]
                  : `Score: ${context.raw}`;
              },
            },
          },
          legend: {
            onClick: (e, legendItem, legend) => {
              const index = legendItem.datasetIndex;
              const chart = legend.chart;
              const meta = chart.getDatasetMeta(index);
              meta.hidden = meta.hidden === null ? true : null;
              chart.update();
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
            ticks: {
              autoSkip: true,
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
        interaction: {
          intersect: false,
          mode: "index",
        },
      },
    });
  } catch (error) {
    console.error("Error creating daily score chart:", error);
    throw new Error("Failed to create daily score chart");
  }
}

// Helper function to create consistent color mapping
function createEmployeeColorMap() {
  const allEmployees = [
    ...new Set(dashboardState.allRecords.map((r) => r.member)),
  ].sort();
  const colorMap = {};

  allEmployees.forEach((employee, index) => {
    colorMap[employee] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  });

  return colorMap;
}

// Sort and update table
function sortAndUpdateTable() {
  try {
    const tableBody = domElements.performanceTable;
    tableBody.innerHTML = "";

    updateSortIndicators();
    const sortedRecords = sortRecords();
    updatePagination(sortedRecords.length);

    const paginatedRecords = getPaginatedRecords(sortedRecords);
    populateTable(paginatedRecords);
  } catch (error) {
    console.error("Error updating table:", error);
    throw new Error("Could not update performance table");
  }
}

// Update sort indicators in table headers
function updateSortIndicators() {
  document.querySelectorAll("#performanceTable th").forEach((th) => {
    th.classList.remove("sort-asc", "sort-desc");
  });

  const headerCells = document.querySelectorAll("#performanceTable th");
  const columnIndex = [
    "date",
    "member",
    "products",
    "quality",
    "errors",
    "score",
    "status",
  ].indexOf(dashboardState.currentSort.column);

  if (columnIndex >= 0) {
    headerCells[columnIndex].classList.add(
      `sort-${dashboardState.currentSort.direction}`
    );
  }
}

// Sort records based on current sort state
function sortRecords() {
  const { column, direction } = dashboardState.currentSort;

  return [...dashboardState.filteredRecords].sort((a, b) => {
    let valueA, valueB;

    switch (column) {
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
        valueA = a._score;
        valueB = b._score;
        break;
      default:
        return 0;
    }

    return direction === "asc"
      ? valueA > valueB
        ? 1
        : -1
      : valueA < valueB
      ? 1
      : -1;
  });
}

// Get paginated records
function getPaginatedRecords(records) {
  const startIndex = (dashboardState.currentPage - 1) * RECORDS_PER_PAGE;
  const endIndex = startIndex + RECORDS_PER_PAGE;
  return records.slice(startIndex, endIndex);
}

// Populate table with records
function populateTable(records) {
  const tableBody = domElements.performanceTable;

  records.forEach((record) => {
    const row = document.createElement("tr");
    const status = getPerformanceStatus(record);

    row.innerHTML = `
                    <td>${record.date}</td>
                    <td>${record.member}</td>
                    <td>${record.products}</td>
                    <td>${record.quality}</td>
                    <td>${record.errors}</td>
                    <td>${record._score.toFixed(1)}</td>
                    <td><span class="badge ${status.class}">${
      status.text
    }</span></td>
                `;

    tableBody.appendChild(row);
  });
}

// Get performance status
function getPerformanceStatus(record) {
  if (record.quality >= 8 && record.errors <= 1) {
    return { class: "badge-success", text: "Excellent" };
  } else if (record.quality >= 6 && record.errors <= 3) {
    return { class: "badge-warning", text: "Good" };
  }
  return { class: "badge-danger", text: "Needs Improvement" };
}

// Update pagination controls
function updatePagination(totalRecords) {
  const pagination = domElements.pagination;
  pagination.innerHTML = "";

  const totalPages = Math.ceil(totalRecords / RECORDS_PER_PAGE);
  if (totalPages <= 1) return;

  // Previous button
  const prevLi = createPaginationItem(
    "Previous",
    dashboardState.currentPage === 1,
    false,
    () => changePage(dashboardState.currentPage - 1)
  );
  pagination.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const li = createPaginationItem(
      i,
      i === dashboardState.currentPage,
      i === dashboardState.currentPage,
      () => changePage(i)
    );
    pagination.appendChild(li);
  }

  // Next button
  const nextLi = createPaginationItem(
    "Next",
    dashboardState.currentPage === totalPages,
    false,
    () => changePage(dashboardState.currentPage + 1)
  );
  pagination.appendChild(nextLi);
}

// Create pagination item
function createPaginationItem(text, isDisabled, isActive, onClick) {
  const li = document.createElement("li");
  li.className = "page-item";

  const a = document.createElement("a");
  a.className = `page-link ${isDisabled ? "disabled" : ""} ${
    isActive ? "activePage" : ""
  }`;
  a.textContent = text;
  a.onclick = !isDisabled ? onClick : null;

  li.appendChild(a);
  return li;
}

// Change current page
function changePage(page) {
  const totalPages = Math.ceil(
    dashboardState.filteredRecords.length / RECORDS_PER_PAGE
  );

  if (page < 1 || page > totalPages) return;

  dashboardState.currentPage = page;
  sortAndUpdateTable();

  window.scrollTo({
    top: document.getElementById("performanceTable").offsetTop - 20,
    behavior: "smooth",
  });
}

// Calculate daily score
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
  const maxScorePerProduct = baseWeight + 1 * qualityWeight - 0 * errorsWeight;
  const maxPossibleScore = maxScorePerProduct * products;
  const percentageScore = (rawScore / maxPossibleScore) * 100;

  return Math.round(Math.max(0, Math.min(100, percentageScore)));
}

// Add employee export buttons
function addEmployeeExportButtons() {
  try {
    const container = domElements.employeeExportButtons;
    container.innerHTML = "";
    console.log("dashboardState:", dashboardState.filteredRecords);

    // Use filteredRecords to only show buttons for employees in current filter
    const employees = [
      ...new Set(dashboardState.filteredRecords.map((r) => r.member)),
    ].sort();
    console.log("employees", employees);

    if (employees.length === 0) {
      container.innerHTML =
        '<div class="text-muted">No employees in current filter</div>';
      return;
    }

    employees.forEach((employee) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-sm btn-outline-primary m-1";
      btn.style.color = "#000";
      btn.innerHTML = `<i class="fas fa-download"></i> ${employee}`;
      btn.onclick = () => exportEmployeeData(employee);
      container.appendChild(btn);
    });

    // Add button to export all filtered data
    const allBtn = document.createElement("button");
    allBtn.className = "btn btn-sm btn-primary m-1";
    allBtn.innerHTML = `<i class="fas fa-download"></i> Export All Filtered Data`;
    allBtn.onclick = exportAllFilteredData;
    container.appendChild(allBtn);
  } catch (error) {
    console.error("Error adding export buttons:", error);
    throw new Error("Could not create export buttons");
  }
}

// Export employee data
async function exportEmployeeData(employee) {
  try {
    // Use filteredRecords instead of allRecords
    const employeeRecords = dashboardState.filteredRecords.filter(
      (r) => r.member === employee
    );

    if (employeeRecords.length === 0) {
      alert(`No filtered data found for ${employee}`);
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet data for the filtered records
    const wsData = createFilteredWorksheetData(employee, employeeRecords);
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Use a single sheet named after the employee
    XLSX.utils.book_append_sheet(wb, ws, `${employee}_Performance`);

    // Export to Excel
    XLSX.writeFile(wb, `${employee}_Filtered_Performance_Report.xlsx`);
  } catch (error) {
    console.error(`Error exporting filtered data for ${employee}:`, error);
    alert(`Failed to export filtered data: ${error.message}`);
  }
}

// Create worksheet data for filtered export
function createFilteredWorksheetData(employee, records) {
  const headerRows = 5;
  const firstDataRow = headerRows + 1;
  const lastDataRow = headerRows + records.length;

  // Get current filter values for the report header
  const dateFrom = domElements.dateFrom.value || "All dates";
  const dateTo = domElements.dateTo.value || "All dates";
  const qualityMin = domElements.qualityFilter.value || "No minimum";
  const maxErrors = domElements.errorsFilter.value || "No maximum";

  const wsData = [
    ["Employee Performance Report (Filtered Data)"],
    [`Employee: ${employee}`],
    [`Date Range: ${dateFrom} to ${dateTo}`],
    [`Quality Minimum: ${qualityMin}`, `Errors Maximum: ${maxErrors}`],
    [],
    [
      "Date",
      "Products",
      "Quality",
      "Errors",
      "Daily Score",
      "Performance Status",
      "Error Categories",
      "Error Descriptions",
    ],
  ];

  // Add records
  records.forEach((record) => {
    const status = getPerformanceStatus(record);
    wsData.push([
      record.date,
      record.products,
      record.quality,
      record.errors,
      record.dailyScore,
      status.text,
      record.errorCategory?.join(", ") || "",
      record.errorDescription?.join(", ") || "",
    ]);
  });

  // Add summary with formulas
  wsData.push(
    [],
    [
      "TOTALS/AVERAGES",
      { f: `SUM(B${firstDataRow}:B${lastDataRow})` },
      { f: `AVERAGE(C${firstDataRow}:C${lastDataRow})` },
      { f: `SUM(D${firstDataRow}:D${lastDataRow})` },
      { f: `AVERAGE(E${firstDataRow}:E${lastDataRow})` },
      "",
      "",
      "",
    ]
  );

  return wsData;
}

// Export all filtered data
function exportAllFilteredData() {
  try {
    if (dashboardState.filteredRecords.length === 0) {
      alert("No filtered data to export");
      return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create worksheet data for all filtered records
    const wsData = createAllFilteredWorksheetData(
      dashboardState.filteredRecords
    );
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Use a single sheet named "Filtered Data"
    XLSX.utils.book_append_sheet(wb, ws, "Filtered Data");

    // Get current filter values for filename
    const dateFrom = domElements.dateFrom.value
      ? domElements.dateFrom.value.replace(/-/g, "")
      : "AllDates";
    const dateTo = domElements.dateTo.value
      ? domElements.dateTo.value.replace(/-/g, "")
      : "AllDates";
    const employeeFilter = domElements.employeeFilter.value || "AllEmployees";

    // Export to Excel
    XLSX.writeFile(
      wb,
      `Filtered_Performance_${employeeFilter}_${dateFrom}_to_${dateTo}.xlsx`
    );
  } catch (error) {
    console.error("Error exporting all filtered data:", error);
    alert(`Failed to export filtered data: ${error.message}`);
  }
}

// Create worksheet data for all filtered records
function createAllFilteredWorksheetData(records) {
  const headerRows = 5;
  const firstDataRow = headerRows + 1;
  const lastDataRow = headerRows + records.length;

  // Get current filter values for the report header
  const dateFrom = domElements.dateFrom.value || "All dates";
  const dateTo = domElements.dateTo.value || "All dates";
  const employeeFilter = domElements.employeeFilter.value || "All employees";
  const qualityMin = domElements.qualityFilter.value || "No minimum";
  const maxErrors = domElements.errorsFilter.value || "No maximum";

  const wsData = [
    ["Employee Performance Report (All Filtered Data)"],
    [`Date Range: ${dateFrom} to ${dateTo}`],
    [`Employee: ${employeeFilter}`],
    [`Quality Minimum: ${qualityMin}`, `Errors Maximum: ${maxErrors}`],
    [],
    [
      "Date",
      "Employee",
      "Products",
      "Quality",
      "Errors",
      "Daily Score",
      "Performance Status",
      "Error Categories",
      "Error Descriptions",
    ],
  ];

  // Add records
  records.forEach((record) => {
    const status = getPerformanceStatus(record);
    wsData.push([
      record.date,
      record.member,
      record.products,
      record.quality,
      record.errors,
      record.dailyScore,
      status.text,
      record.errorCategory?.join(", ") || "",
      record.errorDescription?.join(", ") || "",
    ]);
  });

  // Add summary with formulas
  wsData.push(
    [],
    [
      "TOTALS/AVERAGES",
      "",
      { f: `SUM(C${firstDataRow}:C${lastDataRow})` },
      { f: `AVERAGE(D${firstDataRow}:D${lastDataRow})` },
      { f: `SUM(E${firstDataRow}:E${lastDataRow})` },
      { f: `AVERAGE(F${firstDataRow}:F${lastDataRow})` },
      "",
      "",
      "",
    ]
  );

  return wsData;
}

// Sort table when header is clicked
function sortTable(column) {
  if (dashboardState.currentSort.column === column) {
    dashboardState.currentSort.direction =
      dashboardState.currentSort.direction === "asc" ? "desc" : "asc";
  } else {
    dashboardState.currentSort = { column, direction: "asc" };
  }
  sortAndUpdateTable();
}

// Initialize the dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", initDashboard);
