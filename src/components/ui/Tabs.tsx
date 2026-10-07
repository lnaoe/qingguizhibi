'use client';

import React, { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultActiveId?: string;
}

export const Tabs = ({ tabs, defaultActiveId }: TabsProps) => {
  const [activeId, setActiveId] = useState(defaultActiveId || tabs[0]?.id);

  return (
    <div className={styles.tabs}>
      <div className={styles.list}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeId === tab.id ? styles.active : ''}`}
            onClick={() => setActiveId(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content}>
        {tabs.find((tab) => tab.id === activeId)?.content}
      </div>
    </div>
  );
};
