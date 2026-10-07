# 情归纸笔 --- Database Model

## users

id UUID PK email string unique status enum(active,suspended,deleted)
created_at updated_at last_active_at

## profiles

user_id UUID PK/FK users.id nickname avatar_url country city age_range
bio penpal_reason language string\[\] visibility enum(public,hidden)
onboarding_completed boolean created_at updated_at

MVP不保存精确生日。

## interests

id name slug category created_at

## user_interests

user_id FK interest_id FK created_at PK(user_id,interest_id)

## penpal_requests

id sender_id FK users receiver_id FK users initial_letter_id FK letters
status enum(pending,accepted,rejected,cancelled) created_at responded_at

第一封信就是第一次联系。

## penpal_relationships

id user_low_id user_high_id status enum(active,ended) started_at
ended_at last_letter_at created_at updated_at

canonical ordering保证A-B与B-A相同。 禁止self relationship。
同一pair不能有重复active relationship。

## letters

id relationship_id FK sender_id FK recipient_id FK subject body status
enum(draft,sent) sent_at read_at created_at updated_at

draft不单独建表。 没有Conversation表。 只有参与者可以访问。

## notifications

id user_id FK type
enum(penpal_request,request_accepted,new_letter,system) title body
reference_type reference_id read_at created_at

## blocks

id blocker_id blocked_id created_at unique(blocker_id,blocked_id)

## reports

id reporter_id reported_user_id letter_id nullable reason
enum(harassment,sexual_content,fraud,hate,spam,other) description status
enum(pending,reviewing,resolved,dismissed) created_at resolved_at

## 必须约束

-   不允许自己给自己发request/relationship
-   同一sender→receiver不允许重复pending request
-   同一pair不允许重复active relationship
-   letter只能由relationship参与者访问
-   notification只能由所属user访问
-   block/report必须由当前用户创建
-   blocked pair不能建立新的通信关系
-   ended relationship不能发送新信

## 索引

users(email) profiles(visibility,onboarding_completed)
user_interests(user_id,interest_id)
penpal_requests(sender_id,receiver_id,status)
penpal_requests(receiver_id,status)
penpal_relationships(user_low_id,user_high_id)
letters(relationship_id,created_at)
letters(recipient_id,status,created_at)
notifications(user_id,read_at,created_at) blocks(blocker_id,blocked_id)
reports(status,created_at)
