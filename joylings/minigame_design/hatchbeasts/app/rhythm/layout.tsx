import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '瀑布精靈音遊 Demo｜破殼怪獸',
  description:
    '用方向鍵或 WASD 跟著音樂接住水花，和瀑布精靈一起演奏。',
};

export default function RhythmLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
