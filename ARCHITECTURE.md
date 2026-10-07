# 情归纸笔 --- Technical Architecture

## 1. 目标

保持MVP简单、可维护、可测试，避免过早微服务化。

推荐逻辑： Client → API/Server → Service → Repository/DB

## 2. 分层

### Presentation

页面、组件、表单、客户端状态。

### API/Route

负责： - authentication context - input parsing - schema validation -
调用service - mapping response

不直接写业务规则。

### Service

负责： - penpal request - relationship - letter lifecycle -
notification - block/report - transaction - business rules

### Repository/Data Access

负责： - DB queries - transactions - unique constraint handling

### Database

执行最终约束和索引。

## 3. 推荐目录

``` text
src/
  app/ or pages/
  components/
    ui/
    navigation/
    profile/
    penpal/
    letter/
    notification/
  features/
    auth/
    onboarding/
    discovery/
    requests/
    letters/
    relationships/
    safety/
  services/
  repositories/
  lib/
  schemas/
  types/
```

实际框架可根据现有项目调整，不为目录形式而重构。

## 4. Frontend原则

-   API client集中管理。
-   不在页面里散落fetch细节。
-   表单先客户端校验，再依赖server最终校验。
-   mutation期间按钮disabled。
-   所有异步页面处理loading/empty/error。
-   不把敏感数据存localStorage。
-   auth token使用项目认证方案。

## 5. Backend原则

-   currentUserId来自认证上下文。
-   不信任client user_id。
-   service执行权限检查。
-   多表状态变化使用transaction。
-   不吞异常。
-   对唯一约束冲突返回明确业务错误。
-   日志不得记录letter body、密码、token等敏感内容。

## 6. 数据访问

MVP允许单体后端 + 单数据库。 不要引入： - microservices - event bus -
message queue - CQRS - vector database 除非实际需求出现。

## 7. 推荐缓存策略

MVP默认不做复杂缓存。 优先正确性。 后续若需要，只缓存： - interests -
public profile - discovery结果 并确保block/visibility变化不会泄漏。

## 8. 测试层级

Unit： 业务规则、状态转换、validation。

Integration： service + database transaction。

API： 权限、schema、状态码、核心流程。

E2E： 注册 → onboarding → 找笔友 → 第一封信 → 接受 → 回信。

## 9. 安全

-   server-side authorization
-   rate limit
-   input validation
-   output filtering
-   XSS防护
-   CSRF策略按auth架构实施
-   password由auth provider处理
-   secret只放server环境变量

## 10. Definition of Done

一个任务只有同时满足： - UI完成 - API完成 - DB变更完成（如需要） -
权限完成 - loading/empty/error完成 - mobile基本适配 - tests通过
才算完成。
