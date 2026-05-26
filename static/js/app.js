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
  let res;
  try {
    res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
  } catch {
    throw new Error(
      "تعذر الاتصال بالخادم (Failed to fetch). تأكدي أن السيرفر يعمل ثم حدّثي الصفحة."
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadSavedEvaluations() {
  try {
    return await api("/api/evaluations/saved");
  } catch (err) {
    const msg = String(err.message || "");
    const isMissingEndpoint =
      msg.includes("404") || msg.includes("Not Found") || msg.includes("not found");
    if (!isMissingEndpoint) throw err;

    const all = await api("/api/evaluations");
    return all.filter((r) => r.evaluated).map((r) => ({
      session_id: r.session_id,
      case_number: r.case_number,
      department_key: r.department_key,
      department_name: r.department_name,
      clinical_relevance_score: r.clinical_relevance_score,
      question_specificity_score: r.question_specificity_score,
      single_question_score: r.single_question_score,
      safety_score: r.safety_score,
      linguistic_score: r.linguistic_score,
      denial_handling_score: r.denial_handling_score,
      department_accuracy_score: r.department_accuracy_score,
      clinical_reasoning_score: r.clinical_reasoning_score,
      doctor_notes: r.doctor_notes,
      updated_at: r.updated_at,
    }));
  }
}

function navigate(path) {
  history.pushState(null, "", path);
  render();
}

window.addEventListener("popstate", render);

async function renderHome() {
  const departments = await api("/api/departments");
  appEl.innerHTML = `
    <header class="page-header">
      <h1>تقييم المحادثات الطبية</h1>
      <p>Multi-Agent Medical Chatbot Evaluation — واجهة الأطباء الخبراء</p>
      <div class="top-actions">
        <a class="btn btn-hero" href="/evaluations" data-nav>عرض كل التقييمات المحفوظة</a>
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

async function renderEvaluations() {
  const rows = await loadSavedEvaluations();

  const RUBRIC = [
    { field: "clinical_relevance_score", header: "ارتباط" },
    { field: "question_specificity_score", header: "دقة" },
    { field: "single_question_score", header: "سؤال واحد" },
    { field: "safety_score", header: "سلامة" },
    { field: "linguistic_score", header: "لغة" },
    { field: "denial_handling_score", header: "رفض" },
    { field: "department_accuracy_score", header: "قسم" },
    { field: "clinical_reasoning_score", header: "سريري" },
  ];

  const allDepartments = Array.from(
    new Map(rows.map((r) => [r.department_key, r.department_name])).entries()
  ).map(([key, name]) => ({ key, name }));

  function averageScore(r) {
    const vals = RUBRIC.map((c) => r[c.field]).filter((v) => v != null);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }

  function formatArDate(dt) {
    if (!dt) return "—";
    return new Date(dt).toLocaleString("ar", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function rowHtml(r) {
    const avg = averageScore(r);
    const notes = r.doctor_notes ? escapeHtml(r.doctor_notes) : "—";

    return `
      <tr class="eval-row evaluated">
        <td>${escapeHtml(r.department_name)}</td>
        <td class="nowrap">Case ${r.case_number} - ${r.session_id}</td>
        <td class="center nowrap">${avg ?? "—"}</td>
        ${RUBRIC.map((col) => {
          const v = r[col.field];
          return `<td class="center nowrap">${v == null ? "—" : v}</td>`;
        }).join("")}
        <td class="notes" title="${notes}">${notes}</td>
        <td class="nowrap">${formatArDate(r.updated_at)}</td>
        <td class="center nowrap">
          <a href="/case/${r.session_id}" data-nav class="view-link">عرض</a>
        </td>
      </tr>
    `;
  }

  function getFilteredRows() {
    const sel = document.getElementById("dept-filter");
    if (!sel) return rows;
    const val = sel.value;
    if (val === "all") return rows;
    return rows.filter((r) => r.department_key === val);
  }

  function updateCount(filtered) {
    const el = document.getElementById("eval-total-count");
    if (el) el.textContent = String(filtered.length);
  }

  function renderTbody(filtered) {
    const tbody = document.getElementById("eval-tbody");
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="14" class="empty-table">لا توجد تقييمات محفوظة بعد.</td></tr>`;
    } else {
      tbody.innerHTML = filtered.map(rowHtml).join("");
    }
    updateCount(filtered);
    bindNavLinks();
  }

  function downloadCSV(filtered) {
    const headers = [
      "القسم",
      "الحالة",
      "Session ID",
      "المتوسط",
      ...RUBRIC.map((c) => c.header),
      "ملاحظات",
      "التاريخ",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      const line = [
        r.department_name,
        `Case ${r.case_number}`,
        r.session_id,
        averageScore(r) ?? "",
        ...RUBRIC.map((c) => (r[c.field] == null ? "" : r[c.field])),
        r.doctor_notes ? r.doctor_notes.replace(/"/g, '""') : "",
        r.updated_at ? new Date(r.updated_at).toISOString() : "",
      ].map((x) => `"${String(x)}"`).join(",");
      lines.push(line);
    });
    triggerDownload(
      new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
      "expert_evaluations.csv"
    );
  }

  function downloadExcel(filtered) {
    const headers = [
      "القسم",
      "الحالة",
      "Session ID",
      "المتوسط",
      ...RUBRIC.map((c) => c.header),
      "ملاحظات",
      "التاريخ",
    ];
    const esc = (v) => escapeHtml(v == null ? "" : v);
    const html =
      `<table border="1" dir="rtl"><thead><tr>` +
      headers.map((h) => `<th>${esc(h)}</th>`).join("") +
      `</tr></thead><tbody>` +
      filtered
        .map((r) => {
          const cells = [
            r.department_name,
            `Case ${r.case_number}`,
            r.session_id,
            averageScore(r) ?? "",
            ...RUBRIC.map((c) => (r[c.field] == null ? "" : r[c.field])),
            r.doctor_notes || "",
            r.updated_at ? formatArDate(r.updated_at) : "",
          ].map(esc);
          return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
        })
        .join("") +
      `</tbody></table>`;
    triggerDownload(
      new Blob([html], { type: "application/vnd.ms-excel" }),
      "expert_evaluations.xls"
    );
  }

  function triggerDownload(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2500);
  }

  const initialFiltered = rows;
  appEl.innerHTML = `
    <nav class="breadcrumb">
      <a href="/" data-nav>الرئيسية</a>
      <span>›</span>
      <span>التقييمات المحفوظة</span>
    </nav>
    <header class="page-header">
      <h1>التقييمات المحفوظة</h1>
      <p>كل التقييمات المسجلة من الأطباء — من قاعدة البيانات مباشرة</p>
    </header>

    <section class="section-card saved-panel">
      <div class="saved-toolbar">
        <div class="saved-total">إجمالي التقييمات: <strong id="eval-total-count">${initialFiltered.length}</strong></div>
        <div class="saved-filter">
          <label for="dept-filter">القسم:</label>
          <select id="dept-filter" class="table-select">
            <option value="all">كل الأقسام</option>
            ${allDepartments.map((d) => `<option value="${d.key}">${escapeHtml(d.name)}</option>`).join("")}
          </select>
        </div>
        <div class="saved-export">
          <button type="button" class="export-link" id="btn-export-csv">تنزيل (CSV)</button>
          <span class="export-sep">أو</span>
          <button type="button" class="export-link" id="btn-export-excel">Excel</button>
        </div>
      </div>

      <div class="table-container">
        <table class="eval-table saved-table">
          <thead>
            <tr>
              <th>القسم</th>
              <th>الحالة</th>
              <th class="center">المتوسط</th>
              ${RUBRIC.map((c) => `<th class="center">${escapeHtml(c.header)}</th>`).join("")}
              <th>ملاحظات</th>
              <th>التاريخ</th>
              <th class="center">عرض</th>
            </tr>
          </thead>
          <tbody id="eval-tbody">
            ${
              initialFiltered.length
                ? initialFiltered.map(rowHtml).join("")
                : `<tr><td colspan="14" class="empty-table">لا توجد تقييمات محفوظة بعد.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;

  bindNavLinks();

  document.getElementById("dept-filter")?.addEventListener("change", () => {
    renderTbody(getFilteredRows());
  });
  document.getElementById("btn-export-csv")?.addEventListener("click", () => {
    downloadCSV(getFilteredRows());
  });
  document.getElementById("btn-export-excel")?.addEventListener("click", () => {
    downloadExcel(getFilteredRows());
  });
}

async function renderDepartment(deptKey) {
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
  appEl.classList.remove("wide");
  appEl.innerHTML = `<p class="loading">جاري التحميل...</p>`;

  try {
    if (route.view === "home") await renderHome();
    else if (route.view === "evaluations") {
      appEl.classList.add("wide");
      await renderEvaluations();
    }
    else if (route.view === "department") await renderDepartment(route.deptKey);
    else if (route.view === "case") await renderCase(route.sessionId);
  } catch (err) {
    appEl.innerHTML = `<p class="error-msg">${escapeHtml(err.message)}</p>`;
  }
}

render();
