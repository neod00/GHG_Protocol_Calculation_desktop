import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "GHG License Admin",
  description: "License and update management for GHG Desktop"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
