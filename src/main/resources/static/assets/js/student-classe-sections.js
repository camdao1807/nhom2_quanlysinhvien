/* ===== Logic trang Phân lớp sinh viên (lấy dữ liệu từ bảng students) ===== */
(function () {
    /* ------------------------------------------------------------
       CẤU HÌNH API - đổi cho đúng với backend của bạn.
       Hãy mở file JS của trang index.html (Quản lý sinh viên), xem nó
       gọi fetch('...') tới URL nào rồi dán URL đó vào studentsUrl.
       ------------------------------------------------------------ */
    const API = {
        studentsUrl: '/api/students',          // GET: danh sách bảng students
        classesUrls: ['/api/student-classes', '/api/student_classes', '/api/studentClasses', '/api/student-classe', '/api/classes'], // GET: bảng student_classes (thử lần lượt)
        advisorUrls: ['/api/advisor_classe_sections', '/api/advisor-classe-sections', '/api/advisorClasseSections', '/api/advisor-class-sections', '/api/advisor_class_sections'], // GET: bảng phân công GV/CVHT (lấy tên CVHT cho từng lớp)
        employeeUrls: ['/api/employees', '/api/advisors', '/api/lecturers', '/api/teachers'], // GET: danh sách giảng viên (nếu bảng phân công chỉ có mã GV)
        advisorScripts: ['/assets/js/advisor-classe-sections.js'], // JS của trang Phân công GV/CVHT: đọc ra URL API thật nó đang gọi
        // POST: gán danh sách sinh viên vào lớp (cập nhật students.student_classe_id)
        assign: function (studentIds, classId) {
            return fetch('/api/students/assign-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds: studentIds, studentClasseId: classId })
            }).then(function (r) {
                if (r.ok) return;
                return r.text().then(function (t) {
                    const err = new Error('HTTP ' + r.status + (t ? ' - ' + t.slice(0, 220) : ''));
                    err.status = r.status;
                    err.body = t || '';
                    console.error('[Phân lớp] POST /api/students/assign-class lỗi', r.status, t);
                    throw err;
                });
            });
        }
    };
    const DEFAULT_CAPACITY = 40;   // [ĐỔI] 70 -> 40, khớp với trang Lớp học
    const PAGE_SIZE = 10;   // số sinh viên mỗi trang

    /* ---------- Chuẩn hóa dữ liệu (nhận cả camelCase lẫn snake_case) ---------- */
    const pick = function (o) {
        for (let i = 1; i < arguments.length; i++) {
            const v = o[arguments[i]];
            if (v !== undefined && v !== null) return v;
        }
        return undefined;
    };
    const unwrap = (r) => Array.isArray(r) ? r : (r && (r.content || r.data || r.items || r.result)) || [];
    const fmtDate = (v) => {
        if (!v) return '—';
        const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
        return m ? m[3] + '/' + m[2] + '/' + m[1] : String(v);
    };
    const toSex = (v) => {
        const t = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
        return ['f', 'female', 'nu', 'nữ', '0', 'false'].includes(t) ? 'Nữ' : 'Nam';
    };

    // Gom mọi giá trị tham chiếu tới lớp của sinh viên (id lớp, mã lớp, tên lớp...), bất kể API đặt tên field thế nào
    function collectClassRefs(r) {
        const refs = [];
        const add = (v) => {
            if ((typeof v === 'string' && v.trim() !== '') || (typeof v === 'number' && v !== 0)) refs.push(String(v).trim());
        };
        // Nếu bản ghi có object lớp lồng nhau (vd studentClass: {id, code, name}) thì chỉ dùng nó,
        // tránh đếm trùng với các trường phẳng như classCode / className
        const nestedKey = Object.keys(r).find(function (k) {
            return /class|classe|lop/i.test(k) && !/size|count|year|leader|total/i.test(k) && r[k] && typeof r[k] === 'object';
        });
        if (nestedKey) {
            const v = r[nestedKey];
            add(v.id); add(v.code); add(v.name);
            return refs;
        }
        Object.keys(r).forEach(function (k) {
            if (!/class|classe|lop/i.test(k) || /size|count|year|leader|total/i.test(k)) return;
            const v = r[k];
            if (v && typeof v === 'object') { add(v.id); add(v.code); add(v.name); } else add(v);
        });
        return refs;
    }

    function normStudent(r) {
        const majorId = pick(r, 'majorId', 'major_id');
        const active = pick(r, 'isActive', 'is_active');
        const rawYear = pick(r, 'admissionYear', 'admission_year');
        const ym = rawYear !== undefined ? String(rawYear).match(/^(\d{4})/) : null;   // chấp nhận 2026 lẫn 2026-09-05T00:00:00
        const majorObj = r.major && typeof r.major === 'object' ? r.major : null;
        const major = pick(r, 'majorName', 'major_name', 'majorTitle') ||
            (majorObj && (majorObj.name || majorObj.majorName || majorObj.code)) ||
            (typeof r.major === 'string' ? r.major : '') ||
            pick(r, 'majorCode', 'major_code') ||
            (majorId !== undefined ? 'Ngành #' + majorId : '—');
        return {
            id: pick(r, 'id'),
            raw: r,
            code: String(pick(r, 'code', 'studentCode') || ''),
            name: pick(r, 'fullName', 'full_name', 'name') || '(chưa có tên)',
            sex: toSex(pick(r, 'gender', 'sex')),
            dob: fmtDate(pick(r, 'dateOfBirth', 'date_of_birth')),
            major: major,
            year: ym ? Number(ym[1]) : null,
            address: pick(r, 'address', 'currentAddress', 'current_address') || '—',
            refs: collectClassRefs(r),
            deleted: !!pick(r, 'deletedAt', 'deleted_at'),
            active: !(active === false || active === 0)
        };
    }

    const scanKey = (o, re, test) => { for (const k of Object.keys(o)) { if (re.test(k) && test(o[k])) return o[k]; } };
    const isStr = (v) => typeof v === 'string' && v.trim() !== '';
    const isNum = (v) => typeof v === 'number' && v > 0;

    function normClass(c, i) {
        const emp = c.employee || c.advisor || c.homeroomTeacher || c.teacher || c.gvcn || {};
        const empId = pick(c, 'employeeId', 'employee_id');
        const name = pick(c, 'name', 'className');
        const code = String(pick(c, 'code', 'classCode') || name || ('Lớp #' + pick(c, 'id')));
        const act = pick(c, 'isActive', 'is_active');
        const advisor = pick(c, 'employeeName', 'advisorName', 'advisor_name', 'homeroomTeacherName', 'gvcn', 'gvcnName', 'teacherName', 'cvhtName') ||
            emp.fullName || emp.full_name || emp.name || emp.employeeName ||
            scanKey(c, /(advisor|gvcn|cvht|teacher|homeroom|lecturer|employee|instructor).*(name|ten)|^(gvcn|cvht|advisor|teacher|homeroom|lecturer)$/i, isStr);
        // [ĐỔI] ưu tiên maxSize (sĩ số tối đa đặt ở trang Lớp học), bỏ bước đoán tên trường
        const max = Number(pick(c, 'maxSize', 'max_size', 'maxStudents', 'max_students', 'capacity', 'quota', 'maxCapacity')) || DEFAULT_CAPACITY;
        const id = pick(c, 'id');
        return {
            id: id,
            code: code,
            fullName: name ? String(name) : '',
            name: name && String(name) !== code ? String(name) : '',
            keys: [String(id), code, name ? String(name) : ''].filter(Boolean),
            cvht: advisor || (empId !== undefined ? 'Mã GV #' + empId : 'Chưa phân công'),
            max: max,
            hasAdvisor: !!advisor,
            empId: empId,
            deleted: !!pick(c, 'deletedAt', 'deleted_at'),
            active: !(act === false || act === 0),
            icon: ['bi-mortarboard', 'bi-mortarboard-fill', 'bi-terminal', 'bi-braces', 'bi-database'][i % 5]
        };
    }

    function init() {
        // Ngày hôm nay trên thanh trên cùng
        const todayEl = document.getElementById('todayText');
        if (todayEl) {
            const d = new Date();
            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            todayEl.textContent = days[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
        }

        // Tự nạp CSS cho trang (không phụ thuộc file CSS ngoài, không cần Bootstrap utilities)
        (function injectStyles() {
            if (document.getElementById('sectionsInjectedStyle')) return;
            const st = document.createElement('style');
            st.id = 'sectionsInjectedStyle';
            st.textContent = `
/* --- Phân trang --- */
.card-footer{background:#fff;border-top:1px solid #eef1f7;padding:1rem 1.4rem}
#pagingInfo{color:#6c7693;font-size:.95rem}
ul.pagination{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0;padding:0;list-style:none}
ul.pagination .page-item{list-style:none;margin:0;padding:0}
ul.pagination .page-link{width:38px;height:38px;padding:0;margin:0;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #e3e7ee;border-radius:8px;color:#4a5575;font-size:.95rem;text-decoration:none;box-shadow:none;cursor:pointer}
ul.pagination .page-link:hover{background:#f4f7fc;color:#1b2559}
ul.pagination .page-item.active .page-link{background:#1a63d6;border-color:#1a63d6;color:#fff;font-weight:600}
ul.pagination .page-item.disabled .page-link{background:#fff;border-color:#eef1f6;color:#c3cad8;pointer-events:none}

/* --- Bảng sinh viên --- */
.stu-cell{display:flex;align-items:center;gap:10px}
.avatar-sq{width:40px;height:40px;border-radius:10px;color:#fff;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
.person-name{font-weight:700;color:#1b2559}
.code-pill{display:inline-block;background:#e3ecff;color:#2b5fd0;font-family:ui-monospace,Menlo,monospace;font-weight:700;font-size:.8rem;border-radius:6px;padding:4px 9px;white-space:nowrap}
.status-pill{display:inline-block;font-size:.78rem;font-weight:700;border-radius:20px;padding:5px 12px;color:#fff;white-space:nowrap}
.status-wait{background:#dc3545}
.status-temp{background:#0d6efd}
tr.row-selected td{background:#eaf1ff}
.empty-state{text-align:center;padding:2.5rem 1rem;color:#6c7693}
.empty-state i{display:block;font-size:2rem;margin-bottom:.5rem;opacity:.5}

/* --- Thẻ lớp tiếp nhận --- */
.cc{background:#fff;border:1px solid #e8ecf3;border-radius:16px;padding:14px 16px;margin-bottom:12px;cursor:pointer;box-shadow:0 2px 10px rgba(20,30,70,.05);transition:border-color .15s,box-shadow .15s}
.cc:hover{border-color:#b9c9ee}
.cc.target{border:2px solid #0d6efd;padding:13px 15px;box-shadow:0 6px 18px rgba(13,110,253,.15)}
.cc:focus-visible{outline:2px solid #0d6efd;outline-offset:2px}
.cc-empty{cursor:default;color:#6c7693;font-size:.9rem}
.cc-top{display:flex;align-items:flex-start;gap:10px}
.cc-ico{width:40px;height:40px;border-radius:10px;background:#eceff4;color:#4a5575;display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0}
.cc.target .cc-ico{background:#0d6efd;color:#fff}
.cc-title{flex:1;min-width:0}
.cc-code{font-weight:800;font-size:1.02rem;color:#1b2559;line-height:1.25}
.cc-code small{font-weight:400;color:#6c7693;font-size:.8rem;margin-left:4px}
.cc-advisor{font-size:.82rem;color:#6c7693;margin-top:2px}
.cc-advisor strong{color:#1b2559}
.cc-side{text-align:right;flex-shrink:0}
.cc-side small{display:block;color:#6c7693;font-size:.72rem}
.cc-tag{display:inline-block;font-size:.68rem;font-weight:700;border-radius:6px;padding:2px 8px;color:#fff;white-space:nowrap}
.cc-tag-primary{background:#0d6efd}
.cc-tag-danger{background:#dc3545}
.cc-tag-success{background:#198754}
.cc-tag-secondary{background:#6c757d}
.cc-count{font-weight:800;margin-top:4px;color:#1b2559}
.cc-bar{height:7px;background:#e9edf5;border-radius:4px;overflow:hidden;margin:10px 0}
.cc-fill{height:100%;border-radius:4px;background:#3f4a63}
.cc-fill.blue{background:#0d6efd}
.cc-fill.red{background:#dc3545}
.cc-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:#f4f7fc;border-radius:10px;padding:8px 4px;text-align:center}
.cc-metrics small{display:block;font-size:.7rem;color:#6c7693}
.cc-metrics strong{font-size:.85rem;color:#1b2559}
.cc-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.cc-actions em{font-size:.75rem;color:#4a5575}
.cc-btn{border:1px solid transparent;border-radius:8px;padding:6px 12px;font-size:.85rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px;line-height:1.3}
.cc-btn-primary{background:#0d6efd;color:#fff}
.cc-btn-primary:hover{background:#0b5ed7}
.cc-btn-light{background:#fff;color:#1b2559;border-color:#ced4da}
.cc-btn-light:hover{background:#f4f6fb}

.toast-msg{position:fixed;bottom:24px;right:24px;z-index:4000;background:#1b2559;color:#fff;padding:10px 16px;border-radius:10px;font-size:.9rem;max-width:420px;opacity:0;transform:translateY(8px);pointer-events:none;transition:opacity .2s,transform .2s}
.toast-msg.show{opacity:1;transform:none}
#classCards{max-height:75vh;overflow-y:auto;padding:2px 4px 2px 2px}

/* --- Hộp thoại xem danh sách lớp --- */
.sm-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:center;justify-content:center;z-index:3000;padding:16px}
.sm-modal.show{display:flex}
.sm-modal-dialog{background:#fff;border-radius:16px;width:min(900px,100%);max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.sm-modal-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 20px;border-bottom:1px solid #eef1f7}
.sm-modal-head h5{margin:0;font-weight:700;color:#1b2559}
.sm-modal-head small{color:#6c7693}
.sm-close{border:none;background:transparent;font-size:1.6rem;line-height:1;cursor:pointer;color:#6c7693}
.sm-modal-body{overflow:auto;padding:0 8px 8px}
.sm-modal-body table{width:100%;border-collapse:collapse}
.sm-modal-body th{font-size:.78rem;text-transform:uppercase;color:#2c3558;text-align:left;padding:12px;background:#f8fafd;white-space:nowrap}
.sm-modal-body td{padding:10px 12px;border-bottom:1px solid #eff2f7}
`;
            document.head.appendChild(st);
        })();

        /* ---------- Trạng thái ---------- */
        let all = [];          // toàn bộ sinh viên từ bảng students
        let classes = [];      // các lớp hành chính
        let byCode = new Map();
        let targetCode = null;
        let page = 1;
        let classesError = '';
        const selected = new Set();
        const AVATAR_COLORS = ['#d97706', '#0891b2', '#475569', '#dc2626', '#2563eb', '#7c3aed'];

        const $ = (id) => document.getElementById(id);
        const setText = (id, v) => { const el = $(id); if (el) el.textContent = v; };
        const fmt = (n) => n.toLocaleString('en-US');
        const initial = (name) => name.trim().split(' ').pop().charAt(0).toUpperCase();
        const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        const liveStudents = () => all.filter((s) => !s.deleted && s.active);
        const isAssigned = (s) => s.refs.length > 0;
        const belongs = (s, c) => !s.deleted && s.refs.some((v) => c.keys.includes(v));
        const classOf = (s) => classes.find((c) => belongs(s, c));
        const pendingList = () => liveStudents().filter((s) => !isAssigned(s));
        const curOf = (c) => all.filter((s) => belongs(s, c)).length;
        const getClass = (code) => classes.find((c) => c.code === code);

        function toast(msg) {
            let el = $('toastMsg');
            if (!el) {
                el = document.createElement('div');
                el.id = 'toastMsg';
                el.className = 'toast-msg';
                el.setAttribute('role', 'status');
                document.body.appendChild(el);
            }
            el.textContent = msg;
            el.classList.add('show');
            clearTimeout(toast.t);
            toast.t = setTimeout(() => el.classList.remove('show'), 3500);
        }

        function fetchJson(url) {
            return fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) {
                if (!r.ok) throw new Error(url + ' trả về HTTP ' + r.status);
                return r.json();
            });
        }

        // Lấy toàn bộ dữ liệu: xin size lớn và tự đọc tiếp các trang nếu API có phân trang (Spring: page/size)
        function fetchAll(url) {
            const sep = url.indexOf('?') >= 0 ? '&' : '?';
            return fetchJson(url + sep + 'page=0&size=1000').then(function (first) {
                let items = unwrap(first);
                const totalPages = first && !Array.isArray(first) ? Number(first.totalPages) || 1 : 1;
                if (totalPages <= 1) return items;
                let chain = Promise.resolve();
                for (let pg = 1; pg < totalPages; pg++) {
                    chain = chain.then(function () {
                        return fetchJson(url + sep + 'page=' + pg + '&size=1000').then(function (more) { items = items.concat(unwrap(more)); });
                    });
                }
                return chain.then(function () { return items; });
            });
        }

        function fetchFirst(urls, okKey) {
            let chain = Promise.reject(new Error('Không có URL'));
            urls.forEach(function (u) {
                chain = chain.catch(function () {
                    return fetchAll(u).then(function (data) { API[okKey || 'lastUrlOk'] = u; return data; });
                });
            });
            return chain;
        }

        // Đọc file JS của trang khác để biết nó gọi API nào (/api/...)
        function discoverApiUrls(scriptPaths) {
            return Promise.all(scriptPaths.map(function (sp) {
                return fetch(sp).then(function (r) { return r.ok ? r.text() : ''; }).catch(function () { return ''; });
            })).then(function (texts) {
                const found = [];
                texts.forEach(function (t) {
                    (t.match(/\/api\/[A-Za-z0-9_\-]+(?:\/[A-Za-z0-9_\-]+)*/g) || []).forEach(function (u) {
                        if (found.indexOf(u) < 0) found.push(u);
                    });
                });
                return found;
            });
        }

        function loadAdvisorData() {
            return discoverApiUrls(API.advisorScripts).then(function (found) {
                const uniq = (a) => a.filter((u, i) => a.indexOf(u) === i);
                const isAssign = (u) => /(advisor|gvcn|cvht).*(classe|class|section|assign)|(classe|class|section).*(advisor|gvcn|cvht)/i.test(u);
                const assignUrls = uniq(found.filter(isAssign).concat(API.advisorUrls));
                const empUrls = uniq(found.filter((u) => !isAssign(u) && /employee|lecturer|teacher|advisor/i.test(u)).concat(API.employeeUrls));
                console.log('[Phân lớp] API đọc được từ JS trang CVHT:', found);
                return Promise.all([
                    fetchFirst(assignUrls, 'advisorUrlOk').catch(function (e) { console.warn('Không tải được API phân công CVHT:', e); return []; }),
                    fetchFirst(empUrls, 'employeeUrlOk').catch(function () { return []; })
                ]);
            });
        }

        function buildEmployeeMap(rows) {
            const m = new Map();
            rows.forEach(function (r) {
                const id = pick(r, 'id');
                const name = pick(r, 'fullName', 'full_name', 'name', 'employeeName');
                if (id !== undefined && name) m.set(String(id), String(name));
            });
            return m;
        }

        // Bảng phân công GV/CVHT -> bản đồ { mã/id lớp : tên giảng viên }
        function buildAdvisorMap(rows, empMap) {
            const map = new Map();
            rows.forEach(function (r) {
                if (pick(r, 'deletedAt', 'deleted_at')) return;
                const act = pick(r, 'isActive', 'is_active');
                const inactive = (act === false || act === 0);
                const emp = r.employee || r.advisor || r.teacher || r.lecturer || r.user || {};
                const empId = pick(r, 'employeeId', 'employee_id', 'advisorId', 'advisor_id', 'lecturerId', 'lecturer_id', 'teacherId', 'teacher_id');
                const name = pick(r, 'employeeName', 'advisorName', 'advisor_name', 'lecturerName', 'teacherName', 'fullName', 'full_name') ||
                    emp.fullName || emp.full_name || emp.name || emp.employeeName ||
                    scanKey(r, /(employee|advisor|lecturer|teacher|gvcn|cvht).*(name|ten)/i, isStr) ||
                    (empId !== undefined ? empMap.get(String(empId)) : undefined);
                if (!name) return;
                collectClassRefs(r).forEach(function (ref) {
                    const cur = map.get(ref);
                    if (!cur || (cur.inactive && !inactive)) map.set(ref, { name: String(name), inactive: inactive });
                });
            });
            return map;
        }

        /* ---------- Bảng sinh viên ---------- */
        function visibleStudents() {
            const kw = $('filterKeyword').value.trim().toLowerCase();
            const mj = $('filterMajor').value;
            const st = $('filterStatus') ? $('filterStatus').value : '';
            const sx = $('filterSex').value;
            return liveStudents().filter((s) => {
                if (kw && !(s.code + ' ' + s.name).toLowerCase().includes(kw)) return false;
                if (mj !== 'all' && s.major !== mj) return false;
                if (st === 'wait' && isAssigned(s)) return false;
                if (st === 'done' && !isAssigned(s)) return false;
                if (sx && s.sex !== sx) return false;
                return true;
            });
        }

        function getPageRows() {
            const rows = visibleStudents();
            const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
            const p = Math.min(page, totalPages);
            return rows.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
        }

        function pageItem(label, target, disabled, active, aria) {
            return '<li class="page-item' + (disabled ? ' disabled' : '') + (active ? ' active' : '') + '">' +
                '<a class="page-link" href="#" data-page="' + target + '"' + (aria ? ' aria-label="' + aria + '"' : '') + '>' + label + '</a></li>';
        }

        // Lấy khung phân trang; nếu HTML chưa có thì tự tạo ngay cạnh dòng "Đang xem ..."
        function getPager() {
            let ul = document.getElementById('pagination') || document.querySelector('.pagination');
            if (ul) return ul;
            const info = $('pagingInfo');
            if (!info || !info.parentElement) return null;
            const host = info.parentElement;
            host.classList.add('d-flex', 'flex-wrap', 'align-items-center', 'justify-content-between', 'gap-2');
            ul = document.createElement('ul');
            ul.id = 'pagination';
            ul.className = 'pagination pagination-sm mb-0';
            host.appendChild(ul);
            return ul;
        }

        function renderPagination(totalPages) {
            const ul = getPager();
            if (!ul) return;
            let html = pageItem('<i class="bi bi-chevron-left"></i>', page - 1, page === 1, false, 'Trang trước');
            let prev = 0;
            for (let p = 1; p <= totalPages; p++) {
                if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                    if (p - prev > 1) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
                    html += pageItem(p, p, false, p === page);
                    prev = p;
                }
            }
            html += pageItem('<i class="bi bi-chevron-right"></i>', page + 1, page === totalPages, false, 'Trang sau');
            ul.innerHTML = html;
        }

        const statusSel = $('filterStatus');
        if (statusSel) {
            statusSel.innerHTML = '<option value="">Trạng thái: Tất cả</option>' +
                '<option value="wait">Chưa xếp lớp</option><option value="done">Đã xếp lớp</option>';
        }

        function renderMajorFilter() {
            const sel = $('filterMajor');
            const current = sel.value || 'all';
            const majors = [...new Set(liveStudents().map((s) => s.major))].sort();
            sel.innerHTML = '<option value="all">Ngành: Tất cả</option>' +
                majors.map((m) => '<option value="' + esc(m) + '">' + esc(m) + '</option>').join('');
            sel.value = majors.includes(current) ? current : 'all';
        }

        function statusPill(s) {
            if (!isAssigned(s)) return '<span class="status-pill status-wait">Chưa xếp lớp</span>';
            const cls = classOf(s);
            const label = cls ? cls.code : (s.refs.find((v) => isNaN(Number(v))) || ('#' + s.refs[0]));
            return '<span class="status-pill status-temp">Lớp ' + esc(label) + '</span>';
        }

        function renderStudents() {
            const rows = visibleStudents();
            const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
            if (page > totalPages) page = totalPages;
            const start = (page - 1) * PAGE_SIZE;
            const pageSlice = rows.slice(start, start + PAGE_SIZE);
            const tbody = $('studentRows');
            if (!rows.length) {
                tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-inbox"></i>Không có sinh viên nào khớp bộ lọc.</div></td></tr>';
            } else {
                tbody.innerHTML = pageSlice.map((s, k) => {
                    const i = start + k;
                    const checked = selected.has(s.code) ? 'checked' : '';
                    const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                    const yy = s.year ? 'K' + String(s.year).slice(-2) : '';
                    return '<tr class="' + (checked ? 'row-selected' : '') + '">' +
                        '<td><input type="checkbox" class="form-check-input row-check" data-code="' + esc(s.code) + '" ' + checked + ' aria-label="Chọn ' + esc(s.name) + '" /></td>' +
                        '<td>' + String(i + 1).padStart(2, '0') + '</td>' +
                        '<td><span class="code-pill">' + esc(s.code) + '</span></td>' +
                        '<td><div class="stu-cell"><span class="avatar-sq" style="background:' + color + '">' + esc(initial(s.name)) + '</span>' +
                        '<div><div class="person-name">' + esc(s.name) + '</div><small class="text-muted">' + s.sex + ' • ' + s.dob + '</small></div></div></td>' +
                        '<td><div>' + esc(s.major) + '</div>' + (yy ? '<small class="text-muted">Khóa ' + yy + '</small>' : '') + '</td>' +
                        '<td class="fw-bold">' + (s.year || '—') + '</td>' +
                        '<td><small class="text-muted" title="' + esc(s.address) + '">' + esc(String(s.address).slice(0, 30)) + '</small></td>' +
                        '<td>' + statusPill(s) + '</td></tr>';
                }).join('');
            }
            setText('pendingBadge', liveStudents().length + ' SV');
            const ttl = $('pendingBadge') && $('pendingBadge').parentElement;
            if (ttl && ttl.firstChild && ttl.firstChild.nodeType === 3) ttl.firstChild.textContent = 'Danh sách sinh viên ';
            setText('pagingInfo', rows.length
                ? 'Hiển thị ' + (start + 1) + ' - ' + (start + pageSlice.length) + ' trong tổng số ' + rows.length + ' sinh viên'
                : 'Không có bản ghi để hiển thị');
            renderPagination(totalPages);
            updateSelection();
        }

        function updateSelection() {
            const n = selected.size;
            setText('selectedCount', n + ' sinh viên');
            const rows = getPageRows();
            const allBox = $('checkAll');
            allBox.checked = rows.length > 0 && rows.every((s) => selected.has(s.code));
            allBox.indeterminate = n > 0 && !allBox.checked;
        }

        /* ---------- Thẻ lớp ---------- */
        function renderClasses() {
            const box = $('classCards');
            if (!classes.length) {
                box.innerHTML = '<div class="cc cc-empty">' + (classesError
                    ? esc(classesError) + '<br>Hãy sửa <code>API.classesUrls</code> ở đầu file student-classe-sections.js cho đúng URL trang Lớp học đang dùng.'
                    : 'Bảng student_classes chưa có lớp nào đang hoạt động.') + '</div>';
                return;
            }
            box.innerHTML = classes.map((c) => {
                const cur = curOf(c);
                const isTarget = c.code === targetCode;
                const left = Math.max(0, c.max - cur);
                const pct = Math.min(100, Math.round((cur / c.max) * 100));
                let tag;
                if (isTarget) tag = ['primary', 'Lớp mục tiêu • Còn ' + left + ' chỗ'];
                else if (left <= 2) tag = ['danger', left === 0 ? 'Đã đầy' : 'Sắp đầy (Còn ' + left + ' chỗ)'];
                else if (cur === 0) tag = ['success', 'Lớp mới mở'];
                else tag = ['secondary', 'Còn ' + left + ' chỗ'];
                const fill = isTarget ? 'blue' : (left <= 2 ? 'red' : '');

                const members = all.filter((s) => belongs(s, c));
                const female = members.filter((s) => s.sex === 'Nữ').length;
                const femaleTxt = members.length ? Math.round(female / members.length * 100) + '% (' + female + ' SV)' : '—';
                const metrics = '<div class="cc-metrics">' +
                    '<div><small>Sĩ số</small><strong>' + cur + ' SV</strong></div>' +
                    '<div><small>Tỷ lệ Nữ</small><strong>' + femaleTxt + '</strong></div>' +
                    '<div><small>Còn trống</small><strong>' + left + ' chỗ</strong></div></div>';

                const assignRow = isTarget && left > 0
                    ? '<em>' + (selected.size ? 'Gán ' + selected.size + ' hồ sơ đã chọn vào lớp này' : 'Tick chọn sinh viên ở bảng bên trái rồi bấm Thêm') + '</em>' +
                      '<button class="cc-btn cc-btn-primary btn-assign-here" type="button" data-code="' + esc(c.code) + '"><i class="bi bi-plus-circle"></i>' + (selected.size ? 'Thêm ' + selected.size + ' SV' : 'Thêm SV') + '</button>'
                    : '';
                const viewBtn = '<button class="cc-btn cc-btn-light btn-view-class" type="button" data-code="' + esc(c.code) + '"><i class="bi bi-eye"></i>Xem danh sách lớp</button>';

                return '<div class="cc' + (isTarget ? ' target' : '') + '" data-code="' + esc(c.code) + '" tabindex="0" role="button" aria-pressed="' + isTarget + '">' +
                    '<div class="cc-top">' +
                    '<span class="cc-ico"><i class="bi ' + c.icon + '"></i></span>' +
                    '<div class="cc-title"><div class="cc-code">' + esc(c.code) + (c.name ? ' <small>' + esc(c.name) + '</small>' : '') + '</div>' +
                    '<div class="cc-advisor"><i class="bi bi-person"></i> CVHT: <strong>' + esc(c.cvht) + '</strong></div></div>' +
                    '<div class="cc-side"><span class="cc-tag cc-tag-' + tag[0] + '">' + tag[1] + '</span>' +
                    '<div class="cc-count">' + cur + ' / ' + c.max + '</div><small>' + pct + '% chỉ tiêu</small></div></div>' +
                    '<div class="cc-bar"><div class="cc-fill ' + fill + '" style="width:' + pct + '%"></div></div>' +
                    metrics +
                    '<div class="cc-actions">' + assignRow + viewBtn + '</div></div>';
            }).join('');
        }

        /* ---------- Xem danh sách sinh viên của lớp ---------- */
        function closeClassModal() { const m = $('classModal'); if (m) m.classList.remove('show'); }

        function ensureClassModal() {
            let m = $('classModal');
            if (m) return m;
            m = document.createElement('div');
            m.id = 'classModal';
            m.className = 'sm-modal';
            m.innerHTML =
                '<div class="sm-modal-dialog" role="dialog" aria-modal="true">' +
                '<div class="sm-modal-head"><div><h5 class="mb-0 fw-bold" id="cmTitle"></h5><small class="text-muted" id="cmSub"></small></div>' +
                '<button type="button" class="sm-close" id="cmClose" aria-label="Đóng">&times;</button></div>' +
                '<div class="sm-modal-body"><div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
                '<thead><tr><th>STT</th><th>Mã SV</th><th>Họ và tên</th><th>Ngày sinh</th><th>Giới tính</th><th>Năm nhập học</th></tr></thead>' +
                '<tbody id="cmRows"></tbody></table></div></div></div>';
            document.body.appendChild(m);
            m.addEventListener('click', function (e) { if (e.target === m) closeClassModal(); });
            $('cmClose').addEventListener('click', closeClassModal);
            document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeClassModal(); });
            return m;
        }

        function openClassModal(code) {
            const cls = getClass(code);
            if (!cls) return;
            const members = all.filter((s) => belongs(s, cls));
            const m = ensureClassModal();
            $('cmTitle').textContent = 'Lớp ' + cls.code + (cls.name ? ' – ' + cls.name : '');
            $('cmSub').textContent = 'CVHT: ' + cls.cvht + ' • ' + members.length + ' / ' + cls.max + ' sinh viên';
            $('cmRows').innerHTML = members.length
                ? members.map((s, i) =>
                    '<tr><td>' + String(i + 1).padStart(2, '0') + '</td>' +
                    '<td><span class="code-pill">' + esc(s.code) + '</span></td>' +
                    '<td class="person-name">' + esc(s.name) + '</td>' +
                    '<td>' + esc(s.dob) + '</td><td>' + s.sex + '</td><td>' + (s.year || '—') + '</td></tr>').join('')
                : '<tr><td colspan="6"><div class="empty-state"><i class="bi bi-inbox"></i>Lớp này chưa có sinh viên.</div></td></tr>';
            m.classList.add('show');
        }

        function renderStats() {
            const live = liveStudents();
            const total = live.length;
            const pend = pendingList().length;
            const done = total - pend;
            setText('statTotal', fmt(total));
            setText('statAssigned', fmt(done));
            setText('statPercent', (total ? done / total * 100 : 0).toFixed(1) + '%');
            setText('statPending', fmt(pend));
            setText('statPendingPct', (total ? pend / total * 100 : 0).toFixed(1) + '%');
            setText('statClasses', classes.length);
            const avg = classes.length ? (classes.reduce((a, c) => a + curOf(c), 0) / classes.length).toFixed(1) : '0';
            // [ĐỔI] hiển thị sĩ số tối đa thực tế thay vì ghi cứng 70
            const maxCap = classes.length ? Math.max.apply(null, classes.map((c) => c.max)) : DEFAULT_CAPACITY;
            setText('statClassNote', 'Sĩ số TB ' + avg + ' • Định mức tối đa ' + maxCap);
        }

        const setWidth = (id, pct) => { const el = $(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%'; };

        // Định dạng khối "Cân bằng đào tạo" bằng JS (phòng khi CSS của trang thiếu)
        function fixBalance() {
            ['balGenderText', 'balGapText', 'balFillText'].forEach(function (id) {
                const el = $(id);
                if (!el || !el.parentElement) return;
                const row = el.parentElement;
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'baseline';
                row.style.gap = '8px';
                row.style.fontSize = '.85rem';
                row.style.marginTop = '12px';
                el.style.fontWeight = '700';
                el.style.textAlign = 'right';
            });
            [['balMaleBar', '#0d6efd'], ['balFemaleBar', '#9ec5fe'], ['balGapBar', '#0d6efd'], ['balFillBar', '#0d6efd']].forEach(function (pair) {
                const bar = $(pair[0]);
                if (!bar || !bar.parentElement) return;
                const track = bar.parentElement;
                track.style.display = 'flex';
                track.style.height = '6px';
                track.style.background = '#e9edf5';
                track.style.borderRadius = '4px';
                track.style.overflow = 'hidden';
                track.style.marginTop = '4px';
                bar.style.display = 'block';
                bar.style.height = '100%';
                bar.style.background = pair[1];
            });
        }

        function renderBalance() {
            const live = liveStudents();
            setText('classBadge', classes.length + ' lớp');

            // Tiêu đề: niên khóa lấy từ năm nhập học lớn nhất trong dữ liệu
            const years = live.map((s) => Number(s.year)).filter(Boolean);
            setText('pageSubtitle', years.length
                ? 'Niên khóa ' + Math.max.apply(null, years) + ' - ' + (Math.max.apply(null, years) + 4) + ' • ' + live.length + ' sinh viên trong hệ thống'
                : 'Chưa có dữ liệu sinh viên');

            // Giới tính chung
            const female = live.filter((s) => s.sex === 'Nữ').length;
            const femalePct = live.length ? Math.round(female / live.length * 100) : 0;
            setText('balGenderText', live.length ? 'Nam ' + (100 - femalePct) + '% • Nữ ' + femalePct + '%' : '–');
            setWidth('balMaleBar', live.length ? 100 - femalePct : 0);
            setWidth('balFemaleBar', live.length ? femalePct : 0);

            // Sĩ số giữa các lớp
            const sizes = classes.map(curOf);
            if (sizes.length) {
                const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
                const std = Math.sqrt(sizes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sizes.length);
                const gap = Math.max.apply(null, sizes) - Math.min.apply(null, sizes);
                const cap = Math.max.apply(null, classes.map((c) => c.max));
                setText('balStd', 'Độ lệch chuẩn: ' + std.toFixed(2));
                setText('balGapText', 'Δ = ' + gap + ' SV');
                setWidth('balGapBar', 100 - gap / cap * 100);
                const totalCur = sizes.reduce((a, b) => a + b, 0);
                const totalMax = classes.reduce((a, c) => a + c.max, 0);
                setText('balFillText', totalCur + ' / ' + totalMax + ' (' + Math.round(totalCur / totalMax * 100) + '%)');
                setWidth('balFillBar', totalCur / totalMax * 100);
            } else {
                setText('balStd', 'Độ lệch chuẩn: –');
                setText('balGapText', '–');
                setText('balFillText', '–');
                setWidth('balGapBar', 0);
                setWidth('balFillBar', 0);
            }
        }

        function refreshAll() { renderMajorFilter(); renderStudents(); renderClasses(); renderStats(); renderBalance(); fixBalance(); }

        /* ---------- Gán sinh viên (lưu về server) ---------- */
        function idsOf(codes) { return codes.map((c) => byCode.get(c).id); }

        // Tạo dữ liệu gửi lên: bản ghi gốc của sinh viên nhưng đổi trường "lớp" sang lớp mới
        function classPayloadFor(raw, classId) {
            const payload = Object.assign({}, raw);
            const idVal = /^\d+$/.test(String(classId)) ? Number(classId) : classId;
            let touched = false;
            Object.keys(raw).forEach(function (k) {
                if (!/class|classe|lop/i.test(k) || /size|count|year|leader|total/i.test(k)) return;
                const v = raw[k];
                if (/id$/i.test(k) && (v === null || typeof v === 'number' || typeof v === 'string')) { payload[k] = idVal; touched = true; }
                else if (v && typeof v === 'object') { payload[k] = Object.assign({}, v, { id: idVal }); touched = true; }
            });
            if (!touched) { payload.studentClasseId = idVal; payload.student_classe_id = idVal; }
            return payload;
        }

        async function assignViaStudentUpdate(codes, classObj) {
            const base = API.studentsUrl.replace(/\/$/, '');
            for (const code of codes) {
                const s = byCode.get(code);
                const url = base + '/' + s.id;
                const opts = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classPayloadFor(s.raw || {}, classObj.id)) };
                let r = await fetch(url, Object.assign({ method: 'PUT' }, opts));
                if (r.status === 405) r = await fetch(url, Object.assign({ method: 'PATCH' }, opts));
                if (!r.ok) {
                    const txt = await r.text().catch(function () { return ''; });
                    console.error('[Phân lớp] Cập nhật sinh viên thất bại', r.status, url, txt);
                    throw new Error('API POST /api/students/assign-class chưa chạy (đã thử PUT sinh viên ' + s.code + ' cũng HTTP ' + r.status + '). Kiểm tra đã tạo StudentAssignClassController trong thư mục controller và khởi động lại ứng dụng chưa.');
                }
            }
        }

        async function saveGroup(classObj, codes) {
            try {
                await API.assign(idsOf(codes), classObj.id);
            } catch (e) {
                const noRoute = e.status === 405 || e.status === 501 || (e.status === 404 && !/Không tìm thấy lớp/.test(e.body || ''));
                if (noRoute) await assignViaStudentUpdate(codes, classObj);
                else throw e;
            }
            codes.forEach((c) => { byCode.get(c).refs = [String(classObj.id)]; selected.delete(c); });
        }

        async function assign(codes, classCode) {
            const cls = getClass(classCode);
            if (!cls) { toast('Chưa có lớp để gán.'); return; }
            if (!codes.length) { toast('Hãy chọn ít nhất 1 sinh viên.'); return; }
            const moving = codes.filter((c) => !belongs(byCode.get(c), cls));
            if (!moving.length) { toast('Các sinh viên đã chọn đã thuộc lớp ' + classCode + '.'); return; }
            const left = cls.max - curOf(cls);
            if (moving.length > left) { toast('Lớp ' + classCode + ' chỉ còn ' + left + ' chỗ, không đủ cho ' + moving.length + ' sinh viên.'); return; }
            codes = moving;
            try { await saveGroup(cls, codes); }
            catch (e) { toast('Lưu thất bại: ' + e.message); return; }
            refreshAll();
            toast('Đã gán ' + codes.length + ' sinh viên vào lớp ' + classCode + '.');
        }

        // Chia sinh viên vào các lớp còn chỗ theo hàm chọn lớp, rồi lưu từng nhóm
        async function distribute(codes, choose) {
            const counts = {};
            classes.forEach((c) => { counts[c.id] = curOf(c); });
            const groups = new Map();
            codes.forEach((code) => {
                const open = classes.filter((c) => c.max - counts[c.id] > 0);
                if (!open.length) return;
                const c = choose(open, counts);
                counts[c.id]++;
                if (!groups.has(c)) groups.set(c, []);
                groups.get(c).push(code);
            });
            let placed = 0;
            try {
                for (const [cls, list] of groups) { await saveGroup(cls, list); placed += list.length; }
            } catch (e) { toast('Lưu thất bại: ' + e.message); }
            refreshAll();
            return placed;
        }

        /* ---------- Sự kiện ---------- */
        $('studentRows').addEventListener('change', function (e) {
            if (!e.target.classList.contains('row-check')) return;
            const code = e.target.dataset.code;
            e.target.checked ? selected.add(code) : selected.delete(code);
            e.target.closest('tr').classList.toggle('row-selected', e.target.checked);
            updateSelection();
            renderClasses();
        });

        $('checkAll').addEventListener('change', function () {
            getPageRows().forEach((s) => (this.checked ? selected.add(s.code) : selected.delete(s.code)));
            renderStudents();
            renderClasses();
        });

        ['filterKeyword', 'filterMajor', 'filterStatus', 'filterSex'].forEach((id) => {
            const el = $(id);
            if (el) el.addEventListener('input', function () { page = 1; renderStudents(); });
        });

        $('btnReset').addEventListener('click', function () {
            $('filterKeyword').value = '';
            $('filterMajor').value = 'all';
            if ($('filterStatus')) $('filterStatus').value = '';
            $('filterSex').value = '';
            page = 1;
            renderStudents();
        });

        // Bấm nút phân trang (gắn vào cả trang nên chạy được kể cả khi nút được tạo sau)
        document.addEventListener('click', function (e) {
            const a = e.target.closest('.pagination a[data-page]');
            if (!a) return;
            e.preventDefault();
            if (a.parentElement.classList.contains('disabled')) return;
            page = parseInt(a.dataset.page, 10);
            renderStudents();
        });

        $('classCards').addEventListener('click', function (e) {
            const viewBtn = e.target.closest('.btn-view-class');
            if (viewBtn) { e.stopPropagation(); openClassModal(viewBtn.dataset.code); return; }
            const btn = e.target.closest('.btn-assign-here');
            if (btn) { e.stopPropagation(); assign([...selected], btn.dataset.code); return; }
            const card = e.target.closest('.cc');
            if (card) { targetCode = card.dataset.code; renderClasses(); }
        });
        $('classCards').addEventListener('keydown', function (e) {
            const card = e.target.closest('.cc');
            if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                targetCode = card.dataset.code; renderClasses();
            }
        });

        $('btnAssignSelected').addEventListener('click', () => assign([...selected], targetCode));

        $('btnRandom').addEventListener('click', async function () {
            const codes = [...selected];
            if (!codes.length) { toast('Hãy chọn ít nhất 1 sinh viên.'); return; }
            const n = await distribute(codes, (open) => open[Math.floor(Math.random() * open.length)]);
            toast('Đã gán ngẫu nhiên ' + n + ' sinh viên.');
        });

        $('btnAutoAssign').addEventListener('click', async function () {
            const codes = pendingList().map((s) => s.code);
            if (!codes.length) { toast('Không còn sinh viên chờ phân lớp.'); return; }
            const n = await distribute(codes, (open, counts) =>
                open.slice().sort((a, b) => (counts[a.id] / a.max) - (counts[b.id] / b.max))[0]);
            const left = pendingList().length;
            toast(left ? 'Đã phân ' + n + ' sinh viên, còn ' + left + ' sinh viên do các lớp đã hết chỗ.'
                       : 'Đã phân lớp tự động theo nguyên tắc cân bằng sĩ số.');
        });

        $('btnSaveAll').addEventListener('click', () => toast('Các thay đổi đã được lưu ngay khi gán lớp.'));
        $('btnRefresh').addEventListener('click', () => load(true));

        /* ---------- Tải dữ liệu ---------- */
        function load(showToast) {
            $('studentRows').innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-hourglass-split"></i>Đang tải dữ liệu từ bảng students...</div></td></tr>';
            return Promise.all([
                fetchAll(API.studentsUrl),
                fetchFirst(API.classesUrls, 'classesUrlOk')
                    .then(function (d) { classesError = ''; return d; })
                    .catch(function (e) { console.warn('Không tải được API lớp:', e); classesError = 'Không gọi được API bảng student_classes (đã thử: ' + API.classesUrls.join(', ') + ').'; return []; }),
                loadAdvisorData()
            ]).then(function (res) {
                const rawStudents = unwrap(res[0]);
                const rawClasses = unwrap(res[1]);
                console.log('[Phân lớp] 1 bản ghi sinh viên mẫu từ API:', rawStudents[0]);
                console.log('[Phân lớp] 1 bản ghi lớp mẫu từ API:', rawClasses[0], '(URL:', API.classesUrlOk, ')');
                all = rawStudents.map(normStudent);
                classes = rawClasses.map(normClass).filter((c) => !c.deleted && c.active);

                // Gắn tên CVHT từ bảng phân công
                const rawAdvisors = unwrap(res[2][0]);
                const empMap = buildEmployeeMap(unwrap(res[2][1]));
                console.log('[Phân lớp] Số bản ghi phân công:', rawAdvisors.length, '| giảng viên:', empMap.size, '| URL phân công:', API.advisorUrlOk, '| URL giảng viên:', API.employeeUrlOk);
                console.log('[Phân lớp] 1 bản ghi phân công CVHT mẫu:', rawAdvisors[0], '(URL:', API.advisorUrlOk, ')');
                const advisorMap = buildAdvisorMap(rawAdvisors, empMap);
                classes.forEach(function (c) {
                    if (c.hasAdvisor) return;
                    for (let k = 0; k < c.keys.length; k++) {
                        const a = advisorMap.get(c.keys[k]);
                        if (a) { c.cvht = a.name; c.hasAdvisor = true; break; }
                    }
                    if (!c.hasAdvisor && c.empId !== undefined && empMap.has(String(c.empId))) {
                        c.cvht = empMap.get(String(c.empId));
                        c.hasAdvisor = true;
                    }
                });
                console.log('[Phân lớp] Số lớp có tên CVHT:', classes.filter((c) => c.hasAdvisor).length, '/', classes.length);
                console.log('[Phân lớp] Lớp từ API:', rawClasses.length, '→ hiển thị:', classes.length, '| Mẫu lớp đã chuẩn hóa:', classes[0]);
                console.log('[Phân lớp] Mẫu sinh viên đã chuẩn hóa:', all[0]);
                byCode = new Map(all.map((s) => [s.code, s]));
                selected.clear();
                if (!classes.some((c) => c.code === targetCode)) {
                    const open = classes.find((c) => c.max - curOf(c) > 0);
                    targetCode = open ? open.code : (classes[0] && classes[0].code);
                }
                page = 1;
                refreshAll();
                if (showToast) toast('Đã làm mới danh sách.');
            }).catch(function (e) {
                console.error(e);
                $('studentRows').innerHTML = '<tr><td colspan="8"><div class="empty-state"><i class="bi bi-exclamation-triangle"></i>Không tải được dữ liệu: ' + esc(e.message) + '<br><small>Kiểm tra lại <code>API.studentsUrl</code> ở đầu file student-classe-sections.js</small></div></td></tr>';
                renderClasses();
            });
        }

        /* ---------- Hộp thoại "Thêm sinh viên mới" ---------- */
        (function setupAddStudent() {
            // Tên field gửi lên API: đổi cho khớp với trang index.html (Quản lý sinh viên)
            const FIELD = {
                code: 'code', fullName: 'fullName', dob: 'dateOfBirth', gender: 'gender',
                idNumber: 'identityNumber', idDate: 'identityIssueDate', idPlace: 'identityIssuePlace',
                permAddr: 'permanentAddress', curAddr: 'currentAddress', admission: 'admissionDate'
            };

            const st = document.createElement('style');
            st.textContent = `
.as-modal{position:fixed;inset:0;background:rgba(15,23,42,.45);display:none;align-items:flex-start;justify-content:center;z-index:3500;padding:16px;overflow-y:auto}
.as-modal.show{display:flex}
.as-dialog{background:#fff;border-radius:14px;width:min(900px,100%);margin-top:40px;box-shadow:0 20px 50px rgba(0,0,0,.25)}
.as-head{display:flex;align-items:center;justify-content:space-between;padding:16px 26px;border-bottom:1px solid #eef1f7}
.as-head h5{margin:0;font-weight:700;color:#1b2559;display:flex;align-items:center;gap:12px;font-size:1.15rem}
.as-head h5 i{background:#1a63d6;color:#fff;width:34px;height:34px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:1rem}
.as-x{border:none;background:transparent;font-size:1.5rem;cursor:pointer;color:#1b2559;line-height:1}
.as-body{padding:22px 26px;display:grid;grid-template-columns:1fr 1fr;gap:18px 32px}
.as-body .full{grid-column:1/-1}
.as-body label{display:block;font-weight:600;font-size:.9rem;color:#2c3558;margin-bottom:6px}
.as-body label b{color:#dc3545}
.as-body input,.as-body select{width:100%;height:44px;border:1px solid #e3e7ee;border-radius:8px;padding:0 14px;font-size:.95rem;background:#fff;box-sizing:border-box}
.as-body input:focus,.as-body select:focus{outline:none;border-color:#1a63d6;box-shadow:0 0 0 3px rgba(26,99,214,.15)}
.as-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 26px;border-top:1px solid #eef1f7}
.as-btn{border:none;border-radius:8px;padding:10px 20px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.as-btn-cancel{background:#eef1f6;color:#1b2559}
.as-btn-save{background:#1a63d6;color:#fff}
.as-btn-save:disabled{opacity:.6;cursor:wait}
@media(max-width:700px){.as-body{grid-template-columns:1fr}}`;
            document.head.appendChild(st);

            const modal = document.createElement('div');
            modal.className = 'as-modal';
            modal.id = 'addStudentModal';
            modal.innerHTML =
                '<div class="as-dialog" role="dialog" aria-modal="true">' +
                '<div class="as-head"><h5><i class="bi bi-person-plus"></i>Thêm sinh viên mới</h5>' +
                '<button type="button" class="as-x" id="asClose" aria-label="Đóng">&times;</button></div>' +
                '<form id="asForm" novalidate><div class="as-body">' +
                '<div><label>Mã sinh viên <b>*</b></label><input id="asCode" required></div>' +
                '<div><label>Họ và tên <b>*</b></label><input id="asName" required></div>' +
                '<div><label>Ngày sinh</label><input id="asDob" type="date"></div>' +
                '<div><label>Giới tính</label><select id="asGender"><option value="Nam">Nam</option><option value="Nữ">Nữ</option></select></div>' +
                '<div><label>Số CCCD/CMND</label><input id="asIdNum"></div>' +
                '<div><label>Ngày cấp</label><input id="asIdDate" type="date"></div>' +
                '<div class="full"><label>Nơi cấp</label><input id="asIdPlace"></div>' +
                '<div><label>Địa chỉ thường trú</label><input id="asPerm"></div>' +
                '<div><label>Địa chỉ hiện tại</label><input id="asCur"></div>' +
                '<div><label>Ngày nhập học</label><input id="asAdm" type="date"></div>' +
                '</div>' +
                '<div class="as-foot"><button type="button" class="as-btn as-btn-cancel" id="asCancel">Hủy</button>' +
                '<button type="submit" class="as-btn as-btn-save" id="asSave"><i class="bi bi-check-circle"></i>Lưu sinh viên</button></div>' +
                '</form></div>';
            document.body.appendChild(modal);

            const g = (id) => document.getElementById(id).value.trim();
            const openM = () => {
                document.getElementById('asForm').reset();
                modal.classList.add('show');
                setTimeout(() => document.getElementById('asCode').focus(), 50);
            };
            const closeM = () => modal.classList.remove('show');

            document.getElementById('asClose').addEventListener('click', closeM);
            document.getElementById('asCancel').addEventListener('click', closeM);
            modal.addEventListener('mousedown', (e) => { if (e.target === modal) closeM(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeM(); });

            // Bắt nút "Thêm mới" ở thanh trên cùng (tìm theo chữ trên nút)
            document.addEventListener('click', function (e) {
                const b = e.target.closest('button, a');
                if (!b || modal.contains(b)) return;
                if (b.textContent.replace(/\s+/g, ' ').trim() === 'Thêm mới') { e.preventDefault(); openM(); }
            });

            document.getElementById('asForm').addEventListener('submit', async function (e) {
                e.preventDefault();
                if (!g('asCode') || !g('asName')) { toast('Vui lòng nhập Mã sinh viên và Họ và tên.'); return; }
                const body = {};
                body[FIELD.code] = g('asCode');
                body[FIELD.fullName] = g('asName');
                body[FIELD.dob] = g('asDob') || null;
                body[FIELD.gender] = g('asGender');
                body[FIELD.idNumber] = g('asIdNum') || null;
                body[FIELD.idDate] = g('asIdDate') || null;
                body[FIELD.idPlace] = g('asIdPlace') || null;
                body[FIELD.permAddr] = g('asPerm') || null;
                body[FIELD.curAddr] = g('asCur') || null;
                body[FIELD.admission] = g('asAdm') || null;

                const btn = document.getElementById('asSave');
                btn.disabled = true;
                try {
                    const r = await fetch(API.studentsUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (!r.ok) {
                        const t = await r.text().catch(() => '');
                        throw new Error('HTTP ' + r.status + (t ? ' - ' + t.slice(0, 200) : ''));
                    }
                    closeM();
                    await load(false);
                    toast('Đã thêm sinh viên ' + body[FIELD.fullName] + '.');
                } catch (err) {
                    console.error('[Thêm sinh viên] lỗi', err);
                    toast('Lưu thất bại: ' + err.message);
                } finally {
                    btn.disabled = false;
                }
            });
        })();

        load(false);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();