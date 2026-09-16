import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '怪獸音遊｜破殼怪獸',
  description:
    '用方向鍵或 WASD 跟著音樂接住節拍，和剛孵出的怪獸一起演奏。',
};

export default function RhythmLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
