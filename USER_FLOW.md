# 情归纸笔 --- User Flow

## 主路径

注册 → Onboarding → 首页 → 今日遇见 → 笔友详情 → 写第一封信 → 寄出 →
等待 → 收到来信 → 打开信件 → 回信 → 建立/持续笔友关系 → 通信记录 →
继续写信

## 页面信息架构

### Auth

A01 启动页 A02 登录 A03 注册 A04 找回密码

### Onboarding

B01 欢迎 B02 基础资料 B03 兴趣 B04 关于我 B05 为什么想找笔友

### Home

C01 首页

### Find Penpal

D01 找笔友 D02 搜索/筛选 D03 笔友详情 D04 写第一封信（复用通用写信页）

### Mailbox

E01 信箱 E02 信件详情 E03 写信

### Me

F01 我的 F02 我的资料 F03 编辑资料 F04 我的笔友 F05 笔友关系详情 F06
通知 F07 设置

### Safety

G01 举报 G02 屏蔽确认（Modal）

## 全局导航

首页 / 找笔友 / 信箱 / 我的。 写信不是底部导航。

## 核心页面优先级

Home \> Find \> Penpal Detail \> Write Letter \> Mailbox \> Letter
Detail \> My Penpals

## 状态

loading / empty / error / unread / draft / sent / blocked / reported

## 状态机

Profile: onboarding_completed=false → true

PenpalRequest: pending → accepted / rejected / cancelled

Relationship: active → ended

Letter: draft → sent → read（read_at被设置）

## 业务不变量

1.  用户不能给自己发 request。
2.  同一 sender→receiver 只能存在一个 pending request。
3.  同一用户对只能有一个 active relationship。
4.  第一封信是 request 的核心载体。
5.  被屏蔽用户不能建立新的通信。
6.  relationship 结束后不能继续发送新信。
7.  只有通信参与者能读取信件。
