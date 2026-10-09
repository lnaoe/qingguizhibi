'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Input, Textarea } from '@/components/ui';
import { saveReplyDraft, sendReplyDraft } from './reply-client';
import type {
  LetterDraftFieldErrors,
  LetterDraftValues,
} from './types';
import {
  LETTER_BODY_MAX_LENGTH,
  LETTER_SUBJECT_MAX_LENGTH,
  validateReplyLetter,
} from './validation';
import styles from './letter.module.css';

interface ReplyRecipient {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

interface ReplyLetterFormProps {
  relationshipId: string;
  recipient: ReplyRecipient;
  sourceLetterId?: string;
  initialDraftId?: string;
  initialSubject?: string | null;
  initialBody?: string;
  mode?: 'reply' | 'draft' | 'letter';
  returnHref?: string;
  returnLabel?: string;
  title?: string;
}

type PendingAction = 'save' | 'send';

export function ReplyLetterForm({
  relationshipId,
  recipient,
  sourceLetterId,
  initialDraftId,
  initialSubject,
  initialBody,
  mode = 'reply',
  returnHref,
  returnLabel,
  title,
}: ReplyLetterFormProps) {
  const router = useRouter();
  const isDraftMode = mode === 'draft';
  const resolvedReturnHref =
    returnHref ??
    (sourceLetterId
      ? `/letters/${sourceLetterId}`
      : isDraftMode
        ? '/mailbox/drafts'
        : '/relationships');
  const resolvedReturnLabel =
    returnLabel ??
    (isDraftMode
      ? '返回草稿箱'
      : mode === 'letter'
        ? '返回通信记录'
        : '返回信件');
  const resolvedTitle =
    title ?? (isDraftMode ? '编辑草稿' : mode === 'letter' ? '写信' : '回信');
  const [draftId, setDraftId] = useState<string | null>(
    initialDraftId ?? null,
  );
  const [values, setValues] = useState<LetterDraftValues>({
    subject: initialSubject ?? '',
    body: initialBody ?? '',
  });
  const [errors, setErrors] = useState<LetterDraftFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] =
    useState<PendingAction | null>(null);
  const isSubmitting = pendingAction !== null;

  function setField(field: keyof LetterDraftValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
    setSavedMessage(null);
  }

  function showRequestErrors(errorsResult?: LetterDraftFieldErrors) {
    if (errorsResult?.subject || errorsResult?.body) {
      setErrors(errorsResult);
      return;
    }

    setFormError(
      errorsResult?.request ??
        errorsResult?.relationship_id ??
        '暂时无法处理这封信，请稍后重试。',
    );
  }

  async function persistDraft(
    letterValues: LetterDraftValues,
  ): Promise<string | null> {
    try {
      const result = await saveReplyDraft({
        relationshipId,
        draftId,
        ...letterValues,
      });

      if (!result.ok) {
        showRequestErrors(result.errors);

        if (!result.errors || result.formError) {
          setFormError(
            result.formError ??
              '暂时无法保存草稿，请稍后重试。',
          );
        }

        return null;
      }

      setDraftId(result.draftId);
      return result.draftId;
    } catch {
      setFormError('网络连接失败，请检查后重试。');
      return null;
    }
  }

  async function handleSave() {
    setFormError(null);
    setSavedMessage(null);
    setPendingAction('save');

    try {
      const savedDraftId = await persistDraft(values);

      if (savedDraftId) {
        setSavedMessage('草稿已保存');
      }
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSend() {
    setFormError(null);
    setSavedMessage(null);

    const validation = validateReplyLetter(values);

    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setPendingAction('send');

    try {
      const savedDraftId = await persistDraft(validation.values);

      if (!savedDraftId) {
        return;
      }

      const result = await sendReplyDraft(savedDraftId);

      if (!result.ok) {
        showRequestErrors(result.errors);

        if (!result.errors || result.formError) {
          setFormError(
            result.formError ??
              '暂时无法寄出这封信，请稍后重试。',
          );
        }

        return;
      }

      router.replace(`/letters/${result.letterId}`);
      router.refresh();
    } catch {
      setFormError('网络连接失败，请检查后重试。');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={resolvedReturnHref}>
          {resolvedReturnLabel}
        </Link>

        <header className={styles.header}>
          <h1 className={styles.title}>{resolvedTitle}</h1>
        </header>

        <Card className={styles.recipientCard}>
          {recipient.avatarUrl ? (
            <Avatar
              src={recipient.avatarUrl}
              alt={`${recipient.nickname}的头像`}
            />
          ) : (
            <div className={styles.avatarFallback} aria-hidden="true">
              {recipient.nickname.slice(0, 1)}
            </div>
          )}

          <div className={styles.recipientCopy}>
            <p className={styles.recipientLabel}>收件人</p>
            <p className={styles.recipientName}>{recipient.nickname}</p>
          </div>
        </Card>

        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void handleSend();
          }}
          noValidate
          aria-busy={isSubmitting}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reply-subject">
              主题
            </label>
            <Input
              id="reply-subject"
              name="subject"
              value={values.subject}
              maxLength={LETTER_SUBJECT_MAX_LENGTH}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={
                errors.subject ? 'reply-subject-error' : undefined
              }
              onChange={(event) => setField('subject', event.target.value)}
            />
            <p className={styles.characterCount}>
              {values.subject.length} / {LETTER_SUBJECT_MAX_LENGTH}
            </p>
            {errors.subject && (
              <p id="reply-subject-error" className={styles.fieldError}>
                {errors.subject}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reply-body">
              正文
            </label>
            <Textarea
              id="reply-body"
              name="body"
              className={styles.bodyInput}
              value={values.body}
              maxLength={LETTER_BODY_MAX_LENGTH}
              rows={12}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? 'reply-body-error' : undefined}
              placeholder={`写下想对${recipient.nickname}说的话`}
              onChange={(event) => setField('body', event.target.value)}
            />
            <p className={styles.characterCount}>
              {values.body.length} / {LETTER_BODY_MAX_LENGTH}
            </p>
            {errors.body && (
              <p id="reply-body-error" className={styles.fieldError}>
                {errors.body}
              </p>
            )}
          </div>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          {savedMessage && (
            <p className={styles.successMessage} role="status">
              {savedMessage}
            </p>
          )}

          <div className={styles.replyActions}>
            <Link
              className={styles.cancelLink}
              href={resolvedReturnHref}
            >
              取消
            </Link>
            <Button
              type="button"
              variant="secondary"
              disabled={isSubmitting}
              onClick={() => void handleSave()}
            >
              {pendingAction === 'save' ? '正在保存...' : '保存草稿'}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {pendingAction === 'send' ? '正在寄出...' : '寄出'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
