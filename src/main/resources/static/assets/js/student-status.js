/* =========================================================
   SM University - Quản lý trạng thái sinh viên
   ---------------------------------------------------------
   Mã SV + Họ tên + Lớp + Khoa luôn lấy từ bảng STUDENT
   (GET /api/students). Bảng trạng thái chỉ lưu tham chiếu
   studentId (UUID hoặc studentCode) để ghép dữ liệu.
   ========================================================= */

const API_STATUS   = '/api/student-status-records';
const API_STUDENTS = '/api/students';
const PAGE_SIZE    = 5;

/* ---------- Danh mục trạng thái ---------- */
const STATUS = {
    HOAT_DONG:  { name: 'Đang học',   pill: 'pill-green',  avatar: 'avatar-green',  icon: 'bi-play-circle',  optLabel: 'Đang học (Trở lại)' },
    BAO_LUU:    { name: 'Bảo lưu',    pill: 'pill-yellow', avatar: 'avatar-yellow', icon: 'bi-pause-circle', optLabel: 'Bảo lưu' },
    THOI_HOC:   { name: 'Thôi học',   pill: 'pill-red',    avatar: 'avatar-red',    icon: 'bi-x-circle',     optLabel: 'Thôi học' },
    TOT_NGHIEP: { name: 'Tốt nghiệp', pill: 'pill-purple', avatar: 'avatar-purple', icon: 'bi-mortarboard',  optLabel: 'Tốt nghiệp' },
    CANH_BAO:   { name: 'Cảnh báo',   pill: 'pill-red',    avatar: 'avatar-red',    icon: 'bi-exclamation-triangle', optLabel: 'Cảnh báo' },
    DINH_CHI:   { name: 'Đình chỉ',   pill: 'pill-gray',   avatar: 'avatar-red',    icon: 'bi-slash-circle', optLabel: 'Đình chỉ' }
};
const SELECTABLE = ['HOAT_DONG', 'BAO_LUU', 'THOI_HOC', 'TOT_NGHIEP'];

const REASONS = {
    HOAT_DONG:  ['Hết hạn bảo lưu, làm thủ tục quay lại học', 'Được phép học lại theo quyết định của nhà trường'],
    BAO_LUU:    ['Bảo lưu kết quả học tập theo đơn', 'Lý do sức khỏe', 'Lý do hoàn cảnh gia đình', 'Nghĩa vụ quân sự'],
    THOI_HOC:   ['Sinh viên tự nguyện xin thôi học', 'Không đủ điều kiện tiếp tục học', 'Hết thời hạn bảo lưu không quay lại'],
    TOT_NGHIEP: ['Hoàn thành chương trình đào tạo', 'Đủ điều kiện xét tốt nghiệp']
};

const STATUS_ALIASES = {
    HOAT_DONG:  ['HOAT_DONG', 'ACTIVE', 'STUDYING', 'DANG_HOC', 'DANG_HOAT_DONG', 'STUDY', 'ENROLLED'],
    BAO_LUU:    ['BAO_LUU', 'RESERVED', 'ON_LEAVE', 'LEAVE', 'DEFERRED', 'HOC_BAO_LUU'],
    THOI_HOC:   ['THOI_HOC', 'DROPPED', 'DROPOUT', 'WITHDRAWN', 'DROPPED_OUT', 'QUIT'],
    TOT_NGHIEP: ['TOT_NGHIEP', 'GRADUATED', 'GRADUATE', 'DA_TOT_NGHIEP'],
    CANH_BAO:   ['CANH_BAO', 'WARNING', 'ACADEMIC_WARNING'],
    DINH_CHI:   ['DINH_CHI', 'SUSPENDED', 'SUSPENSION']
};

/* ---------- State ---------- */
let students = [];
const studentByKey = new Map();
let allRecords = [];   // toàn bộ bản ghi từ API (có thể có bản ghi trùng cũ)
let records = [];      // mỗi sinh viên CHỈ 1 bản ghi (mới nhất)
let seqCounter = 0;
let filtered = [];
let page = 1;
let selected = null;
let newStatus = null;

const $ = id => document.getElementById(id);

/* =========================================================
   Helpers
   ========================================================= */
const pick = (obj, ...keys) => {
    for (const k of keys) if (obj?.[k] !== undefined && obj?.[k] !== null && obj[k] !== '') return obj[k];
    return '';
};
const esc = v => String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const todayISO = () => {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const fmtDate = v => {
    if (!v) return '--';
    const p = String(v).slice(0, 10).split('-');
    return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : v;
};
const initials = name => {
    const w = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return 'SV';
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
};
const st = code => STATUS[code] || { name: code || '--', pill: 'pill-gray', avatar: 'avatar-blue', icon: 'bi-question-circle' };

function normCode(v) {
    if (!v) return '';
    const k = String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
        .toUpperCase().trim().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
    for (const [code, list] of Object.entries(STATUS_ALIASES)) if (list.includes(k)) return code;
    return k;
}

function toast(msg, type = 'success') {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type === 'error' ? ' error' : '');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 3000);
}

/* =========================================================
   Chuẩn hóa dữ liệu — Mã SV & Họ tên lấy từ bảng Student
   ========================================================= */
function normalizeStudent(s) {
    return {
        id:          pick(s, 'id', 'studentId', 'student_id'),
        studentCode: pick(s, 'studentCode', 'student_code', 'code', 'maSinhVien', 'ma_sinh_vien'),
        fullName:    pick(s, 'fullName', 'full_name', 'name', 'studentName', 'student_name'),
        className:   pick(s, 'className', 'class_name', 'classCode', 'class_code', 'lop', 'lopHanhChinh'),
        faculty:     pick(s, 'facultyName', 'faculty_name', 'faculty', 'majorName', 'major_name', 'major', 'nganh'),
        status:      pick(s, 'status', 'statusCode', 'status_code'),
        joinedDate:  String(pick(s, 'createdAt', 'created_at', 'admissionYear', 'admission_year', 'admissionDate')).slice(0, 10)
    };
}

function indexStudents(list) {
    students = list.map(normalizeStudent);
    studentByKey.clear();
    students.forEach(s => {
        [s.id, s.studentCode].forEach(k => {
            if (k) studentByKey.set(String(k).trim().toLowerCase(), s);
        });
    });
}
const findStudent = ref => ref ? (studentByKey.get(String(ref).trim().toLowerCase()) || null) : null;

function normalizeRecord(r) {
    const ref = pick(r, 'studentId', 'student_id', 'studentCode', 'student_code', 'studentUuid');
    const nested = r.student || r.studentEntity || r.studentInfo;
    const stu = nested ? normalizeStudent(nested) : findStudent(ref);

    return {
        id:             r.id || crypto.randomUUID(),
        persisted:      !!r.id,
        seq:            ++seqCounter,
        stamp:          String(pick(r, 'updatedAt', 'updated_at', 'modifiedAt', 'createdAt', 'created_at')),
        studentRef:     ref,
        studentCode:    stu?.studentCode || '',
        studentName:    stu?.fullName || '',
        className:      stu?.className || '',
        faculty:        stu?.faculty || '',
        previousStatus: normCode(pick(r, 'previousStatus', 'previous_status', 'oldStatus', 'old_status', 'fromStatus')) || 'HOAT_DONG',
        statusCode:     normCode(pick(r, 'statusCode', 'status_code', 'status', 'newStatus', 'new_status', 'toStatus')),
        startDate:      pick(r, 'startDate', 'start_date', 'effectiveDate', 'effective_date'),
        decisionNo:     pick(r, 'decisionNo', 'decision_no'),
        description:    pick(r, 'description')
    };
}

/* Bản ghi a có "mới hơn" b không: ngày hiệu lực -> thời điểm cập nhật -> thứ tự */
const isNewer = (a, b) => {
    const d = String(a.startDate).localeCompare(String(b.startDate));
    if (d) return d > 0;
    const t = String(a.stamp).localeCompare(String(b.stamp));
    if (t) return t > 0;
    return a.seq > b.seq;
};
const studentKeyOfRecord = r => {
    const stu = findStudent(r.studentRef);
    return String(stu ? (stu.id || stu.studentCode) : r.studentRef).toLowerCase();
};
const ownsRecord = (stu, r) => stu && studentKeyOfRecord(r) === String(stu.id || stu.studentCode).toLowerCase();

/* Mỗi sinh viên chỉ giữ 1 bản ghi mới nhất */
function dedupeRecords(list) {
    const m = new Map();
    list.forEach(r => {
        const k = studentKeyOfRecord(r);
        const cur = m.get(k);
        if (!cur || isNewer(r, cur)) m.set(k, r);
    });
    return [...m.values()];
}

function latestRecordOf(stu) {
    if (!stu) return null;
    const keys = [stu.id, stu.studentCode].filter(Boolean).map(k => String(k).toLowerCase());
    return records
        .filter(r => keys.includes(String(r.studentRef).toLowerCase()))
        .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)))[0] || null;
}
const currentStatusOf = stu => latestRecordOf(stu)?.statusCode || 'HOAT_DONG';
const sortRecords = () => records.sort((a, b) => isNewer(a, b) ? -1 : 1);

/* Sinh viên có trong bảng Student nhưng CHƯA có hồ sơ trạng thái (vừa được thêm mới)
   -> tạo hồ sơ "ảo" mặc định theo students.status (thường là Đang học) để hiện ngay trong bảng.
   Khi bấm "Lưu cập nhật" hồ sơ này sẽ được POST thành bản ghi thật (persisted = false). */
function virtualRecordOf(s) {
    const code = normCode(s.status);
    return {
        id:             'virtual-' + (s.id || s.studentCode),
        persisted:      false,
        virtual:        true,
        seq:            ++seqCounter,
        stamp:          s.joinedDate || '',
        studentRef:     s.id || s.studentCode,
        studentCode:    s.studentCode,
        studentName:    s.fullName,
        className:      s.className,
        faculty:        s.faculty,
        previousStatus: 'HOAT_DONG',
        statusCode:     STATUS[code] ? code : 'HOAT_DONG',
        startDate:      s.joinedDate || todayISO(),
        decisionNo:     '',
        description:    ''
    };
}

/* records = 1 hồ sơ mới nhất / sinh viên  +  hồ sơ ảo cho sinh viên chưa có hồ sơ */
function rebuildRecords() {
    const list = dedupeRecords(allRecords);
    const covered = new Set(list.map(studentKeyOfRecord));
    students.forEach(s => {
        const key = String(s.id || s.studentCode || '').toLowerCase();
        if (key && !covered.has(key)) list.push(virtualRecordOf(s));
    });
    records = list;
    sortRecords();
}

/* =========================================================
   Load dữ liệu
   ========================================================= */
async function fetchList(url) {
    try {
        const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
        if (!res.ok) { console.error('GET ' + url + ' -> HTTP ' + res.status); return null; }
        const data = await res.json();
        return Array.isArray(data) ? data : (Array.isArray(data.content) ? data.content : null);
    } catch (e) { console.error('Không gọi được ' + url, e); return null; }
}

let loading = false;
const keyOfStudent = s => String(s.id || s.studentCode || '').toLowerCase();

/* silent = true: lần tự làm mới (không đụng tới form, giữ nguyên trang đang xem, lỗi thì bỏ qua) */
async function loadData(silent = false) {
    if (loading) return;
    loading = true;
    try {
        const stuList = await fetchList(API_STUDENTS);
        const raw = await fetchList(API_STATUS);
        if (silent && (!stuList || !raw)) return;

        const knownBefore = new Set(students.map(keyOfStudent));
        const prevStatus = selected ? currentStatusOf(selected) : null;
        const prevPage = page;

        indexStudents(stuList || []);

        if (!silent) {
            if (raw && raw[0]) console.log('[student-status] Bản ghi mẫu từ API:', raw[0]);
            if (students[0]) console.log('[student-status] Sinh viên mẫu từ API:', students[0]);
        }

        allRecords = (raw || []).map(normalizeRecord);
        rebuildRecords();

        if (!silent) {
            const codes = {};
            records.forEach(r => { const k = r.statusCode || '(trống)'; codes[k] = (codes[k] || 0) + 1; });
            console.log('[student-status] Số hồ sơ theo mã trạng thái:', codes);
            const virtual = records.filter(r => r.virtual).length;
            if (virtual) console.log('[student-status] ' + virtual + ' sinh viên chưa có hồ sơ trạng thái -> hiển thị mặc định.');
            const missing = records.filter(r => !r.studentCode).length;
            if (missing) console.warn('[student-status] ' + missing + '/' + records.length + ' hồ sơ không ghép được sinh viên (studentId không khớp bảng Student)');
        }

        fillFacultyFilter();
        applyFilters();
        if (silent) { page = prevPage; renderTable(); }
        updateKpis();

        if (!stuList || !raw) {
            const bad = [!stuList && API_STUDENTS, !raw && API_STATUS].filter(Boolean).join(' và ');
            $('dataBody').innerHTML = `<tr><td colspan="6" class="empty"><i class="bi bi-exclamation-triangle"></i>Không tải được dữ liệu từ ${esc(bad)}.<br>Mở F12 → Console / Network để xem lỗi chi tiết.</td></tr>`;
            $('pagerInfo').textContent = 'Lỗi tải dữ liệu';
            $('syncText').textContent = 'Đồng bộ thất bại';
            toast('Lỗi API: ' + bad, 'error');
            return;
        }

        if (selected) {
            // đối tượng sinh viên đã được tạo lại -> trỏ lại; nếu trạng thái đổi từ nơi khác thì cập nhật phiếu
            selected = findStudent(selected.id || selected.studentCode) || selected;
            if (silent && currentStatusOf(selected) !== prevStatus) selectStudent(selected);
        } else if (records.length) {
            selectStudent(findStudent(records[0].studentRef));
        }

        if (silent && knownBefore.size) {
            const added = students.filter(s => !knownBefore.has(keyOfStudent(s))).length;
            if (added) toast('Đã tự động thêm ' + added + ' sinh viên mới vào danh sách.');
        }

        $('syncText').textContent = 'Đồng bộ dữ liệu lúc ' +
            new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } finally {
        loading = false;
    }
}

/* Tự động làm mới khi: định kỳ, quay lại tab, hoặc trang Sinh viên báo vừa thêm (BroadcastChannel) */
const AUTO_REFRESH_MS = 15000;
function startAutoRefresh() {
    const refresh = () => { if (!document.hidden) loadData(true); };
    setInterval(refresh, AUTO_REFRESH_MS);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    if ('BroadcastChannel' in window) new BroadcastChannel('sm-students').onmessage = refresh;
    window.addEventListener('storage', e => { if (e.key === 'sm-students-changed') refresh(); });
}

/* =========================================================
   KPI
   ========================================================= */
function updateKpis() {
    const arr = records; // đã là 1 bản ghi / sinh viên
    const total = Math.max(arr.length, 1);
    const count = codes => arr.filter(r => codes.includes(r.statusCode)).length;

    setKpi('Study', count(['HOAT_DONG']), total);
    setKpi('Save',  count(['BAO_LUU']), total);
    setKpi('Warn',  count(['THOI_HOC', 'CANH_BAO', 'DINH_CHI']), total);
    setKpi('Grad',  count(['TOT_NGHIEP']), total);
}
function setKpi(key, n, total) {
    const pct = Math.round(n / total * 1000) / 10;
    $('kpi' + key).textContent = n.toLocaleString('vi-VN');
    $('pct' + key).textContent = pct.toString().replace('.', ',') + '%';
    $('bar' + key).style.width = Math.max(pct, n ? 3 : 0) + '%';
}

/* =========================================================
   Bộ lọc + bảng
   ========================================================= */
function fillFacultyFilter() {
    const values = [...new Set(records.map(r => r.faculty).filter(Boolean))].sort();
    const cur = $('facultyFilter').value;
    $('facultyFilter').innerHTML = '<option value="ALL">Khoa / Viện: Tất cả</option>' +
        values.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
    if (values.includes(cur)) $('facultyFilter').value = cur;
}

function applyFilters() {
    const q = $('searchInput').value.trim().toLowerCase();
    const type = $('typeFilter').value;
    const fac = $('facultyFilter').value;
    const from = $('dateFrom').value;
    const to = $('dateTo').value;

    filtered = records.filter(r => {
        const text = [r.studentCode, r.studentName, r.className, r.decisionNo, st(r.statusCode).name].join(' ').toLowerCase();
        return (!q || text.includes(q))
            && (type === 'ALL' || r.statusCode === type)
            && (fac === 'ALL' || r.faculty === fac)
            && (!from || r.startDate >= from)
            && (!to || r.startDate <= to);
    });
    page = 1;
    renderTable();
}

function renderTable() {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.min(page, pages);
    const start = (page - 1) * PAGE_SIZE;
    const rows = filtered.slice(start, start + PAGE_SIZE);

    $('shownCount').textContent = rows.length;
    $('totalCount').textContent = total;

    if (!rows.length) {
        $('dataBody').innerHTML = `<tr><td colspan="6" class="empty"><i class="bi bi-folder2-open"></i>Không tìm thấy hồ sơ phù hợp.</td></tr>`;
        $('pagerInfo').textContent = 'Hiển thị 0 hồ sơ';
        $('pagerBtns').innerHTML = '';
        return;
    }

    $('dataBody').innerHTML = rows.map((r, i) => {
        const prev = st(r.previousStatus), cur = st(r.statusCode);
        const name = r.studentName || 'Chưa tìm thấy sinh viên';
        const isSel = selected && [selected.id, selected.studentCode].map(String).includes(String(r.studentRef));
        return `
        <tr data-ref="${esc(r.studentRef)}" class="${isSel ? 'is-selected' : ''}">
            <td class="td-stt">${String(start + i + 1).padStart(2, '0')}</td>
            <td>
                <div class="stu">
                    <div class="avatar ${cur.avatar}">${esc(initials(name))}</div>
                    <div><b>${esc(name)}</b><small>${esc(r.studentCode || '--')}</small></div>
                </div>
            </td>
            <td><span class="class-chip">${esc(r.className || '--')}</span></td>
            <td>
                <div class="transition">
                    <span class="pill ${prev.pill}">${esc(prev.name)}</span>
                    <i class="bi bi-arrow-right"></i>
                    <span class="pill ${cur.pill}">${esc(cur.name)}</span>
                </div>
            </td>
            <td class="td-date">${fmtDate(r.startDate)}</td>
            <td><span class="decision"><i class="bi bi-file-earmark-text"></i>${esc(r.decisionNo || '--')}</span></td>
        </tr>`;
    }).join('');

    $('pagerInfo').textContent = `Hiển thị ${start + 1} - ${Math.min(start + PAGE_SIZE, total)} trong tổng số ${total} hồ sơ`;
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

/* =========================================================
   Phiếu cập nhật trạng thái
   ========================================================= */
function selectStudent(stu) {
    selected = stu || null;
    const cur = currentStatusOf(stu);

    $('selAvatar').textContent = stu ? initials(stu.fullName) : 'SV';
    $('selName').textContent = stu ? stu.fullName : 'Chưa chọn sinh viên';
    $('selCode').textContent = stu ? `${stu.studentCode} • ${stu.className || '--'}` : 'Chọn từ bảng hoặc tra cứu MSSV';
    const pill = $('selStatus');
    pill.textContent = stu ? st(cur).name : '--';
    pill.className = 'pill ' + (stu ? st(cur).pill : 'pill-gray');

    renderStatusOptions(cur);
    renderTable();
}

function renderStatusOptions(current) {
    const opts = SELECTABLE.filter(c => c !== current);
    if (!opts.includes(newStatus)) newStatus = opts[0] || null;

    $('statusOptions').innerHTML = opts.map(c => `
        <button type="button" class="status-option ${c === newStatus ? 'selected' : ''}" data-status="${c}">
            <i class="bi ${STATUS[c].icon}"></i>${esc(STATUS[c].optLabel).replace(' (', '<br>(')}
        </button>`).join('');

    fillReasons();
    updateRule();
}

function fillReasons() {
    $('fReason').innerHTML = (REASONS[newStatus] || [])
        .map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
}

function updateRule() {
    const box = $('ruleBox');
    box.classList.toggle('danger', newStatus === 'THOI_HOC');
    box.querySelector('p').innerHTML = newStatus === 'THOI_HOC'
        ? '<b>Lưu ý:</b> Thôi học là quyết định khó hoàn tác. Cần có đơn hoặc quyết định của Hội đồng kèm theo.'
        : newStatus === 'TOT_NGHIEP'
            ? '<b>Lưu ý:</b> Chỉ chuyển Tốt nghiệp khi sinh viên đã hoàn thành đủ tín chỉ và được Hội đồng xét tốt nghiệp thông qua.'
            : '<b>Quy tắc học vụ:</b> Sinh viên bảo lưu tối đa 2 học kỳ liên tiếp. Sau thời hạn nếu không có đơn sẽ tự động chuyển trạng thái Thôi học.';
}

function resetForm() {
    $('fDate').value = todayISO();
    $('fDecision').value = '';
    $('fNote').value = '';
    renderStatusOptions(currentStatusOf(selected));
}

async function submitUpdate() {
    if (!selected) return toast('Vui lòng chọn sinh viên áp dụng.', 'error');
    if (!newStatus) return toast('Vui lòng chọn trạng thái mới.', 'error');

    const startDate = $('fDate').value;
    const reason = $('fReason').value;
    if (!startDate || !reason) return toast('Vui lòng nhập ngày hiệu lực và lý do điều chỉnh.', 'error');

    const existing = latestRecordOf(selected);
    const payload = {
        studentId: selected.id || selected.studentCode,
        previousStatus: currentStatusOf(selected),
        statusCode: newStatus,
        statusName: st(newStatus).name,
        startDate,
        decisionNo: $('fDecision').value.trim(),
        description: [reason, $('fNote').value.trim()].filter(Boolean).join(' - '),
        isActive: newStatus !== 'TOT_NGHIEP'
    };

    // Đã có hồ sơ -> CẬP NHẬT hồ sơ đó (PUT). Chưa có -> tạo mới (POST).
    let url = API_STATUS, method = 'POST';
    if (existing?.persisted) {
        url = API_STATUS + '/' + encodeURIComponent(existing.id);
        method = 'PUT';
        payload.id = existing.id;
    }

    let body = null;
    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const hint = (method === 'PUT' && (res.status === 404 || res.status === 405))
                ? ' Backend chưa có endpoint PUT ' + API_STATUS + '/{id}.' : '';
            return toast('Lưu thất bại (HTTP ' + res.status + ').' + hint, 'error');
        }
        body = await res.json().catch(() => null);
    } catch (e) {
        return toast('Không kết nối được máy chủ. Dữ liệu chưa được lưu.', 'error');
    }

    const saved = normalizeRecord({ ...payload, ...(body && typeof body === 'object' ? body : {}),
                                    id: body?.id || payload.id });

    // Dọn các bản ghi trùng cũ của cùng sinh viên (mỗi SV chỉ còn 1 hồ sơ)
    const stale = allRecords.filter(r => ownsRecord(selected, r) && r.persisted && r.id !== saved.id);
    const results = await Promise.allSettled(stale.map(r =>
        fetch(API_STATUS + '/' + encodeURIComponent(r.id), { method: 'DELETE' })
            .then(x => { if (!x.ok) throw new Error(x.status); return r.id; })));
    const removed = new Set(results.filter(x => x.status === 'fulfilled').map(x => x.value));
    const failed = stale.length - removed.size;

    allRecords = allRecords.filter(r => !removed.has(r.id) && r.id !== saved.id);
    allRecords.push(saved);
    rebuildRecords();

    fillFacultyFilter();
    applyFilters();
    updateKpis();
    selectStudent(selected);
    resetForm();
    toast(failed
        ? 'Đã cập nhật, nhưng chưa xóa được ' + failed + ' bản ghi trùng cũ trong DB.'
        : 'Đã cập nhật trạng thái sinh viên.');
}

/* ---------- Tra cứu MSSV khác (lấy từ bảng Student) ---------- */
function lookupStudent() {
    const q = $('studentLookup').value.trim().toLowerCase();
    const box = $('suggestBox');
    if (!q) { box.innerHTML = ''; return; }

    const hits = students
        .filter(s => `${s.studentCode} ${s.fullName} ${s.className}`.toLowerCase().includes(q))
        .slice(0, 6);

    box.innerHTML = hits.length
        ? hits.map(s => `
            <button type="button" data-code="${esc(s.studentCode)}">
                <span class="avatar avatar-blue">${esc(initials(s.fullName))}</span>
                <span><b>${esc(s.fullName)}</b><small>${esc(s.studentCode)} • ${esc(s.className || '--')}</small></span>
            </button>`).join('')
        : '<div class="none">Không tìm thấy sinh viên.</div>';
}

/* =========================================================
   Xuất file
   ========================================================= */
function exportExcel() {
    const head = ['STT', 'Mã SV', 'Họ và tên', 'Lớp HC', 'Trạng thái cũ', 'Trạng thái mới', 'Ngày hiệu lực', 'Quyết định số'];
    const rows = filtered.map((r, i) => [
        i + 1, r.studentCode, r.studentName, r.className,
        st(r.previousStatus).name, st(r.statusCode).name, fmtDate(r.startDate), r.decisionNo
    ]);
    const table = '<table border="1"><tr>' + head.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>' +
        rows.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('') + '</table>';

    const blob = new Blob(['\ufeff<html><head><meta charset="UTF-8"></head><body><h3>Danh sách biến động trạng thái sinh viên</h3>' + table + '</body></html>'],
        { type: 'application/vnd.ms-excel;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `trang-thai-sinh-vien-${todayISO()}.xls`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Đã xuất file Excel.');
}

/* =========================================================
   Header: ngày + học kỳ
   ========================================================= */
function renderToday() {
    const d = new Date();
    const date = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    const m = d.getMonth() + 1, y = d.getFullYear();
    let term, year;
    if (m >= 8)      { term = 'Học kỳ I';  year = `${y}/${y + 1}`; }
    else if (m <= 6) { term = 'Học kỳ II'; year = `${y - 1}/${y}`; }
    else             { term = 'Học kỳ hè'; year = `${y - 1}/${y}`; }

    $('todayText').textContent = `Hôm nay: ${date.charAt(0).toUpperCase() + date.slice(1)} · ${term}`;
    $('termBadge').textContent = `${term} · ${year}`;
}

/* =========================================================
   Events
   ========================================================= */
document.addEventListener('DOMContentLoaded', () => {
    renderToday();
    $('fDate').value = todayISO();

    ['searchInput', 'dateFrom', 'dateTo'].forEach(id => $(id).addEventListener('input', applyFilters));
    ['typeFilter', 'facultyFilter'].forEach(id => $(id).addEventListener('change', applyFilters));
    $('globalSearch').addEventListener('input', e => { $('searchInput').value = e.target.value; applyFilters(); });
    $('btnFilterMore').addEventListener('click', () => { $('advancedFilters').hidden = !$('advancedFilters').hidden; });
    $('btnClearFilters').addEventListener('click', () => {
        $('searchInput').value = ''; $('globalSearch').value = '';
        $('dateFrom').value = ''; $('dateTo').value = '';
        $('typeFilter').value = 'ALL'; $('facultyFilter').value = 'ALL';
        applyFilters();
    });

    $('dataBody').addEventListener('click', e => {
        const tr = e.target.closest('tr[data-ref]');
        if (tr) selectStudent(findStudent(tr.dataset.ref));
    });

    $('statusOptions').addEventListener('click', e => {
        const b = e.target.closest('.status-option');
        if (!b) return;
        newStatus = b.dataset.status;
        document.querySelectorAll('.status-option').forEach(x => x.classList.toggle('selected', x === b));
        fillReasons(); updateRule();
    });

    $('lookupLink').addEventListener('click', e => {
        e.preventDefault();
        $('lookupBox').hidden = !$('lookupBox').hidden;
        if (!$('lookupBox').hidden) $('studentLookup').focus();
    });
    $('studentLookup').addEventListener('input', lookupStudent);
    $('suggestBox').addEventListener('click', e => {
        const b = e.target.closest('button[data-code]');
        if (!b) return;
        selectStudent(findStudent(b.dataset.code));
        $('studentLookup').value = ''; $('suggestBox').innerHTML = ''; $('lookupBox').hidden = true;
    });

    const focusPanel = () => {
        $('updatePanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        $('lookupBox').hidden = false; $('studentLookup').focus();
    };
    $('btnUpdateStatus').addEventListener('click', focusPanel);
    $('btnAddNew').addEventListener('click', focusPanel);
    $('btnSubmit').addEventListener('click', submitUpdate);
    $('btnReset').addEventListener('click', resetForm);

    $('btnExport').addEventListener('click', e => { e.stopPropagation(); $('exportDropdown').classList.toggle('open'); });
    $('exportMenu').addEventListener('click', e => {
        const b = e.target.closest('button[data-export]');
        if (!b) return;
        $('exportDropdown').classList.remove('open');
        b.dataset.export === 'excel' ? exportExcel() : window.print();
    });
    document.addEventListener('click', () => $('exportDropdown').classList.remove('open'));

    $('sidebarToggle').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault(); $('globalSearch').focus();
        }
    });

    loadData();
    startAutoRefresh();
});