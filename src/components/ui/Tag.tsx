'use client';

import React from 'react';
import styles from './Tag.module.css';

interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

export const Tag = ({ className = '', children, ...props }: TagProps) => {
  return (
    <span className={`${styles.tag} ${className}`} {...props}>
      {children}
    </span>
  );
};
