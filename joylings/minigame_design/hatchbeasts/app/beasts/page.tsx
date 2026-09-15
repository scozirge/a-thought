import { BEASTS } from '@/lib/game';
import { assetUrl } from '@/lib/assets';

export default function BeastGallery() {
  return (
    <main className="beast-gallery">
      <h1>九隻呆萌怪物</h1>
      <p>歪歪的線條・蠟筆大色塊・呆呆的可愛表情</p>
      <section className="beast-gallery-grid" aria-label="怪物造型總覽">
        {Object.values(BEASTS).map((beast) => (
          <article key={beast.id}>
            {/* oxlint-disable-next-line nextjs/no-img-element -- Local character artwork. */}
            <img
              src={assetUrl(beast.image + '?v=beasts-5')}
              alt={beast.appearance}
              width={1024}
              height={1024}
            />
            <h2>{beast.name}</h2>
            <p>{beast.appearance}</p>
          </article>
        ))}
      </section>
      <p>
        <a href={assetUrl('/')}>回到孵蛋遊戲</a>
      </p>
    </main>
  );
}
