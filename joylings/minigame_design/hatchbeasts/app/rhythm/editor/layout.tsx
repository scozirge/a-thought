import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '瀑布精靈製譜器｜破殼怪獸',
  description:
    '播放音樂並用方向鍵或 WASD 錄下精準落點，製作瀑布精靈音遊譜面。',
};

export default function RhythmEditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
