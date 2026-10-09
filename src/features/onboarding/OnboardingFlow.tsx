'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { Button, Input, Textarea } from '@/components/ui';
import { completeOnboardingAction } from './actions';
import {
  AGE_RANGE_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_OPTIONS,
  PENPAL_REASON_OPTIONS,
} from './options';
import type { OnboardingErrors, OnboardingValues } from './types';
import { validateOnboardingValues } from './validation';
import styles from './onboarding.module.css';

interface OnboardingFlowProps {
  initialValues: OnboardingValues;
}

const TOTAL_STEPS = 5;

const STEP_FIELDS: ReadonlyArray<ReadonlyArray<keyof OnboardingValues>> = [
  [],
  ['nickname', 'avatarUrl', 'country', 'city', 'ageRange', 'languages'],
  ['interestIds'],
  ['bio'],
  ['penpalReasons'],
];

export function OnboardingFlow({ initialValues }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<Key extends keyof OnboardingValues>(
    field: Key,
    value: OnboardingValues[Key],
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

  function getStepErrors(): OnboardingErrors {
    const validation = validateOnboardingValues(values);

    if (validation.ok) {
      return {};
    }

    return STEP_FIELDS[step]!.reduce<OnboardingErrors>((result, field) => {
      const error = validation.errors[field];
      if (error) {
        result[field] = error;
      }
      return result;
    }, {});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (step < TOTAL_STEPS - 1) {
      const stepErrors = getStepErrors();
      setErrors(stepErrors);

      if (Object.keys(stepErrors).length === 0) {
        setStep((current) => current + 1);
      }
      return;
    }

    const validation = validateOnboardingValues(values);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await completeOnboardingAction(validation.values);

      if (!result.ok) {
        if (result.errors) {
          setErrors(result.errors);
          return;
        }
        setFormError(result.formError ?? '资料保存失败，请稍后重试。');
        return;
      }

      window.location.replace('/');
    } catch {
      setFormError('资料保存失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  }

  function goBack() {
    setErrors({});
    setFormError(null);
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.progress} aria-label={`第 ${step + 1} 步，共 ${TOTAL_STEPS} 步`}>
          {Array.from({ length: TOTAL_STEPS }, (_, index) => (
            <span
              key={index}
              className={`${styles.progressSegment} ${
                index <= step ? styles.progressSegmentActive : ''
              }`}
            />
          ))}
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {step === 0 && (
            <section className={`${styles.step} ${styles.welcomeStep}`}>
              <p className={styles.eyebrow}>情归纸笔</p>
              <h1 className={styles.welcomeTitle}>
                不必急着认识谁，先让别人认识你
              </h1>
              <p className={styles.welcomeText}>
                用几分钟写下真实的自己，遇见愿意慢慢了解你的人。
              </p>
            </section>
          )}

          {step === 1 && (
            <section className={styles.step} aria-labelledby="basic-profile-title">
              <header className={styles.stepHeader}>
                <h1 id="basic-profile-title" className={styles.title}>
                  基础资料
                </h1>
              </header>

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
          )}

          {step === 2 && (
            <section className={styles.step} aria-labelledby="interests-title">
              <header className={styles.stepHeader}>
                <h1 id="interests-title" className={styles.title}>
                  兴趣
                </h1>
                <p className={styles.description}>至少选择 3 个</p>
              </header>

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
          )}

          {step === 3 && (
            <section className={styles.step} aria-labelledby="about-title">
              <header className={styles.stepHeader}>
                <h1 id="about-title" className={styles.title}>
                  关于我
                </h1>
              </header>

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
                <p className={styles.characterCount}>
                  {values.bio.length} / 500
                </p>
                {errors.bio && (
                  <p id="bio-error" className={styles.fieldError}>
                    {errors.bio}
                  </p>
                )}
              </div>
            </section>
          )}

          {step === 4 && (
            <section className={styles.step} aria-labelledby="reason-title">
              <header className={styles.stepHeader}>
                <h1 id="reason-title" className={styles.title}>
                  为什么想找笔友
                </h1>
              </header>

              <fieldset className={styles.fieldset}>
                <legend className={styles.srOnly}>找笔友的动机</legend>
                <div className={styles.reasonList}>
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
                        onChange={() =>
                          toggleArrayField('penpalReasons', reason)
                        }
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
          )}

          {formError && (
            <p className={styles.formError} role="alert">
              {formError}
            </p>
          )}

          <div className={styles.actions}>
            {step > 0 && (
              <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={goBack}
              >
                上一步
              </Button>
            )}
            <Button
              className={styles.continueButton}
              type="submit"
              variant={step === 0 ? 'accent' : 'primary'}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? '正在保存...'
                : step === 0
                  ? '开始'
                  : step === TOTAL_STEPS - 1
                    ? '完成'
                    : '继续'}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
