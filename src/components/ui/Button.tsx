'use client';

import React from 'react';
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'text';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    const variantClass = styles[variant];
    return (
      <button
        ref={ref}
        className={`${styles.button} ${variantClass} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
