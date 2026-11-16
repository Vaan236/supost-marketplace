import Link from "next/link";
import { CreditCard, Plus } from "lucide-react";

export function Navbar() {
  return (
    <header className="bg-white border-b border-[#dadde1] sticky top-0 z-30 h-14">
      <div className="max-w-[1440px] mx-auto h-full px-4 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center text-white font-bold text-xl shadow-2xs">
            F
          </div>
          <span className="text-xl font-bold tracking-tight text-[#1c1e21] group-hover:text-[#1877F2] transition-colors">
            Marketplace
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/connect"
            className="inline-flex items-center gap-1.5 bg-[#f0f2f5] hover:bg-[#e4e6eb] text-[#1c1e21] font-semibold text-xs sm:text-sm px-3 py-2 rounded-lg transition-colors"
          >
            <CreditCard className="w-4 h-4 text-[#635bff]" />
            <span>Connect with Stripe</span>
          </Link>

          <Link
            href="/create"
            className="inline-flex items-center gap-1.5 bg-[#e7f3ff] hover:bg-[#dbeafe] text-[#1877F2] font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">Create new listing</span>
            <span className="sm:hidden">Sell</span>
          </Link>
        </div>
      </div>
    </header>
  );
}