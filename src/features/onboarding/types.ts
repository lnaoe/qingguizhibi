export interface OnboardingValues {
  nickname: string;
  avatarUrl: string;
  country: string;
  city: string;
  ageRange: string;
  languages: string[];
  interestIds: string[];
  bio: string;
  penpalReasons: string[];
}

export type OnboardingErrors = Partial<
  Record<keyof OnboardingValues, string>
>;

export type CompleteOnboardingResult =
  | { ok: true }
  | {
      ok: false;
      errors?: OnboardingErrors;
      formError?: string;
    };

export interface OnboardingSnapshot {
  onboardingCompleted: boolean;
  values: OnboardingValues;
}
