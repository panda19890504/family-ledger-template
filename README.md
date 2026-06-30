# 家庭账本模板

这是一个可以自己 fork、自己部署、自己保存数据的家庭记账 PWA。它适合一家人在 Mac、Windows、iPhone 或其他手机上共同记录日常收入/支出，并按月份、类别、成员、币种做分析。

这个仓库是公开模板，不包含任何私人账本、Excel 原始文件、迁移包、环境变量或部署账号。

## 先看结论

你有两种用法：

| 用法 | 适合谁 | 数据保存在哪里 | 能不能多设备同步 |
| --- | --- | --- | --- |
| 本机试用 | 只想先点开看看 | 当前浏览器 `localStorage` | 不能 |
| 云端家庭账本 | 真正日常使用 | Supabase 数据库 | 能 |

建议路线：先本机试用 5 分钟，确认界面适合你，再配置 Supabase + Cloudflare 做成自己的云端账本。

## 需要注册哪些账号

| 服务 | 地址 | 用来做什么 |
| --- | --- | --- |
| GitHub | [github.com](https://github.com) | fork 这个模板，保存你自己的代码副本 |
| Supabase | [supabase.com](https://supabase.com) | 保存账本数据，发送登录验证码 |
| Cloudflare | [dash.cloudflare.com](https://dash.cloudflare.com) | 部署网页，让手机和电脑都能访问 |
| Gmail / Google 账号 | [myaccount.google.com](https://myaccount.google.com) | 可选：用自己的 Gmail SMTP 发送验证码 |

GitHub、Supabase、Cloudflare 都可以先用免费档。Gmail SMTP 不是必须；Supabase 自带邮件可以先测试，但正式给家人用时建议配置自己的发信服务，否则可能遇到发送频率限制或邮件送达不稳定。

官方文档参考：

- GitHub fork：[Fork a repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)
- GitHub 同步 fork：[Syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
- Supabase 邮箱验证码：[Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- Supabase 邮件模板：[Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- Supabase 自定义 SMTP：[Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- Supabase + Gmail SMTP：[Using Google SMTP with Supabase Custom SMTP](https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y)
- Cloudflare Workers 静态资源：[Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- Google 应用专用密码：[Sign in with app passwords](https://support.google.com/accounts/answer/185833)

## 第一次使用：从 fork 开始

### 1. Fork 这个仓库

1. 打开这个模板仓库的 GitHub 页面。
2. 点击右上角 `Fork`。
3. Owner 选择你自己的 GitHub 账号。
4. Repository name 可以继续叫 `family-ledger-template`，也可以改成 `family-ledger`。
5. 点击 `Create fork`。

为什么要 fork：以后你的账本配置、部署设置、改动都在你自己的仓库里，不会影响原始模板。以后模板更新时，你也可以从原始仓库同步新版代码。

### 2. 下载到自己的电脑

推荐不会命令行的朋友用 [GitHub Desktop](https://desktop.github.com/)：

1. 安装 GitHub Desktop。
2. 登录 GitHub。
3. 选择 `File` -> `Clone repository`。
4. 找到你刚 fork 的仓库，Clone 到本地。

会命令行也可以：

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
```

把 `YOUR-USERNAME` 和 `YOUR-REPO` 换成你自己的 GitHub 用户名和仓库名。

### 3. 安装 Node.js

安装 Node.js LTS：[nodejs.org](https://nodejs.org/)

装完后打开终端检查：

```bash
node -v
npm -v
```

能显示版本号就可以继续。

## 本机试用模式

本机试用不需要 Supabase，也不需要 Cloudflare。它只把数据存在当前浏览器里，适合先体验界面。

### Mac

在项目文件夹里双击：

```text
Start-Ledger.command
```

如果系统提示没有权限，打开终端进入项目目录后执行一次：

```bash
chmod +x Start-Ledger.command
```

然后再双击。

### Windows

在项目文件夹里双击：

```text
Start-Ledger.bat
```

如果想放一个桌面快捷方式，双击：

```text
Create-Windows-Shortcut.bat
```

### 通用命令行方式

```bash
npm install
npm run dev
```

浏览器打开终端里显示的本地地址，通常是：

```text
http://localhost:5173
```

没有配置 `.env.local` 时，页面左侧会显示“本机试用”。这时数据不会同步到其他设备。

## 云端同步模式

云端模式需要 4 步：

1. 建 Supabase 项目。
2. 跑数据库 SQL。
3. 配置 `.env.local`。
4. 部署到 Cloudflare。

### 1. 创建 Supabase 项目

1. 打开 [supabase.com](https://supabase.com)，登录。
2. 点击 `New project`。
3. Organization 选择默认的即可。
4. Project name 可以写 `family-ledger`。
5. Region 选择离你和家人更近的区域。
6. Database password 生成一个强密码，并保存在你自己的密码管理器里。
7. 等项目创建完成。

不要把 Database password 写进 README、聊天记录或 GitHub。

### 2. 运行数据库 SQL

在 Supabase 项目后台：

1. 打开左侧 `SQL Editor`。
2. 点击 `New query`。
3. 打开本项目的 `supabase/migrations/` 文件夹。
4. 按文件名从小到大依次复制 SQL 内容，粘贴到 SQL Editor 并运行。

当前顺序是：

```text
202606220001_initial_schema.sql
202606230001_ensure_default_categories.sql
202606230002_grant_authenticated_table_access.sql
202606240001_household_invites.sql
202606240002_household_management.sql
202606260001_transaction_billed_amount.sql
202606300001_category_management.sql
```

为什么要按顺序：后面的 SQL 会依赖前面创建好的表、权限和函数。顺序错了可能报错。

跑完后，数据库会有家庭、成员、类别、汇率、交易记录等表，并启用 RLS 权限控制。用户只能看到自己所属家庭的数据。

### 3. 配置 Supabase 登录验证码

这个项目使用邮箱验证码登录，不需要密码。登录流程是：

1. 用户输入邮箱。
2. Supabase 发验证码。
3. 用户回到账本页面输入验证码。
4. 登录成功。

在 Supabase 后台检查：

1. 打开 `Authentication` -> `Sign In / Providers`。
2. 确认 Email provider 是开启状态。
3. 打开 `Authentication` -> `Email Templates`。
4. 找到 `Magic Link` 或 OTP 相关模板。
5. 模板正文里必须包含：

```text
{{ .Token }}
```

可以用这种简单文案：

```html
<h2>家庭账本验证码</h2>
<p>请输入这个验证码登录家庭账本：</p>
<p style="font-size: 28px; font-weight: 700;">{{ .Token }}</p>
```

为什么不用点击链接：iPhone 加到主屏幕后，点击邮件里的 magic link 可能打开 Safari，而不是回到桌面 App 窗口。输入验证码更稳定，家人也更容易理解。

### 4. 可选：用 Gmail 发送验证码

可以先跳过这一步，用 Supabase 默认邮件测试。如果验证码收不到、进垃圾箱，或以后家人使用频率变高，再配置自定义 SMTP。

如果要用 Gmail：

1. 打开 [Google Account Security](https://myaccount.google.com/security)。
2. 开启 2-Step Verification。
3. 创建 App Password。
4. 回到 Supabase，打开 `Authentication` -> `SMTP Settings` 或 `Emails` -> `SMTP`。
5. 启用 Custom SMTP。
6. 填写：

```text
Host: smtp.gmail.com
Port: 465 或 587
Username: 你的 Gmail 地址
Password: Google App Password
Sender email: 同一个 Gmail 地址
Sender name: 家庭账本
```

注意：

- App Password 只显示一次，保存到你的密码管理器，不要提交到 GitHub。
- Gmail 更适合小范围家庭使用。多人频繁登录时，Resend、Postmark、SendGrid、Mailgun 这类事务邮件服务更稳。
- 如果发送失败，先看 Supabase 的 Auth logs，再检查 Gmail 是否开启了 2-Step Verification 和 App Password。

### 5. 找到 Supabase URL 和 anon key

在 Supabase 后台：

1. 打开 `Project Settings`。
2. 打开 `API`。
3. 复制 `Project URL`。
4. 复制 `anon public` key。

在项目根目录复制环境变量文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```text
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的 anon public key
```

`anon public key` 会被前端使用，本身不是数据库密码；真正的数据安全靠 Supabase RLS。即便如此，`.env.local` 仍然不要提交，因为它绑定的是你自己的项目。

### 6. 本地测试云端登录

```bash
npm install
npm run dev
```

打开：

```text
http://localhost:5173
```

测试流程：

1. 输入你的邮箱。
2. 收验证码。
3. 回到账本页面输入验证码。
4. 第一次登录会自动创建“我的家庭”。
5. 进入 `设置`，可以改家庭名称、邀请家人。

邀请家人的方式：

1. 账本 owner 进入 `设置`。
2. 在成员区域输入家人的邮箱。
3. 对方用同一个邮箱登录。
4. 登录后会自动加入这个家庭账本。

## 部署到 Cloudflare

本地测试通过后，再部署。部署成功后，你会得到一个公开网址，家人以后都打开这个网址使用。

### 1. 登录 Cloudflare

```bash
npx wrangler login
```

浏览器会打开 Cloudflare 授权页面，登录并授权。

### 2. 修改 Worker 名称

打开 `wrangler.jsonc`，把：

```jsonc
"name": "family-ledger-template"
```

改成你自己的名字，例如：

```jsonc
"name": "my-family-ledger"
```

为什么要改：Cloudflare Worker 名称会影响默认访问地址。每个人用自己的名字，避免和模板名混在一起。

### 3. 部署

```bash
npm run deploy
```

这个命令会先构建前端，再用 Wrangler 发布到 Cloudflare Workers。

部署完成后，终端会显示类似：

```text
https://my-family-ledger.YOUR-SUBDOMAIN.workers.dev
```

把这个网址发给家人。家人不需要 GitHub、Node.js、Supabase、Cloudflare 账号，只需要打开网址，用自己的邮箱收验证码登录。

## iPhone 如何配置

推荐用 Safari 安装成主屏幕 App。

1. 在 iPhone 上用 Safari 打开你的 Cloudflare 账本网址。
2. 点击底部分享按钮。
3. 选择 `添加到主屏幕`。
4. 名称可以写 `家庭账本`。
5. 点击 `添加`。

以后从桌面图标打开，会像一个独立 App。

登录时：

1. 输入邮箱。
2. 打开 Mail 或 Gmail App 看验证码。
3. 回到“家庭账本”输入 8 位验证码。

建议：

- 不要在无痕/私人浏览模式里使用。
- 如果验证码没收到，先看垃圾邮件。
- 如果页面一直停在旧版本，关闭主屏幕 App 后重开，或在 Safari 里重新打开一次网址。
- 如果换了 iPhone，只要重新打开网址、添加到主屏幕、用同一个邮箱登录即可。

## Mac / Windows / Android 怎么用

云端部署后，任何设备都打开同一个 Cloudflare 网址。

- Mac：Safari、Chrome、Edge 都可以。
- Windows：Chrome、Edge 都可以。
- Android：Chrome 打开后可以从菜单选择 `Add to Home screen`。

本机试用脚本只适合你自己开发或体验，不适合给家人长期使用。长期使用请发 Cloudflare 网址。

## 日常使用

主要页面：

| 页面 | 用途 |
| --- | --- |
| 记一笔 | 快速录入收入、支出、换汇、贷款、转账等 |
| 明细 | 查看某个月的流水 |
| 分析 | 看月度、分类、币种等统计 |
| 设置 | 管理家庭、成员、类别、汇率、导出备份 |

类别可以在 `设置` 里新增、改名、停用。默认类别只是起点，不需要完全照着用。

## 备份和安全

不要提交这些文件：

```text
.env.local
个人 Excel 账本
迁移包
导出的备份
dist/
outputs/
```

日常建议：

- 定期在 `设置` 里导出 JSON 备份。
- 数据库密码、Gmail App Password、Cloudflare token 只放密码管理器。
- 家人不要共用一个账号；每个人用自己的邮箱登录。
- 如果有人不再使用账本，后续版本应在成员管理里移除访问权限；在支持移除前，可以在 Supabase 后台处理成员表。

## 以后模板有新版，如何刷新

你的账本数据在 Supabase，不在 GitHub 代码里。更新代码通常不会删除数据，但仍建议先导出 JSON 备份。

### 简单方式：GitHub 网页同步

1. 打开你 fork 后的 GitHub 仓库。
2. 如果页面提示 `This branch is behind`，点击 `Sync fork`。
3. 点击 `Update branch`。
4. 回到电脑，用 GitHub Desktop 点 `Fetch origin` / `Pull origin`。
5. 在项目目录运行：

```bash
npm install
npm run build
```

如果新版包含新的 SQL 文件：

1. 打开 `supabase/migrations/`。
2. 找出你以前没运行过的新文件。
3. 按文件名顺序在 Supabase SQL Editor 里运行。
4. 再部署：

```bash
npm run deploy
```

### 命令行方式

第一次配置 upstream：

```bash
git remote add upstream https://github.com/ORIGINAL-OWNER/family-ledger-template.git
```

以后更新：

```bash
git fetch upstream
git merge upstream/main
npm install
npm run build
```

把 `ORIGINAL-OWNER` 换成原始模板仓库的 owner。

如果有冲突，不要硬合并。先备份，再找懂 Git 的朋友处理。

## 常见问题

### 页面显示“本机试用”，不是“家庭云端”

说明没有读到 Supabase 配置。检查：

- `.env.local` 是否在项目根目录。
- `VITE_SUPABASE_URL` 是否填写。
- `VITE_SUPABASE_ANON_KEY` 是否填写。
- 改完 `.env.local` 后是否重启了 `npm run dev`。

### 验证码收不到

按顺序查：

1. 垃圾邮件。
2. 邮箱是否输错。
3. Supabase `Authentication` -> `Logs`。
4. Email template 是否包含 `{{ .Token }}`。
5. 如果用 Gmail SMTP，检查 2-Step Verification、App Password、SMTP host/port。

### 运行 SQL 报错

最常见原因是顺序错了，或者同一个 SQL 重复运行造成对象已存在。

处理方式：

- 先确认是否按文件名从小到大运行。
- 如果是 `already exists`，看对象是否已经创建成功。
- 如果不确定，截图错误信息再处理，不要随便删除表。

### 部署后网页打开是 404

检查 `wrangler.jsonc` 里是否保留了：

```jsonc
"assets": {
  "not_found_handling": "single-page-application"
}
```

这个配置是为了让刷新页面或从主屏幕打开时仍然回到前端应用。

### 换电脑怎么继续开发

1. 在新电脑安装 Node.js 和 GitHub Desktop。
2. Clone 你的 fork。
3. 从旧电脑或密码管理器恢复 `.env.local`。
4. 运行：

```bash
npm install
npm run dev
```

### 家人需要安装什么

不需要安装开发工具。家人只需要：

1. 打开 Cloudflare 网址。
2. 用被邀请的邮箱收验证码登录。
3. iPhone 用户用 Safari 添加到主屏幕。

## 开发命令

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run deploy
```

没有 `.env.local` 时是本机试用模式；填了 Supabase 配置后是云端同步模式。
