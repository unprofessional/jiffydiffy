import React from "react";
import { Sidebar } from "../Sidebar/Sidebar";

export const AppShell: React.FC<{
  onOpenDiff?: (id: string) => void;
  children: React.ReactNode;
}> = ({ onOpenDiff, children }) => {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "auto 1fr",
      height: "100vh",
      width: "100vw",
      background: "#0b0e12",
    }}>
      <Sidebar onOpenDiff={onOpenDiff} />
      <main style={{ padding: 16, overflow: "auto" }}>{children}</main>
    </div>
  );
};
