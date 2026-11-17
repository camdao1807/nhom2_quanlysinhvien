import { API_ENDPOINTS } from './config.js';

const pageSize = 10;
const COLORS = ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0891b2', '#475569', '#dc2626'];

let allStudents = [];
let filtered = [];
let currentPage = 1;
let showArchived = false;
let detailStudent = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
    const d = new Date(), m = d.getMonth() + 1, y = d.getFullYear();
    const term = m >= 8 ? 'Học kỳ I' : m <= 6 ? 'Học kỳ II' : 'Học kỳ hè';
    const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    $('todayText').textContent = `Hôm nay: ${date.charAt(0).toUpperCase() + date.slice(1)} · ${term}`;
    $('termBadge').textContent = `${term} · ${m >= 8 ? y + '/' + (y + 1) : (y - 1) + '/' + y}`;

    $('sidebarToggle').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            $('globalSearch').focus();
        }
    });

    const id = new URLSearchParams(window.location.search).get('id');
    if (id) {
        showPage('page-detail');
        loadDetail(id);
    } else {
        showPage('page-list');
        bindEvents();
        bindAddForm();
        loadStudents();
    }
});

function showPage(pageId) {
    ['page-list', 'page-detail'].forEach((p) => {
        const el = $(p);
        if (el) el.hidden = p !== pageId;
    });
}

/* ---------------- Tiện ích ---------------- */

function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function fmtDate(v) {
    if (!v) return '';
    const p = String(v).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : escapeHtml(v);
}

function fmtDateTime(v) {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d) ? escapeHtml(v) : d.toLocaleString('vi-VN');
}

const yearOf = (v) => (v ? String(v).slice(0, 4) : '');

function toast(msg, type = 'success') {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type === 'error' ? ' error' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 3000);
}

// báo cho các trang khác (vd. Trạng thái sinh viên) tự làm mới
function notifyChanged() {
    try { new BroadcastChannel('sm-students').postMessage('changed'); } catch (_) { /* bỏ qua */ }
    try { localStorage.setItem('sm-students-changed', String(Date.now())); } catch (_) { /* bỏ qua */ }
}

const STATUS_MAP = {
    studying: 'Đang học', reserved: 'Bảo lưu', dropped: 'Thôi học',
    graduated: 'Tốt nghiệp', completed: 'Hoàn thành',
};

function normStatus(v) {
    const t = (v || '').trim();
    return STATUS_MAP[t.toLowerCase()] || t || 'Đang học';
}

const statusOf = (s) => normStatus(s.status);

function pillClass(status) {
    switch (status) {
        case 'Đang học': return 'pill-green';
        case 'Bảo lưu': return 'pill-yellow';
        case 'Thôi học': return 'pill-red';
        case 'Tốt nghiệp': return 'pill-purple';
        default: return 'pill-gray';
    }
}

function statusBadge(status) {
    const s = normStatus(status);
    return `<span class="pill ${pillClass(s)}">${escapeHtml(s)}</span>`;
}

const classCode = (s) => s.classCode ?? '';
const className = (s) => s.className ?? '';

const colorOf = (txt) =>
    COLORS[[...String(txt || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const initial = (name) =>
    (String(name || '?').trim().split(/\s+/).pop().charAt(0) || '?').toUpperCase();

/* ---------------- Sự kiện ---------------- */

function bindEvents() {
    let timer;
    const onKeyword = () => {
        clearTimeout(timer);
        timer = setTimeout(applyFilter, 250);
    };
    $('keyword').addEventListener('input', () => { $('globalSearch').value = $('keyword').value; onKeyword(); });
    $('globalSearch').addEventListener('input', (e) => { $('keyword').value = e.target.value; onKeyword(); });

    ['fClass', 'fStatus', 'fYear', 'fGender'].forEach((id) =>
        $(id).addEventListener('change', applyFilter));
    $('btnReset').addEventListener('click', resetFilters);

    $('btnArchive').addEventListener('click', () => {
        showArchived = !showArchived;
        $('archiveLabel').textContent = showArchived ? 'Danh sách chính' : 'Lưu trữ';
        $('btnAdd').style.display = showArchived ? 'none' : '';
        $('btnAddNew').style.display = showArchived ? 'none' : '';
        loadStudents();
    });
}

function resetFilters() {
    ['keyword', 'globalSearch', 'fClass', 'fStatus', 'fYear', 'fGender'].forEach((id) => ($(id).value = ''));
    applyFilter();
}

/* ---------------- Thêm sinh viên ---------------- */

function bindAddForm() {
    const overlay = $('addOverlay');
    const form = $('addForm');
    if (!overlay || !form) return;

    const openModal = () => {
        form.reset();
        $('addError').textContent = '';
        overlay.classList.add('show');
        $('aCode').focus();
    };
    const closeModal = () => overlay.classList.remove('show');

    $('btnAdd').addEventListener('click', openModal);
    $('btnAddNew').addEventListener('click', openModal);
    $('addClose').addEventListener('click', closeModal);
    $('addCancel').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const err = $('addError');
        err.textContent = '';

        const val = (id) => $(id).value.trim();
        const orNull = (v) => (v ? v : null);

        const body = {
            code: val('aCode'),
            fullName: val('aName'),
            dateOfBirth: orNull($('aDob').value),
            gender: $('aGender').value,
            personalIdentificationNumber: orNull(val('aCccd')),
            dateOfIssue: orNull($('aIssue').value),
            cardPlace: orNull(val('aPlace')),
            address: orNull(val('aAddress')),
            currentAddress: orNull(val('aCurrent')),
            admissionYear: $('aAdmission').value ? `${$('aAdmission').value}T00:00:00` : null,
            status: 'Đang học',
        };

        if (!body.code) { err.textContent = 'Vui lòng nhập mã sinh viên'; return; }
        if (!body.fullName) { err.textContent = 'Vui lòng nhập họ và tên'; return; }
        if (body.dateOfBirth && body.dateOfBirth > new Date().toISOString().slice(0, 10)) {
            err.textContent = 'Ngày sinh không được nằm trong tương lai';
            return;
        }

        const btn = $('addSave');
        btn.disabled = true;
        try {
            const res = await fetch(API_ENDPOINTS.STUDENTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const msg = await res.text();
                throw new Error(msg || `Lỗi HTTP ${res.status}`);
            }
            closeModal();
            await loadStudents();
            toast('Thêm sinh viên thành công');
            notifyChanged();
        } catch (ex) {
            err.textContent = ex.message;
        } finally {
            btn.disabled = false;
        }
    });
}

/* ---------------- Danh sách ---------------- */

async function loadStudents() {
    const body = $('studentTableBody');
    try {
        const url = showArchived ? `${API_ENDPOINTS.STUDENTS}/archived` : API_ENDPOINTS.STUDENTS;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        allStudents = await response.json();

        fillSelects();
        renderStats();
        applyFilter();
    } catch (error) {
        console.error('Lỗi khi tải danh sách sinh viên:', error);
        body.innerHTML = `<tr><td colspan="9" class="empty"><i class="bi bi-exclamation-triangle"></i>Không thể tải danh sách sinh viên</td></tr>`;
        $('paginationInfo').textContent = 'Lỗi tải dữ liệu';
        toast('Không thể tải danh sách sinh viên', 'error');
    }
}

function fillSelects() {
    const keepClass = $('fClass').value;
    const keepYear = $('fYear').value;

    const classes = [...new Set(allStudents.map(classCode).filter(Boolean))].sort();
    $('fClass').innerHTML = `<option value="">Lớp: Tất cả</option>` +
        classes.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    const years = [...new Set(allStudents.map((s) => yearOf(s.admissionYear)).filter(Boolean))].sort();
    $('fYear').innerHTML = `<option value="">Khóa: Tất cả</option>` +
        years.map((y) => `<option value="${y}">K${y}</option>`).join('');

    $('fClass').value = keepClass;
    $('fYear').value = keepYear;
}

function applyFilter() {
    const kw = $('keyword').value.trim().toLowerCase();
    const cls = $('fClass').value;
    const st = $('fStatus').value;
    const yr = $('fYear').value;
    const gd = $('fGender').value;

    filtered = allStudents.filter((s) =>
        (!kw || (s.code || '').toLowerCase().includes(kw) || (s.fullName || '').toLowerCase().includes(kw))
        && (!cls || classCode(s) === cls)
        && (!st || statusOf(s) === st)
        && (!yr || yearOf(s.admissionYear) === yr)
        && (!gd || (s.gender || '') === gd));

    currentPage = 1;
    renderChips();
    renderTable();
}

function renderChips() {
    const items = [];
    const map = [
        ['keyword', 'Từ khóa'], ['fClass', 'Lớp'], ['fStatus', 'Trạng thái'],
        ['fYear', 'Khóa'], ['fGender', 'Giới tính'],
    ];
    map.forEach(([id, label]) => {
        const v = $(id).value.trim();
        if (v) items.push([id, `${label}: ${id === 'fYear' ? 'K' + v : v}`]);
    });

    const box = $('chips');
    if (!items.length) { box.innerHTML = ''; return; }

    box.innerHTML = 'Bộ lọc đang áp dụng: ' +
        items.map(([id, t]) => `<span class="chip">${escapeHtml(t)} <button type="button" data-clear="${id}">×</button></span>`).join('') +
        `<button type="button" class="clear-all" id="clearAll">Xóa tất cả (${items.length})</button>`;

    box.querySelectorAll('[data-clear]').forEach((b) =>
        b.addEventListener('click', () => {
            $(b.dataset.clear).value = '';
            if (b.dataset.clear === 'keyword') $('globalSearch').value = '';
            applyFilter();
        }));
    $('clearAll').addEventListener('click', resetFilters);
}

/* ---------------- Thống kê (KPI) ---------------- */

function renderStats() {
    const total = allStudents.length;
    const count = (st) => allStudents.filter((s) => statusOf(s) === st).length;
    const pctNum = (n) => (total ? (n / total) * 100 : 0);
    const pct = (n) => pctNum(n).toFixed(1).replace('.', ',') + '%';

    const card = (cls, label, n, icon, noteIcon, pctText, note, barPct) => `
        <article class="kpi ${cls}">
            <header><span class="kpi-label"><i class="dot"></i>${label}</span><span class="kpi-icon"><i class="bi ${icon}"></i></span></header>
            <div class="kpi-value"><span>${n.toLocaleString('vi-VN')}</span><small>SV</small></div>
            <footer><span class="kpi-note"><i class="bi ${noteIcon}"></i> <b>${pctText}</b></span><span>${note}</span></footer>
            <div class="bar"><i style="width:${Math.max(barPct, n ? 3 : 0)}%"></i></div>
        </article>`;

    const study = count('Đang học'), save = count('Bảo lưu'), drop = count('Thôi học'), grad = count('Tốt nghiệp');

    $('statCards').innerHTML =
        card('kpi-blue', showArchived ? 'ĐÃ LƯU TRỮ' : 'TỔNG SỐ SINH VIÊN', total, 'bi-people', 'bi-people',
            total ? '100%' : '0%', showArchived ? 'Mục lưu trữ' : 'Toàn trường', total ? 100 : 0) +
        card('kpi-green', 'ĐANG HỌC', study, 'bi-mortarboard', 'bi-graph-up-arrow', pct(study), 'Đúng tiến độ niên khóa', pctNum(study)) +
        card('kpi-yellow', 'BẢO LƯU HỒ SƠ', save, 'bi-pause-circle', 'bi-clock-history', pct(save), 'Tạm dừng có thời hạn', pctNum(save)) +
        card('kpi-red', 'THÔI HỌC', drop, 'bi-exclamation-triangle', 'bi-exclamation', pct(drop), 'Cần xử lý thủ tục', pctNum(drop)) +
        card('kpi-purple', 'ĐÃ TỐT NGHIỆP', grad, 'bi-award', 'bi-check-circle', pct(grad), 'Đã cấp văn bằng', pctNum(grad));
}

/* ---------------- Bảng ---------------- */

function renderTable() {
    const body = $('studentTableBody');
    const info = $('paginationInfo');

    if (!filtered.length) {
        body.innerHTML = `<tr><td colspan="9" class="empty"><i class="bi bi-folder2-open"></i>${showArchived ? 'Mục lưu trữ đang trống' : 'Không có dữ liệu sinh viên'}</td></tr>`;
        info.textContent = 'Hiển thị 0 kết quả';
        renderPagination(0);
        return;
    }

    const totalPages = Math.ceil(filtered.length / pageSize);
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);
    const start = (currentPage - 1) * pageSize;
    const end = Math.min(start + pageSize, filtered.length);
    info.textContent = `Hiển thị ${start + 1} - ${end} trong tổng số ${filtered.length} sinh viên`;

    body.innerHTML = filtered.slice(start, end).map((s, i) => `
        <tr>
            <td class="td-stt">${String(start + i + 1).padStart(2, '0')}</td>
            <td><span class="code">${escapeHtml(s.code)}</span></td>
            <td>
                <div class="person">
                    <div class="p-avatar" style="background:${colorOf(s.code)}">${escapeHtml(initial(s.fullName))}</div>
                    <div class="p-name">${escapeHtml(s.fullName)}</div>
                </div>
            </td>
            <td class="td-date">${fmtDate(s.dateOfBirth)}<span class="sub">${escapeHtml(s.gender)}</span></td>
            <td>${escapeHtml(s.personalIdentificationNumber)}</td>
            <td>${classCode(s) ? `<span class="class-chip">${escapeHtml(classCode(s))}</span>` : ''}</td>
            <td>${escapeHtml(className(s))}<span class="sub">${s.admissionYear ? 'Nhập học ' + yearOf(s.admissionYear) : ''}</span></td>
            <td>${statusBadge(s.status)}</td>
            <td class="col-actions">
                ${showArchived
                    ? `<button type="button" class="btn-restore" onclick="restoreStudent('${escapeHtml(s.id)}')"><i class="bi bi-arrow-counterclockwise"></i>Khôi phục</button>`
                    : `<a class="btn-view" title="Xem hồ sơ" href="index.html?id=${encodeURIComponent(s.id)}"><i class="bi bi-eye"></i></a>`}
            </td>
        </tr>`).join('');

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const box = $('paginationContainer');
    box.innerHTML = '';
    if (totalPages <= 1) return;

    const mk = (html, disabled, active, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.innerHTML = html;
        b.disabled = disabled;
        if (active) b.classList.add('active');
        b.onclick = fn;
        box.appendChild(b);
    };
    const go = (p) => { currentPage = p; renderTable(); };

    mk('<i class="bi bi-chevron-left"></i>', currentPage === 1, false, () => go(currentPage - 1));
    const from = Math.max(1, currentPage - 2);
    const to = Math.min(totalPages, currentPage + 2);
    for (let i = from; i <= to; i++) mk(i, false, i === currentPage, () => go(i));
    mk('<i class="bi bi-chevron-right"></i>', currentPage === totalPages, false, () => go(currentPage + 1));
}

/* ---------------- Khôi phục / Lưu trữ ---------------- */

window.restoreStudent = async function (id) {
    if (!window.confirm('Khôi phục sinh viên này về danh sách chính?')) return;
    try {
        const res = await fetch(`${API_ENDPOINTS.STUDENTS}/${encodeURIComponent(id)}/restore`, { method: 'PUT' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await loadStudents();
        toast('Đã khôi phục sinh viên');
        notifyChanged();
    } catch (err) {
        console.error(err);
        toast('Khôi phục thất bại', 'error');
    }
};

async function archiveStudent(s) {
    if (!window.confirm(`Chuyển sinh viên ${s.fullName} (${s.code}) vào mục Lưu trữ?`)) return;
    try {
        const res = await fetch(`${API_ENDPOINTS.STUDENTS}/${encodeURIComponent(s.id)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        toast('Đã chuyển vào Lưu trữ');
        notifyChanged();
        setTimeout(() => { window.location.href = 'index.html'; }, 600);
    } catch (err) {
        console.error('Lỗi khi lưu trữ sinh viên:', err);
        toast('Thao tác thất bại', 'error');
    }
}

/* ---------------- Chi tiết hồ sơ ---------------- */

async function loadDetail(id) {
    const box = $('detailBody');
    box.innerHTML = `<div class="card detail-state">Đang tải hồ sơ...</div>`;

    try {
        const response = await fetch(`${API_ENDPOINTS.STUDENTS}/${encodeURIComponent(id)}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        renderDetail(await response.json());
    } catch (error) {
        console.error('Lỗi khi lấy thông tin sinh viên:', error);
        box.innerHTML = `
            <div class="card detail-state">
                <i class="bi bi-exclamation-triangle" style="font-size:26px;color:var(--red)"></i>
                <p>Không thể lấy hồ sơ sinh viên.</p>
                <a href="index.html" class="btn-soft"><i class="bi bi-arrow-left"></i> Quay lại</a>
            </div>`;
    }
}

function infoRow(label, value) {
    const v = value === null || value === undefined || value === ''
        ? '<span class="muted">—</span>' : value;
    return `<div><div class="info-label">${escapeHtml(label)}</div><div class="info-value">${v}</div></div>`;
}

function section(title, icon, rows) {
    return `
        <div class="card sec-card">
            <div class="sec-head"><i class="bi ${icon}"></i>${escapeHtml(title)}</div>
            <div class="info-grid">${rows.join('')}</div>
        </div>`;
}

function renderDetail(s) {
    detailStudent = s;

    const header = `
        <div class="card profile-head">
            <div class="p-avatar" style="background:${colorOf(s.code)}">${escapeHtml(initial(s.fullName))}</div>
            <div class="grow">
                <h2>${escapeHtml(s.fullName)}</h2>
                <div class="muted">Mã sinh viên: <b>${escapeHtml(s.code)}</b>${classCode(s) ? ' · Lớp ' + escapeHtml(classCode(s)) : ''}</div>
            </div>
            <div class="right"><small>Trạng thái</small>${statusBadge(s.status)}</div>
        </div>`;

    const personal = section('Thông tin cá nhân', 'bi-person-vcard', [
        infoRow('Mã sinh viên', escapeHtml(s.code)),
        infoRow('Họ và tên', escapeHtml(s.fullName)),
        infoRow('Ngày sinh', fmtDate(s.dateOfBirth)),
        infoRow('Giới tính', escapeHtml(s.gender)),
    ]);

    const idCard = section('Giấy tờ tùy thân', 'bi-credit-card-2-front', [
        infoRow('Số CCCD / CMND', escapeHtml(s.personalIdentificationNumber)),
        infoRow('Ngày cấp', fmtDate(s.dateOfIssue)),
        infoRow('Nơi cấp', escapeHtml(s.cardPlace)),
    ]);

    const address = section('Địa chỉ', 'bi-geo-alt', [
        infoRow('Địa chỉ thường trú', escapeHtml(s.address)),
        infoRow('Địa chỉ hiện tại', escapeHtml(s.currentAddress)),
    ]);

    const study = section('Thông tin học vụ', 'bi-mortarboard', [
        infoRow('Lớp', escapeHtml(classCode(s))),
        infoRow('Tên lớp', escapeHtml(className(s))),
        infoRow('Ngày nhập học', fmtDate(s.admissionYear)),
        infoRow('Trạng thái', statusBadge(s.status)),
    ]);

    const system = section('Thông tin hệ thống', 'bi-clock-history', [
        infoRow('Ngày tạo', fmtDateTime(s.createdAt)),
        infoRow('Cập nhật lần cuối', fmtDateTime(s.updatedAt)),
        infoRow('Tình trạng hồ sơ', s.isActive === false
            ? '<span class="pill pill-gray">Đã lưu trữ</span>'
            : '<span class="pill pill-green">Đang hoạt động</span>'),
    ]);

    $('detailBody').innerHTML = `
        ${header}${personal}${idCard}${address}${study}${system}
        <div class="detail-actions">
            <a href="index.html" class="btn-soft"><i class="bi bi-arrow-left"></i> Quay lại danh sách</a>
            <button type="button" class="btn-primary" id="btnEdit">
                <i class="bi bi-pencil-square"></i> Chỉnh sửa
            </button>
            <button type="button" class="btn-primary btn-danger" id="btnDelete">
                <i class="bi bi-archive"></i> Chuyển vào Lưu trữ
            </button>
        </div>`;

    $('btnEdit').addEventListener('click', () => renderEdit(s));
    $('btnDelete').addEventListener('click', () => archiveStudent(s));
}

/* ---------------- Chỉnh sửa hồ sơ ---------------- */

function renderEdit(s) {
    const d = (v) => (v ? String(v).slice(0, 10) : '');
    const val = (v) => escapeHtml(v ?? '');
    const field = (label, control) =>
        `<div><div class="info-label">${label}</div>${control}</div>`;

    $('detailBody').innerHTML = `
        <form id="editForm" class="card sec-card">
            <div class="sec-head"><i class="bi bi-pencil-square"></i>Chỉnh sửa hồ sơ: ${escapeHtml(s.code)}</div>
            <div class="info-grid">
                ${field('Mã sinh viên', `<input class="form-control" value="${val(s.code)}" disabled>`)}
                ${field('Họ và tên (*)', `<input class="form-control" id="eName" value="${val(s.fullName)}" maxlength="255">`)}
                ${field('Ngày sinh', `<input type="date" class="form-control" id="eDob" value="${d(s.dateOfBirth)}">`)}
                ${field('Giới tính', `
                    <select class="form-control" id="eGender">
                        <option value="Nam" ${s.gender === 'Nam' ? 'selected' : ''}>Nam</option>
                        <option value="Nữ" ${s.gender === 'Nữ' ? 'selected' : ''}>Nữ</option>
                    </select>`)}
                ${field('Số CCCD/CMND', `<input class="form-control" id="eCccd" value="${val(s.personalIdentificationNumber)}" maxlength="20">`)}
                ${field('Ngày cấp', `<input type="date" class="form-control" id="eIssue" value="${d(s.dateOfIssue)}">`)}
                ${field('Nơi cấp', `<input class="form-control" id="ePlace" value="${val(s.cardPlace)}" maxlength="300">`)}
                ${field('Địa chỉ thường trú', `<input class="form-control" id="eAddress" value="${val(s.address)}" maxlength="300">`)}
                ${field('Địa chỉ hiện tại', `<input class="form-control" id="eCurrent" value="${val(s.currentAddress)}" maxlength="300">`)}
                ${field('Ngày nhập học', `<input type="date" class="form-control" id="eAdmission" value="${d(s.admissionYear)}">`)}
            </div>
            <div class="form-error" id="editError" style="color:var(--red,#dc2626);font-size:13px;margin-top:12px"></div>
            <div class="detail-actions">
                <button type="submit" class="btn-primary" id="editSave"><i class="bi bi-check-circle"></i> Lưu</button>
                <button type="button" class="btn-soft" id="btnCancelEdit">Hủy</button>
            </div>
        </form>`;

    $('btnCancelEdit').addEventListener('click', () => renderDetail(detailStudent));
    $('editForm').addEventListener('submit', (e) => { e.preventDefault(); saveEdit(s); });
}

async function saveEdit(s) {
    const err = $('editError');
    err.textContent = '';
    const v = (id) => $(id).value.trim();
    const orNull = (x) => (x ? x : null);

    if (!v('eName')) { err.textContent = 'Vui lòng nhập họ và tên'; return; }
    const dob = $('eDob').value;
    if (dob && dob > new Date().toISOString().slice(0, 10)) {
        err.textContent = 'Ngày sinh không được nằm trong tương lai';
        return;
    }

    const body = {
        fullName: v('eName'),
        dateOfBirth: orNull(dob),
        gender: $('eGender').value,
        personalIdentificationNumber: orNull(v('eCccd')),
        dateOfIssue: orNull($('eIssue').value),
        cardPlace: orNull(v('ePlace')),
        address: orNull(v('eAddress')),
        currentAddress: orNull(v('eCurrent')),
        admissionYear: $('eAdmission').value ? `${$('eAdmission').value}T00:00:00` : null,
    };

    const btn = $('editSave');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_ENDPOINTS.STUDENTS}/${encodeURIComponent(s.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text()) || `Lỗi HTTP ${res.status}`);
        renderDetail(await res.json());
        toast('Đã lưu thay đổi');
        notifyChanged();
    } catch (ex) {
        err.textContent = ex.message;
        btn.disabled = false;
    }
}