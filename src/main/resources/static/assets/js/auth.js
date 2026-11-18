// /assets/js/auth.js  (Spring Security session)
const btn  = document.getElementById('profileBtn');
const menu = document.getElementById('profileMenu');

btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = menu.hidden;
    menu.hidden = !willOpen;
    btn.setAttribute('aria-expanded', String(willOpen));
});
document.addEventListener('click', () => {
    if (menu) menu.hidden = true;
    btn?.setAttribute('aria-expanded', 'false');
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu) menu.hidden = true;
});

document.getElementById('btnLogout')?.addEventListener('click', async () => {
    if (!confirm('Bạn có chắc muốn đăng xuất?')) return;
    try {
        // csrf đang tắt nên POST /logout chạy được
        await fetch('/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
        location.replace('/login.html');
    }
});