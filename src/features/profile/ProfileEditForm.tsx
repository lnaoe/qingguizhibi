'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, Textarea } from '@/components/ui';
import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  PENPAL_REASON_OPTIONS,
} from '../onboarding/options';
import { saveProfileAction } from './actions';
import {
  PROFILE_VISIBILITY_LABELS,
  PROFILE_VISIBILITY_OPTIONS,
} from './options';
import type { ProfileErrors, ProfileValues } from './types';
import { validateProfileValues } from './validation';
import styles from './profile.module.css';

interface ProfileEditFormProps {
  initialValues: ProfileValues;
}

export function ProfileEditForm({ initialValues }: ProfileEditFormProps) {
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<Key extends keyof ProfileValues>(
    field: Key,
    value: ProfileValues[Key],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function toggleArrayField(
    field: 'languages' | 'interestIds' | 'penpalReasons',
    value: string,
  ) {
    const selected = values[field];
    const nextValue = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    setField(field, nextValue);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const validation = validateProfileValues(values);

    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveProfileAction(validation.values);

      if (!result.ok) {
        if (result.errors) {
          setErrors(result.errors);
          return;
        }
        setFormError(result.formError ?? '资料保存失败，请稍后重试。');
        return;
      }

      router.replace('/profile');
      router.refresh();
    } catch {
      setFormError('资料保存失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>F03</p>
            <h1 className={styles.title}>编辑资料</h1>
          </div>
        </header>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <section className={styles.formSection} aria-labelledby="basic-title">
            <h2 id="basic-title" className={styles.sectionTitle}>
              基础资料
            </h2>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="nickname">
                昵称
              </label>
              <Input
                id="nickname"
                value={values.nickname}
                maxLength={30}
                autoComplete="nickname"
                aria-invalid={Boolean(errors.nickname)}
                aria-describedby={errors.nickname ? 'nickname-error' : undefined}
                onChange={(event) => setField('nickname', event.target.value)}
              />
              {errors.nickname && (
                <p id="nickname-error" className={styles.fieldError}>
                  {errors.nickname}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="avatar-url">
                头像链接（可选）
              </label>
              <Input
                id="avatar-url"
                type="url"
                inputMode="url"
                value={values.avatarUrl}
                placeholder="https://"
                aria-invalid={Boolean(errors.avatarUrl)}
                aria-describedby={errors.avatarUrl ? 'avatar-url-error' : undefined}
                onChange={(event) => setField('avatarUrl', event.target.value)}
              />
              {errors.avatarUrl && (
                <p id="avatar-url-error" className={styles.fieldError}>
                  {errors.avatarUrl}
                </p>
              )}
            </div>

            <div className={styles.twoColumns}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="country">
                  国家/地区
                </label>
                <Input
                  id="country"
                  value={values.country}
                  maxLength={50}
                  autoComplete="country-name"
                  aria-invalid={Boolean(errors.country)}
                  aria-describedby={errors.country ? 'country-error' : undefined}
                  onChange={(event) => setField('country', event.target.value)}
                />
                {errors.country && (
                  <p id="country-error" className={styles.fieldError}>
                    {errors.country}
                  </p>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="city">
                  城市
                </label>
                <Input
                  id="city"
                  value={values.city}
                  maxLength={50}
                  autoComplete="address-level2"
                  aria-invalid={Boolean(errors.city)}
                  aria-describedby={errors.city ? 'city-error' : undefined}
                  onChange={(event) => setField('city', event.target.value)}
                />
                {errors.city && (
                  <p id="city-error" className={styles.fieldError}>
                    {errors.city}
                  </p>
                )}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="age-range">
                年龄段
              </label>
              <select
                id="age-range"
                className={styles.select}
                value={values.ageRange}
                aria-invalid={Boolean(errors.ageRange)}
                aria-describedby={errors.ageRange ? 'age-range-error' : undefined}
                onChange={(event) => setField('ageRange', event.target.value)}
              >
                <option value="">请选择</option>
                {AGE_RANGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.ageRange && (
                <p id="age-range-error" className={styles.fieldError}>
                  {errors.ageRange}
                </p>
              )}
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.label}>语言</legend>
              <div className={styles.choiceGrid}>
                {LANGUAGE_OPTIONS.map((language) => (
                  <label
                    key={language}
                    className={`${styles.choice} ${
                      values.languages.includes(language)
                        ? styles.choiceSelected
                        : ''
                    }`}
                  >
                    <input
                      className={styles.choiceInput}
                      type="checkbox"
                      checked={values.languages.includes(language)}
                      onChange={() => toggleArrayField('languages', language)}
                    />
                    <span>{language}</span>
                  </label>
                ))}
              </div>
              {errors.languages && (
                <p className={styles.fieldError} role="alert">
                  {errors.languages}
                </p>
              )}
            </fieldset>
          </section>

          <section className={styles.formSection} aria-labelledby="interests-title">
            <div className={styles.sectionHeading}>
              <h2 id="interests-title" className={styles.sectionTitle}>
                兴趣
              </h2>
              <p className={styles.hint}>至少选择 3 个</p>
            </div>

            <fieldset className={styles.fieldset}>
              <legend className={styles.srOnly}>兴趣</legend>
              <div className={styles.choiceGrid}>
                {INTEREST_OPTIONS.map((interest) => (
                  <label
                    key={interest.id}
                    className={`${styles.choice} ${
                      values.interestIds.includes(interest.id)
                        ? styles.choiceSelected
                        : ''
                    }`}
                  >
                    <input
                      className={styles.choiceInput}
                      type="checkbox"
                      checked={values.interestIds.includes(interest.id)}
                      onChange={() =>
                        toggleArrayField('interestIds', interest.id)
                      }
                    />
                    <span>{interest.name}</span>
                  </label>
                ))}
              </div>
              <p className={styles.selectionCount} aria-live="polite">
                已选择 {values.interestIds.length} 个
              </p>
              {errors.interestIds && (
                <p className={styles.fieldError} role="alert">
                  {errors.interestIds}
                </p>
              )}
            </fieldset>
          </section>

          <section className={styles.formSection} aria-labelledby="about-title">
            <h2 id="about-title" className={styles.sectionTitle}>
              关于我
            </h2>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="bio">
                自我介绍
              </label>
              <Textarea
                id="bio"
                value={values.bio}
                maxLength={500}
                rows={7}
                aria-invalid={Boolean(errors.bio)}
                aria-describedby={errors.bio ? 'bio-error' : undefined}
                onChange={(event) => setField('bio', event.target.value)}
              />
              <p className={styles.characterCount}>{values.bio.length} / 500</p>
              {errors.bio && (
                <p id="bio-error" className={styles.fieldError}>
                  {errors.bio}
                </p>
              )}
            </div>
          </section>

          <section className={styles.formSection} aria-labelledby="reason-title">
            <h2 id="reason-title" className={styles.sectionTitle}>
              为什么想找笔友
            </h2>

            <fieldset className={styles.fieldset}>
              <legend className={styles.srOnly}>找笔友的动机</legend>
              <div className={styles.reasonChoices}>
                {PENPAL_REASON_OPTIONS.map((reason) => (
                  <label
                    key={reason}
                    className={`${styles.choice} ${styles.reasonChoice} ${
                      values.penpalReasons.includes(reason)
                        ? styles.choiceSelected
                        : ''
                    }`}
                  >
                    <input
                      className={styles.choiceInput}
                      type="checkbox"
                      checked={values.penpalReasons.includes(reason)}
                      onChange={() => toggleArrayField('penpalReasons', reason)}
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
              {errors.penpalReasons && (
                <p className={styles.fieldError} role="alert">
                  {errors.penpalReasons}
                </p>
              )}
            </fieldset>
          </section>

          <section className={styles.formSection} aria-labelledby="visibility-title">
            <h2 id="visibility-title" className={styles.sectionTitle}>
              资料可见范围
            </h2>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="visibility">
                谁可以看到我的资料
              </label>
              <select
                id="visibility"
                className={styles.select}
                value={values.visibility}
                aria-invalid={Boolean(errors.visibility)}
                aria-describedby={
                  errors.visibility ? 'visibility-error' : undefined
                }
                onChange={(event) =>
                  setField(
                    'visibility',
                    event.target.value as ProfileValues['visibility'],
                  )
                }
              >
                {PROFILE_VISIBILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {PROFILE_VISIBILITY_LABELS[option]}
                  </option>
                ))}
              </select>
              {errors.visibility && (
                <p id="visibility-error" className={styles.fieldError}>
                  {errors.visibility}
                </p>
              )}
            </div>
          </section>

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            <Link className={styles.secondaryLink} href="/profile">
              取消
            </Link>
            <Button
              className={styles.submitButton}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '正在保存...' : '保存资料'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
