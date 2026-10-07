'use client';

import React from 'react';
import styles from './Empty.module.css';

interface EmptyProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const Empty = ({ title, description, action }: EmptyProps) => {
  return (
    <div className={styles.empty}>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
