import type { Metadata } from 'next';
import './classroom.css';

export const metadata: Metadata = {
  title: '遊戲設計課｜破殼怪獸與紅藍槍戰',
  description: '從破殼怪獸到紅藍槍戰，一起體驗遊戲、分享點子與動手設計。',
};

export default function ClassroomLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="classroom-shell">{children}</div>;
}
