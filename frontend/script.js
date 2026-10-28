
const API = "/api";

const state = {
  students: [],
  attendance: [],
  attendanceDraft: {},
  reportRecords: [],
  editingStudentId: null
};

const $ = (id) => document.getElementById(id);

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || result.error || "Request failed.");
  }

  return result;
}

function showMessage(message, type = "success") {
  const box = $("message");
  box.textContent = message;
  box.className = `message ${type}`;
  box.hidden = false;

  window.clearTimeout(showMessage.timeout);
  showMessage.timeout = window.setTimeout(() => {
    box.hidden = true;
  }, 4000);
}

function formatDate(value) {
  if (!value) return "—";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function statusBadge(status) {
  const normalized = status || "Unmarked";
  const className = normalized.toLowerCase();

  return `<span class="badge ${escapeHTML(className)}">${escapeHTML(normalized)}</span>`;
}

function setPage(pageName) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === `${pageName}-page`);
  });

  document.querySelectorAll(".nav-link").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === pageName);
  });

  const titles = {
    dashboard: "Dashboard",
    students: "Students",
    attendance: "Mark Attendance",
    reports: "Reports"
  };

  $("page-title").textContent = titles[pageName] || "Dashboard";

  if (pageName === "students") loadStudents();
  if (pageName === "attendance") loadAttendance();
  if (pageName === "reports") loadReport();
}

function getStudent(studentId) {
  return state.students.find(
    (student) => student.student_id === studentId
  );
}

// -------------------- STUDENTS --------------------

async function loadStudents() {
  try {
    const search = $("student-search").value.trim();
    const query = search ? `?search=${encodeURIComponent(search)}` : "";

    const result = await apiRequest(`/students${query}`);

    state.students = result;
    renderStudents();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function renderStudents() {
  const search = $("student-search").value.trim().toLowerCase();

  const students = state.students.filter((student) => {
    const text = [
      student.student_id,
      student.name,
      student.class_name,
      student.email
    ].join(" ").toLowerCase();

    return text.includes(search);
  });

  $("student-count").textContent =
    `${students.length} student${students.length === 1 ? "" : "s"}`;

  $("students-body").innerHTML = students.length
    ? students.map((student) => `
      <tr>
        <td>${escapeHTML(student.student_id)}</td>
        <td>${escapeHTML(student.name)}</td>
        <td>${escapeHTML(student.class_name)}</td>
        <td>${escapeHTML(student.email || "—")}</td>
        <td>
          <button class="action-btn" data-edit="${escapeHTML(student.student_id)}">
            Edit
          </button>
          <button class="action-btn delete" data-delete="${escapeHTML(student.student_id)}">
            Deactivate
          </button>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="5" class="empty-row">No students found.</td></tr>`;
}

function openStudentForm(student = null) {
  state.editingStudentId = student?.student_id || null;

  $("student-form").reset();
  $("student-form-panel").hidden = false;

  $("student-form-title").textContent = student
    ? "Edit Student"
    : "Add New Student";

  $("student-id").disabled = Boolean(student);
  $("save-student-btn").textContent = student
    ? "Update Student"
    : "Save Student";

  if (student) {
    $("student-id").value = student.student_id;
    $("student-name").value = student.name;
    $("student-class").value = student.class_name;
    $("student-email").value = student.email || "";
  }

  $("student-form-panel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

$("add-student-btn").addEventListener("click", () => {
  openStudentForm();
});

$("cancel-student-btn").addEventListener("click", () => {
  $("student-form-panel").hidden = true;
  state.editingStudentId = null;
});

$("reset-student-btn").addEventListener("click", () => {
  if (state.editingStudentId) {
    openStudentForm(getStudent(state.editingStudentId));
  } else {
    $("student-form").reset();
  }
});

$("student-form").addEventListener("submit", async (event) => {
  event.preventDefault();

  const student = {
    student_id: $("student-id").value.trim(),
    name: $("student-name").value.trim(),
    class_name: $("student-class").value.trim(),
    email: $("student-email").value.trim() || null
  };

  try {
    if (state.editingStudentId) {
      await apiRequest(
        `/students/${encodeURIComponent(state.editingStudentId)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: student.name,
            class_name: student.class_name,
            email: student.email
          })
        }
      );

      showMessage("Student updated successfully.");
    } else {
      await apiRequest("/students", {
        method: "POST",
        body: JSON.stringify(student)
      });

      showMessage("Student added successfully.");
    }

    $("student-form-panel").hidden = true;
    state.editingStudentId = null;

    await loadStudents();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, "error");
  }
});

$("students-body").addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const student = getStudent(editButton.dataset.edit);

    if (student) openStudentForm(student);
  }

  if (deleteButton) {
    const id = deleteButton.dataset.delete;

    if (!confirm(`Deactivate student ${id}?`)) return;

    try {
      await apiRequest(`/students/${encodeURIComponent(id)}`, {
        method: "DELETE"
      });

      showMessage("Student deactivated successfully.");
      await loadStudents();
      await loadDashboard();
    } catch (error) {
      showMessage(error.message, "error");
    }
  }
});

let studentSearchTimer;

$("student-search").addEventListener("input", () => {
  window.clearTimeout(studentSearchTimer);

  studentSearchTimer = window.setTimeout(() => {
    loadStudents();
  }, 250);
});

// -------------------- ATTENDANCE --------------------

async function loadAttendance() {
  const date = $("attendance-date").value || localDate();

  $("attendance-date").value = date;

  try {
    const [students, records] = await Promise.all([
      apiRequest("/students"),
      apiRequest(`/attendance?date=${encodeURIComponent(date)}`)
    ]);

    state.students = students;
    state.attendance = records;
    state.attendanceDraft = {};

    records.forEach((record) => {
      state.attendanceDraft[record.student_id] = record.status;
    });

    renderAttendance();
  } catch (error) {
    showMessage(error.message, "error");
  }
}

function renderAttendance() {
  const search = $("attendance-search").value.trim().toLowerCase();

  const students = state.students.filter((student) => {
    const text = `${student.student_id} ${student.name} ${student.class_name}`
      .toLowerCase();

    return text.includes(search);
  });

  $("attendance-body").innerHTML = students.length
    ? students.map((student) => {
      const status = state.attendanceDraft[student.student_id] || "";

      return `
        <tr>
          <td>${escapeHTML(student.student_id)}</td>
          <td>${escapeHTML(student.name)}</td>
          <td>${escapeHTML(student.class_name)}</td>
          <td>
            <select
              class="status-select"
              data-attendance-id="${escapeHTML(student.student_id)}"
              aria-label="Attendance status for ${escapeHTML(student.name)}"
            >
              <option value="" ${status === "" ? "selected" : ""}>Unmarked</option>
              <option value="Present" ${status === "Present" ? "selected" : ""}>Present</option>
              <option value="Absent" ${status === "Absent" ? "selected" : ""}>Absent</option>
            </select>
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="4" class="empty-row">No students found. Add students first.</td></tr>`;

  updateAttendanceCounters();
}

function updateAttendanceCounters() {
  const statuses = Object.values(state.attendanceDraft);

  $("marked-present").textContent =
    statuses.filter((status) => status === "Present").length;

  $("marked-absent").textContent =
    statuses.filter((status) => status === "Absent").length;

  $("marked-unmarked").textContent =
    Math.max(0, state.students.length -
      statuses.filter((status) => status === "Present" || status === "Absent").length);
}

$("attendance-body").addEventListener("change", (event) => {
  const select = event.target.closest("[data-attendance-id]");

  if (!select) return;

  const id = select.dataset.attendanceId;

  if (select.value) {
    state.attendanceDraft[id] = select.value;
  } else {
    delete state.attendanceDraft[id];
  }

  updateAttendanceCounters();
});

$("attendance-search").addEventListener("input", renderAttendance);
$("load-attendance-btn").addEventListener("click", loadAttendance);

$("attendance-date").addEventListener("change", loadAttendance);

$("save-attendance-btn").addEventListener("click", async () => {
  const date = $("attendance-date").value;

  if (!date) {
    showMessage("Select an attendance date.", "error");
    return;
  }

  const entries = Object.entries(state.attendanceDraft).filter(
    ([, status]) => status === "Present" || status === "Absent"
  );

  if (!entries.length) {
    showMessage("Mark at least one student before saving.", "error");
    return;
  }

  const button = $("save-attendance-btn");
  button.disabled = true;
  button.textContent = "Saving...";

  try {
    // Save each marked record. Unmarked students are left unchanged.
    const results = await Promise.allSettled(
      entries.map(([student_id, status]) =>
        apiRequest("/attendance", {
          method: "POST",
          body: JSON.stringify({
            student_id,
            attendance_date: date,
            status
          })
        })
      )
    );

    const failed = results.filter(
      (result) => result.status === "rejected"
    );

    if (failed.length) {
      showMessage(
        `${entries.length - failed.length} saved; ${failed.length} failed. ${failed[0].reason.message}`,
        "error"
      );
    } else {
      showMessage("Attendance saved successfully.");
    }

    await loadAttendance();
    await loadDashboard();
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = "Save Attendance";
  }
});

// -------------------- DASHBOARD --------------------

async function loadDashboard() {
  try {
    const today = localDate();

    const [students, records, summary] = await Promise.all([
      apiRequest("/students"),
      apiRequest(`/attendance?date=${encodeURIComponent(today)}`),
      apiRequest(`/attendance/reports/summary?date=${encodeURIComponent(today)}`)
    ]);

    state.students = students;
    state.attendance = records;

    $("total-students").textContent = summary.data
      ? summary.data.totalStudents
      : summary.totalStudents;

    const data = summary.data || summary;

    $("total-students").textContent = data.totalStudents;
    $("present-today").textContent = data.present;
    $("absent-today").textContent = data.absent;
    $("attendance-rate").textContent = `${data.attendancePercentage}%`;

    const studentMap = new Map(
      students.map((student) => [student.student_id, student])
    );

    const recent = [...records].reverse();

    $("recent-attendance-body").innerHTML = recent.length
      ? recent.slice(0, 8).map((record) => {
        const student = studentMap.get(record.student_id);

        return `
          <tr>
            <td>${escapeHTML(record.student_id)}</td>
            <td>${escapeHTML(student?.name || "Student record")}</td>
            <td>${escapeHTML(student?.class_name || "—")}</td>
            <td>${escapeHTML(formatDate(record.attendance_date))}</td>
            <td>${statusBadge(record.status)}</td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="5" class="empty-row">No attendance records for today.</td></tr>`;
  } catch (error) {
    showMessage(error.message, "error");
  }
}

// -------------------- REPORTS --------------------

async function loadReport() {
  const date = $("report-date").value || localDate();

  $("report-date").value = date;

  try {
    const [students, records, summary] = await Promise.all([
      apiRequest("/students"),
      apiRequest(`/attendance?date=${encodeURIComponent(date)}`),
      apiRequest(`/attendance/reports/summary?date=${encodeURIComponent(date)}`)
    ]);

    state.students = students;
    state.reportRecords = records;

    const data = summary.data || summary;

    $("report-total").textContent = data.totalStudents;
    $("report-present").textContent = data.present;
    $("report-absent").textContent = data.absent;
    $("report-unmarked").textContent = data.unmarked;
    $("report-rate").textContent = `${data.attendancePercentage}%`;

    const studentMap = new Map(
      students.map((student) => [student.student_id, student])
    );

    $("report-body").innerHTML = students.length
      ? students.map((student) => {
        const record = records.find(
          (item) => item.student_id === student.student_id
        );

        return `
          <tr>
            <td>${escapeHTML(student.student_id)}</td>
            <td>${escapeHTML(student.name)}</td>
            <td>${escapeHTML(student.class_name)}</td>
            <td>${escapeHTML(formatDate(date))}</td>
            <td>${statusBadge(record?.status || "Unmarked")}</td>
          </tr>
        `;
      }).join("")
      : `<tr><td colspan="5" class="empty-row">No students available.</td></tr>`;

    // Store the student details needed for CSV export.
    state.reportStudentMap = studentMap;
  } catch (error) {
    showMessage(error.message, "error");
  }
}

$("load-report-btn").addEventListener("click", loadReport);
$("report-date").addEventListener("change", loadReport);

$("export-csv-btn").addEventListener("click", () => {
  const date = $("report-date").value;

  if (!date || !state.students.length) {
    showMessage("Generate a report before exporting.", "error");
    return;
  }

  const quote = (value) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = [
    ["Student ID", "Student Name", "Class", "Date", "Status"],
    ...state.students.map((student) => {
      const record = state.reportRecords.find(
        (item) => item.student_id === student.student_id
      );

      return [
        student.student_id,
        student.name,
        student.class_name,
        date,
        record?.status || "Unmarked"
      ];
    })
  ];

  const csv = rows.map((row) => row.map(quote).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `attendance-${date}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  showMessage("CSV report exported.");
});

// -------------------- NAVIGATION --------------------

document.querySelectorAll("[data-page]").forEach((button) => {
  button.addEventListener("click", () => {
    setPage(button.dataset.page);
  });
});

document.querySelectorAll("[data-go]").forEach((button) => {
  button.addEventListener("click", () => {
    setPage(button.dataset.go);
  });
});

// -------------------- INITIALIZATION --------------------

async function initializeApp() {
  const today = localDate();

  $("today-label").textContent = new Date().toLocaleDateString(
    undefined,
    {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    }
  );

  $("attendance-date").value = today;
  $("report-date").value = today;

  try {
    await apiRequest("/health");
    await loadDashboard();
  } catch (error) {
    showMessage(
      "Cannot connect to the backend. Start the Node.js server and check your Supabase configuration.",
      "error"
    );
  }
}

initializeApp();
