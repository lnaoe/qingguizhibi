'use client';

import React from 'react';
import styles from './Error.module.css';
import { Button } from '../ui/Button';

interface ErrorProps {
  message: string;
  onRetry?: () => void;
}

export const Error = ({ message, onRetry }: ErrorProps) => {
  return (
    <div className={styles.error}>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.action}>
          <Button variant="primary" onClick={onRetry}>
            再试一次
          </Button>
        </div>
      )}
    </div>
  );
};
