import { Music2 } from 'lucide-react';
import NavLinks from './NavLinks';
import CircleOfFifths from './CircleOfFifths';

export default function SideNav() {
  return (
    <div className="flex h-full flex-col border-b border-stone-300 bg-[#eef0e9]/90 px-3 py-3 backdrop-blur-md md:border-b-0 md:border-r md:px-4 md:py-5">
      <div className="mb-3 flex h-20 items-end rounded-2xl bg-moss-900 p-4 text-white md:h-44">
        <div><Music2 className="mb-3 h-7 w-7 text-brass-100"/><p className="font-sans text-2xl font-semibold leading-none tracking-[-0.025em]">Scale e arpeggi<br/>al pianoforte</p></div>
      </div>
      <NavLinks />
      <CircleOfFifths />
    </div>
  );
}
