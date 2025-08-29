// src/components/Layout/AppShell.tsx
import React from "react";
import { Sidebar } from "../Sidebar/Sidebar";
import { FontScaleProvider, useFontScale } from "../../state/font-scale";
import "../../styles/app-shell.css";

export const AppShell: React.FC<{
  onOpenDiff?: (id: string) => void;
  children: React.ReactNode;
}> = ({ onOpenDiff, children }) => {
  return (
    <FontScaleProvider>
      <AppShellInner onOpenDiff={onOpenDiff}>{children}</AppShellInner>
    </FontScaleProvider>
  );
};

const AppShellInner: React.FC<{
  onOpenDiff?: (id: string) => void;
  children: React.ReactNode;
}> = ({ onOpenDiff, children }) => {
  const { vars } = useFontScale(); // exposes --ui-font, --code-font, --code-line-height
  return (
    <div className="app-shell" style={vars}>
      <Sidebar onOpenDiff={onOpenDiff} />
      <main className="app-main">{children}</main>
    </div>
  );
};
