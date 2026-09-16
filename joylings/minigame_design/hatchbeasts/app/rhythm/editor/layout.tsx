import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '怪獸製譜器｜破殼怪獸',
  description:
    '播放音樂並用方向鍵或 WASD 錄下精準落點，製作破殼怪獸音遊譜面。',
};

export default function RhythmEditorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
