/* =========================================================
   SM University - Quản lý lớp học
   ========================================================= */
const API            = '/api/student_classes';
const STUDENTS_API   = '/api/students';
const EMPLOYEES_API  = '/api/employees';
const ADVISOR_API    = '/api/advisor-classe-sections';
const PAGE_SIZE      = 10;
const STATUS = { on: 'Hoạt động', off: 'Tạm dừng', done: 'Đã đóng' };
const PILL   = { on: 'pill-green', off: 'pill-yellow', done: 'pill-gray' };

let classes = [], students = [], teacherByClass = new Map();
let editing = null, page = 1, filtered = [];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const unwrap = d => Array.isArray(d) ? d : (d && (d.content || d.data || d.items)) || [];
const fmtDate = v => {
    if (!v) return '—';
    const p = String(v).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v;
};
const inClass = (s, c) => s.classCode === c.code;

function toast(msg, type = 'success') {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type === 'error' ? ' error' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 3000);
}

async function getJson(url) {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

/* ========== Tải dữ liệu ========== */
async function loadStudents() {
    try { students = unwrap(await getJson(STUDENTS_API)); }
    catch (e) { console.error('Không tải được sinh viên:', e); students = []; }
}

// GVCN của lớp = phân công đang hoạt động (mới nhất) trong bảng advisor-classe-sections
async function loadTeachers() {
    teacherByClass = new Map();
    try {
        const [emps, adv] = await Promise.all([getJson(EMPLOYEES_API), getJson(ADVISOR_API)]);
        const empName = new Map(unwrap(emps).map(e => [String(e.id).toLowerCase(), e.fullName || e.name]));
        const best = new Map();
        unwrap(adv).forEach(a => {
            const k = String(a.studentClasseId).toLowerCase(), cur = best.get(k);
            if (!cur || (a.isActive && !cur.isActive) ||
                (a.isActive === cur.isActive && new Date(a.startDate) > new Date(cur.startDate))) best.set(k, a);
        });
        best.forEach((a, k) => {
            const n = empName.get(String(a.employeeId).toLowerCase());
            if (n) teacherByClass.set(k, n);
        });
    } catch (e) { console.error('Không tải được giảng viên:', e); }
}

async function loadClasses() {
    let failed = false;
    try {
        const data = unwrap(await getJson(API + '?size=1000'));
        await Promise.all([loadStudents(), loadTeachers()]);
        classes = data.map(c => {
            const m = /(\d{2})/.exec(c.code || '');   // IT26-13 -> 2026 (tạm thời)
            return {
                id: c.id, code: c.code || '', name: c.name || '',
                year: m ? 2000 + Number(m[1]) : 0,
                teacher: teacherByClass.get(String(c.id).toLowerCase()) || '',
                size: students.filter(s => inClass(s, c)).length,
                max: 40,
                status: c.status || 'on'
            };
        });
        classes.sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true }));
    } catch (e) {
        console.error('Không tải được danh sách lớp:', e);
        classes = []; failed = true;
        toast('Không tải được danh sách lớp.', 'error');
    }
    $('syncText').textContent = failed ? 'Đồng bộ thất bại'
        : 'Đồng bộ dữ liệu lúc ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    refresh();
}

/* ========== Giao diện ========== */
function fillFilters() {
    const keepY = $('fYear').value, keepT = $('fTeacher').value;
    $('fYear').innerHTML = '<option value="">Khóa: Tất cả</option>' +
        [...new Set(classes.map(c => c.year))].sort().reverse().map(y => `<option value="${y}">Khóa ${y}</option>`).join('');
    $('fTeacher').innerHTML = '<option value="">GVCN: Tất cả</option>' +
        [...new Set(classes.map(c => c.teacher).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'))
            .map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    $('fYear').value = keepY; $('fTeacher').value = keepT;
}

function renderStats() {
    const total = classes.length, n = s => classes.filter(c => c.status === s).length;
    const pct = v => total ? v / total * 100 : 0;
    const fp = v => pct(v).toFixed(1).replace('.', ',') + '%';
    const sizeSum = classes.reduce((a, c) => a + c.size, 0);
    const cards = [
        ['blue',   'TỔNG SỐ LỚP',     total,       'bi-building',       'bi-globe',          '',          'Toàn trường', total ? 100 : 0],
        ['green',  'ĐANG HOẠT ĐỘNG',  n('on'),     'bi-check-circle',   'bi-graph-up-arrow', fp(n('on')),   'Tỷ lệ trên tổng', pct(n('on'))],
        ['yellow', 'TẠM DỪNG',        n('off'),    'bi-pause-circle',   'bi-clock-history',  fp(n('off')),  'Tỷ lệ trên tổng', pct(n('off'))],
        ['red',    'ĐÃ ĐÓNG',         n('done'),   'bi-lock',           'bi-slash-circle',   fp(n('done')), 'Tỷ lệ trên tổng', pct(n('done'))],
        ['purple', 'TỔNG SĨ SỐ',      sizeSum,     'bi-person-check',   'bi-people',         '',          'Sinh viên đã phân lớp', sizeSum ? 100 : 0]
    ];
    $('stats').innerHTML = cards.map(c => `
        <article class="kpi kpi-${c[0]}">
            <header><span class="kpi-label"><i class="dot"></i>${c[1]}</span><span class="kpi-icon"><i class="bi ${c[3]}"></i></span></header>
            <div class="kpi-value"><span>${c[2].toLocaleString('vi-VN')}</span><small>${c[0] === 'purple' ? 'SV' : 'LỚP'}</small></div>
            <footer>${c[5] ? `<span class="kpi-note"><i class="bi ${c[4]}"></i> <b>${c[5]}</b></span>` : ''}<span>${c[6]}</span></footer>
            <div class="bar"><i style="width:${Math.max(c[7], c[2] ? 3 : 0)}%"></i></div>
        </article>`).join('');
}

function applyFilters() {
    const q = $('fSearch').value.trim().toLowerCase(), st = $('fStatus').value, y = $('fYear').value, t = $('fTeacher').value;
    filtered = classes.map((c, i) => ({ ...c, i })).filter(c =>
        (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) &&
        (!st || c.status === st) && (!y || String(c.year) === y) && (!t || c.teacher === t));
    page = 1;
    renderTable();
}

function renderTable() {
    const total = filtered.length, pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(page, pages);
    const start = (page - 1) * PAGE_SIZE, rows = filtered.slice(start, start + PAGE_SIZE);
    $('shownCount').textContent = rows.length;
    $('totalCount').textContent = total;

    if (!rows.length) {
        $('tbody').innerHTML = '<tr><td colspan="8" class="empty"><i class="bi bi-folder2-open"></i>Không có lớp học phù hợp. Hãy đổi bộ lọc hoặc thêm lớp mới.</td></tr>';
        $('pagerInfo').textContent = 'Hiển thị 0 lớp học';
        $('pagerBtns').innerHTML = '';
        return;
    }
    $('tbody').innerHTML = rows.map((c, k) => `
        <tr>
            <td class="td-stt">${String(start + k + 1).padStart(2, '0')}</td>
            <td><span class="code-tag">${esc(c.code)}</span></td>
            <td><a href="#" class="cname cname-link" data-students="${c.i}">${esc(c.name)}</a></td>
            <td>Khóa ${c.year}<div class="sub">Nhập học ${c.year}</div></td>
            <td>${esc(c.teacher || '—')}</td>
            <td class="size-cell"><b>${c.size}/${c.max}</b><div class="prog-bar"><span style="width:${c.max ? Math.min(100, c.size / c.max * 100) : 0}%"></span></div></td>
            <td><span class="pill ${PILL[c.status] || 'pill-gray'}">${STATUS[c.status] || c.status}</span></td>
            <td style="text-align:right;white-space:nowrap">
                <button class="act" title="Sửa" data-edit="${c.i}"><i class="bi bi-pencil"></i></button>
                <button class="act del" title="Xóa" data-del="${c.i}"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`).join('');

    $('pagerInfo').textContent = `Hiển thị ${start + 1} - ${Math.min(start + PAGE_SIZE, total)} trong tổng số ${total} lớp học`;
    renderPager(pages);
}

function renderPager(pages) {
    const box = $('pagerBtns');
    box.innerHTML = '';
    if (pages <= 1) return;
    const mk = (html, disabled, active, fn) => {
        const b = document.createElement('button');
        b.innerHTML = html; b.disabled = disabled;
        if (active) b.classList.add('active');
        b.onclick = fn; box.appendChild(b);
    };
    mk('<i class="bi bi-chevron-left"></i>', page === 1, false, () => { page--; renderTable(); });
    for (let i = 1; i <= pages; i++) mk(i, false, i === page, () => { page = i; renderTable(); });
    mk('<i class="bi bi-chevron-right"></i>', page === pages, false, () => { page++; renderTable(); });
}

function refresh() { fillFilters(); renderStats(); applyFilters(); }

/* ========== Danh sách sinh viên của lớp ========== */
function openStudents(i) {
    const c = classes[i];
    if (!c) return;
    const rows = students.filter(s => inClass(s, c));
    $('sTitle').textContent = `Sinh viên lớp ${c.code}`;
    $('sSub').textContent = `${c.name} - ${rows.length} sinh viên`;
    $('sBody').innerHTML = rows.length
        ? rows.map((s, k) => `<tr>
            <td class="td-stt">${String(k + 1).padStart(2, '0')}</td>
            <td><span class="code-tag">${esc(s.code)}</span></td>
            <td class="cname">${esc(s.fullName)}</td>
            <td>${fmtDate(s.dateOfBirth)}</td>
            <td>${esc(s.gender || '—')}</td></tr>`).join('')
        : '<tr><td colspan="5" class="empty">Chưa có sinh viên trong lớp này.</td></tr>';
    $('studentDialog').showModal();
}

/* ========== Thêm / sửa / xóa ========== */
function openEdit(i) {
    editing = i;
    const c = i === null ? { code: '', name: '', year: 2026, max: 40, teacher: '', status: 'on' } : classes[i];
    $('modalTitle').textContent = i === null ? 'Thêm lớp học' : 'Sửa lớp học';
    $('mCode').value = c.code; $('mName').value = c.name; $('mYear').value = c.year;
    $('mMax').value = c.max; $('mTeacher').value = c.teacher; $('mStatus').value = c.status; $('mErr').textContent = '';
    $('classDialog').showModal();
}

async function saveClass() {
    const d = { code: $('mCode').value.trim(), name: $('mName').value.trim(), status: $('mStatus').value };
    if (!d.code || !d.name) { $('mErr').textContent = 'Vui lòng nhập mã lớp và tên lớp.'; return; }
    if (classes.some((c, i) => c.code === d.code && i !== editing)) { $('mErr').textContent = 'Mã lớp đã tồn tại.'; return; }
    const isNew = editing === null;
    try {
        const res = await fetch(isNew ? API : `${API}/${classes[editing].id}`, {
            method: isNew ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(d)
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        $('classDialog').close();
        await loadClasses();
        toast(isNew ? 'Đã thêm lớp học.' : 'Đã cập nhật lớp học.');
    } catch (err) {
        $('mErr').textContent = 'Không lưu được: ' + err.message;
    }
}

async function removeClass(i) {
    if (!confirm(`Xóa lớp ${classes[i].code}? Hành động này không thể hoàn tác.`)) return;
    try {
        const res = await fetch(`${API}/${classes[i].id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        await loadClasses();
        toast('Đã xóa lớp học.');
    } catch {
        toast('Không xóa được lớp này (có thể đang có sinh viên thuộc lớp).', 'error');
    }
}

/* ========== Sự kiện ========== */
document.addEventListener('DOMContentLoaded', () => {
    const d = new Date();
    const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    const m = d.getMonth() + 1, y = d.getFullYear();
    const term = m >= 8 ? 'Học kỳ I' : m <= 6 ? 'Học kỳ II' : 'Học kỳ hè';
    const year = m >= 8 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
    $('todayText').textContent = `Hôm nay: ${date.charAt(0).toUpperCase() + date.slice(1)} · ${term}`;
    $('termBadge').textContent = `${term} · ${year}`;

    ['fSearch'].forEach(id => $(id).addEventListener('input', applyFilters));
    ['fStatus', 'fYear', 'fTeacher'].forEach(id => $(id).addEventListener('change', applyFilters));
    $('globalSearch').addEventListener('input', e => { $('fSearch').value = e.target.value; applyFilters(); });
    $('btnReset').addEventListener('click', () => {
        ['fSearch', 'fStatus', 'fYear', 'fTeacher', 'globalSearch'].forEach(id => $(id).value = '');
        applyFilters();
    });

    $('tbody').addEventListener('click', e => {
        const s = e.target.closest('[data-students]'), ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
        if (s) { e.preventDefault(); openStudents(+s.dataset.students); }
        else if (ed) openEdit(+ed.dataset.edit);
        else if (del) removeClass(+del.dataset.del);
    });

    $('btnAdd').addEventListener('click', () => openEdit(null));
    $('btnAddTop').addEventListener('click', () => openEdit(null));
    $('btnSave').addEventListener('click', saveClass);
    document.querySelectorAll('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
    document.querySelectorAll('dialog').forEach(dl => dl.addEventListener('click', e => { if (e.target === dl) dl.close(); }));

    $('btnPrint').addEventListener('click', () => {
        $('printInfo').textContent = `Ngày in: ${new Date().toLocaleDateString('vi-VN')} · ${filtered.length} lớp học`;
        window.print();
    });
    $('btnPrintStudents').addEventListener('click', () => {
        $('sPrintInfo').textContent = `Ngày in: ${new Date().toLocaleDateString('vi-VN')}`;
        document.body.classList.add('print-students');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-students'));

    $('sidebarToggle').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('globalSearch').focus(); }
    });

    loadClasses();
});