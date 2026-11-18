# GETECH — Media Tech Website

Trang chủ giới thiệu GETECH. HTML5 + CSS3 + Vanilla JavaScript. Không framework, không backend, không build step — mở `index.html` là chạy.

```
getech-website/
├── index.html              # Toàn bộ nội dung trang chủ
├── css/style.css           # 20 phần, đánh số ở đầu file
├── js/script.js            # Chia theo init function, có bảng dịch VI/EN
├── assets/
│   ├── images/             # hero, services, news, about, logo, favicon, og
│   ├── partners/           # logo đối tác
│   └── icons/              # để trống, dành cho icon rời sau này
├── .github/workflows/
│   └── deploy.yml          # workflow deploy GitHub Pages (tuỳ chọn)
├── .nojekyll               # để Pages phục vụ file nguyên trạng
└── README.md
```

---

## Chạy local

Mở thẳng `index.html` bằng trình duyệt là được. Nhưng nên chạy qua HTTP server để `localStorage` (ghi nhớ ngôn ngữ) hoạt động đúng:

```bash
cd getech-website
python3 -m http.server 8000
# mở http://localhost:8000
```

Hoặc dùng extension **Live Server** của VS Code.

---

## Những chỗ cần thay nội dung thật

### 1. Logo

| Vị trí | File |
| --- | --- |
| Header + Footer | `assets/images/logo.png` |
| Favicon / tab trình duyệt | `assets/images/favicon.png` |

Logo hiện tại là **placeholder**: khối chữ G màu xanh + chữ GETECH, nền trong suốt, 880×220. Thay bằng file cùng tên là xong — CSS đặt `height: 34px` (header) và `38px` (footer), chiều rộng tự co. PNG trong suốt hoặc SVG đều được (nếu dùng SVG thì sửa đuôi file trong `index.html`).

### 2. Hình ảnh

Tất cả đều là ảnh trừu tượng sinh sẵn, **đúng tỉ lệ layout cần**. Đè file cùng tên là layout giữ nguyên, không phải sửa code.

| File | Dùng ở | Tỉ lệ nên giữ |
| --- | --- | --- |
| `images/hero.jpg` | Nền Hero | ngang, rộng (≈16:9) |
| `images/music.jpg` | Card MUSIC | **dọc 3:4** |
| `images/media.jpg` | Card MEDIA | **dọc 3:4** |
| `images/content.jpg` | Card CONTENT | **dọc 3:4** |
| `images/news-01.jpg` | Tin tức 1 | ngang 16:11 |
| `images/news-02.jpg` | Tin tức 2 | ngang 16:11 |
| `images/news-03.jpg` | Tin tức 3 | ngang 16:11 |
| `images/about-01.jpg` | Ảnh lớn mục Về chúng tôi | ngang 15:11 |
| `images/about-02.jpg` | Ảnh nhỏ chồng lên | dọc 5:6 |
| `images/og-image.jpg` | Ảnh khi share link | **1200×630** |

Trong `index.html`, mỗi chỗ đều có comment `<!-- Replace with GETECH official image -->`. Nhớ sửa cả `alt=""` cho đúng nội dung ảnh thật.

> Ảnh placeholder có chữ mờ ở góc (HERO, MUSIC, NEWS 01…) để bạn biết đang xem file nào. Thay file là mất.

### 3. Logo đối tác

`assets/partners/` — `meta.png`, `youtube.png`, `tiktok.png`, `epidemic-sound.png`, `warner-music.png`, `soundcloud.png`.

Hiện là chữ trắng trên nền trong suốt. Thay bằng **logo trắng, nền trong suốt**. CSS đặt `height: 20–30px` và `opacity: .5`, sáng lên khi hover — nên logo màu sẫm sẽ chìm.

### 4. Màu thương hiệu

Sửa duy nhất khối `:root` ở đầu `css/style.css` — mọi màu khác đều dẫn xuất từ đây:

```css
--primary:    #1667FF;   /* xanh electric: nút, nhấn, focus */
--primary-dark: #0A2F8F; /* xanh sâu: gradient, trạng thái nhấn */
--accent:     #22D3FF;   /* cyan: eyebrow, mũi tên, gạch chân */
--background: #03060E;   /* nền đen-xanh */
--text:       #FFFFFF;
```

### 5. Thông tin thật cần điền

| Nội dung | Vị trí |
| --- | --- |
| Email liên hệ | `index.html` — `mailto:contact@getech.vn` (mục CTA) |
| Link mạng xã hội | `index.html` — footer, 4 thẻ `href="#"` có `data-soon` |
| Domain thật | `index.html` — thẻ `<link rel="canonical">` |
| Năm thành lập | `index.html` — khối `.about__badge` (đang để 2026) |
| Ngày / danh mục tin | `index.html` — `<time datetime="...">` trong mỗi news card |

---

## Song ngữ VI / EN

Bảng dịch nằm ở đầu `js/script.js`:

```javascript
const translations = {
    vi: { 'nav.home': 'TRANG CHỦ', ... },
    en: { 'nav.home': 'HOME',      ... }
};
```

Mọi phần tử có `data-i18n="key"` sẽ tự đổi khi bấm VI/EN. Lựa chọn được nhớ trong `localStorage`.

**Thêm chuỗi mới:** đặt `data-i18n="ten.key"` lên thẻ HTML, rồi thêm `'ten.key'` vào **cả hai** ngôn ngữ. Chuỗi chứa `<br>` được xử lý như HTML, còn lại là text thuần.

**Thêm ngôn ngữ mới:** thêm object thứ ba (ví dụ `ko: {...}`) và một nút `<button data-lang-btn="ko">` trong header. Không cần sửa gì thêm.

---

## Cấu trúc code

**CSS** chia 20 phần, có mục lục ở đầu file. Toàn bộ khoảng cách, bo góc, easing đều là biến trong `:root`.

**JavaScript** tách thành các hàm độc lập, gọi trong `init()`:

```javascript
initPreloader();   initReveal();     initParticles();
initHeader();      initCounters();   initToTop();
initMobileMenu();  initParallax();   initComingSoon();
initScrollSpy();   initLanguage();
```

Mỗi hàm tự thoát nếu không tìm thấy phần tử của nó — xoá một section khỏi HTML sẽ không làm vỡ những phần còn lại.

### Về animation

- Chỉ animate `transform` và `opacity` (chạy trên GPU, không gây reflow).
- Easing tuỳ chỉnh, không dùng `ease-in` cho UI vì cảm giác ì.
- Hover được bọc trong `@media (hover: hover) and (pointer: fine)` để không dính trạng thái hover khi chạm trên mobile.
- Tôn trọng `prefers-reduced-motion`: tắt chuyển động vị trí, marquee, particles — giữ lại fade.
- Particles tự dừng khi Hero ra khỏi màn hình hoặc tab bị ẩn.

### Chế độ 3D "cinematic" (`js/motion3d.js`)

Khi trình duyệt có WebGL và người dùng không bật *reduced motion*, trang chạy như một bộ phim. Các section xếp chồng trên một sân khấu cố định, còn thanh cuộn chỉ dùng để tua một timeline GSAP. Hạt 3D (Three.js) biến hình theo từng cảnh: cầu → sóng âm → đĩa vinyl → cột dữ liệu → đường hầm → thiên hà → cầu.

| Thư viện | Vai trò | Nạp từ |
| --- | --- | --- |
| three 0.170 | Hạt 3D WebGL | CDN jsDelivr, khai báo trong `<script type="importmap">` ở `index.html` |
| gsap 3.13 (+ ScrollTrigger, SplitText) | Timeline, chuyển cảnh | như trên |
| lenis 1.3 | Cuộn mượt | như trên |

- Muốn thêm hay đổi cảnh: sửa `chapters`, `enters`, `exits`, `holds` và `POSES` trong `buildFilm()`.
- Thời lượng chuyển cảnh nằm ở `TR`. Độ dài cuộn cho mỗi đơn vị timeline nằm ở `UNIT`.
- Debug trong DevTools: `__film.go('news')`, `__film.timeline.progress()`.
- Nếu CDN lỗi, không có WebGL, hoặc người dùng bật reduced motion, trang **tự quay về bản 2D** (`initMotion2D()` trong `script.js`). Nội dung luôn là HTML thật nên không ảnh hưởng SEO hay song ngữ.

### Mục "Coming Soon"

Link nào gắn `data-soon` sẽ hiện toast "đang hoàn thiện" thay vì dẫn tới trang trống. Khi có trang thật, chỉ cần bỏ `data-soon` và điền `href`.

---

## Responsive

| Breakpoint | Thay đổi chính |
| --- | --- |
| ≥ 1440px | Bố cục đầy đủ |
| ≤ 1180px | Ẩn nút CTA trên header |
| ≤ 1023px | Nav → hamburger; services 2 cột (card 3 tràn ngang); stats 2 cột |
| ≤ 767px | Services + news 1 cột; ẩn gợi ý cuộn ở hero |
| ≤ 420px | Stats 1 cột; ẩn nút VI/EN ở header |

---

## Deploy

`.github/workflows/deploy.yml` đã sẵn sàng (push lên `main` → tự deploy GitHub Pages, cần bật **Settings → Pages → Source: GitHub Actions**). Nếu bạn tự lo phần deploy theo cách khác thì xoá file này cũng không ảnh hưởng gì tới trang.

Toàn bộ đường dẫn trong project đều là **relative** (`assets/images/logo.png`, không phải `/assets/...`), nên trang chạy đúng cả ở `username.github.io/repo-name/` lẫn domain riêng.
