const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxQ3ER8XrUn1DIaIXMzlVXPMYu63ezWIiI09n9LGw4t71k9VzOWvbKTcQ5O4mUqpu31/exec";

const form = document.getElementById("entry-form");
const statusEl = document.getElementById("status");
const nameFilter = document.getElementById("name-filter");
const chartHint = document.getElementById("chart-hint");
const dateInput = document.getElementById("date");

let chart = null;
let cachedRecords = [];

const today = new Date();
dateInput.value = today.toISOString().slice(0, 10);

function setStatus(message, kind) {
  statusEl.textContent = message;
  if (kind) {
    statusEl.dataset.kind = kind;
  } else {
    delete statusEl.dataset.kind;
  }
}

function apiConfigured() {
  return API_BASE_URL && !API_BASE_URL.includes("YOUR_GAS_WEB_APP_URL");
}

function normalizeRecords(records) {
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    date: record.date,
    delta: Number(record.delta || 0),
    createdAt: record.created_at || record.createdAt || "",
  }));
}

function sortRecords(records) {
  return [...records].sort((a, b) => {
    if (a.date === b.date) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.date.localeCompare(b.date);
  });
}

function computeSeries(records) {
  let total = 0;
  const labels = [];
  const values = [];

  records.forEach((record) => {
    total += record.delta;
    labels.push(record.date);
    values.push(total);
  });

  return { labels, values };
}

function updateFilterOptions(records) {
  const current = nameFilter.value;
  const names = Array.from(new Set(records.map((record) => record.name))).sort();

  nameFilter.innerHTML = "<option value=\"all\">All players</option>";
  names.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    nameFilter.appendChild(option);
  });

  if (names.includes(current)) {
    nameFilter.value = current;
  }
}

function getFilteredRecords(records) {
  const filter = nameFilter.value;
  if (filter === "all") {
    return records;
  }
  return records.filter((record) => record.name === filter);
}

function renderChart(records) {
  const ctx = document.getElementById("trend-chart");
  const sorted = sortRecords(records);
  const series = computeSeries(sorted);

  chartHint.textContent = series.labels.length
    ? `Entries: ${series.labels.length} | Latest total: ${
        series.values[series.values.length - 1]
      }`
    : "No data yet. Add your first entry.";

  if (!chart) {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "Cumulative chips",
            data: series.values,
            borderColor: "#1f8a8a",
            backgroundColor: "rgba(31, 138, 138, 0.2)",
            tension: 0.25,
            fill: true,
            pointRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            grid: {
              color: "rgba(0, 0, 0, 0.08)",
            },
          },
          x: {
            grid: {
              display: false,
            },
          },
        },
      },
    });
    return;
  }

  chart.data.labels = series.labels;
  chart.data.datasets[0].data = series.values;
  chart.update();
}

async function fetchRecords() {
  if (!apiConfigured()) {
    setStatus("Set API_BASE_URL in app.js first.", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}?action=list`);
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.error?.message || "Failed to load data.");
    }

    cachedRecords = normalizeRecords(payload.data || []);
    updateFilterOptions(cachedRecords);
    renderChart(getFilteredRecords(cachedRecords));
    setStatus("Data loaded.", "success");
  } catch (error) {
    setStatus(error.message, "error");
  }
}

async function submitRecord(record) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "create",
      data: record,
    }),
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error?.message || "Failed to save entry.");
  }
  return payload.data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("Saving entry...", "success");

  const formData = new FormData(form);
  const name = formData.get("name").trim();
  const date = formData.get("date");
  const delta = Number(formData.get("delta"));

  if (!name) {
    setStatus("Name is required.", "error");
    document.getElementById("name").focus();
    return;
  }

  if (!date) {
    setStatus("Date is required.", "error");
    document.getElementById("date").focus();
    return;
  }

  if (Number.isNaN(delta)) {
    setStatus("Chip delta must be a number.", "error");
    document.getElementById("delta").focus();
    return;
  }

  try {
    await submitRecord({ name, date, delta });
    form.reset();
    dateInput.value = today.toISOString().slice(0, 10);
    setStatus("Entry saved.", "success");
    await fetchRecords();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

nameFilter.addEventListener("change", () => {
  renderChart(getFilteredRecords(cachedRecords));
});

fetchRecords();
