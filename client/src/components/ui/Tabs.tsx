import React from "react";

export interface TabItem {
  /** 
   * Unique identifier for the tab.
   * Directly establishes the relationship with the corresponding content panel.
   * The content panel must carry the ID `tabpanel-${id}` to match the tab trigger's `aria-controls` attribute.
   */
  id: string;
  /** Label text displayed in the tab button. */
  label: string;
  /** Optional icon rendered before the label. */
  icon?: React.ReactNode;
  /** Optional flag to disable interaction with this tab. */
  disabled?: boolean;
}

export interface TabsProps {
  /** List of tabs to render. */
  tabs: TabItem[];
  /** Currently active tab ID. */
  activeTab: string;
  /** Callback fired when a tab is selected. */
  onChange: (id: string) => void;
  /** Optional className overrides for the tab list container. */
  className?: string;
  /** Optional className overrides for the tab buttons. */
  tabClassName?: string;
}

/**
 * A highly accessible, controlled Tabs component that complies with WAI-ARIA guidelines,
 * supporting arrow-key, Home, and End keyboard navigation.
 * 
 * ### WAI-ARIA Panel Binding Requirements:
 * To ensure full screen reader accessibility, each tab trigger button references its content panel via `aria-controls`.
 * Consumers MUST implement the corresponding panels in their markup:
 * 1. Wrap the active panel content in an element with `role="tabpanel"`.
 * 2. Assign the ID `id={`tabpanel-${tab.id}`}` to the panel wrapper to match the trigger's `aria-controls` attribute.
 * 3. Link the panel back to the trigger button using `aria-labelledby={`tab-btn-${tab.id}`}`.
 * 
 * Example:
 * ```tsx
 * const tabs = [{ id: 'overview', label: 'Overview' }];
 * <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
 * 
 * {activeTab === 'overview' && (
 *   <div role="tabpanel" id="tabpanel-overview" aria-labelledby="tab-btn-overview">
 *     Panel Content Here
 *   </div>
 * )}
 * ```
 */
export function Tabs({
  tabs,
  activeTab,
  onChange,
  className = "",
  tabClassName = "",
}: TabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const enabledIndices = tabs
      .map((t, idx) => (!t.disabled ? idx : -1))
      .filter((idx) => idx !== -1);
    const currentEnabledIndex = enabledIndices.indexOf(index);

    let targetIndex = -1;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      targetIndex = enabledIndices[(currentEnabledIndex + 1) % enabledIndices.length];
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      targetIndex = enabledIndices[(currentEnabledIndex - 1 + enabledIndices.length) % enabledIndices.length];
    } else if (e.key === "Home") {
      targetIndex = enabledIndices[0];
    } else if (e.key === "End") {
      targetIndex = enabledIndices[enabledIndices.length - 1];
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetTab = tabs[targetIndex];
      const buttonEl = document.getElementById(`tab-btn-${targetTab.id}`);
      buttonEl?.focus();
      onChange(targetTab.id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Tabs Navigation"
      className={`flex overflow-x-auto border-b border-base bg-surface/90 backdrop-blur-sm shadow-sm ${className}`}
    >
      {tabs.map((tab, idx) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            id={`tab-btn-${tab.id}`}
            role="tab"
            aria-selected={isActive}
            aria-disabled={tab.disabled}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            disabled={tab.disabled}
            className={`relative flex shrink-0 items-center gap-2 px-5 py-3.5 text-sm font-medium transition duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
              isActive
                ? "text-brand font-semibold"
                : "text-muted-fg hover:text-primary"
            } ${tab.disabled ? "opacity-40 cursor-not-allowed" : ""} ${tabClassName}`}
          >
            {tab.icon && <span className="flex shrink-0 items-center justify-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-650 dark:bg-indigo-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
