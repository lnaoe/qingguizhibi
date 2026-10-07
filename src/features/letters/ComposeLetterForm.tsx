'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Avatar, Button, Card, Input, Textarea } from '@/components/ui';
import { submitFirstLetter } from './first-letter-client';
import type { LetterDraftValues, LetterFieldErrors } from './types';
import {
  LETTER_BODY_MAX_LENGTH,
  LETTER_SUBJECT_MAX_LENGTH,
  validateLetterDraft,
} from './validation';
import styles from './letter.module.css';

interface LetterRecipient {
  id: string;
  nickname: string;
  avatarUrl: string | null;
}

interface ComposeLetterFormProps {
  recipient: LetterRecipient;
}

export function ComposeLetterForm({ recipient }: ComposeLetterFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<LetterDraftValues>({
    subject: '',
    body: '',
  });
  const [errors, setErrors] = useState<LetterFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField(field: keyof LetterDraftValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validation = validateLetterDraft(values);

    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await submitFirstLetter({
        receiverId: recipient.id,
        ...validation.values,
      });

      if (!result.ok) {
        if (result.errors) {
          setErrors(result.errors);
          return;
        }

        setFormError(
          result.formError ?? '暂时无法寄出这封信，请稍后重试。',
        );
        return;
      }

      router.replace('/');
      router.refresh();
    } catch {
      setFormError('网络连接失败，请检查后重试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <Link className={styles.backLink} href={`/penpals/${recipient.id}`}>
          返回笔友详情
        </Link>

        <header className={styles.header}>
          <h1 className={styles.title}>写第一封信</h1>
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
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isSubmitting}
        >
          <div className={styles.draftNotice}>
            <span className={styles.draftBadge}>草稿</span>
            <p>寄出前，内容只保留在当前页面。</p>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="letter-subject">
              主题
            </label>
            <Input
              id="letter-subject"
              name="subject"
              value={values.subject}
              maxLength={LETTER_SUBJECT_MAX_LENGTH}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={errors.subject ? 'letter-subject-error' : undefined}
              onChange={(event) => setField('subject', event.target.value)}
            />
            <p className={styles.characterCount}>
              {values.subject.length} / {LETTER_SUBJECT_MAX_LENGTH}
            </p>
            {errors.subject && (
              <p id="letter-subject-error" className={styles.fieldError}>
                {errors.subject}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="letter-body">
              正文
            </label>
            <Textarea
              id="letter-body"
              name="body"
              className={styles.bodyInput}
              value={values.body}
              maxLength={LETTER_BODY_MAX_LENGTH}
              rows={12}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.body)}
              aria-describedby={errors.body ? 'letter-body-error' : undefined}
              placeholder={`写下想对${recipient.nickname}说的话`}
              onChange={(event) => setField('body', event.target.value)}
            />
            <p className={styles.characterCount}>
              {values.body.length} / {LETTER_BODY_MAX_LENGTH}
            </p>
            {errors.body && (
              <p id="letter-body-error" className={styles.fieldError}>
                {errors.body}
              </p>
            )}
          </div>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            <Link
              className={styles.cancelLink}
              href={`/penpals/${recipient.id}`}
            >
              取消
            </Link>
            <Button
              className={styles.submitButton}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '正在寄出...' : '寄出'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
