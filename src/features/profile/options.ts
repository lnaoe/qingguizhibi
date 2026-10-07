export const PROFILE_VISIBILITY_OPTIONS = ['public', 'hidden'] as const;

export type ProfileVisibility = (typeof PROFILE_VISIBILITY_OPTIONS)[number];

export const PROFILE_VISIBILITY_LABELS: Record<ProfileVisibility, string> = {
  public: '公开资料',
  hidden: '隐藏资料',
};
