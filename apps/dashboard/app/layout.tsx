import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Desktop MCP Dashboard',
  description: 'Local control plane for Desktop MCP Server'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}