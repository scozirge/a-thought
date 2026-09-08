import type { Metadata } from 'next';
import { assetUrl } from '@/lib/assets';
import './globals.css';
export const metadata: Metadata = {
  title: '破殼怪獸｜一場小小的孵化奇遇',
  description: '選一個喜歡的地方，分享你喜歡做的事，再輕輕點點神祕蛋。',
  icons: { icon: assetUrl('/favicon.svg') },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
