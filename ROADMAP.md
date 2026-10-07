# 情归纸笔 --- Codex Implementation Roadmap

## 使用规则

Codex 每次只执行一个 Task，读取： 1. AGENTS.md 2.
当前Task涉及的PRODUCT/USER_FLOW/UI/DATABASE/API/ARCHITECTURE 3.
当前代码相关文件

不要为了一个Task读取全部docs。

每个Task完成后： - 实现 - 测试 - lint/typecheck - 报告修改文件 -
不顺手做下一Task

## Phase 0 --- Foundation

### Task 0.1 项目初始化

目标： 建立前后端/全栈基础结构、环境变量、基础脚本。

验收： - dev可运行 - build可运行 - lint/typecheck可运行 -
README包含启动方法

### Task 0.2 Design Tokens

实现UI.md中的颜色、字体、spacing、radius、shadow、breakpoint。

验收： 页面不再散落硬编码设计值。

### Task 0.3 Base UI

实现： Button / Input / Textarea / Tag / Avatar / Card / Modal / Tabs /
Empty / Loading / Error / BottomNav。

验收： 核心页面可以复用，不重复实现基础组件。

### Task 0.4 Database

根据DATABASE.md建立schema、enum、FK、unique constraint、index。

验收： migration成功。 关键约束有测试。

### Task 0.5 Auth

接入选定认证方案。

验收： register/login/logout/session正常。 密码不进入业务数据库。

## Phase 1 --- Auth + Onboarding

### Task 1.1 启动/Login/Register

验收： 新用户能注册、登录；已有用户能登录。

### Task 1.2 Password Reset

验收： 能发起重置并处理成功/失败状态。

### Task 1.3 Onboarding

实现B01-B05。

验收： profile完整，onboarding_completed=true后进入Home。

### Task 1.4 Profile

实现查看/编辑自己的profile和interests。

验收： 保存后重新加载数据一致。

## Phase 2 --- Discovery

### Task 2.1 Discovery API

实现GET /penpals及筛选。

验收： 过滤自己、hidden、deleted/suspended、blocked对象。 分页稳定。

### Task 2.2 Home

实现C01： 今日遇见 + 最近来信。

验收： 真实API数据可渲染；empty/error/loading齐全。

### Task 2.3 Find

实现D01/D02。

验收： 搜索/筛选可以刷新列表。

### Task 2.4 Penpal Detail

实现D03。

验收： 公开profile正确显示；不能泄露私密字段。

## Phase 3 --- First Letter

### Task 3.1 First Letter UI

实现D04/E03。

验收： subject/body校验、草稿提示、send loading、错误恢复。

### Task 3.2 Create First Contact

实现POST /penpal-requests。

验收： 一次事务创建request + initial letter + notification。
重复请求被阻止。

### Task 3.3 Accept/Reject

实现request状态操作。

验收： 只有receiver可accept/reject。 accept后只创建一个active
relationship。

### Task 3.4 First Letter E2E

验收： A寄信 → B收到通知 → B接受 → relationship存在。

## Phase 4 --- Mailbox + Letter

### Task 4.1 Inbox

E01来信。

验收： 按时间排序、未读状态正确、分页正确。

### Task 4.2 Sent

寄出列表。

### Task 4.3 Drafts

draft创建、编辑、删除策略（如实现删除则需同步更新API契约）。

### Task 4.4 Letter Detail

E02。

验收： 只有参与者可读。 recipient打开后read_at正确写入。

### Task 4.5 Reply

POST /letters + send。

验收： 只能给active relationship回信。 寄出后双方通信记录可见。

### Task 4.6 Mailbox E2E

验收： A第一封信 → B接受 → B回信 → A读信 → A再次回信。

## Phase 5 --- Relationships

### Task 5.1 My Penpals

F04。

验收： 只展示当前用户relationship。

### Task 5.2 Relationship Detail

F05 + 通信记录。

验收： 分页正确；只允许参与者访问。

### Task 5.3 End Relationship

active → ended。

验收： 结束后不能发新信。 重复end幂等。

## Phase 6 --- Safety + Notifications

### Task 6.1 Notifications

F06及相关通知。

验收： request / accept / new letter正确生成。 只能访问自己的通知。

### Task 6.2 Block

G02 + block API。

验收： block后不能建立新通信、不能继续发信、discovery不再推荐。

### Task 6.3 Report

G01。

验收： report记录正确；非法letter关联被拒绝。

### Task 6.4 Safety E2E

覆盖： block → request失败 block → send失败 report → record created

## Phase 7 --- Me + Settings

### Task 7.1 My

F01。

### Task 7.2 Profile Edit

F02/F03。

### Task 7.3 Settings

F07。

验收： 隐私/账号入口可用，未实现功能不显示为可点击假入口。

## Phase 8 --- Product Polish

### Task 8.1 Loading/Empty/Error

所有核心页面统一。

### Task 8.2 Responsive

320/375/390/430px + desktop。

### Task 8.3 Accessibility

键盘、focus、label、contrast、semantic HTML。

### Task 8.4 Performance

减少不必要请求、图片尺寸优化、列表分页。

### Task 8.5 E2E

覆盖完整核心循环。

## Phase 9 --- Release Readiness

### Task 9.1 Security Review

检查： authorization rate limit input validation XSS CSRF secret
handling 越权访问

### Task 9.2 Data Integrity Review

检查所有FK、unique、transaction、状态转换。

### Task 9.3 UX Review

检查： 文案 loading empty error 按钮状态 移动端

### Task 9.4 Production Build

验收： build成功、环境变量清晰、migration流程清晰、日志无敏感信息。

# MVP Release Gate

必须全部通过： 1. 注册 2. onboarding 3. discovery 4. penpal detail 5.
第一封信 6. request accept 7. relationship 8. inbox 9. read 10. reply
11. my penpals 12. block/report 13. 权限测试 14. E2E核心流程 15.
mobile基本适配

未完成以下内容也可以发布：
AI、即时聊天、点赞、关注、社区、复杂推荐、支付、视频/语音、复杂媒体。
