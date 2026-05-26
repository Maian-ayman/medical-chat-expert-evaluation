const appEl = document.getElementById("app");
const toastEl = document.getElementById("toast");

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 3200);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function parseRoute() {
  const path = window.location.pathname;
  if (path.match(/^\/evaluations\/?$/)) return { view: "evaluations" };
  const caseMatch = path.match(/^\/case\/(\d+)\/?$/);
  if (caseMatch) return { view: "case", sessionId: parseInt(caseMatch[1], 10) };
  const deptMatch = path.match(/^\/department\/([a-z]+)\/?$/);
  if (deptMatch) return { view: "department", deptKey: deptMatch[1] };
  return { view: "home" };
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return null;
  return res.json();
}

function navigate(path) {
  history.pushState(null, "", path);
  render();
}

window.addEventListener("popstate", render);

const SCORE_FIELDS = [
  "clinical_relevance_score",
  "question_specificity_score",
  "single_question_score",
  "safety_score",
  "linguistic_score",
  "denial_handling_score",
  "department_accuracy_score",
  "clinical_reasoning_score",
];

function scoreAverage(item) {
  const values = SCORE_FIELDS.map((f) => item[f]).filter((v) => v != null);
  if (!values.length) return "—";
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Number.isInteger(avg) ? String(avg) : avg.toFixed(1);
}

function setPageLayout(view) {
  appEl.classList.toggle("page-evaluations", view === "evaluations");
}

async function renderHome() {
  setPageLayout("home");
  const departments = await api("/api/departments");
  appEl.innerHTML = `
    <header class="page-header">
      <h1>تقييم المحادثات الطبية</h1>
      <p>واجهة الأطباء الخبراء — Multi-Agent Medical Chatbot Evaluation</p>
      <div class="top-actions">
        <a class="btn btn-outline" href="/evaluations" data-nav>عرض كل التقييمات المحفوظة</a>
      </div>
    </header>
    <div class="dept-grid">
      ${departments
        .map((d) => {
          const pct =
            d.total_cases > 0
              ? Math.round((d.evaluated_count / d.total_cases) * 100)
              : 0;
          return `
            <a class="dept-card" href="/department/${d.key}" data-nav>
              <h2>${escapeHtml(d.name_ar)}</h2>
              <div class="en">${escapeHtml(d.name_en)}</div>
              <div class="stats">
                <span>${d.evaluated_count} / ${d.total_cases} حالة مقيّمة</span>
                <span>${pct}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width:${pct}%"></div>
              </div>
            </a>
          `;
        })
        .join("")}
    </div>
  `;
  bindNavLinks();
}

function downloadEvaluationsCsv(rows) {
  const headers = [
    "القسم",
    "رقم الحالة",
    "Session ID",
    "المتوسط",
    "ارتباط",
    "دقة",
    "سؤال واحد",
    "سلامة",
    "لغة",
    "رفض",
    "قسم (دقة)",
    "سريري",
    "ملاحظات",
    "آخر تحديث",
  ];
  const lines = [headers.join(",")];
  for (const item of rows) {
    const cells = [
      item.department_name,
      item.case_number ?? "",
      item.session_id,
      scoreAverage(item),
      item.clinical_relevance_score,
      item.question_specificity_score,
      item.single_question_score,
      item.safety_score,
      item.linguistic_score,
      item.denial_handling_score,
      item.department_accuracy_score,
      item.clinical_reasoning_score,
      (item.doctor_notes || "").replace(/"/g, '""'),
      item.updated_at,
    ].map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`);
    lines.push(cells.join(","));
  }
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expert_evaluations.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function renderEvaluationsTableRows(rows) {
  if (!rows.length) {
    return `<tr><td colspan="12" class="table-empty">لا توجد تقييمات لهذا القسم.</td></tr>`;
  }
  return rows
    .map((item) => {
      const notes = item.doctor_notes ? escapeHtml(item.doctor_notes) : "—";
      const caseLabel =
        item.case_number != null
          ? `Case ${item.case_number}<span class="session-id">${item.session_id}</span>`
          : `Session ${item.session_id}`;
      const score = (f) => (item[f] != null ? item[f] : "—");
      return `
        <tr class="eval-row" data-session="${item.session_id}">
          <td>${escapeHtml(item.department_name)}</td>
          <td>
            <a href="/case/${item.session_id}" class="case-link" data-nav>${caseLabel}</a>
          </td>
          <td class="num">${scoreAverage(item)}</td>
          <td class="num">${score("clinical_relevance_score")}</td>
          <td class="num">${score("question_specificity_score")}</td>
          <td class="num">${score("single_question_score")}</td>
          <td class="num">${score("safety_score")}</td>
          <td class="num">${score("linguistic_score")}</td>
          <td class="num">${score("denial_handling_score")}</td>
          <td class="num">${score("department_accuracy_score")}</td>
          <td class="num">${score("clinical_reasoning_score")}</td>
          <td class="notes-cell">${notes}</td>
        </tr>
      `;
    })
    .join("");
}

async function renderEvaluations() {
  setPageLayout("evaluations");
  const [evaluations, departments] = await Promise.all([
    api("/api/evaluations"),
    api("/api/departments"),
  ]);

  const deptOptions = departments
    .map(
      (d) =>
        `<option value="${d.key}">${escapeHtml(d.name_ar)}</option>`
    )
    .join("");

  appEl.innerHTML = `
    <nav class="breadcrumb">
      <a href="/" data-nav>الرئيسية</a>
      <span>›</span>
      <span>التقييمات المحفوظة</span>
    </nav>
    <header class="page-header">
      <h1>التقييمات المحفوظة</h1>
      <p>كل التقييمات المسجّلة من الأطباء — من قاعدة البيانات مباشرة</p>
    </header>
  `;

  const toolbar = document.createElement("div");
  toolbar.className = "eval-toolbar section-card";
  toolbar.innerHTML = `
    <div class="eval-total">إجمالي التقييمات: <strong id="eval-count">${evaluations.length}</strong></div>
    <label class="eval-filter">
      <span>القسم:</span>
      <select id="dept-filter">
        <option value="">كل الأقسام</option>
        ${deptOptions}
      </select>
    </label>
    <button type="button" class="btn btn-outline" id="btn-csv">تنزيل CSV (أو Excel)</button>
  `;
  appEl.appendChild(toolbar);

  const tableWrap = document.createElement("div");
  tableWrap.className = "section-card table-card";
  tableWrap.innerHTML = `
    <div class="table-scroll">
      <table class="eval-table">
        <thead>
          <tr>
            <th>القسم</th>
            <th>الحالة</th>
            <th>المتوسط</th>
            <th>ارتباط</th>
            <th>دقة</th>
            <th>سؤال واحد</th>
            <th>سلامة</th>
            <th>لغة</th>
            <th>رفض</th>
            <th>قسم</th>
            <th>سريري</th>
            <th>ملاحظات</th>
          </tr>
        </thead>
        <tbody id="eval-tbody">${renderEvaluationsTableRows(evaluations)}</tbody>
      </table>
    </div>
  `;
  appEl.appendChild(tableWrap);

  if (!evaluations.length) {
    tableWrap.querySelector("#eval-tbody").innerHTML =
      `<tr><td colspan="12" class="table-empty">لا توجد تقييمات محفوظة بعد.</td></tr>`;
  }

  const allRows = evaluations;

  function applyFilter() {
    const key = document.getElementById("dept-filter").value;
    const filtered = key
      ? allRows.filter((r) => r.department_key === key)
      : allRows;
    document.getElementById("eval-count").textContent = filtered.length;
    document.getElementById("eval-tbody").innerHTML =
      renderEvaluationsTableRows(filtered);
    bindNavLinks();
  }

  document.getElementById("dept-filter").addEventListener("change", applyFilter);
  document.getElementById("btn-csv").addEventListener("click", () => {
    const key = document.getElementById("dept-filter").value;
    const filtered = key
      ? allRows.filter((r) => r.department_key === key)
      : allRows;
    downloadEvaluationsCsv(filtered);
  });

  bindNavLinks();
}

async function renderDepartment(deptKey) {
  setPageLayout("department");
  const [departments, cases] = await Promise.all([
    api("/api/departments"),
    api(`/api/departments/${deptKey}/cases`),
  ]);
  const dept = departments.find((d) => d.key === deptKey);
  if (!dept) {
    appEl.innerHTML = `<p class="error-msg">القسم غير موجود</p>`;
    return;
  }

  appEl.innerHTML = `
    <nav class="breadcrumb">
      <a href="/" data-nav>الرئيسية</a>
      <span>›</span>
      <span>${escapeHtml(dept.name_ar)}</span>
    </nav>
    <header class="page-header">
      <h1>${escapeHtml(dept.name_ar)}</h1>
      <p>${escapeHtml(dept.name_en)} — ${dept.evaluated_count} من ${dept.total_cases} حالة مقيّمة</p>
    </header>
    <div class="case-list">
      ${cases
        .map(
          (c) => `
        <a
          class="case-item ${c.evaluated ? "evaluated" : "not-evaluated"}"
          href="/case/${c.session_id}"
          data-nav
        >
          <div>
            <div class="title">Case ${c.case_number}</div>
            <div class="meta">Session ID: ${c.session_id}</div>
          </div>
          <span class="badge ${c.evaluated ? "done" : "pending"}">
            ${c.evaluated ? "تم تقييمها" : "لم يتم تقييمها"}
          </span>
        </a>
      `
        )
        .join("")}
    </div>
  `;
  bindNavLinks();
}

function renderRubricAccordion(existing = {}) {
  return RUBRIC_ITEMS.map((item, index) => {
    const selected = existing[item.field];
    const badgeClass = selected ? "filled" : "";
    const badgeText = selected || "—";
    const options = item.scores
      .map(
        (s) => `
      <label class="score-option">
        <input
          type="radio"
          name="${item.field}"
          value="${s.value}"
          ${selected === s.value ? "checked" : ""}
          required
        />
        <span class="score-num">${s.value}</span>
        <span class="score-text">
          <span class="en">${escapeHtml(s.en)}</span>
          <span class="ar">${escapeHtml(s.ar)}</span>
        </span>
      </label>
    `
      )
      .join("");

    return `
      <div class="accordion-item ${index === 0 ? "open" : ""}" data-accordion>
        <button type="button" class="accordion-header" aria-expanded="${index === 0}">
          <span>
            <span class="title-en">${escapeHtml(item.title_en)}</span>
            <span class="title-ar">${escapeHtml(item.title_ar)}</span>
          </span>
          <span class="score-badge ${badgeClass}" data-badge-for="${item.field}">${badgeText}</span>
          <span class="accordion-chevron" aria-hidden="true">▼</span>
        </button>
        <div class="accordion-body">
          <div class="score-options">${options}</div>
        </div>
      </div>
    `;
  }).join("");
}

function bindAccordion() {
  document.querySelectorAll("[data-accordion]").forEach((item) => {
    const header = item.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      const isOpen = item.classList.contains("open");
      document.querySelectorAll("[data-accordion].open").forEach((el) => {
        el.classList.remove("open");
        el.querySelector(".accordion-header").setAttribute("aria-expanded", "false");
      });
      if (!isOpen) {
        item.classList.add("open");
        header.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.querySelectorAll('input[type="radio"]').forEach((input) => {
    input.addEventListener("change", () => {
      const badge = document.querySelector(
        `[data-badge-for="${input.name}"]`
      );
      if (badge) {
        badge.textContent = input.value;
        badge.classList.add("filled");
      }
    });
  });
}

async function renderCase(sessionId) {
  setPageLayout("case");
  const [sessionData, evaluation] = await Promise.all([
    api(`/api/sessions/${sessionId}/messages`),
    api(`/api/sessions/${sessionId}/evaluation`).catch(() => null),
  ]);

  const existing = evaluation || {};
  const chatHtml = sessionData.messages
    .map((m) => {
      const isUser = m.role === "user";
      const label = isUser ? "المريض" : "المساعد";
      return `
        <div class="chat-bubble ${m.role}">
          <div class="chat-label">${label}</div>
          ${escapeHtml(m.content)}
        </div>
      `;
    })
    .join("");

  appEl.innerHTML = `
    <nav class="breadcrumb">
      <a href="/" data-nav>الرئيسية</a>
      <span>›</span>
      <a href="/department/${sessionData.department_key}" data-nav>${escapeHtml(sessionData.department_name_ar)}</a>
      <span>›</span>
      <span>Case ${sessionData.case_number}</span>
    </nav>

    <div class="case-header">
      <h2>Case ${sessionData.case_number} <span style="font-weight:400;color:var(--text-muted);font-size:0.95rem">(Session ${sessionId})</span></h2>
      <div class="nav-buttons">
        <button type="button" class="btn btn-secondary" id="btn-prev" ${sessionData.prev_session_id ? "" : "disabled"}>
          ← Previous Case
        </button>
        <button type="button" class="btn btn-secondary" id="btn-next" ${sessionData.next_session_id ? "" : "disabled"}>
          Next Case →
        </button>
        <a class="btn btn-secondary" href="/department/${sessionData.department_key}" data-nav>Back to Department</a>
      </div>
    </div>

    <section class="chat-panel" aria-label="المحادثة">
      <div class="chat-messages">${chatHtml}</div>
    </section>

    <form id="evaluation-form">
      <section class="section-card">
        <h3>معايير التقييم | Evaluation Rubric</h3>
        <div id="rubric-accordion">${renderRubricAccordion(existing)}</div>
      </section>

      <section class="section-card">
        <label class="notes-label" for="doctor_notes">Doctor Notes / ملاحظات الطبيب</label>
        <textarea
          id="doctor_notes"
          name="doctor_notes"
          class="notes-textarea"
          placeholder="أي ملاحظات إضافية عن المحادثة..."
        ></textarea>
      </section>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">حفظ التقييم | Save Evaluation</button>
      </div>
    </form>
  `;

  const notesEl = document.getElementById("doctor_notes");
  if (notesEl && existing.doctor_notes) {
    notesEl.value = existing.doctor_notes;
  }

  bindNavLinks();
  bindAccordion();
  scrollToTop();

  document.getElementById("btn-prev")?.addEventListener("click", () => {
    if (sessionData.prev_session_id) navigate(`/case/${sessionData.prev_session_id}`);
  });
  document.getElementById("btn-next")?.addEventListener("click", () => {
    if (sessionData.next_session_id) navigate(`/case/${sessionData.next_session_id}`);
  });

  document.getElementById("evaluation-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = {};
    for (const field of RUBRIC_FIELDS) {
      const input = form.querySelector(`input[name="${field}"]:checked`);
      if (!input) {
        alert("يرجى إكمال جميع معايير التقييم (1–3) قبل الحفظ.");
        const missing = document.querySelector(`input[name="${field}"]`);
        missing?.closest("[data-accordion]")?.classList.add("open");
        return;
      }
      payload[field] = parseInt(input.value, 10);
    }
    payload.doctor_notes =
      form.doctor_notes.value.trim() || null;

    try {
      await api(`/api/sessions/${sessionId}/evaluation`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      showToast("تم حفظ التقييم بنجاح ✓");
    } catch (err) {
      alert(err.message || "فشل الحفظ");
    }
  });
}

function bindNavLinks() {
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(el.getAttribute("href"));
    });
  });
}

async function render() {
  const route = parseRoute();
  appEl.innerHTML = `<p class="loading">جاري التحميل...</p>`;

  try {
    if (route.view === "home") await renderHome();
    else if (route.view === "evaluations") await renderEvaluations();
    else if (route.view === "department") await renderDepartment(route.deptKey);
    else if (route.view === "case") await renderCase(route.sessionId);
  } catch (err) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(err.message)}</p>`;
  }
}

render();
