# 情归纸笔 | QingGui Paper

> 写一封信，认识一个人。

一个以书信为核心媒介的慢社交平台，帮助人们低压力地认识陌生人，并通过长期通信建立真实、有温度的人际连接。
不是让你认识更多的人，而是让你真正认识一个人。
---

## 📖 项目介绍

在即时通讯和碎片化社交成为主流的今天，人们可以快速认识很多人，却越来越难真正理解一个人。

**情归纸笔（QingGui Paper）** 希望重新探索人与人连接的方式。

它不是一个聊天软件，也不是一个约会匹配平台，而是一个围绕「书信」「陌生人」「长期关系」建立的笔友平台。

用户通过个人资料、兴趣和交流偏好寻找适合自己的笔友，从第一封信开始，在时间和文字中逐渐了解彼此。

> **North Star：不是让你认识更多的人，而是让你真正认识一个人。**

---

# ✨ 产品理念

情归纸笔相信：

- 真正的连接需要时间
- 文字能够承载比即时消息更多的情感
- 等待和回应本身也是交流的一部分

因此，产品刻意避免：

- 即时聊天
- 在线状态
- 信息流
- 点赞关注
- 热度排行
- 快速社交刺激

而专注于：

> 发现一个人 → 写第一封信 → 等待回应 → 持续交流 → 建立长期关系

---

# 🎯 核心用户

主要面向：

- 希望认识陌生人的用户
- 不喜欢高频即时社交的人
- 希望表达自己、分享生活的人
- 渴望长期关系而非短暂互动的人

核心需求：

- 找到理解自己的人
- 通过文字表达自我
- 建立稳定、有深度的连接

---

# 🚀 核心功能

## 👤 用户画像

用户通过 onboarding 创建自己的笔友档案：

- 昵称
- 头像
- 国家/地区
- 城市
- 年龄范围
- 兴趣标签
- 自我介绍
- 寻找笔友的原因

帮助系统理解用户，也帮助其他人认识用户。

---

## 🔍 笔友发现

用户可以浏览推荐笔友：

- 查看公开资料
- 查看兴趣标签
- 查看交流动机
- 搜索和筛选笔友

推荐逻辑采用：

```
共同兴趣匹配
+
基础条件匹配
+
随机扰动
```

MVP 阶段不引入复杂推荐系统。

---

## 💌 第一封信

情归纸笔的核心体验。

用户不是发送好友请求，而是：

> 用一封信开始一次相遇。

第一封信同时作为：

- 初次联系
- 笔友请求
- 关系建立入口

---

## 📬 信箱系统

支持：

- 收到的信
- 寄出的信
- 草稿
- 信件详情
- 回复信件

所有信件仅允许通信双方访问。

---

## 🤝 笔友关系

建立关系后：

用户可以：

- 查看笔友列表
- 查看通信记录
- 继续写信
- 结束关系

系统记录双方关系生命周期。

---

## 🛡️ 安全机制

平台包含：

- 举报
- 屏蔽
- 权限控制
- 用户状态管理

保护用户在陌生关系中的安全。

---

# 🧭 用户流程

核心用户路径：

```
注册

↓

Onboarding

↓

首页

↓

发现笔友

↓

查看笔友详情

↓

写第一封信

↓

寄出

↓

等待回应

↓

收到来信

↓

回复

↓

建立长期笔友关系
```

---

# 🎨 Design System

## 设计方向

整体体验：

> 现代产品设计 × 纸张质感 × 轻微人文气息

关键词：

- 温暖
- 安静
- 真诚
- 克制
- 手写感
- 时间感

避免：

- 强渐变
- 过度游戏化
- 信息流设计
- 过度复古拟物

---

## 视觉规范

颜色：

```
Paper      #F8F5EF
Paper Deep #F1ECE3
Ink        #3B3632
Seal       #9A5145
Green      #657A68
Blue       #657486
Gold       #B29563
```

字体：

- Noto Sans SC
- PingFang SC
- Microsoft YaHei
- Noto Serif SC

---

# 🏗️ 技术架构

采用简单、可维护的 MVP 架构：

```
Client

 ↓

API / Server

 ↓

Service Layer

 ↓

Repository

 ↓

Database
```

---

## 前端职责

负责：

- 页面
- UI组件
- 表单
- 客户端状态

设计原则：

- API集中管理
- loading/error/empty状态完整
- mobile first

---

## 后端职责

Service 层负责：

- 笔友请求
- 关系管理
- 信件生命周期
- 通知
- 举报
- 屏蔽
- 业务规则

---

# 🗄️ 数据模型

核心数据结构：

```
users
 |
profiles
 |
interests

users
 |
penpal_requests
 |
letters
 |
penpal_relationships
```

主要实体：

## User

用户账号

## Profile

用户公开资料：

- nickname
- avatar
- city
- bio
- interests

## Penpal Request

第一次联系：

- sender
- receiver
- initial letter
- status

状态：

```
pending
accepted
rejected
cancelled
```

## Relationship

长期笔友关系：

```
active
ended
```

## Letter

信件：

```
draft
sent
```

---

# 🔌 API设计

API统一：

```
/api/v1
```

采用：

- REST
- JSON
- authenticated user context

核心接口：

## Profile

```
GET /me

PATCH /me/profile
```

---

## Penpal Discovery

```
GET /penpals

GET /penpals/:id
```

---

## First Letter

```
POST /penpal-requests
```

创建：

- request
- first letter
- notification

---

## Mailbox

```
GET /mailbox/inbox

GET /mailbox/sent
```

---

## Letters

```
POST /letters

GET /letters/:id

POST /letters/:id/send
```

---

# 📂 项目结构

```
src/

├── app/
├── components/
│   ├── ui/
│   ├── profile/
│   ├── penpal/
│   └── letter/

├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── discovery/
│   ├── requests/
│   ├── letters/
│   ├── relationships/
│   └── safety/

├── services/

├── repositories/

├── schemas/

└── types/
```

---

# 🛠️ 本地运行

## 环境要求

```
Node.js >= 18
```

---

## 安装依赖

```bash
pnpm install
```

---

## 启动开发环境

```bash
pnpm dev
```

访问：

```
http://localhost:3000
```

---

# 🗺️ Roadmap

## Phase 0
基础建设

- 项目初始化
- Design System
- Database
- Auth

---

## Phase 1
用户系统

- 注册登录
- Onboarding
- Profile

---

## Phase 2
发现笔友

- 推荐列表
- 搜索筛选
- 笔友详情

---

## Phase 3
第一次通信

- 第一封信
- 请求接受
- Relationship建立

---

## Phase 4
完整通信

- Inbox
- Letter
- Reply

---

## Phase 5

关系管理：

- 我的笔友
- 通信记录
- 关系结束

---

## Phase 6

安全与通知：

- Notification
- Block
- Report

---

## Phase 7-9

产品完善：

- Responsive
- Accessibility
- Performance
- Security Review
- Production Release

---

# 🚧 暂不开发

为了保持核心体验，MVP阶段暂不包含：

- 即时聊天
- AI代写
- 点赞
- 关注
- 社区动态
- 视频/语音
- 复杂推荐算法
- 支付系统

---

# 🌱 Future Vision

未来，情归纸笔希望连接数字与现实：

- AI辅助寻找真正契合的笔友
- 主题信活动
- 漂流信
- 实体书信服务
- 笔友社区活动

让数字时代的人们重新拥有：

> 一封信的温度。

---

# 📄 License

MIT License
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
