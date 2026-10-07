'use client';

import React from 'react';
import styles from './Avatar.module.css';

interface AvatarProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

export const Avatar = ({ className = '', src, alt, ...props }: AvatarProps) => {
  return (
    <div className={`${styles.avatarContainer} ${className}`}>
      <img
        src={src}
        alt={alt}
        className={styles.avatar}
        {...props}
      />
    </div>
  );
};
