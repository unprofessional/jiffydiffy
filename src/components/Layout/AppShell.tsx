import React from "react";
import { Sidebar } from "../Sidebar/Sidebar";

export const AppShell: React.FC<{
  onOpenDiff?: (id: string) => void;
  children: React.ReactNode;
}> = ({ onOpenDiff, children }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr", // give sidebar a stable width (adjust to taste)
        width: "100%",   // avoid 100vw
        height: "100%",  // avoid 100vh
        minWidth: 0,     // allow grid children to shrink horizontally
        minHeight: 0,    // allow grid children to shrink vertically
        overflow: "hidden",
        background: "#0b0e12",
      }}
    >
      <Sidebar onOpenDiff={onOpenDiff} />
      <main
        style={{
          padding: 16,
          overflow: "auto",
          minWidth: 0,    // important for scrollable children
          minHeight: 0,   // important for scrollable children
        }}
      >
        {children}
      </main>
    </div>
  );
};
