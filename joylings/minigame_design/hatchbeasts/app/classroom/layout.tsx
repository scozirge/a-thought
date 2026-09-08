import type { Metadata } from 'next';
import './classroom.css';

export const metadata: Metadata = {
  title: '遊戲設計｜破殼怪獸課堂',
  description: '從體驗、發想到設計與開發，一起製作破殼怪獸。',
};

export default function ClassroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="classroom-shell">{children}</div>;
}
