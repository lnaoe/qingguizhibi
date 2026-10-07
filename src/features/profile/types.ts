import type { OnboardingValues } from '../onboarding/types';
import type { ProfileVisibility } from './options';

export interface ProfileValues extends OnboardingValues {
  visibility: ProfileVisibility;
}

export type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

export interface ProfileInterest {
  id: string;
  name: string;
  slug: string;
  category: string | null;
}

export interface ProfileSnapshot {
  values: ProfileValues;
  interests: ProfileInterest[];
}

export type SaveProfileResult =
  | { ok: true }
  | {
      ok: false;
      errors?: ProfileErrors;
      formError?: string;
    };

export type ProfileValidationResult =
  | { ok: true; values: ProfileValues }
  | { ok: false; errors: ProfileErrors };
