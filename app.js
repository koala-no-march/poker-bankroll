const API_BASE_URL = "https://script.google.com/macros/s/AKfycbxQ3ER8XrUn1DIaIXMzlVXPMYu63ezWIiI09n9LGw4t71k9VzOWvbKTcQ5O4mUqpu31/exec";

const form = document.getElementById("entry-form");
const statusEl = document.getElementById("status");
const nameFilter = document.getElementById("name-filter");
const chartHint = document.getElementById("chart-hint");
const dateInput = document.getElementById("date");
const recordIdInput = document.getElementById("record-id");
const submitButton = document.getElementById("submit-button");
const cancelEditButton = document.getElementById("cancel-edit");
const recordsBody = document.getElementById("records-body");
const tableEmpty = document.getElementById("table-empty");

let chart = null;
let cachedRecords = [];

const today = new Date();
dateInput.value = today.toISOString().slice(0, 10);
const CHART_YEAR = 2026;
const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

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

function getYearMonth(dateString) {
  if (!dateString) {
    return null;
  }
  const parts = dateString.split("-");
  if (parts.length !== 3) {
    return null;
  }
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) {
    return null;
  }
  return { year, month };
}

function computeMonthlySeries(records) {
  const monthlyTotals = Array.from({ length: 12 }, () => 0);
  records.forEach((record) => {
    const parsed = getYearMonth(record.date);
    if (!parsed || parsed.year !== CHART_YEAR) {
      return;
    }
    monthlyTotals[parsed.month - 1] += record.delta;
  });

  let total = 0;
  const values = monthlyTotals.map((delta) => {
    total += delta;
    return total;
  });

  return { labels: MONTH_LABELS, values };
}

function updateFilterOptions(records) {
  const current = nameFilter.value;
  const names = Array.from(new Set(records.map((record) => record.name))).sort();

  nameFilter.innerHTML = "<option value=\"all\">全員</option>";
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
  const series = computeMonthlySeries(sorted);

  chartHint.textContent = records.length
    ? `記録件数: ${records.length} | 最新累計: ${
        series.values[series.values.length - 1]
      }`
    : "まだデータがありません。";

  if (!chart) {
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: "累計チップ",
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

function renderTable(records) {
  const sorted = sortRecords(records).reverse();
  recordsBody.innerHTML = "";

  if (sorted.length === 0) {
    tableEmpty.textContent = "表示する記録がありません。";
    return;
  }

  tableEmpty.textContent = "";
  sorted.forEach((record) => {
    const row = document.createElement("tr");

    const nameCell = document.createElement("td");
    nameCell.textContent = record.name;

    const dateCell = document.createElement("td");
    dateCell.textContent = record.date;

    const deltaCell = document.createElement("td");
    deltaCell.textContent = record.delta;

    const actionCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost edit-button";
    editButton.textContent = "編集";
    editButton.addEventListener("click", () => startEdit(record));
    actionCell.appendChild(editButton);

    row.appendChild(nameCell);
    row.appendChild(dateCell);
    row.appendChild(deltaCell);
    row.appendChild(actionCell);
    recordsBody.appendChild(row);
  });
}

function startEdit(record) {
  recordIdInput.value = record.id;
  form.name.value = record.name;
  form.date.value = record.date;
  form.delta.value = record.delta;
  submitButton.textContent = "更新する";
  cancelEditButton.classList.remove("is-hidden");
  setStatus("編集中の記録があります。", "success");
}

function resetFormState() {
  recordIdInput.value = "";
  submitButton.textContent = "保存する";
  cancelEditButton.classList.add("is-hidden");
}

async function fetchRecords() {
  if (!apiConfigured()) {
    setStatus("API_BASE_URLが未設定です。", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}?action=list`);
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.error?.message || "データの取得に失敗しました。");
    }

    cachedRecords = normalizeRecords(payload.data || []);
    updateFilterOptions(cachedRecords);
    const filtered = getFilteredRecords(cachedRecords);
    renderChart(filtered);
    renderTable(filtered);
    setStatus("データを読み込みました。", "success");
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
    throw new Error(payload.error?.message || "保存に失敗しました。");
  }
  return payload.data;
}

async function updateRecord(recordId, record) {
  const response = await fetch(API_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "update",
      id: recordId,
      data: record,
    }),
  });

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error?.message || "更新に失敗しました。");
  }
  return payload.data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("保存しています...", "success");

  const formData = new FormData(form);
  const name = formData.get("name").trim();
  const date = formData.get("date");
  const delta = Number(formData.get("delta"));

  if (!name) {
    setStatus("氏名は必須です。", "error");
    document.getElementById("name").focus();
    return;
  }

  if (!date) {
    setStatus("日付は必須です。", "error");
    document.getElementById("date").focus();
    return;
  }

  if (Number.isNaN(delta)) {
    setStatus("チップ増減は数値で入力してください。", "error");
    document.getElementById("delta").focus();
    return;
  }

  try {
    const recordId = recordIdInput.value;
    if (recordId) {
      await updateRecord(recordId, { name, date, delta });
      setStatus("更新しました。", "success");
    } else {
      await submitRecord({ name, date, delta });
      setStatus("保存しました。", "success");
    }
    form.reset();
    dateInput.value = today.toISOString().slice(0, 10);
    resetFormState();
    await fetchRecords();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

nameFilter.addEventListener("change", () => {
  const filtered = getFilteredRecords(cachedRecords);
  renderChart(filtered);
  renderTable(filtered);
});

cancelEditButton.addEventListener("click", () => {
  form.reset();
  dateInput.value = today.toISOString().slice(0, 10);
  resetFormState();
  setStatus("編集を解除しました。", "success");
});

fetchRecords();
