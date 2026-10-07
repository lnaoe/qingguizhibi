# 情归纸笔 --- API Contract (MVP)

## 0. API原则

-   REST/JSON。
-   所有时间统一 ISO 8601 UTC 存储和返回。
-   API版本前缀：`/api/v1`。
-   认证由项目选定的 auth provider 提供；业务 API 通过 authenticated
    user context 获取当前用户。
-   不接受客户端传来的 `sender_id`/`user_id` 作为权限依据；服务端从
    session/token 得到 currentUserId。
-   所有资源访问都在 server-side 做 authorization。
-   业务状态变化必须由 service 层完成，route/controller
    不直接拼接多表事务。
-   数据库唯一约束是最终防线，service 层负责友好错误。

## 1. 通用响应

成功：

``` json
{"data": {...}, "meta": {...}}
```

列表：

``` json
{"data": [...], "meta": {"next_cursor": "...", "has_more": true}}
```

错误：

``` json
{
  "error": {
    "code": "validation_error",
    "message": "请求参数无效",
    "details": {}
  }
}
```

错误码： 400 validation_error 401 unauthorized 403 forbidden 404
not_found 409 conflict 422 business_rule_violation 429 rate_limited 500
internal_error

不要向客户端返回 SQL、stack trace、内部ID或认证系统敏感信息。

## 2. Pagination

默认 cursor pagination。 query： - limit：默认20，最大50 - cursor：可选
列表排序必须稳定，避免翻页重复/遗漏。

## 3. Auth/Profile

### GET /api/v1/me

返回当前用户和profile摘要。

### PATCH /api/v1/me/profile

更新：
nickname/avatar_url/country/city/age_range/bio/penpal_reason/language/visibility。
只能修改自己的profile。

### PUT /api/v1/me/interests

请求：

``` json
{"interest_ids":["...","..."]}
```

要求至少3个兴趣时由业务规则验证。

### GET /api/v1/users/:id

返回公开profile。 若visibility=hidden，非本人不可见。

### GET /api/v1/interests

返回可选兴趣列表。

## 4. Penpal Discovery

### GET /api/v1/penpals

参数： - cursor - limit - age_range - language - country - city -
interest_ids - recommend=true\|false

推荐排序： shared_interest_score + basic_condition_score +
random_jitter。 不要创建Recommendation/Embedding表。

服务端过滤： - 当前用户 - deleted/suspended - hidden profile -
已block关系 - 已结束/活动关系中的不适合重复推荐对象 - 自己

### GET /api/v1/penpals/:id

返回公开profile、兴趣、penpal_reason。 不得返回私密字段。

## 5. Penpal Request + First Letter

### POST /api/v1/penpal-requests

用途：创建第一次联系。

请求：

``` json
{
  "receiver_id":"uuid",
  "subject":"你好",
  "body":"你好，很高兴认识你。"
}
```

服务端必须在一个事务中完成： 1. 验证receiver存在且可见。 2.
验证不是自己。 3. 验证未被block。 4. 验证没有活动relationship。 5.
验证没有重复pending request。 6. 创建initial letter。 7. 创建pending
request并关联initial_letter_id。 8. 创建receiver notification。 9.
提交事务。

建议直接创建为sent状态，因为"寄出第一封信"就是创建request的动作。
若产品未来需要先保存第一封信草稿，再单独send，可增加 draft
flow，但MVP不必。

响应：

``` json
{
  "data": {
    "request": {...},
    "letter": {...}
  }
}
```

### GET /api/v1/penpal-requests

返回当前用户作为sender/receiver的request。 支持：
status=pending\|accepted\|rejected\|cancelled cursor/limit。

### GET /api/v1/penpal-requests/:id

只有request sender/receiver可访问。

### POST /api/v1/penpal-requests/:id/accept

只有receiver可执行。 事务： 1. 锁定request。 2. 检查status=pending。 3.
检查双方未被block。 4. 创建唯一active relationship。 5. request →
accepted。 6. 创建sender的request_accepted notification。 7. commit。

重复accept必须幂等：已accepted时返回当前accepted结果，而不是创建第二个relationship。

### POST /api/v1/penpal-requests/:id/reject

只有receiver。 pending → rejected。 重复reject返回当前状态。

### POST /api/v1/penpal-requests/:id/cancel

只有sender。 pending → cancelled。

## 6. Letters

### GET /api/v1/mailbox/inbox

当前用户收到的sent letters。 过滤： - recipient=currentUser -
status=sent 分页按sent_at desc。

返回列表应包含用于UI展示的最小sender profile摘要。

### GET /api/v1/mailbox/sent

当前用户寄出的sent letters。

### GET /api/v1/mailbox/drafts

当前用户自己的draft letters。

### POST /api/v1/letters

创建草稿。 请求：

``` json
{
  "relationship_id":"uuid",
  "subject":"",
  "body":""
}
```

只能为当前用户参与的active relationship创建。
第一封信不使用此接口创建；第一封信使用POST /penpal-requests。

### GET /api/v1/letters/:id

只有sender/recipient可访问。

### PATCH /api/v1/letters/:id

只有draft sender可修改。 只能修改subject/body。

### POST /api/v1/letters/:id/send

只有draft sender。 事务： 1. 锁定letter。 2. 确认status=draft。 3.
确认relationship=active。 4. 确认双方未被block。 5. 验证body非空。 6.
status→sent。 7. sent_at=now。 8. relationship.last_letter_at=sent_at。
9. 创建recipient new_letter notification。 10. commit。

重复send必须返回conflict或当前sent资源，绝不生成第二封信。

### POST /api/v1/letters/:id/read

只有recipient。 若已经read，幂等返回当前letter。 否则设置read_at。

## 7. Relationships

### GET /api/v1/relationships

返回当前用户的active/ended relationships。 可按status过滤。

### GET /api/v1/relationships/:id

只有参与者可访问。

### GET /api/v1/relationships/:id/letters

只有参与者可访问。 返回该relationship的通信记录，cursor pagination。

### POST /api/v1/relationships/:id/end

只有参与者可执行。 active → ended，写入ended_at。 重复end幂等。
ended后不能发新信。

## 8. Notifications

### GET /api/v1/notifications

只返回currentUser通知。 参数：unread_only、cursor、limit。

### POST /api/v1/notifications/:id/read

只能标记自己的通知。

### POST /api/v1/notifications/read-all

只能影响currentUser未读通知。

## 9. Blocks

### GET /api/v1/blocks

返回当前用户主动屏蔽的用户。

### POST /api/v1/blocks

请求：

``` json
{"blocked_user_id":"uuid"}
```

不能block自己。 block后： - 不允许创建新的request - 不允许发送新信 -
discovery不再推荐
已有relationship按产品规则停止通信；MVP默认视为不可继续发送。

### DELETE /api/v1/blocks/:userId

解除当前用户创建的block。

## 10. Reports

### POST /api/v1/reports

请求：

``` json
{
  "reported_user_id":"uuid",
  "letter_id":"uuid|null",
  "reason":"harassment",
  "description":"..."
}
```

必须验证reported_user存在。
letter若提供，必须属于reported_user参与的通信。
reporter只能是currentUser。

## 11. API权限矩阵

  资源             当前用户                                对方           其他用户
  ---------------- --------------------------------------- -------------- ------------
  own profile      RW                                      public字段     public字段
  hidden profile   RW                                      无             无
  request          RW(自己相关)                            RW(自己相关)   无
  letter           RW(自己是sender) / R(自己是recipient)   R              无
  relationship     RW                                      RW             无
  notification     RW                                      无             无
  block            RW(自己创建)                            无             无
  report           C(自己提交)                             无             无

## 12. 事务与一致性

以下操作必须是事务： - 创建penpal request + initial letter +
notification - accept request + create relationship + notification -
send draft + update relationship + notification

唯一约束负责最终防重复： - pending request sender/receiver - active
relationship user pair - block blocker/blocked

## 13. Rate Limit建议

MVP至少限制： - register/login - penpal request - send letter - report -
password reset

具体阈值由部署环境决定，不写死在前端。

## 14. 页面/API/DB映射

Home： GET /me GET /penpals?recommend=true GET /mailbox/inbox

Find： GET /penpals GET /penpals/:id

First Letter： POST /penpal-requests

Mailbox： GET /mailbox/inbox GET /mailbox/sent GET /mailbox/drafts

Letter： GET /letters/:id POST /letters/:id/read

Reply： POST /letters PATCH /letters/:id POST /letters/:id/send

My Penpals： GET /relationships GET /relationships/:id GET
/relationships/:id/letters

Safety： POST/DELETE /blocks POST /reports

## 15. API验收

核心路径必须通过： 注册 → onboarding → discovery → 查看profile →
发第一封信 → receiver看到通知 → accept → relationship创建 →
receiver看到来信 → read → reply → 双方通信记录可见。

必须测试： - 重复点击send - 重复accept - 越权读取letter -
自己给自己发request - blocked user发request - ended relationship发信 -
deleted/suspended用户被推荐
