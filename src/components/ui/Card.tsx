'use client';

import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card = ({ className = '', children, ...props }: CardProps) => {
  return (
    <div className={`${styles.card} ${className}`} {...props}>
      {children}
    </div>
  );
};
