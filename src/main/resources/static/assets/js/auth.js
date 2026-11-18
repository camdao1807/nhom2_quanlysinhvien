// /assets/js/auth.js - tự thêm menu Đăng xuất cho mọi trang (Spring Security session)
(function () {
    // CSS tự chèn, không cần sửa file css nào
    const style = document.createElement('style');
    style.textContent = `
        .profile-wrap{position:relative}
        .profile{cursor:pointer}
        .profile .logout-caret{font-size:12px;opacity:.7;margin-left:4px}
        .profile-menu{
            position:absolute;right:0;top:calc(100% + 8px);min-width:190px;
            background:#12161f;border:1px solid rgba(255,255,255,.1);
            border-radius:10px;padding:6px;z-index:9999;
            box-shadow:0 10px 30px rgba(0,0,0,.4);
        }
        .profile-menu[hidden]{display:none}
        .profile-menu-item{
            width:100%;display:flex;align-items:center;gap:10px;
            padding:10px 12px;background:none;border:0;border-radius:8px;
            color:#f87171;font:inherit;font-size:13px;cursor:pointer;text-align:left;
        }
        .profile-menu-item:hover{background:rgba(255,255,255,.06)}
    `;
    document.head.appendChild(style);

    const profile = document.getElementById('profileBtn') || document.querySelector('.profile');
    if (!profile) return;

    let menu = document.getElementById('profileMenu');
    let logoutBtn = document.getElementById('btnLogout');

    // Trang nào chưa có menu thì tự tạo
    if (!menu) {
        const wrap = document.createElement('div');
        wrap.className = 'profile-wrap';
        profile.parentNode.insertBefore(wrap, profile);
        wrap.appendChild(profile);

        profile.setAttribute('role', 'button');
        profile.setAttribute('tabindex', '0');
        profile.insertAdjacentHTML('beforeend', '<i class="bi bi-chevron-down logout-caret"></i>');

        menu = document.createElement('div');
        menu.className = 'profile-menu';
        menu.id = 'profileMenu';
        menu.hidden = true;
        menu.innerHTML = '<button type="button" class="profile-menu-item" id="btnLogout"><i class="bi bi-box-arrow-right"></i> Đăng xuất</button>';
        wrap.appendChild(menu);
        logoutBtn = menu.querySelector('#btnLogout');
    }

    const toggle = (e) => {
        e.stopPropagation();
        menu.hidden = !menu.hidden;
    };
    profile.addEventListener('click', toggle);
    profile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(e); }
    });
    document.addEventListener('click', () => { menu.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.hidden = true; });

    logoutBtn.addEventListener('click', async () => {
        if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
        try {
            // csrf đang tắt nên POST /logout chạy được
            await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
        } finally {
            location.replace('/login.html');
        }
    });
})();