# 情归纸笔 --- UI Design System

## 1. 设计方向

核心感受： \>
这里不是让我快速认识很多人，而是让我安静下来，认真认识一个人。

关键词：温暖、安静、真诚、克制、纸张、手写、时间感、人和人的距离感。

视觉目标： 现代产品设计 × 纸张质感 × 轻微的人文气息。

避免：强渐变、霓虹、大面积纯黑、过度玻璃拟态、信息流、游戏化、过度复古拟物。

## 2. Colors

Paper #F8F5EF Paper Deep #F1ECE3 White #FFFDFC Ink #3B3632 Ink Light
#6B655E Seal #9A5145 Seal Dark #7C3F36 Green #657A68 Blue #657486 Gold
#B29563 Border #DED8CE Shadow: 0 2px 8px rgba(59,54,50,0.06)

## 3. Typography

Noto Sans SC / PingFang SC / Microsoft YaHei 标题/信件可用 Noto Serif SC
/ Songti SC

Display 32/600/1.3 H1 26/600/1.35 H2 20/600/1.4 Body 16/400/1.75 Small
14/400/1.5 Caption 12/400/1.4 Letter 17/400/1.9 serif

## 4. Spacing

4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80px 页面水平padding 24px Card
20px 组件gap 16px section gap 32px 大留白 48px+

## 5. Radius

6 / 10 / 14px Button 8px

## 6. Buttons

Primary: #3B3632 + white Accent CTA: #9A5145 + white，少量使用
Secondary: transparent + #D8D1C7 border Text: no bg/border

## 7. Components

Tags: #EFEAE1 / #5F5952 / radius 6 Icons: Lucide, 20x20, stroke约1.8
Avatar: 64x64 circle, 1px border, no online dot Card:
不显示followers/likes/online/popularity/ranking

## 8. Letter

现代、克制、轻微纸张感。 通过暖色、留白、细边框、衬线字体实现。
不要做复古信纸模拟器。

## 9. Bottom Nav

Home / Find / Mailbox / Me selected #3B3632 unselected #9B958D
无大面积彩色底。

## 10. Motion

150--250ms ease-out 打开信件250--350ms 只用轻fade/slide。

## 11. Responsive

mobile first: 320/375/390/430px desktop max 1100--1200px letter max
760px

# 页面简表

A01 启动：情归纸笔 / 写一封信，认识一个人 / 开始写信 A02
登录：邮箱、密码、登录、忘记密码、注册 A03
注册：邮箱、密码、确认密码、创建账号 A04 找回密码：邮箱、发送重置 B01
欢迎：不必急着认识谁，先让别人认识你 B02
基础资料：昵称、头像、国家/地区、城市、年龄段、语言 B03
兴趣：至少选择3个 B04 关于我：多行自我介绍 B05 为什么找笔友：多选动机
C01 首页：今日遇见 + 最近来信 D01 找笔友：搜索 + 推荐 D02
筛选：语言、年龄段、兴趣、地区 D03
笔友详情：个人信息、兴趣、动机、写信、举报/屏蔽 D04/E03
写信：收件人、主题、正文、保存草稿、寄出 E01 信箱：来信/寄出/草稿 E02
信件详情：日期、发信人、主题、正文、回信 F01
我的：资料、笔友、通知、设置 F02/F03 资料查看/编辑 F04 笔友列表 F05
关系详情 + 通信记录 + 写信 F06 通知 F07 设置 G01 举报 G02 屏蔽确认

## 全局状态

Loading：轻Skeleton或"正在寻找合适的笔友......" Empty：说明 + 下一步CTA
Error：用户可理解的中文 + 再试一次 不要展示技术错误。
