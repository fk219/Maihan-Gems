/**
 * apps/web/src/app/(storefront)/education/[[...educationPath]]/page.tsx
 *
 * `/education` and `/education/<chapter>` — the reading room.
 *
 * The source carried fifteen education URLs. There is no CMS content in this
 * environment, so the reading room is authored here as four short, general
 * chapters. They describe how to read a catalogue record; they do not claim a
 * laboratory result, an origin opinion or a treatment for any specific stone.
 *
 * An unknown chapter is a 404, not a blank page under a 200.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Breadcrumbs } from '../../../../components/design-system/Breadcrumbs.js';
import { EditorialMasthead } from '../../../../components/design-system/EditorialMasthead.js';

interface Chapter {
  readonly slug: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly summary: string;
  readonly paragraphs: readonly string[];
}

const CHAPTERS: readonly Chapter[] = [
  {
    slug: 'reading-a-record',
    eyebrow: 'Catalogue literacy',
    title: 'Reading a gemstone record',
    summary: 'Carat, colour, cut, clarity — and the evidence status beside each value.',
    paragraphs: [
      'A carat is a unit of mass, not a measure of size. Two stones of the same weight can face up very differently because depth and cut proportions change how much of the stone is visible from above.',
      'Colour is described with three separate ideas: hue (the family, such as green or blue), tone (how light or dark) and saturation (how strong). A record that gives only a hue is telling you less than a record that gives all three.',
      'Cut is the only human-controlled variable. It governs how light returns through the crown. A well-cut stone can look brighter than a larger, poorly proportioned one; the record should state the shape and the cutting style it actually carries.',
      'Clarity is a description of what is visible, at a stated magnification, by a human grader. It is not a guarantee that a stone is flawless, and it is not a substitute for examining the stone in person.',
    ],
  },
  {
    slug: 'treatment-disclosure',
    eyebrow: 'Disclosure',
    title: 'Treatment, disclosed',
    summary: 'Why a treated stone is not a defective stone, and why silence is the problem.',
    paragraphs: [
      'Heat treatment is routine for many coloured stones. It can improve colour or clarity, and it is stable. A disclosed heat treatment is a fact about the stone, not a defect to be hidden or punished.',
      'Other treatments are less stable. Fracture filling and dyeing can change over time and require different care. Oiling is common in emerald; the amount and the material matter, and the record should say what is known.',
      'The catalogue rule is simple: a treatment is shown when the record carries it. A blank treatment field means the record is silent, not that the stone is untreated. The two are different statements.',
      'When a treatment is unknown, ask. A refusal to guess is more useful than a confident label that cannot be supported.',
    ],
  },
  {
    slug: 'origin-opinion',
    eyebrow: 'Provenance',
    title: 'Origin is an opinion',
    summary: 'A laboratory origin call is expert judgement, not a birth certificate.',
    paragraphs: [
      'Origin is inferred from inclusions, trace elements and isotopic ratios. It is an expert opinion based on the evidence available at the time, and reputable laboratories can differ.',
      'A country name is not a quality grade. Fine stones and poor stones come from the same deposit. Paying a premium for a locality is a decision about provenance, not about beauty.',
      'The source catalogue did not carry a verified origin for every stone. Where the record is silent, this site leaves the field open and says so. It does not copy an origin from a neighbouring stone.',
    ],
  },
  {
    slug: 'light-and-photography',
    eyebrow: 'Looking',
    title: 'What a photograph cannot show',
    summary: 'Screens, lighting and inclusions: the limits of judging a stone online.',
    paragraphs: [
      'A photograph is a record of one lighting condition. A stone photographed under a cool key light can look distinctly different under warm room light, and different again in daylight.',
      'Screens are calibrated differently. A colour that looks saturated on one display can look muted on another. This is why a hue name is more stable than a swatch.',
      'Inclusions that are obvious under a loupe may be invisible at arm’s length, and the reverse is also true. A photograph cannot replace a viewing, and a catalogue should not imply that it can.',
      'Where a product has no photograph, this site shows a light study and says so. It does not use a stock image and caption it as the stone.',
    ],
  },
];

interface PageProps {
  readonly params: Promise<{ educationPath?: string[] }>;
}

function findChapter(path: readonly string[]): Chapter | undefined {
  if (path.length !== 1) return undefined;
  return CHAPTERS.find((chapter) => chapter.slug === path[0]);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { educationPath } = await params;
  if (educationPath === undefined || educationPath.length === 0) {
    return { title: 'Reading room | Maihan Gems' };
  }
  const chapter = findChapter(educationPath);
  return chapter === undefined
    ? { title: 'Reading room | Maihan Gems' }
    : { title: `${chapter.title} | Maihan Gems`, description: chapter.summary };
}

export default async function EducationPage({ params }: PageProps) {
  const { educationPath } = await params;
  const path = educationPath ?? [];

  if (path.length > 1) notFound();

  if (path.length === 1) {
    const chapter = findChapter(path);
    if (chapter === undefined) notFound();

    return (
      <main className="page education-page mh-page">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: 'Reading room', href: '/education' },
            { label: chapter.title },
          ]}
        />
        <EditorialMasthead
          eyebrow={chapter.eyebrow}
          title={chapter.title}
          lead={chapter.summary}
        />
        <article className="sf-split">
          <div className="sf-prose">
            {chapter.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 32)}>{paragraph}</p>
            ))}
          </div>
          <aside className="sf-aside-note" aria-labelledby="chapter-more">
            <h2 id="chapter-more">Keep reading</h2>
            <ul className="sf-footer__list" style={{ color: 'inherit' }}>
              {CHAPTERS.filter((entry) => entry.slug !== chapter.slug).map((entry) => (
                <li key={entry.slug}>
                  <Link href={`/education/${entry.slug}`} style={{ color: '#474339' }}>
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </article>
      </main>
    );
  }

  return (
    <main className="page education-page mh-page">
      <Breadcrumbs crumbs={[{ label: 'Home', href: '/' }, { label: 'Reading room' }]} />

      <EditorialMasthead
        eyebrow="The reading room"
        title="How to read a stone"
        lead="Four short chapters on catalogue literacy: what the fields mean, what a treatment disclosure does and does not say, and why a photograph is not an examination."
        meta={<>{CHAPTERS.length} chapters</>}
      />

      <div className="sf-editorial-grid">
        {CHAPTERS.map((chapter, index) => (
          <article className="sf-editorial" key={chapter.slug}>
            <span className="sf-editorial__index">{String(index + 1).padStart(2, '0')}</span>
            <p className="sf-eyebrow">{chapter.eyebrow}</p>
            <h2>
              <Link href={`/education/${chapter.slug}`}>{chapter.title}</Link>
            </h2>
            <p>{chapter.summary}</p>
            <Link className="sf-text-link" href={`/education/${chapter.slug}`}>
              Read the chapter <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </main>
  );
}
