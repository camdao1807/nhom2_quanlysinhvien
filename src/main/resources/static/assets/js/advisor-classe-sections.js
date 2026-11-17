const API_URL = "/api/advisor-classe-sections";
const PAGE_SIZE = 10;

let assignments = [], currentPage = 1, editingId = null;
let employees = [], employeeMap = new Map();
let studentClasses = [], studentClassMap = new Map();

const $ = (id) => document.getElementById(id);
const key = (v) => String(v ?? "").toLowerCase();

/* ========== Tải dữ liệu danh mục ========== */
async function loadEmployees() {
    const select = $("employeeId");
    try {
        const result = await request("/api/employees");
        employees = Array.isArray(result) ? result : [];
        employeeMap = new Map(employees.map(e => [key(e.id), e]));
        select.innerHTML = `<option value="">-- Chọn giảng viên phụ trách --</option>` +
            employees.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.code)} - ${escapeHtml(e.fullName)}${e.isActive === false ? " (Ngừng hoạt động)" : ""}</option>`).join("");
    } catch (error) {
        employees = []; employeeMap.clear();
        select.innerHTML = `<option value="">Không tải được danh sách giảng viên</option>`;
        setMessage("Không tải được danh sách giảng viên: " + error.message, "error");
    }
}

function classLabel(c) {
    return c?.classCode ?? c?.code ?? c?.className ?? c?.name ?? null;
}

async function loadStudentClasses() {
    const select = $("studentClasseId");
    try {
        const result = await request("/api/student_classes?page=0&size=1000");
        studentClasses = Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
        studentClassMap = new Map(studentClasses.map(c => [key(c.id), c]));
        select.innerHTML = `<option value="">-- Chọn lớp hành chính --</option>` +
            studentClasses.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(classLabel(c) ?? c.id)}</option>`).join("");
    } catch (error) {
        studentClasses = []; studentClassMap.clear();
        select.innerHTML = `<option value="">Không tải được danh sách lớp</option>`;
        setMessage("Không tải được danh sách lớp: " + error.message, "error");
    }
}

/* ========== Header: ngày + học kỳ ========== */
function renderToday() {
    const d = new Date();
    const date = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
    const m = d.getMonth() + 1, y = d.getFullYear();
    let term, year;
    if (m >= 8)      { term = "Học kỳ I";  year = `${y}/${y + 1}`; }
    else if (m <= 6) { term = "Học kỳ II"; year = `${y - 1}/${y}`; }
    else             { term = "Học kỳ hè"; year = `${y - 1}/${y}`; }
    $("todayText").textContent = `Hôm nay: ${date.charAt(0).toUpperCase() + date.slice(1)} · ${term}`;
    $("termBadge").textContent = `${term} · ${year}`;
}

/* ========== Khởi tạo ========== */
document.addEventListener("DOMContentLoaded", () => {
    renderToday();

    const rerender = () => { currentPage = 1; renderTable(); };
    $("assignmentForm").addEventListener("submit", saveAssignment);
    $("showCreateForm").addEventListener("click", showCreateForm);
    $("btnAddNew").addEventListener("click", () => {
        if (!document.body.classList.contains("tab-sub")) showCreateForm();
    });
    $("cancelForm").addEventListener("click", hideForm);
    $("exportButton").addEventListener("click", exportCsv);
    $("searchInput").addEventListener("input", rerender);
    ["statusFilter", "classFilter", "facultyFilter", "degreeFilter"].forEach(id => $(id).addEventListener("change", rerender));
    $("globalSearch").addEventListener("input", e => { $("searchInput").value = e.target.value; rerender(); });
    $("refreshButton").addEventListener("click", () => {
        $("searchInput").value = ""; $("globalSearch").value = "";
        ["classFilter", "statusFilter", "facultyFilter", "degreeFilter"].forEach(id => $(id).value = "all");
        currentPage = 1; loadData();
    });

    $("assignmentTable").addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-profile]");
        if (btn) openProfile(btn.dataset.profile);
    });
    $("profileDialog").addEventListener("click", (e) => {
        if (e.target === $("profileDialog")) return $("profileDialog").close();
        const btn = e.target.closest("[data-action]");
        if (!btn) return;
        if (btn.dataset.action === "close") return $("profileDialog").close();
        if (btn.dataset.action === "print") return window.print();
        $("profileDialog").close();
        handleAction(btn.dataset.action, btn.dataset.id);
    });

    Promise.all([loadEmployees(), loadStudentClasses()]).then(loadData);
});

async function request(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
    });
    if (!response.ok) {
        const raw = await response.text();
        let msg = raw;
        try { const j = JSON.parse(raw); msg = j.message || j.error || raw; } catch { /* giữ nguyên */ }
        throw new Error(msg || `Lỗi HTTP ${response.status}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try { return JSON.parse(text); } catch { return text; }
}

async function loadData() {
    $("assignmentTable").innerHTML = '<tr><td colspan="11" class="empty">Đang tải dữ liệu...</td></tr>';
    try {
        const result = await request(API_URL);
        assignments = Array.isArray(result) ? result : Array.isArray(result?.content) ? result.content : [];
        currentPage = 1;
        renderTable();
        await loadStatistics();
        $("syncText").textContent = "Đồng bộ dữ liệu lúc " +
            new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch (error) {
        assignments = [];
        renderTable();
        $("syncText").textContent = "Đồng bộ thất bại";
        setMessage("Không tải được danh sách: " + error.message, "error");
    }
}

function setStat(id, rateId, value, total) {
    $(id).textContent = value ?? "—";
    const n = Number(value), t = Number(total);
    const pct = t > 0 && Number.isFinite(n) ? n / t * 100 : 0;
    if (rateId) $(rateId).textContent = pct.toFixed(1) + "%";
    const bar = $(id.replace("Count", "Bar"));
    if (bar) bar.style.width = (id === "totalCount" ? (t > 0 ? 100 : 0) : Math.max(pct, n ? 3 : 0)) + "%";
}

async function loadStatistics() {
    let total = assignments.length, active = assignments.filter(i => i.isActive).length,
        inactive = assignments.filter(i => !i.isActive).length, deleted = "—";
    try {
        const s = await request(`${API_URL}/statistics/overview`);
        if (s && typeof s === "object") {
            total = s.total ?? s.totalCount ?? total;
            active = s.active ?? s.activeCount ?? active;
            inactive = s.inactive ?? s.inactiveCount ?? inactive;
            deleted = s.deleted ?? s.deletedCount ?? deleted;
        }
    } catch { /* dùng số liệu tính từ danh sách */ }
    setStat("totalCount", null, total, total);
    setStat("activeCount", "rateActive", active, total);
    setStat("inactiveCount", "rateInactive", inactive, total);
    setStat("deletedCount", "rateDeleted", deleted, total);
}

/* ========== Hiển thị ========== */
function getStudentClassDisplay(id) {
    const c = studentClassMap.get(key(id));
    return c ? (classLabel(c) ?? "Chưa có tên lớp") : "Không tìm thấy lớp";
}

function getFilteredAssignments() {
    const keyword = $("searchInput").value.trim().toLowerCase();
    const status = $("statusFilter").value;

    let filtered = assignments.filter(item => {
        const e = employeeMap.get(key(item.employeeId));
        const info = [e?.code, e?.fullName, e?.email, item.employeeId].join(" ").toLowerCase();
        return info.includes(keyword) ||
            getStudentClassDisplay(item.studentClasseId).toLowerCase().includes(keyword) ||
            key(item.studentClasseId).includes(keyword) || key(item.id).includes(keyword);
    });

    // Mỗi giảng viên chỉ giữ một phân công (ưu tiên đang hoạt động, rồi ngày bắt đầu mới hơn)
    const unique = new Map();
    filtered.forEach(item => {
        const k = key(item.employeeId), ex = unique.get(k);
        if (!ex || (item.isActive && !ex.isActive) ||
            (item.isActive === ex.isActive && new Date(item.startDate) > new Date(ex.startDate))) unique.set(k, item);
    });

    const cls = $("classFilter").value,
        faculty = $("facultyFilter").value, degree = $("degreeFilter").value;
    filtered = [...unique.values()].filter(i =>
        (status === "all" || (status === "active" && i.isActive === true) || (status === "inactive" && i.isActive === false)) &&
        (cls === "all" || key(i.studentClasseId) === key(cls)) &&
        (faculty === "all" || facultyOf(employeeMap.get(key(i.employeeId))) === faculty) &&
        (degree === "all" || degreeOf(employeeMap.get(key(i.employeeId))) === degree));

    const num = (i) => Number((employeeMap.get(key(i.employeeId))?.code ?? "").replace(/\D/g, ""));
    return filtered.sort((a, b) => num(a) - num(b));
}

function getTotalPages() { return Math.max(1, Math.ceil(getFilteredAssignments().length / PAGE_SIZE)); }

function genderOf(e) {
    const g = String(e?.gender ?? e?.sex ?? "").trim().toLowerCase();
    if (/^(nam|male|m|true|1)$/.test(g)) return "Nam";
    if (/^(nữ|nu|female|f|false|0)$/.test(g)) return "Nữ";
    return "";
}

function pick(e, ...keys) {
    for (const k of keys) {
        const v = e?.[k];
        if (v == null || v === "") continue;
        return typeof v === "object" ? String(v.name ?? v.fullName ?? v.code ?? "") : String(v);
    }
    return "";
}
const birthOf = (e) => pick(e, "dateOfBirth", "birthDate", "dob", "birthday");
const degreeOf = (e) => pick(e, "academicDegree", "degree", "degreeName", "qualification", "academicTitle");
const facultyOf = (e) => pick(e, "facultyName", "departmentName", "faculty", "department");

function formatDateOnly(value) {
    if (!value) return "—";
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : formatDate(value);
}

function fillDynamicFilters() {
    if (!employees.length) return;
    const fill = (id, label, fn) => {
        const sel = $(id);
        if (sel.options.length > 1) return;
        const values = [...new Set(employees.map(fn).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
        sel.innerHTML = `<option value="all">${label}: Tất cả</option>` +
            values.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join("");
    };
    fill("facultyFilter", "Khoa", facultyOf);
    fill("degreeFilter", "Học vị", degreeOf);
}

function classSizeOf(id) {
    const c = studentClassMap.get(key(id));
    const v = pick(c, "studentCount", "totalStudents", "numberOfStudents", "studentsCount", "currentSize", "size", "quantity");
    return v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null;
}
function classSizeText(id) {
    const n = classSizeOf(id);
    return n === null ? "—" : `<b>${n}</b> <small style="color:var(--muted)">SV</small>`;
}

// Tiến độ: dùng trường progress của API nếu có, nếu không thì tính theo thời gian nhiệm kỳ đã qua
function progressOf(item) {
    const p = Number(item.progressPercent ?? item.progress);
    if (item.progressPercent != null || item.progress != null) return Number.isFinite(p) ? Math.max(0, Math.min(100, p)) : null;
    const s = new Date(item.startDate).getTime(), e = new Date(item.endDate).getTime();
    if (!item.startDate || !item.endDate || Number.isNaN(s) || Number.isNaN(e) || e <= s) return null;
    return Math.max(0, Math.min(100, (Date.now() - s) / (e - s) * 100));
}
function progressHtml(item) {
    const p = progressOf(item);
    if (p === null) return "—";
    const done = p >= 100 ? " done" : "";
    return `<div class="prog"><div class="prog-text${done}">${p.toFixed(1)}%</div><div class="prog-bar${done}"><span style="width:${p}%"></span></div></div>`;
}

const AVATAR_CLASSES = ["avatar-blue", "avatar-green", "avatar-yellow", "avatar-red", "avatar-purple"];
function avatarClass(s) { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_CLASSES[h % AVATAR_CLASSES.length]; }
function initials(name) {
    const w = String(name ?? "").trim().split(/\s+/).filter(Boolean);
    if (!w.length) return "?";
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
}

function fillClassFilter() {
    const sel = $("classFilter");
    if (sel.options.length > 1 || !studentClasses.length) return;
    sel.innerHTML = '<option value="all">Lớp: Tất cả</option>' +
        studentClasses.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(classLabel(c) ?? c.id)}</option>`).join("");
}

function renderTable() {
    fillClassFilter();
    fillDynamicFilters();
    const filtered = getFilteredAssignments(), totalPages = getTotalPages();
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    $("shownCount").textContent = pageItems.length;
    $("totalRows").textContent = filtered.length;

    if (!pageItems.length) {
        $("assignmentTable").innerHTML = '<tr><td colspan="11" class="empty"><i class="bi bi-folder2-open"></i>Không tìm thấy dữ liệu phù hợp.</td></tr>';
        $("pagerInfo").textContent = "Hiển thị 0 phân công";
        $("pagerBtns").innerHTML = "";
        return;
    }
    $("assignmentTable").innerHTML = pageItems.map((item, index) => {
        const active = item.isActive === true;
        const e = employeeMap.get(key(item.employeeId));
        const name = e?.fullName ?? "Không tìm thấy giảng viên";
        return `
        <tr>
            <td class="td-stt">${String(start + index + 1).padStart(2, "0")}</td>
            <td><span class="code-tag">${escapeHtml(e?.code ?? "—")}</span></td>
            <td><div class="stu"><div class="avatar ${avatarClass(name)}">${escapeHtml(initials(name))}</div><div><b>${escapeHtml(name)}</b></div></div></td>
            <td>${escapeHtml(degreeOf(e) || "—")}</td>
            <td>${escapeHtml(facultyOf(e) || "—")}</td>
            <td><span class="class-chip">${escapeHtml(getStudentClassDisplay(item.studentClasseId))}</span></td>
            <td>${classSizeText(item.studentClasseId)}</td>
            <td class="td-term"><div>${formatDate(item.startDate)}</div><small>→ ${formatDate(item.endDate)}</small></td>
            <td>${progressHtml(item)}</td>
            <td><span class="pill ${active ? "pill-green" : "pill-red"}">${active ? "Đang hoạt động" : "Không hoạt động"}</span></td>
            <td style="text-align:center"><button type="button" class="btn-eye" data-profile="${escapeHtml(item.id)}" title="Xem hồ sơ" aria-label="Xem hồ sơ"><i class="bi bi-eye"></i></button></td>
        </tr>`;
    }).join("");

    $("pagerInfo").textContent = `Hiển thị ${start + 1} - ${Math.min(start + PAGE_SIZE, filtered.length)} trong tổng số ${filtered.length} phân công`;
    renderPager(totalPages);
}

function renderPager(pages) {
    const box = $("pagerBtns");
    box.innerHTML = "";
    if (pages <= 1) return;
    const mk = (html, disabled, active, fn) => {
        const b = document.createElement("button");
        b.innerHTML = html; b.disabled = disabled;
        if (active) b.classList.add("active");
        b.onclick = fn; box.appendChild(b);
    };
    mk('<i class="bi bi-chevron-left"></i>', currentPage === 1, false, () => { currentPage--; renderTable(); });
    for (let i = 1; i <= pages; i++) mk(i, false, i === currentPage, () => { currentPage = i; renderTable(); });
    mk('<i class="bi bi-chevron-right"></i>', currentPage === pages, false, () => { currentPage++; renderTable(); });
}

function openProfile(id) {
    const item = assignments.find(i => String(i.id) === String(id));
    if (!item) return;
    const e = employeeMap.get(key(item.employeeId));
    const active = item.isActive === true, sid = escapeHtml(item.id);
    const name = e?.fullName ?? "Không tìm thấy giảng viên";
    const row = (l, v) => `<div class="pf-row"><dt>${l}</dt><dd>${escapeHtml(v || "—")}</dd></div>`;
    $("profileDialog").innerHTML = `
    <div class="pf-head">
        <div class="avatar ${avatarClass(name)}">${escapeHtml(initials(name))}</div>
        <div><div class="pf-name">${escapeHtml(name)}</div><span class="code-tag">${escapeHtml(e?.code ?? "—")}</span></div>
        <button type="button" class="pf-close" data-action="close" aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
    </div>
    <dl class="pf-body">
        ${row("Lớp hành chính", getStudentClassDisplay(item.studentClasseId))}
        ${row("Trạng thái", active ? "Đang hoạt động" : "Không hoạt động")}
        ${row("Ngày bắt đầu", formatDate(item.startDate))}
        ${row("Ngày kết thúc", formatDate(item.endDate))}
        ${row("Ngày sinh", birthOf(e) ? formatDateOnly(birthOf(e)) : "")}
        ${row("Giới tính", genderOf(e))}
        ${row("Học vị", degreeOf(e))}
        ${row("Khoa", facultyOf(e))}
        ${row("Email", e?.email)}
        ${row("Điện thoại", e?.phone ?? e?.phoneNumber)}
        ${row("Người tạo", item.createdBy)}
        ${row("Người cập nhật", item.updatedBy)}
    </dl>
    <div class="pf-foot">
        <button type="button" class="btn-primary btn-sm" data-action="edit" data-id="${sid}"><i class="bi bi-pencil-square"></i> Sửa</button>
        <button type="button" class="btn-soft btn-sm" data-action="toggle" data-id="${sid}"><i class="bi ${active ? "bi-pause-circle" : "bi-play-circle"}"></i> ${active ? "Ngừng hoạt động" : "Kích hoạt"}</button>
        <button type="button" class="btn-soft btn-danger-soft btn-sm" data-action="delete" data-id="${sid}"><i class="bi bi-trash3"></i> Xóa</button>
        <button type="button" class="btn-soft btn-sm ms-auto" data-action="print"><i class="bi bi-printer"></i> In</button>
    </div>`;
    $("profileDialog").showModal();
}

/* ========== Thao tác ========== */
async function handleAction(action, id) {
    const item = assignments.find(r => String(r.id) === String(id));
    if (!item) return;
    try {
        if (action === "edit") { showEditForm(item); return; }
        if (action === "delete") {
            if (!confirm("Bạn có chắc muốn xóa mềm phân công này không?")) return;
            await request(`${API_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
            setMessage("Đã gửi yêu cầu xóa phân công.", "success");
            await loadData();
            return;
        }
        if (action === "toggle") {
            await request(`${API_URL}/${encodeURIComponent(id)}/${item.isActive ? "deactivate" : "activate"}`, { method: "PATCH" });
            setMessage("Đã cập nhật trạng thái phân công.", "success");
            await loadData();
        }
    } catch (error) {
        setMessage("Thao tác thất bại: " + error.message, "error");
    }
}

function showCreateForm() {
    editingId = null;
    $("assignmentForm").reset();
    $("assignmentId").value = "";
    $("formTitle").textContent = "Thêm phân công mới";
    $("startDate").value = localDateTimeNow();
    $("assignmentForm").hidden = false;
    $("assignmentForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showEditForm(item) {
    editingId = item.id;
    $("assignmentId").value = item.id;
    $("employeeId").value = item.employeeId ?? "";
    $("studentClasseId").value = item.studentClasseId ?? "";
    $("startDate").value = toDateTimeInput(item.startDate);
    $("endDate").value = toDateTimeInput(item.endDate);
    $("createdBy").value = item.createdBy ?? "";
    $("updatedBy").value = item.updatedBy ?? "";
    $("formTitle").textContent = "Cập nhật phân công";
    $("assignmentForm").hidden = false;
    $("assignmentForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function hideForm() { $("assignmentForm").hidden = true; editingId = null; }

async function saveAssignment(event) {
    event.preventDefault();
    const employeeId = $("employeeId").value, studentClasseId = $("studentClasseId").value.trim();
    const startDate = $("startDate").value, endDate = $("endDate").value;

    if (!employeeId || !studentClasseId || !startDate) {
        setMessage("Vui lòng chọn giảng viên, lớp hành chính và ngày bắt đầu.", "error"); return;
    }
    if (endDate && endDate < startDate) {
        setMessage("Ngày kết thúc không được trước ngày bắt đầu.", "error"); return;
    }
    const sec = (v) => v.length === 16 ? `${v}:00` : v;
    const payload = {
        employeeId, studentClasseId,
        startDate: sec(startDate),
        endDate: endDate ? sec(endDate) : null,
        createdBy: $("createdBy").value.trim() || null,
        updatedBy: $("updatedBy").value.trim() || null
    };
    try {
        if (editingId) {
            await request(`${API_URL}/${encodeURIComponent(editingId)}`, { method: "PUT", body: JSON.stringify(payload) });
            setMessage("Cập nhật phân công thành công.", "success");
        } else {
            await request(API_URL, { method: "POST", body: JSON.stringify(payload) });
            setMessage("Thêm phân công thành công.", "success");
        }
        hideForm();
        await loadData();
    } catch (error) {
        setMessage("Không lưu được dữ liệu: " + error.message, "error");
    }
}

function exportCsv() {
    const rows = [["STT", "Mã GV", "Họ tên", "Học vị", "Khoa", "Lớp", "Quy mô lớp", "Bắt đầu", "Kết thúc", "Tiến độ", "Trạng thái"]];
    getFilteredAssignments().forEach((i, n) => {
        const e = employeeMap.get(key(i.employeeId));
        rows.push([n + 1, e?.code ?? "", e?.fullName ?? "", degreeOf(e), facultyOf(e), getStudentClassDisplay(i.studentClasseId), (classSizeOf(i.studentClasseId) ?? ""),
            formatDate(i.startDate), formatDate(i.endDate), (progressOf(i) === null ? "" : progressOf(i).toFixed(1) + "%"), i.isActive ? "Đang hoạt động" : "Không hoạt động"]);
    });
    const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "phan-cong-cvht.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    setMessage("Đã xuất file CSV.", "success");
}

/* ========== Tiện ích ========== */
function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function toDateTimeInput(value) { return value ? String(value).slice(0, 16) : ""; }
function localDateTimeNow() {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* Thông báo dùng toast chuẩn của hệ thống */
function setMessage(message, type) {
    if (!message) return;
    const el = $("toast");
    el.textContent = message;
    el.className = "toast show" + (type === "error" ? " error" : "");
    clearTimeout(setMessage.t);
    setMessage.t = setTimeout(() => el.classList.remove("show"), 3000);
}


/* =========================================================
   Đổi giảng viên / CVHT + Lịch sử đổi giảng viên
   Nạp SAU phần trên. Không sửa hàm gốc:
   file này bọc (wrap) openProfile / handleAction / loadData.
   ========================================================= */
(() => {
    let changing = null;
    const sec = (v) => (v.length === 16 ? `${v}:00` : v);
    const empLabel = (id) => {
        const e = employeeMap.get(key(id));
        return e ? `${e.code} - ${e.fullName}` : "Không tìm thấy giảng viên";
    };
    const empCell = (id) => {
        const e = employeeMap.get(key(id));
        return e ? `<span class="code-tag">${escapeHtml(e.code)}</span> <b>${escapeHtml(e.fullName)}</b>` : "—";
    };
    const byStart = (a, b) => new Date(a.startDate) - new Date(b.startDate);

    /* ---------- Dựng DOM: card lịch sử + hộp thoại đổi GV ---------- */
    document.querySelector(".table-card").insertAdjacentHTML("afterend", `
    <section class="card table-card history-card" id="historyCard">
        <div class="toolbar">
            <h2 class="hist-title"><i class="bi bi-clock-history"></i> Lịch sử đổi giảng viên</h2>
            <select id="historyClassFilter" class="select"><option value="all">Lớp: Tất cả</option></select>
        </div>
        <div class="table-wrap hist-wrap">
            <table class="data-table hist-table">
                <thead><tr>
                    <th style="width:48px">STT</th><th>LỚP HC</th><th>GIẢNG VIÊN CŨ</th><th></th><th>GIẢNG VIÊN MỚI</th>
                    <th>NGÀY HIỆU LỰC</th><th>LÝ DO</th><th>NGƯỜI THỰC HIỆN</th>
                </tr></thead>
                <tbody id="historyTable"><tr><td colspan="8" class="empty">Đang tải dữ liệu...</td></tr></tbody>
            </table>
        </div>
        <div class="pager"><span id="historyInfo">--</span></div>
    </section>`);

    document.body.insertAdjacentHTML("beforeend", `
    <dialog id="changeDialog" class="profile-dialog">
        <form id="changeForm" novalidate>
            <div class="pf-head">
                <div class="title-icon"><i class="bi bi-arrow-left-right"></i></div>
                <div><div class="pf-name">Đổi giảng viên / CVHT</div><small id="chgClass" style="color:var(--muted)"></small></div>
                <button type="button" class="pf-close" data-close aria-label="Đóng"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="chg-body">
                <div><label class="lbl" for="chgCurrent">Giảng viên hiện tại</label><input id="chgCurrent" class="input" readonly></div>
                <div><label class="lbl" for="chgNew">Giảng viên mới *</label><select id="chgNew" class="select full" required></select></div>
                <div><label class="lbl" for="chgDate">Ngày hiệu lực *</label><input id="chgDate" class="input" type="datetime-local" required></div>
                <div><label class="lbl" for="chgReason">Lý do đổi *</label><textarea id="chgReason" class="input" rows="3" maxlength="500" placeholder="VD: Giảng viên nghỉ phép, chuyển công tác..." required></textarea></div>
                <div><label class="lbl" for="chgBy">ID người thực hiện</label><input id="chgBy" class="input" placeholder="Có thể để trống"></div>
            </div>
            <div class="pf-foot">
                <button type="submit" class="btn-primary btn-sm" id="chgSave"><i class="bi bi-check2-circle"></i> Xác nhận đổi</button>
                <button type="button" class="btn-soft btn-sm" data-close>Hủy</button>
            </div>
        </form>
    </dialog>`);

    /* ---------- Lịch sử: suy ra từ danh sách phân công của từng lớp ---------- */
    function buildChanges() {
        const byClass = new Map();
        assignments.forEach(a => {
            const k = key(a.studentClasseId);
            if (!byClass.has(k)) byClass.set(k, []);
            byClass.get(k).push(a);
        });
        const out = [];
        byClass.forEach(list => {
            list.sort(byStart);
            for (let i = 1; i < list.length; i++) {
                if (key(list[i - 1].employeeId) !== key(list[i].employeeId)) out.push({ prev: list[i - 1], cur: list[i] });
            }
        });
        return out.sort((a, b) => byStart(b.cur, a.cur));
    }

    function renderHistory() {
        const sel = $("historyClassFilter");
        if (sel.options.length <= 1 && studentClasses.length) {
            sel.innerHTML = '<option value="all">Lớp: Tất cả</option>' +
                studentClasses.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(classLabel(c) ?? c.id)}</option>`).join("");
        }
        const cls = sel.value;
        const rows = buildChanges().filter(r => cls === "all" || key(r.cur.studentClasseId) === key(cls));
        $("historyInfo").textContent = `${rows.length} lần đổi giảng viên`;
        if (!rows.length) {
            $("historyTable").innerHTML = '<tr><td colspan="8" class="empty"><i class="bi bi-clock-history"></i>Chưa có lần đổi giảng viên nào.</td></tr>';
            return;
        }
        $("historyTable").innerHTML = rows.map(({ prev, cur }, i) => `
        <tr>
            <td class="td-stt">${String(i + 1).padStart(2, "0")}</td>
            <td><span class="class-chip">${escapeHtml(getStudentClassDisplay(cur.studentClasseId))}</span></td>
            <td>${empCell(prev.employeeId)}</td>
            <td class="hist-arrow"><i class="bi bi-arrow-right"></i></td>
            <td>${empCell(cur.employeeId)}</td>
            <td class="td-term">${formatDate(cur.startDate)}</td>
            <td class="hist-reason">${escapeHtml(cur.reason ?? cur.note ?? "—")}</td>
            <td>${escapeHtml(cur.createdBy ?? "—")}</td>
        </tr>`).join("");
    }

    function classHistoryBlock(classId) {
        const list = assignments.filter(a => key(a.studentClasseId) === key(classId)).sort((a, b) => byStart(b, a));
        const rows = list.map(a => `
            <tr><td>${empCell(a.employeeId)}</td><td>${formatDate(a.startDate)}</td><td>${formatDate(a.endDate)}</td>
            <td><span class="pill ${a.isActive ? "pill-green" : "pill-red"}">${a.isActive ? "Đang hoạt động" : "Đã kết thúc"}</span></td></tr>`).join("");
        return `<div class="pf-hist"><div class="pf-hist-title"><i class="bi bi-clock-history"></i> Lịch sử CVHT lớp ${escapeHtml(getStudentClassDisplay(classId))}</div>
            <div class="pf-hist-wrap"><table class="mini-table"><thead><tr><th>Giảng viên</th><th>Từ</th><th>Đến</th><th>Trạng thái</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
    }

    /* ---------- Hộp thoại đổi giảng viên ---------- */
    function openChange(item) {
        changing = item;
        $("chgClass").textContent = "Lớp " + getStudentClassDisplay(item.studentClasseId);
        $("chgCurrent").value = empLabel(item.employeeId);
        $("chgNew").innerHTML = '<option value="">-- Chọn giảng viên mới --</option>' +
            employees.filter(e => key(e.id) !== key(item.employeeId) && e.isActive !== false)
                .map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.code)} - ${escapeHtml(e.fullName)}</option>`).join("");
        $("chgDate").value = localDateTimeNow();
        $("chgReason").value = "";
        $("chgBy").value = "";
        $("changeDialog").showModal();
    }

    async function submitChange(event) {
        event.preventDefault();
        const item = changing;
        if (!item) return;
        const newEmp = $("chgNew").value, date = $("chgDate").value, reason = $("chgReason").value.trim();
        const by = $("chgBy").value.trim() || null;
        if (!newEmp || !date || !reason) return setMessage("Vui lòng chọn giảng viên mới, ngày hiệu lực và nhập lý do.", "error");
        if (key(newEmp) === key(item.employeeId)) return setMessage("Giảng viên mới phải khác giảng viên hiện tại.", "error");
        if (date <= toDateTimeInput(item.startDate)) return setMessage("Ngày hiệu lực phải sau ngày bắt đầu của phân công hiện tại.", "error");

        const url = `${API_URL}/${encodeURIComponent(item.id)}`;
        const oldPayload = (endDate) => ({
            employeeId: item.employeeId, studentClasseId: item.studentClasseId,
            startDate: sec(toDateTimeInput(item.startDate)), endDate,
            createdBy: item.createdBy ?? null, updatedBy: by
        });
        const btn = $("chgSave");
        btn.disabled = true;
        let closed = false, deactivated = false;
        try {
            // 1) Kết thúc nhiệm kỳ của giảng viên cũ
            await request(url, { method: "PUT", body: JSON.stringify(oldPayload(sec(date))) });
            closed = true;
            if (item.isActive) { await request(`${url}/deactivate`, { method: "PATCH" }); deactivated = true; }
            // 2) Tạo phân công mới cho giảng viên mới (kèm lý do => hiển thị ở bảng lịch sử)
            await request(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    employeeId: newEmp, studentClasseId: item.studentClasseId,
                    startDate: sec(date), endDate: null, reason,
                    previousEmployeeId: item.employeeId, createdBy: by, updatedBy: by
                })
            });
            $("changeDialog").close();
            setMessage("Đã đổi giảng viên thành công.", "success");
            await loadData();
        } catch (error) {
            // Hoàn tác phân công cũ nếu bước sau thất bại
            try {
                if (deactivated) await request(`${url}/activate`, { method: "PATCH" });
                if (closed) await request(url, { method: "PUT", body: JSON.stringify(oldPayload(item.endDate ? sec(toDateTimeInput(item.endDate)) : null)) });
            } catch { /* bỏ qua lỗi hoàn tác */ }
            setMessage("Đổi giảng viên thất bại: " + error.message, "error");
        } finally {
            btn.disabled = false;
        }
    }

    /* ---------- Gắn sự kiện ---------- */
    $("changeForm").addEventListener("submit", submitChange);
    $("changeDialog").addEventListener("click", (e) => {
        if (e.target === $("changeDialog") || e.target.closest("[data-close]")) $("changeDialog").close();
    });
    $("historyClassFilter").addEventListener("change", renderHistory);

    /* ---------- Bọc hàm gốc ---------- */
    const _openProfile = openProfile;
    openProfile = function (id) {
        _openProfile(id);
        const item = assignments.find(i => String(i.id) === String(id));
        const foot = $("profileDialog").querySelector(".pf-foot");
        if (!item || !foot) return;
        foot.insertAdjacentHTML("beforebegin", classHistoryBlock(item.studentClasseId));
        foot.insertAdjacentHTML("afterbegin",
            `<button type="button" class="btn-soft btn-sm" data-action="change" data-id="${escapeHtml(item.id)}"><i class="bi bi-arrow-left-right"></i> Đổi giảng viên</button>`);
    };

    const _handleAction = handleAction;
    handleAction = function (action, id) {
        if (action === "change") {
            const item = assignments.find(r => String(r.id) === String(id));
            if (item) openChange(item);
            return;
        }
        return _handleAction(action, id);
    };

    const _loadData = loadData;
    loadData = async function () {
        await _loadData();
        renderHistory();
    };
})();

/* =========================================================
   Quản lý dạy thay & ngày công (KHÔNG liên quan tiền lương)
   Không sửa lịch/phân công gốc: dữ liệu dạy thay nằm ở API riêng.
   ========================================================= */
(() => {
    const SUB_API = "/api/substitute-assignments";
    const SUB_PAGE = 10;
    const SCHOOL = "SM UNIVERSITY";
    const ST = { ASSIGNED: ["Đã phân công", "pill-yellow"], COMPLETED: ["Đã hoàn thành", "pill-green"] };
    let subs = [], subPage = 1, subEditing = null;

    const ename = (id) => employeeMap.get(key(id))?.fullName ?? "—";
    const ecode = (id) => employeeMap.get(key(id))?.code ?? "";
    const day = (v) => String(v ?? "").slice(0, 10);
    const dmy = (v) => { const m = day(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : "—"; };
    const cname = (id) => getStudentClassDisplay(id);
    const unwrap = (r) => Array.isArray(r) ? r : Array.isArray(r?.content) ? r.content : [];
    const today = () => localDateTimeNow().slice(0, 10);

    /* ---------- Dựng giao diện ---------- */
    document.querySelector(".page-head").insertAdjacentHTML("afterend", `
    <div class="tabs" role="tablist">
        <button type="button" class="tab active" data-tab="cvht" role="tab"><i class="bi bi-person-badge"></i> Phân công CVHT</button>
        <button type="button" class="tab" data-tab="sub" role="tab"><i class="bi bi-calendar-check"></i> Dạy thay &amp; ngày công</button>
    </div>`);

    $("historyCard").insertAdjacentHTML("afterend", `
    <div id="subSection">
        <section class="kpi-grid sub-kpi">
            <article class="kpi kpi-blue"><header><span class="kpi-label"><i class="dot"></i>TỔNG PHÂN CÔNG DẠY THAY</span><span class="kpi-icon"><i class="bi bi-calendar2-week"></i></span></header>
                <div class="kpi-value"><span id="sbTotal">0</span><small>LƯỢT</small></div><footer><span>Tất cả lịch dạy thay</span></footer><div class="bar"><i id="sbBTotal"></i></div></article>
            <article class="kpi kpi-green"><header><span class="kpi-label"><i class="dot"></i>ĐÃ HOÀN THÀNH</span><span class="kpi-icon"><i class="bi bi-check-circle"></i></span></header>
                <div class="kpi-value"><span id="sbDone">0</span><small>LƯỢT</small></div><footer><span class="kpi-note"><i class="bi bi-graph-up-arrow"></i> <b id="sbPDone">0%</b></span><span>Đã xác nhận thực tế</span></footer><div class="bar"><i id="sbBDone"></i></div></article>
            <article class="kpi kpi-yellow"><header><span class="kpi-label"><i class="dot"></i>CHỜ XÁC NHẬN</span><span class="kpi-icon"><i class="bi bi-hourglass-split"></i></span></header>
                <div class="kpi-value"><span id="sbPend">0</span><small>LƯỢT</small></div><footer><span class="kpi-note"><i class="bi bi-clock-history"></i> <b id="sbPPend">0%</b></span><span>Chưa tính ngày công</span></footer><div class="bar"><i id="sbBPend"></i></div></article>
            <article class="kpi kpi-purple"><header><span class="kpi-label"><i class="dot"></i>NGÀY CÔNG KỲ ĐANG CHỌN</span><span class="kpi-icon"><i class="bi bi-calendar-check"></i></span></header>
                <div class="kpi-value"><span id="sbDays">0</span><small>NGÀY</small></div><footer><span id="sbDaysNote">Theo bộ lọc thống kê bên dưới</span></footer><div class="bar"><i id="sbBDays"></i></div></article>
        </section>

        <section class="card table-card sub-card">
            <div class="toolbar">
                <h2 class="hist-title"><i class="bi bi-people"></i> Phân công giáo viên dạy thay</h2>
                <label class="field-search"><i class="bi bi-search"></i><input type="text" id="sbSearch" placeholder="Tìm theo lớp, giáo viên, ghi chú..."></label>
                <input type="month" id="sbMonth" class="select" title="Tháng dạy">
                <select id="sbClass" class="select"><option value="">Lớp: Tất cả</option></select>
                <select id="sbTeacher" class="select"><option value="">Giáo viên: Tất cả</option></select>
                <select id="sbStatus" class="select"><option value="">Trạng thái: Tất cả</option><option value="ASSIGNED">Đã phân công</option><option value="COMPLETED">Đã hoàn thành</option></select>
                <button type="button" class="icon-btn outline" id="sbReset" title="Đặt lại" aria-label="Đặt lại"><i class="bi bi-arrow-counterclockwise"></i></button>
                <button type="button" class="btn-primary" id="sbAdd"><i class="bi bi-plus-circle"></i> Thêm phân công dạy thay</button>
            </div>
            <div class="meta-row"><span>Hiển thị <b id="sbShown">0</b> / <b id="sbCount">0</b> phân công</span><span class="legend"><i class="lg lg-yellow"></i>Đã phân công <i class="lg lg-green"></i>Đã hoàn thành</span></div>
            <div class="table-wrap"><table class="data-table sub-table">
                <thead><tr><th style="width:48px">STT</th><th>NGÀY DẠY</th><th>LỚP HỌC</th><th>GIÁO VIÊN CHÍNH</th><th>GIÁO VIÊN DẠY THAY</th><th>TRẠNG THÁI</th><th>GHI CHÚ</th><th style="text-align:right">THAO TÁC</th></tr></thead>
                <tbody id="sbTable"><tr><td colspan="8" class="empty">Đang tải dữ liệu...</td></tr></tbody>
            </table></div>
            <div class="pager"><span id="sbInfo">--</span><div class="pager-btns" id="sbPager"></div></div>
        </section>

        <section class="card table-card sub-card">
            <div class="toolbar">
                <h2 class="hist-title"><i class="bi bi-bar-chart"></i> Thống kê ngày công giáo viên dạy thay</h2>
                <select id="sbSTeacher" class="select"><option value="">Giáo viên: Tất cả</option></select>
                <select id="sbSMonth" class="select"></select>
                <select id="sbSYear" class="select"></select>
                <button type="button" class="btn-soft" id="sbCsv"><i class="bi bi-file-earmark-excel"></i> Xuất Excel (CSV)</button>
                <button type="button" class="btn-primary" id="sbPreview"><i class="bi bi-printer"></i> Xem trước &amp; in báo cáo</button>
            </div>
            <div class="total-box"><div><small>TỔNG SỐ NGÀY CÔNG</small><strong id="sbSTotal">0</strong></div>
                <p>Chỉ tính lịch đã xác nhận hoàn thành. Giáo viên dạy nhiều lớp trong cùng một ngày chỉ tính 1 ngày công. Không có dữ liệu tiền lương trong chức năng này.</p></div>
            <div class="two-tables">
                <div><h3 class="sub-title">Tổng hợp theo giáo viên</h3><div class="table-wrap"><table class="data-table narrow">
                    <thead><tr><th style="width:48px">STT</th><th>GIÁO VIÊN DẠY THAY</th><th style="text-align:right">SỐ NGÀY CÔNG</th></tr></thead><tbody id="sbSummary"></tbody></table></div></div>
                <div><h3 class="sub-title">Chi tiết ngày dạy thay</h3><div class="table-wrap"><table class="data-table narrow">
                    <thead><tr><th>GIÁO VIÊN</th><th>NGÀY DẠY</th><th>LỚP</th><th>GV CHÍNH</th><th>GHI CHÚ</th></tr></thead><tbody id="sbDetail"></tbody></table></div></div>
            </div>
        </section>
    </div>`);

    document.body.insertAdjacentHTML("beforeend", `
    <dialog id="sbFormDialog" class="profile-dialog">
        <form id="sbForm" novalidate>
            <div class="pf-head"><div class="title-icon"><i class="bi bi-calendar-check"></i></div>
                <div><div class="pf-name" id="sbFormTitle">Thêm phân công dạy thay</div><small style="color:var(--muted)">Không làm thay đổi phân công CVHT gốc</small></div>
                <button type="button" class="pf-close" data-close aria-label="Đóng"><i class="bi bi-x-lg"></i></button></div>
            <div class="chg-body">
                <div class="form-grid">
                    <div><label class="lbl" for="sbDate">Ngày dạy *</label><input id="sbDate" class="input" type="date" required></div>
                    <div><label class="lbl" for="sbFClass">Lớp học *</label><select id="sbFClass" class="select full" required></select></div>
                </div>
                <div><label class="lbl" for="sbMain">Giáo viên chính (có lịch dạy ban đầu) *</label><select id="sbMain" class="select full" required></select></div>
                <div><label class="lbl" for="sbSub">Giáo viên dạy thay *</label><select id="sbSub" class="select full" required></select></div>
                <div><label class="lbl" for="sbNote">Ghi chú</label><textarea id="sbNote" class="input" rows="2" maxlength="500" placeholder="Không bắt buộc"></textarea></div>
                <div class="sb-err" id="sbErr"></div>
            </div>
            <div class="pf-foot"><button type="submit" class="btn-primary btn-sm"><i class="bi bi-check2-circle"></i> Lưu phân công</button><button type="button" class="btn-soft btn-sm" data-close>Hủy</button></div>
        </form>
    </dialog>
    <dialog id="sbReportDialog" class="profile-dialog sb-report-dlg">
        <div class="pf-head"><div class="title-icon"><i class="bi bi-eye"></i></div><div><div class="pf-name">Xem trước báo cáo</div></div>
            <div class="rep-tools"><button type="button" class="btn-primary btn-sm" id="sbPrint"><i class="bi bi-printer"></i> In / Lưu PDF</button>
            <button type="button" class="btn-soft btn-sm" data-close>Đóng</button></div></div>
        <div class="sb-report-wrap"><div id="sbReport" class="report"></div></div>
    </dialog>`);

    /* ---------- Tải dữ liệu ---------- */
    async function loadSubs() {
        try { subs = unwrap(await request(SUB_API)); }
        catch (e) { subs = []; setMessage("Không tải được lịch dạy thay: " + e.message, "error"); }
        renderAll();
    }

    function fillSelects() {
        const emp = employees.filter(e => e.isActive !== false);
        const opts = (list, first) => `<option value="">${first}</option>` + list.join("");
        const eo = emp.map(e => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.code)} - ${escapeHtml(e.fullName)}</option>`);
        const co = studentClasses.map(c => `<option value="${escapeHtml(c.id)}">${escapeHtml(classLabel(c) ?? c.id)}</option>`);
        const keep = (id, html) => { const v = $(id).value; $(id).innerHTML = html; $(id).value = v; };
        keep("sbTeacher", opts(eo, "Giáo viên: Tất cả"));
        keep("sbSTeacher", opts(eo, "Giáo viên: Tất cả"));
        keep("sbClass", opts(co, "Lớp: Tất cả"));
        keep("sbFClass", opts(co, "-- Chọn lớp --"));
        keep("sbMain", opts(eo, "-- Chọn giáo viên chính --"));
        keep("sbSub", opts(eo, "-- Chọn giáo viên dạy thay --"));
        if (!$("sbSMonth").options.length) {
            const now = new Date(), y = now.getFullYear();
            $("sbSMonth").innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Tháng ${i + 1}</option>`).join("");
            $("sbSYear").innerHTML = [y - 3, y - 2, y - 1, y, y + 1].map(v => `<option value="${v}">Năm ${v}</option>`).join("");
            $("sbSMonth").value = now.getMonth() + 1; $("sbSYear").value = y;
        }
    }

    /* ---------- Danh sách phân công ---------- */
    function filtered() {
        const q = $("sbSearch").value.trim().toLowerCase(), mo = $("sbMonth").value, cl = $("sbClass").value,
            tc = $("sbTeacher").value, st = $("sbStatus").value;
        return subs.filter(s =>
            (!q || [cname(s.studentClasseId), ename(s.mainEmployeeId), ename(s.substituteEmployeeId), s.note].join(" ").toLowerCase().includes(q)) &&
            (!mo || day(s.teachingDate).startsWith(mo)) &&
            (!cl || key(s.studentClasseId) === key(cl)) &&
            (!tc || key(s.mainEmployeeId) === key(tc) || key(s.substituteEmployeeId) === key(tc)) &&
            (!st || s.status === st)
        ).sort((a, b) => day(b.teachingDate).localeCompare(day(a.teachingDate)));
    }

    function renderList() {
        const rows = filtered(), pages = Math.max(1, Math.ceil(rows.length / SUB_PAGE));
        subPage = Math.min(subPage, pages);
        const start = (subPage - 1) * SUB_PAGE, view = rows.slice(start, start + SUB_PAGE);
        $("sbShown").textContent = view.length; $("sbCount").textContent = rows.length;
        if (!view.length) {
            $("sbTable").innerHTML = '<tr><td colspan="8" class="empty"><i class="bi bi-calendar-x"></i>Chưa có phân công dạy thay phù hợp.</td></tr>';
            $("sbInfo").textContent = "Hiển thị 0 phân công"; $("sbPager").innerHTML = ""; return;
        }
        $("sbTable").innerHTML = view.map((s, i) => {
            const [label, cls] = ST[s.status] ?? ST.ASSIGNED, id = escapeHtml(s.id);
            return `<tr>
                <td class="td-stt">${String(start + i + 1).padStart(2, "0")}</td>
                <td class="td-term"><b>${dmy(s.teachingDate)}</b></td>
                <td><span class="class-chip">${escapeHtml(cname(s.studentClasseId))}</span></td>
                <td>${escapeHtml(ename(s.mainEmployeeId))}</td>
                <td><b>${escapeHtml(ename(s.substituteEmployeeId))}</b></td>
                <td><span class="pill ${cls}">${label}</span></td>
                <td class="hist-reason">${escapeHtml(s.note || "—")}</td>
                <td style="text-align:right;white-space:nowrap">
                    ${s.status === "COMPLETED" || day(s.teachingDate) > today() ? "" : `<button type="button" class="btn-eye sb-ok" data-sb="complete" data-id="${id}" title="Xác nhận đã dạy thay"><i class="bi bi-check2-circle"></i></button>`}
                    <button type="button" class="btn-eye" data-sb="edit" data-id="${id}" title="Sửa"><i class="bi bi-pencil"></i></button>
                    <button type="button" class="btn-eye sb-del" data-sb="delete" data-id="${id}" title="Xóa"><i class="bi bi-trash"></i></button>
                </td></tr>`;
        }).join("");
        $("sbInfo").textContent = `Hiển thị ${start + 1} - ${Math.min(start + SUB_PAGE, rows.length)} trong tổng số ${rows.length} phân công`;
        const box = $("sbPager"); box.innerHTML = "";
        if (pages <= 1) return;
        const mk = (html, dis, act, fn) => { const b = document.createElement("button"); b.type = "button"; b.innerHTML = html; b.disabled = dis; if (act) b.classList.add("active"); b.onclick = fn; box.appendChild(b); };
        mk('<i class="bi bi-chevron-left"></i>', subPage === 1, false, () => { subPage--; renderList(); });
        for (let i = 1; i <= pages; i++) mk(i, false, i === subPage, () => { subPage = i; renderList(); });
        mk('<i class="bi bi-chevron-right"></i>', subPage === pages, false, () => { subPage++; renderList(); });
    }

    /* ---------- Thống kê ngày công ---------- */
    // Chỉ lịch COMPLETED; mỗi (giáo viên dạy thay, ngày) = 1 ngày công dù dạy nhiều lớp
    function stats() {
        const mo = Number($("sbSMonth").value), yr = Number($("sbSYear").value), tc = $("sbSTeacher").value;
        const prefix = `${yr}-${String(mo).padStart(2, "0")}`;
        const rows = subs.filter(s => s.status === "COMPLETED" && day(s.teachingDate).startsWith(prefix) && (!tc || key(s.substituteEmployeeId) === key(tc)));
        const byTeacher = new Map();
        rows.forEach(s => {
            const k = key(s.substituteEmployeeId);
            if (!byTeacher.has(k)) byTeacher.set(k, { id: s.substituteEmployeeId, days: new Map() });
            const d = day(s.teachingDate), days = byTeacher.get(k).days;
            if (!days.has(d)) days.set(d, []);
            days.get(d).push(s);
        });
        const list = [...byTeacher.values()].sort((a, b) => ename(a.id).localeCompare(ename(b.id), "vi"));
        const total = list.reduce((n, t) => n + t.days.size, 0);
        return { mo, yr, prefix, list, rows, total };
    }

    function renderStats() {
        const st = stats();
        $("sbSTotal").textContent = st.total;
        $("sbDays").textContent = st.total;
        $("sbDaysNote").textContent = `Tháng ${st.mo}/${st.yr}${$("sbSTeacher").value ? " · 1 giáo viên" : " · tất cả giáo viên"}`;
        $("sbBDays").style.width = Math.min(100, st.total * 100 / 31) + "%";
        $("sbSummary").innerHTML = st.list.length
            ? st.list.map((t, i) => `<tr><td class="td-stt">${String(i + 1).padStart(2, "0")}</td><td><b>${escapeHtml(ename(t.id))}</b> <span class="code-tag">${escapeHtml(ecode(t.id))}</span></td><td style="text-align:right"><b class="sb-num">${t.days.size}</b> ngày</td></tr>`).join("")
            : '<tr><td colspan="3" class="empty">Chưa có ngày dạy thay hoàn thành trong kỳ này.</td></tr>';
        $("sbDetail").innerHTML = st.rows.length
            ? st.rows.slice().sort((a, b) => ename(a.substituteEmployeeId).localeCompare(ename(b.substituteEmployeeId), "vi") || day(a.teachingDate).localeCompare(day(b.teachingDate)))
                .map(s => `<tr><td>${escapeHtml(ename(s.substituteEmployeeId))}</td><td class="td-term">${dmy(s.teachingDate)}</td><td><span class="class-chip">${escapeHtml(cname(s.studentClasseId))}</span></td><td>${escapeHtml(ename(s.mainEmployeeId))}</td><td class="hist-reason">${escapeHtml(s.note || "—")}</td></tr>`).join("")
            : '<tr><td colspan="5" class="empty">Không có dữ liệu.</td></tr>';
    }

    function renderKpi() {
        const t = subs.length, d = subs.filter(s => s.status === "COMPLETED").length, p = t - d;
        const pc = (n) => (t ? n * 100 / t : 0);
        $("sbTotal").textContent = t; $("sbDone").textContent = d; $("sbPend").textContent = p;
        $("sbPDone").textContent = pc(d).toFixed(1) + "%"; $("sbPPend").textContent = pc(p).toFixed(1) + "%";
        $("sbBTotal").style.width = (t ? 100 : 0) + "%"; $("sbBDone").style.width = pc(d) + "%"; $("sbBPend").style.width = pc(p) + "%";
    }
    function renderAll() { fillSelects(); renderKpi(); renderList(); renderStats(); }

    /* ---------- Thêm / sửa / xóa / xác nhận ---------- */
    function openForm(item) {
        subEditing = item ?? null;
        $("sbFormTitle").textContent = item ? "Sửa phân công dạy thay" : "Thêm phân công dạy thay";
        $("sbDate").value = item ? day(item.teachingDate) : today();
        $("sbFClass").value = item?.studentClasseId ?? ""; $("sbMain").value = item?.mainEmployeeId ?? "";
        $("sbSub").value = item?.substituteEmployeeId ?? ""; $("sbNote").value = item?.note ?? ""; $("sbErr").textContent = "";
        $("sbFormDialog").showModal();
    }

    async function saveSub(ev) {
        ev.preventDefault();
        const d = $("sbDate").value, cl = $("sbFClass").value, mn = $("sbMain").value, sb = $("sbSub").value, note = $("sbNote").value.trim();
        const err = (m) => { $("sbErr").textContent = m; };
        if (!d || !cl || !mn || !sb) return err("Vui lòng nhập ngày dạy, lớp, giáo viên chính và giáo viên dạy thay.");
        if (key(mn) === key(sb)) return err("Giáo viên dạy thay phải khác giáo viên chính.");
        if (subs.some(s => (!subEditing || s.id !== subEditing.id) && day(s.teachingDate) === d && key(s.studentClasseId) === key(cl) && key(s.substituteEmployeeId) === key(sb)))
            return err("Đã có phân công dạy thay trùng (cùng ngày, lớp và giáo viên).");
        const payload = { teachingDate: d, studentClasseId: cl, mainEmployeeId: mn, substituteEmployeeId: sb, note: note || null, status: subEditing?.status ?? "ASSIGNED" };
        try {
            await request(subEditing ? `${SUB_API}/${encodeURIComponent(subEditing.id)}` : SUB_API, { method: subEditing ? "PUT" : "POST", body: JSON.stringify(payload) });
            $("sbFormDialog").close();
            setMessage(subEditing ? "Đã cập nhật phân công dạy thay." : "Đã thêm phân công dạy thay.", "success");
            await loadSubs();
        } catch (e) { err("Không lưu được: " + e.message); }
    }

    async function subAction(action, id) {
        const item = subs.find(s => String(s.id) === String(id));
        if (!item) return;
        try {
            if (action === "edit") return openForm(item);
            if (action === "delete") {
                if (!confirm("Xóa phân công dạy thay này? Lịch dạy gốc không bị ảnh hưởng.")) return;
                await request(`${SUB_API}/${encodeURIComponent(id)}`, { method: "DELETE" });
                setMessage("Đã xóa phân công dạy thay.", "success");
            }
            if (action === "complete") {
                if (!confirm(`Xác nhận ${ename(item.substituteEmployeeId)} đã thực tế dạy thay ngày ${dmy(item.teachingDate)}?`)) return;
                await request(`${SUB_API}/${encodeURIComponent(id)}/complete`, { method: "PATCH" });
                setMessage("Đã xác nhận hoàn thành, tính vào ngày công.", "success");
            }
            await loadSubs();
        } catch (e) { setMessage("Thao tác thất bại: " + e.message, "error"); }
    }

    /* ---------- Báo cáo: xem trước, in, xuất Excel ---------- */
    function buildReport() {
        const st = stats();
        const mm = String(st.mo).padStart(2, "0");
        const blocks = st.list.map(t => {
            const rows = [...t.days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, list], i) => {
                const uniq = (fn) => [...new Set(list.map(fn).filter(Boolean))].join(", ");
                return `<tr><td>${i + 1}</td><td>${dmy(d)}</td><td>${escapeHtml(uniq(s => cname(s.studentClasseId)))}</td><td>${escapeHtml(uniq(s => ename(s.mainEmployeeId)))}</td><td>${escapeHtml(uniq(s => s.note) || "")}</td></tr>`;
            }).join("");
            return `<div class="rp-block"><h4>Giáo viên: ${escapeHtml(ename(t.id))}${ecode(t.id) ? " (" + escapeHtml(ecode(t.id)) + ")" : ""}</h4>
                <table class="rp-table"><thead><tr><th style="width:44px">STT</th><th style="width:100px">Ngày làm việc</th><th>Lớp đã dạy thay</th><th>Giáo viên chính</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>
                <div class="rp-total">Tổng số ngày công: <b>${t.days.size}</b> ngày</div></div>`;
        }).join("") || '<p class="rp-empty">Không có ngày làm việc nào được xác nhận trong kỳ này.</p>';
        return `<div class="rp-head"><div class="rp-school">${SCHOOL}</div><h2>BẢNG THỐNG KÊ NGÀY LÀM VIỆC GIÁO VIÊN</h2><div>Tháng ${mm} năm ${st.yr}</div></div>
            ${blocks}
            <div class="rp-grand">TỔNG CỘNG: <b>${st.total}</b> ngày công${st.list.length > 1 ? ` của ${st.list.length} giáo viên` : ""}</div>
            <div class="rp-foot"><span>Ngày in: ${new Date().toLocaleDateString("vi-VN")}</span><span class="rp-sign">Người lập báo cáo<br><i>(Ký, ghi rõ họ tên)</i></span></div>`;
    }

    function exportSubCsv() {
        const st = stats();
        const rows = [["STT", "Giáo viên dạy thay", "Mã GV", "Ngày làm việc", "Lớp đã dạy thay", "Giáo viên chính", "Ghi chú"]];
        let n = 0;
        st.list.forEach(t => [...t.days.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([d, list]) => {
            const uniq = (fn) => [...new Set(list.map(fn).filter(Boolean))].join("; ");
            rows.push([++n, ename(t.id), ecode(t.id), dmy(d), uniq(s => cname(s.studentClasseId)), uniq(s => ename(s.mainEmployeeId)), uniq(s => s.note)]);
        }));
        rows.push(["", "TỔNG SỐ NGÀY CÔNG", "", st.total]);
        const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        a.download = `ngay-cong-giao-vien-${st.yr}-${String(st.mo).padStart(2, "0")}.csv`;
        a.click(); URL.revokeObjectURL(a.href);
        setMessage("Đã xuất file Excel (CSV).", "success");
    }

    /* ---------- Sự kiện ---------- */
    document.querySelectorAll(".tab[data-tab]").forEach(b => b.addEventListener("click", () => {
        document.querySelectorAll(".tab[data-tab]").forEach(x => x.classList.toggle("active", x === b));
        document.body.classList.toggle("tab-sub", b.dataset.tab === "sub");
    }));
    const rerender = () => { subPage = 1; renderList(); };
    $("sbSearch").addEventListener("input", rerender);
    ["sbMonth", "sbClass", "sbTeacher", "sbStatus"].forEach(id => $(id).addEventListener("change", rerender));
    ["sbSTeacher", "sbSMonth", "sbSYear"].forEach(id => $(id).addEventListener("change", renderStats));
    $("sbReset").addEventListener("click", () => { ["sbSearch", "sbMonth", "sbClass", "sbTeacher", "sbStatus"].forEach(id => $(id).value = ""); rerender(); });
    $("sbAdd").addEventListener("click", () => openForm(null));
    $("sbForm").addEventListener("submit", saveSub);
    $("sbTable").addEventListener("click", (e) => { const b = e.target.closest("[data-sb]"); if (b) subAction(b.dataset.sb, b.dataset.id); });
    $("sbCsv").addEventListener("click", exportSubCsv);
    $("sbPreview").addEventListener("click", () => { $("sbReport").innerHTML = buildReport(); $("sbReportDialog").showModal(); });
    $("sbPrint").addEventListener("click", () => { document.body.classList.add("print-sb-report"); window.print(); });
    window.addEventListener("afterprint", () => document.body.classList.remove("print-sb-report"));
    ["sbFormDialog", "sbReportDialog"].forEach(id => $(id).addEventListener("click", (e) => {
        if (e.target === $(id) || e.target.closest("[data-close]")) $(id).close();
    }));
    $("btnAddNew").addEventListener("click", () => {   // nút "Thêm mới" trên topbar theo tab đang mở
        if (document.body.classList.contains("tab-sub")) openForm(null);
    });
    $("globalSearch").addEventListener("input", e => {
        if (document.body.classList.contains("tab-sub")) { $("sbSearch").value = e.target.value; rerender(); }
    });
    $("sbFClass").addEventListener("change", () => {
        if ($("sbMain").value) return;
        const cur = assignments.find(a => a.isActive && key(a.studentClasseId) === key($("sbFClass").value));
        if (cur) $("sbMain").value = cur.employeeId;
    });
    /* Bọc loadData: sau khi danh mục giảng viên/lớp đã tải thì tải lịch dạy thay */
    const _loadData2 = loadData;
    loadData = async function () { await _loadData2(); await loadSubs(); };
})();