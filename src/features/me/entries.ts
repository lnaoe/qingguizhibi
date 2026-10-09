export interface MeSection {
  href: string;
  label: string;
  description: string;
}

export const ME_SECTIONS: MeSection[] = [
  {
    href: '/profile',
    label: '我的资料',
    description: '查看你的资料和兴趣',
  },
  {
    href: '/relationships',
    label: '我的笔友',
    description: '查看正在通信的笔友',
  },
  {
    href: '/notifications',
    label: '通知',
    description: '查看笔友请求和来信提醒',
  },
  {
    href: '/settings',
    label: '设置',
    description: '管理隐私和账号',
  },
];
