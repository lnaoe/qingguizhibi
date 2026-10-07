'use client';

import React from 'react';
import styles from './BottomNav.module.css';

interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavProps {
  items: BottomNavItem[];
  activeId: string;
  onItemClick: (id: string) => void;
}

export const BottomNav = ({ items, activeId, onItemClick }: BottomNavProps) => {
  return (
    <nav className={styles.bottomNav}>
      {items.map((item) => (
        <button
          key={item.id}
          className={`${styles.item} ${activeId === item.id ? styles.active : ''}`}
          onClick={() => onItemClick(item.id)}
          type="button"
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
