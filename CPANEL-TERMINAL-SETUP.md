# راهنمای راه‌اندازی MySudoku روی cPanel از طریق Terminal

این راهنما برای محیط استاندارد **cPanel + CloudLinux** نوشته شده است؛ با فرض اینکه **Node.js** و **Git** روی هاست فعال هستند و می‌خواهید پروژه را مستقیماً از GitHub با Terminal کلون/آپدیت کنید.

> **نکته مهم:** این پروژه با Vite ساخته می‌شود. خروجی قابل سرو برای مرورگر داخل پوشه `dist/` است. بعد از هر `build` باید همان خروجی را در مسیر وب (مثلاً `public_html`) سرو کنید.

مخزن SSH این پروژه:

```bash
git@github.com:DanialBakhtiari/MySudoku.git
```

---

## ۱) راه‌اندازی SSH Key (اتصال cPanel به GitHub)

### ۱-۱. ساخت کلید SSH در Terminal سی‌پنل

وارد **cPanel → Terminal** شوید و اجرا کنید:

```bash
ssh-keygen -t rsa -b 4096 -C "cpanel-mysudoku-deploy"
```

وقتی مسیر فایل را پرسید، Enter بزنید (پیش‌فرض: `~/.ssh/id_rsa`).  
برای Passphrase می‌توانید Enter بزنید (خالی بماند) مگر اینکه عمداً رمز بخواهید.

اگر پوشه `.ssh` از قبل وجود نداشت:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
```

### ۱-۲. خواندن Public Key برای Deploy Key در GitHub

```bash
cat ~/.ssh/id_rsa.pub
```

کل خروجی را کپی کنید، سپس در GitHub:

1. بروید به مخزن **MySudoku**
2. **Settings → Deploy keys → Add deploy key**
3. Title مثلاً: `cPanel Shared Hosting`
4. Key را Paste کنید
5. اگر فقط Pull لازم دارید، **Allow write access** را خاموش بگذارید
6. **Add key** را بزنید

مجوزهای پیشنهادی فایل‌های SSH:

```bash
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### ۱-۳. تست اتصال SSH به GitHub

اولین بار ممکن است fingerprint را تأیید کند (`yes`):

```bash
ssh -T git@github.com
```

پیام موفق معمولاً شبیه این است:

```text
Hi DanialBakhtiari! You've successfully authenticated, but GitHub does not provide shell access.
```

اگر خطا گرفتید، agent را چک کنید:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa
ssh -T git@github.com
```

---

## ۲) کلون اولیه پروژه

### ۲-۱. رفتن به مسیر درست وب

بسته به ساختار هاست یکی از این‌ها را استفاده کنید:

```bash
cd ~/public_html
```

یا اگر دامنه/ساب‌دامین جدا دارید:

```bash
cd ~/site
```

یا مسیر ساب‌فولدر اختصاصی:

```bash
mkdir -p ~/public_html/sudoku
cd ~/public_html/sudoku
```

> اگر می‌خواهید ریشه دامنه فقط خروجی build باشد، بهتر است سورس را خارج از web root کلون کنید (مثلاً `~/apps/MySudoku`) و فقط `dist/` را به `public_html` کپی کنید. هر دو الگو در ادامه آمده است.

### ۲-۲. کلون با SSH

اگر داخل فولدر مقصد هستید و می‌خواهید محتویات داخل همان پوشه بیاید:

```bash
git clone git@github.com:DanialBakhtiari/MySudoku.git .
```

یا کلون داخل زیرپوشه `MySudoku`:

```bash
git clone git@github.com:DanialBakhtiari/MySudoku.git
cd MySudoku
```

بررسی وضعیت:

```bash
git status
git branch -vv
```

---

## ۳) آپدیت‌های روتین (دریافت تغییرات بعدی)

هر بار که روی سیستم لوکال کامیت/پوش کردید، روی cPanel این کارها را انجام دهید.

### ۳-۱. Pull معمولی از `main`

```bash
cd ~/public_html/sudoku
# یا مسیر واقعی پروژه، مثلاً:
# cd ~/apps/MySudoku

git pull origin main
```

اگر remote پیش‌فرض درست است:

```bash
git pull
```

### ۳-۲. Hard Reset وقتی Branchها از هم فاصله گرفته‌اند

اگر Pull به‌خاطر تغییرات محلی یا conflict گیر کرد و می‌خواهید سرور دقیقاً مثل GitHub شود:

```bash
cd ~/public_html/sudoku
# یا مسیر واقعی پروژه

git fetch origin
git reset --hard origin/main
```

هشدار: `git reset --hard` همه تغییرات commit‌نشده روی سرور را پاک می‌کند.

پاک‌سازی فایل‌های untracked (اختیاری ولی مفید):

```bash
git clean -fd
```

---

## ۴) عملیات بعد از Pull (Node.js / NPM)

بعد از `pull` یا `reset`، dependencyها را نصب و پروژه را build کنید.

### ۴-۱. انتخاب نسخه Node.js در cPanel (CloudLinux)

اگر `node`/`npm` پیدا نشد یا نسخه قدیمی است، معمولاً از طریق **Setup Node.js App** یا moduleهای CloudLinux نسخه را فعال می‌کنید. سپس در Terminal:

```bash
node -v
npm -v
```

نسخه پیشنهادی برای این پروژه: **Node.js 20+** (ترجیحاً 22).

### ۴-۲. نصب تمیز dependencyها

روش توصیه‌شده (با `package-lock.json`):

```bash
npm ci
```

اگر به هر دلیل `npm ci` خطا داد:

```bash
rm -rf node_modules
npm install
```

### ۴-۳. Build پروژه

```bash
npm run build
```

خروجی داخل `dist/` ساخته می‌شود (`index.html`, `assets/`, `sw.js`, `manifest.webmanifest`, ...).

بررسی سریع:

```bash
ls -la dist
test -f dist/index.html && echo "Build OK"
```

### ۴-۴. قرار دادن خروجی در مسیر وب

#### حالت A — سورس داخل `public_html/sudoku` است

Document Root ساب‌دامین/فولدر را روی `.../sudoku/dist` بگذارید، **یا** محتویات `dist` را به ریشه وب کپی کنید:

```bash
# مثال: سرو مستقیم از dist با کپی به public_html
rsync -av --delete ./dist/ ~/public_html/
```

اگر فقط داخل ساب‌فولدر باید دیده شود:

```bash
mkdir -p ~/public_html/sudoku-live
rsync -av --delete ./dist/ ~/public_html/sudoku-live/
```

#### حالت B — سورس خارج از web root (پیشنهادی)

```bash
# مثال مسیر سورس
cd ~/apps/MySudoku
git pull origin main
npm ci
npm run build
rsync -av --delete ./dist/ ~/public_html/
```

---

## چک‌لیست سریع «آپدیت کامل» بعد از هر Push لوکال

```bash
cd ~/apps/MySudoku
# یا مسیر واقعی پروژه روی هاست

git fetch origin
git reset --hard origin/main
npm ci
npm run build
rsync -av --delete ./dist/ ~/public_html/
```

اگر فقط Pull کافی است و conflict ندارید:

```bash
cd ~/apps/MySudoku
git pull origin main
npm ci
npm run build
rsync -av --delete ./dist/ ~/public_html/
```

---

## عیب‌یابی رایج

| مشکل | کار پیشنهادی |
|------|---------------|
| `Permission denied (publickey)` | Deploy Key را دوباره چک کنید؛ `ssh -T git@github.com` |
| `npm: command not found` | Node.js App را در cPanel فعال کنید و Terminal را دوباره باز کنید |
| سایت قدیمی می‌ماند | مطمئن شوید Document Root به `dist` یا کپی تازه از `dist` اشاره دارد |
| PWA/کش قدیمی | یک‌بار Hard Refresh یا Clear Site Data در مرورگر |
| خطای `npm ci` | `rm -rf node_modules && npm install` |

---

## یادآوری امنیتی

- کلید خصوصی (`~/.ssh/id_rsa`) را هرگز در GitHub یا چت قرار ندهید.
- فقط **Public Key** را به Deploy Keys اضافه کنید.
- اگر از GitHub Actions + FTPS هم استفاده می‌کنید، این راهنمای Terminal جایگزین آن است؛ هر دو را هم‌زمان روی یک مسیر وب با احتیاط هماهنگ کنید تا روی هم overwrite ناخواسته ننویسند.

---

**توسعه‌دهنده و معمار:** [Danial Bakhtiari](https://danialbakhtiari.com)
