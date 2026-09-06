'use client';

import clsx from 'clsx';
import { BookOpenText, Database, GraduationCap, Music4 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ARPEGGIO_PRACTICE_SELECTION_EVENT, arpeggioPracticeSelectionHref, DEFAULT_ARPEGGIO_PRACTICE_SELECTION, readArpeggioPracticeSelection, type ArpeggioPracticeSelection } from '@/app/lib/arpeggio-practice-selection';
import { DEFAULT_PRACTICE_SELECTION, PRACTICE_SELECTION_EVENT, practiceSelectionHref, readPracticeSelection, type PracticeSelection } from '@/app/lib/practice-selection';

const links = [
  { name: 'Scale', href: '/scale', icon: BookOpenText },
  { name: 'Arpeggi', href: '/arpeggi', icon: Music4 },
  { name: 'Studio scale', href: '/studio', icon: GraduationCap },
  { name: 'Studio arpeggi', href: '/studio-arpeggi', icon: GraduationCap },
  { name: 'Dati', href: '/dati', icon: Database },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [selection, setSelection] = useState<PracticeSelection>(DEFAULT_PRACTICE_SELECTION);
  const [arpeggioSelection, setArpeggioSelection] = useState<ArpeggioPracticeSelection>(DEFAULT_ARPEGGIO_PRACTICE_SELECTION);
  useEffect(() => {
    setSelection(readPracticeSelection());
    setArpeggioSelection(readArpeggioPracticeSelection());
    const update = (event: Event) => setSelection((event as CustomEvent<PracticeSelection>).detail);
    const updateArpeggio = (event: Event) => setArpeggioSelection((event as CustomEvent<ArpeggioPracticeSelection>).detail);
    window.addEventListener(PRACTICE_SELECTION_EVENT, update);
    window.addEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, updateArpeggio);
    return () => {
      window.removeEventListener(PRACTICE_SELECTION_EVENT, update);
      window.removeEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, updateArpeggio);
    };
  }, [pathname]);
  const hrefFor = (href: string) => {
    if (href === '/studio') return practiceSelectionHref(href, selection);
    if (href === '/studio-arpeggi') return arpeggioPracticeSelectionHref(href, arpeggioSelection);
    return href;
  };
  return (
    <nav className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Navigazione principale">
      {links.map(({ name, href, icon: Icon }) => (
        <Link key={href} href={hrefFor(href)} className={clsx('flex h-12 min-w-fit items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition md:justify-start', pathname === href ? 'bg-moss-100 text-moss-900' : 'bg-white/55 text-stone-600 hover:bg-white hover:text-moss-700')}>
          <Icon className="h-5 w-5"/><span>{name}</span>
        </Link>
      ))}
    </nav>
  );
}
