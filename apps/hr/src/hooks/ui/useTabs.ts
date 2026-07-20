import { useState } from 'react';

export function useTabs(defaultValue: string) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const changeTab = (value: string) => {
    setActiveTab(value);
  };

  return {
    activeTab,
    changeTab
  };
} 