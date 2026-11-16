import Link from "next/link";
import { Plus } from "lucide-react";

export function Navbar() {
  return (
    <header className="bg-white border-b border-[#dadde1] sticky top-0 z-30 h-14">
      <div className="max-w-[1440px] mx-auto h-full px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-xl shadow-2xs">
            F
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1c1e21] group-hover:text-[#1877F2] transition-colors">
            Marketplace
          </span>
        </Link>

        <Link
          href="/create"
          className="inline-flex items-center gap-1.5 bg-[#e7f3ff] hover:bg-[#dbeafe] text-[#1877F2] font-semibold text-sm px-3.5 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Create new listing</span>
        </Link>
      </div>
    </header>
  );
}