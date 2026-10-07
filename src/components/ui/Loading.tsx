'use client';

import React from 'react';
import styles from './Loading.module.css';

interface LoadingProps {
  text?: string;
}

export const Loading = ({ text = '加载中...' }: LoadingProps) => {
  return (
    <div className={styles.loading}>
      <div className={styles.spinner}></div>
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
};
