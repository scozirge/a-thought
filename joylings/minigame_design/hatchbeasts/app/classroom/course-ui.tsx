import {
  ArrowLeft,
  BookOpen,
  Brain,
  Code2,
  Flag,
  Gamepad2,
  PencilRuler,
  Puzzle,
} from 'lucide-react';
import { assetUrl } from '@/lib/assets';
import { units } from './course-data';

export function UnitIcon({ name }: { name: (typeof units)[number]['icon'] }) {
  const Icon = {
    game: Gamepad2,
    pencil: PencilRuler,
    puzzle: Puzzle,
    code: Code2,
    flag: Flag,
    brain: Brain,
  }[name];
  return <Icon size={28} strokeWidth={1.6} aria-hidden="true" />;
}

export function CourseHeader({ back = false }: { back?: boolean }) {
  return (
    <header className="course-header">
      <a className="course-brand" href={assetUrl('/classroom/')}>
        <BookOpen size={21} strokeWidth={1.7} aria-hidden="true" />
        <span>
          破殼怪獸<span className="brand-divider"> / </span>
          <span className="brand-note">課堂筆記</span>
        </span>
      </a>
      {back ? (
        <a className="course-back" href={assetUrl('/classroom/')}>
          <ArrowLeft size={18} aria-hidden="true" />
          返回目錄
        </a>
      ) : (
        <span className="header-note">一起把點子做成遊戲</span>
      )}
    </header>
  );
}

export function CoursePlaceholder({ index }: { index: number }) {
  const unit = units[index];
  return (
    <>
      <CourseHeader back />
      <main className="course-main unit-cover">
        <span className={`unit-icon tint-${unit.color}`}>
          <UnitIcon name={unit.icon} />
        </span>
        <p className="course-eyebrow">
          單元 {String(index + 1).padStart(2, '0')}
        </p>
        <h1>{unit.title}</h1>
        <p className="unit-pending">本單元內容準備中</p>
        <a className="course-button" href={assetUrl('/classroom/')}>
          <ArrowLeft size={18} />
          返回目錄
        </a>
      </main>
    </>
  );
}
