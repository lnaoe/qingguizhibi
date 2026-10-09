export interface SettingsLink {
  href: string;
  label: string;
  description: string;
}

export const SETTINGS_LINKS: SettingsLink[] = [
  {
    href: '/profile/edit',
    label: '资料可见性',
    description: '管理谁可以查看你的资料',
  },
];
