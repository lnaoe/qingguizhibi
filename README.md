# 情归纸笔

情归纸笔是一个以书信为核心媒介，帮助人们低压力认识陌生人、分享生活、交换思想并建立长期笔友关系的平台。

不是让你认识更多的人，而是让你真正认识一个人。

## 环境要求

- Node.js 20.19 或更高版本
- pnpm 11.25.0

## 本地开发

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000)。

## 环境变量

复制 `.env.example` 为 `.env.local`，按需调整：

```dotenv
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_SECRET=replace-with-a-long-random-string
```

未设置时，本地开发默认使用 `http://localhost:3000`。

`BETTER_AUTH_SECRET` 用于签名认证会话，必须保持私密，生产环境请使用足够长的随机字符串。

## 认证

认证由 [Better Auth](https://www.better-auth.com/) 提供，服务端入口为
`/api/auth/*`，支持邮箱密码注册、登录、登出和会话查询。密码哈希只存储在独立的
`auth_account` 表中，不写入业务的 `users` 表。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm test:watch
```

## 目录结构

```text
src/
  app/       页面路由、布局和全局样式
  lib/       公共基础设施
```

业务页面、服务、数据访问、schema 和类型会在对应 Task 实现时按需加入。
