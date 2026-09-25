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
| Supabase | [supabase.com](https://supabase.com) | 保存账本数据，生成登录验证码 |
| Cloudflare | [dash.cloudflare.com](https://dash.cloudflare.com) | 部署网页，让手机和电脑都能访问 |
| Gmail / Google 账号 | [myaccount.google.com](https://myaccount.google.com) | 用自己的 Gmail SMTP 发送验证码 |

GitHub、Supabase、Cloudflare 都可以先用免费档。关键点：Supabase 免费项目可以用，但不要依赖 Supabase 默认发信服务做验证码登录。Supabase 官方说明内置邮件服务主要用于演示，发送限制很低且可用性是 best-effort；这个账本要给家人稳定使用，应配置 Gmail SMTP 或其他自定义 SMTP。

官方文档参考：

- GitHub fork：[Fork a repository](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/fork-a-repo)
- GitHub 同步 fork：[Syncing a fork](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork)
- Supabase 邮箱验证码：[Passwordless email logins](https://supabase.com/docs/guides/auth/auth-email-passwordless)
- Supabase 邮件模板：[Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- Supabase 自定义 SMTP：[Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- Supabase Auth Rate Limits：[Rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- Supabase API URL 和 API keys：[Data REST API](https://supabase.com/docs/guides/api)
- Supabase + Gmail SMTP：[Using Google SMTP with Supabase Custom SMTP](https://supabase.com/docs/guides/troubleshooting/using-google-smtp-with-supabase-custom-smtp-ZZzU4Y)
- Cloudflare Workers 静态资源：[Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- Cloudflare Wrangler：[Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- Cloudflare workers.dev 域名：[workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- Cloudflare 自定义域名：[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
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

Node.js 是本地运行和部署这个账本需要的工具。家人只打开 Cloudflare 网址使用时不需要安装；只有负责配置、部署、更新的人需要装。

最稳妥的方式是去 [nodejs.org](https://nodejs.org/) 下载 `LTS` 版本安装包。安装完后关闭终端，再重新打开一次。

#### Mac 安装

不会命令行：打开 [nodejs.org](https://nodejs.org/)，下载 macOS 的 `LTS` 安装包，一路下一步安装。

会命令行，并且已经装了 Homebrew：

```bash
brew install node
```

如果 Mac 还没有 Homebrew，先安装 Homebrew：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

然后再运行：

```bash
brew install node
```

#### Windows 安装

不会命令行：打开 [nodejs.org](https://nodejs.org/)，下载 Windows 的 `LTS` 安装包，一路下一步安装。

会命令行：打开 PowerShell 或 Windows Terminal，运行：

```powershell
winget install OpenJS.NodeJS.LTS
```

如果提示找不到 `winget`，先从 Microsoft Store 更新或安装 `App Installer`，然后重新打开 PowerShell。

Windows 还需要 Microsoft Visual C++ Redistributable。这个项目里的 `Start-Ledger.bat` 会先检查，缺了会询问是否自动安装/更新。也可以提前手动安装：

```powershell
winget install -e --id Microsoft.VCRedist.2015+.x64
winget install -e --id Microsoft.VCRedist.2015+.x86
```

为什么要装 VC++ 运行库：有些朋友的 Windows 没有完整运行库，Node 或依赖启动时会直接失败。先补 x64 和 x86 两个包，能减少双击脚本打不开的问题。

#### 检查是否安装成功

Mac 打开 Terminal，运行：

```bash
node -v
npm -v
```

Windows 打开 PowerShell，运行：

```powershell
node -v
npm.cmd -v
```

Windows 这里推荐写 `npm.cmd -v`，不要写 `npm -v`。有些电脑的 PowerShell 会优先运行 `npm.ps1`，然后因为执行策略报错。这个不是 npm 没装好，而是 PowerShell 安全策略拦住了脚本。

如果你确实想在 PowerShell 里直接运行 `npm -v`，可以执行一次：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

能显示版本号就可以继续。如果刚安装完还显示找不到命令，先关闭终端窗口再重新打开。

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

### 3. 配置 Supabase Auth 邮箱验证码

这个项目使用邮箱验证码登录，不需要密码。验证码由 Supabase Auth 生成，但邮件要通过你配置的 Gmail SMTP 发出；不要依赖 Supabase 默认发信服务。登录流程是：

1. 用户输入邮箱。
2. Supabase Auth 生成验证码，并通过 Gmail SMTP 发送邮件。
3. 用户回到账本页面输入验证码。
4. 登录成功。

在 Supabase 后台检查两个邮件模板。这里先设置模板，下一步再配置 Gmail SMTP 发信：

1. 打开 `Authentication` -> `Sign In / Providers`。
2. 确认 Email provider 是开启状态。
3. 打开 `Authentication` -> `Email Templates`。
4. 打开 `Confirm sign up` 模板，保留确认链接。第一个账户首次注册时，Supabase 可能先发这封确认注册邮件，需要点击链接激活账户。
5. 打开 `Magic Link` 或 OTP 相关模板，模板正文里必须包含：

```text
{{ .Token }}
```

可以用这种简单文案：

```html
<h2>家庭账本验证码</h2>
<p>请输入这个验证码登录家庭账本：</p>
<p style="font-size: 28px; font-weight: 700;">{{ .Token }}</p>
```

首次账户激活和日常验证码是两件事：

- `Confirm sign up`：第一次注册/激活账户时可能收到，按邮件链接点一次。
- `Magic Link or OTP`：日常登录用，邮件里应该显示验证码，让用户回到账本页面输入。

为什么日常登录不用点击 magic link：iPhone 加到主屏幕后，点击邮件里的 magic link 可能打开 Safari，而不是回到桌面 App 窗口。输入验证码更稳定，家人也更容易理解。

### 4. 配置 Gmail 发送验证码

这一步不要跳过。Supabase 默认邮件服务只适合临时演示，免费项目的内置发信限制太低，家人一登录或多试几次就可能遇到验证码发不出来。实际使用请配置 Gmail SMTP。

配置 Gmail：

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
- 这里用的是 Google App Password，不是你的 Gmail 登录密码。
- Gmail 更适合小范围家庭使用。多人频繁登录时，Resend、Postmark、SendGrid、Mailgun 这类事务邮件服务更稳。
- 如果发送失败，先看 Supabase 的 Auth logs，再检查 Gmail 是否开启了 2-Step Verification 和 App Password。
- 配好 SMTP 后，去 Supabase 的 `Authentication` -> `Rate Limits` 检查邮件/OTP 发送限制。自定义 SMTP 才能把限制调到适合自己家庭使用的范围。
- Gmail 发出的验证码邮件可能进垃圾邮件。第一次测试时，收件箱和垃圾邮件都看一下；如果进了垃圾邮件，把发件人标记为“不是垃圾邮件”。

### 5. 找到 Supabase URL 和 anon key

在 Supabase 后台：

1. 打开 `Project Settings`。
2. 打开 `General`，找到 `Project ID` 或 `Reference ID`。
3. 你的 Supabase URL 按这个格式填写：

```text
https://PROJECT_ID.supabase.co
```

例如 Project ID 是 `abcd1234xyz`，那 URL 就是：

```text
https://abcd1234xyz.supabase.co
```

4. 打开 `Project Settings` -> `API Keys`，复制 `anon public` key 或 `publishable` key。

如果你的 Supabase 后台还有 `Integrations` -> `Data API` 页面，也可以在那里直接找到 API URL；它和上面用 Project ID 拼出来的 URL 是同一个用途。

在项目根目录复制环境变量文件：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```text
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=你的 anon public key
```

`anon public key` / `publishable key` 会被前端使用，本身不是数据库密码；真正的数据安全靠 Supabase RLS。不要使用 `service_role`、`secret` 或任何后台管理密钥。`.env.local` 也不要提交，因为它绑定的是你自己的项目。

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
2. 如果这是这个邮箱第一次使用，可能先收到 `Confirm sign up` 邮件，点链接激活账户。
3. 回到账本页面，再输入邮箱收验证码。
4. 收到验证码后，回到账本页面输入验证码。
5. 第一次登录成功会自动创建“我的家庭”。
6. 进入 `设置`，可以改家庭名称、邀请家人。

邀请家人的方式：

1. 账本 owner 进入 `设置`。
2. 在成员区域输入家人的邮箱。
3. 对方用同一个邮箱登录。
4. 登录后会自动加入这个家庭账本。

## 第一次配置 Cloudflare

本地测试通过后，再部署到 Cloudflare。部署成功后，你会得到一个公开网址，家人以后都打开这个网址使用。

这个项目使用 Cloudflare Workers Static Assets。你不需要先在 Cloudflare 网页后台手动创建 Worker；第一次运行 `npm run deploy` 时，Wrangler 会根据 `wrangler.jsonc` 创建并发布。

### 1. 注册并登录 Cloudflare

1. 打开 [dash.cloudflare.com](https://dash.cloudflare.com)。
2. 用邮箱或 Google 账号注册/登录。
3. 如果 Cloudflare 询问用途，选择个人或 hobby 项目即可。
4. 不需要先添加自己的域名；免费 `workers.dev` 地址已经够家庭使用。

为什么先用 `workers.dev`：它不需要买域名、不需要改 DNS，第一次部署最少步骤。以后想换成 `ledger.yourdomain.com`，再配置自定义域名。

### 2. 在本地登录 Wrangler

先进入项目根目录：

```bash
cd YOUR-REPO
```

把 `YOUR-REPO` 换成你下载后的项目文件夹。

然后登录 Wrangler：

```bash
npx wrangler login
```

浏览器会打开 Cloudflare 授权页面：

1. 选择你的 Cloudflare 账号。
2. 点击授权。
3. 回到终端，看到登录成功即可。

如果浏览器没有自动打开，可以把终端里显示的链接复制到浏览器。

确认 Wrangler 已经登录成功：

```bash
npx wrangler whoami
```

能看到你的 Cloudflare 账号信息，就可以继续部署。

### 3. 确认 workers.dev 子域名

第一次部署时，如果 Cloudflare 账号还没有 `workers.dev` 子域名，Wrangler 或 Cloudflare 后台可能会提示你设置一个。

子域名格式是：

```text
YOUR-SUBDOMAIN.workers.dev
```

例如你设置成：

```text
laoka-ledger.workers.dev
```

以后这个账号下的 Worker 默认地址会类似：

```text
WORKER-NAME.laoka-ledger.workers.dev
```

如果需要在 Cloudflare 后台手动确认：

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 找到 `Your subdomain`。
4. 如果还没设置，按页面提示设置一个容易识别的名字。

### 4. 修改 Worker 名称

打开项目里的 `wrangler.jsonc`。Windows 可以在项目根目录运行：

```powershell
notepad .\wrangler.jsonc
```

Mac 可以用自己常用的编辑器打开这个文件。

找到：

```jsonc
"name": "family-ledger-template"
```

改成你自己的名字。最简单的做法是去掉 `-template`：

```jsonc
"name": "family-ledger"
```

也可以改成其他名字，例如：

```jsonc
"name": "my-family-ledger"
```

为什么要改：Cloudflare Worker 名称会影响默认访问地址。默认地址通常是：

```text
https://WORKER-NAME.YOUR-SUBDOMAIN.workers.dev
```

每个人用自己的名字，避免和模板名混在一起。

命名建议：

- 只用小写字母、数字和短横线。
- 不要放姓名、生日、地址等隐私信息。
- 例如 `my-family-ledger`、`home-ledger`、`ledger-2026`。

### 5. 第一次部署

```bash
npm run deploy
```

这个命令会先构建前端，再用 Wrangler 发布到 Cloudflare Workers。

部署完成后，终端会显示类似：

```text
https://my-family-ledger.YOUR-SUBDOMAIN.workers.dev
```

也可以回到 Cloudflare 网页后台查看：

1. 打开 `Workers & Pages`。
2. 找到刚部署出来的 Worker。
3. 页面里会显示这个 Worker 的 `workers.dev` 地址或 subdomain。
4. 最终完整网址通常是：

```text
https://WORKER-NAME.YOUR-SUBDOMAIN.workers.dev
```

打开这个网址测试：

1. 页面能打开。
2. 输入邮箱能收到验证码。
3. 登录后能看到“家庭云端”。
4. 新增一笔测试记录，刷新后还在。

确认没问题后，把这个网址发给家人。家人不需要 GitHub、Node.js、Supabase、Cloudflare 账号，只需要打开网址，用自己的邮箱收验证码登录。

### 6. 以后怎么重新部署

以后改了代码、同步了模板新版，或者改了 `wrangler.jsonc`，只需要在项目目录运行：

```bash
npm run deploy
```

同一个 Worker 名称会覆盖发布新版网页，不会删除 Supabase 里的账本数据。

### 7. 可选：绑定自己的域名

如果你有自己的域名，可以以后再绑定，例如：

```text
ledger.example.com
```

大致路径：

1. 先把域名加入 Cloudflare。
2. 打开 `Workers & Pages`。
3. 选择这个账本 Worker。
4. 进入 `Settings` -> `Domains & Routes`。
5. 添加 Custom Domain。

普通家庭使用可以先不做这一步。`workers.dev` 地址已经能正常添加到 iPhone 主屏幕。

### Cloudflare 常见问题

如果 `npx wrangler login` 后没有反应：

- 确认浏览器已经完成授权。
- 关闭终端重新打开，再运行一次。
- 公司电脑或代理网络可能拦截授权页，换家庭网络试一次。

如果第一次部署后访问 `workers.dev` 出现短暂错误：

- 等 1 分钟再刷新。
- Cloudflare 第一次分配地址可能需要一点时间。

如果终端提示 Worker 名称已经被占用：

- 修改 `wrangler.jsonc` 里的 `name`。
- 换一个更独特的名字后重新运行 `npm run deploy`。

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
- 如果右上角出现红色“有新版本”，先保存正在填写的内容，再点击它更新。如果暂时没有提示，关闭主屏幕 App 后重开，或在 Safari 里重新打开一次网址。
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

### Windows 更新手机端网页

如果只是把 GitHub 上的新版本发布到 iPhone/手机端，按这个流程：

1. 打开 GitHub Desktop。
2. 选择自己的账本仓库。
3. 点击 `Fetch origin`。
4. 如果出现更新，点击 `Pull origin`。
5. 打开 PowerShell。
6. 进入项目目录，例如：

```powershell
cd C:\Users\你的用户名\Documents\GitHub\family-ledger
```

7. 如果这次更新改了依赖，先运行：

```powershell
npm install
```

8. 发布到 Cloudflare：

```powershell
npm run deploy
```

部署完成后，iPhone 或其他手机打开原来的 Cloudflare 网址就是新版。若右上角出现红色“有新版本”，先保存正在填写的内容，再点击它更新；如果暂时没有提示，关闭主屏幕 App 后重新打开，或用 Safari 打开 Cloudflare 网址刷新一次；必要时等 1 分钟。

注意：

- 命令是 `npm run deploy`，不是 `depoly`。
- 这台 Windows 电脑需要已经运行过 `npx wrangler login`，并且 `npx wrangler whoami` 能看到 Cloudflare 账号。
- `wrangler.jsonc` 里的 `"name"` 要保持自己的 Worker 名称，不要改回模板名。

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
5. 是否已经配置 Custom SMTP。不要依赖 Supabase 默认发信服务。
6. 如果用 Gmail SMTP，检查 2-Step Verification、App Password、SMTP host/port。
7. Gmail 是否把验证码邮件放进垃圾邮件。
8. Supabase `Authentication` -> `Rate Limits` 是否过低。

### Windows 双击脚本打不开

按顺序查：

1. 是否安装 Node.js LTS。
2. 是否安装 Microsoft Visual C++ Redistributable x64 和 x86。
3. 如果 PowerShell 里 `npm -v` 报 `npm.ps1 cannot be loaded`，改用 `npm.cmd -v` 检查，或执行：

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

4. 重新双击 `Start-Ledger.bat`。

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
