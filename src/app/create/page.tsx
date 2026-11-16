import Link from "next/link";
import { ShoppingBag, Layers, Car, Home, ArrowLeft } from "lucide-react";

const LISTING_TYPES = [
  {
    title: "Item for sale",
    description: "Create a single listing for one or more items to sell.",
    icon: ShoppingBag,
    href: "/create/item?type=item",
    featured: true,
  },
  {
    title: "Create multiple listings",
    description: "Queue up several items and publish them all at once.",
    icon: Layers,
    href: "/create/item?type=multiple",
    featured: false,
  },
  {
    title: "Vehicle for sale",
    description: "Sell a car, truck, bike, or other type of vehicle.",
    icon: Car,
    href: "/create/item?type=vehicle",
    featured: false,
  },
  {
    title: "Home for sale or rent",
    description: "List a house or apartment for sale or rent.",
    icon: Home,
    href: "/create/item?type=home",
    featured: false,
  },
];

export default function ChooseListingTypePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1877F2] hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Marketplace</span>
      </Link>

      <h1 className="text-2xl font-bold text-center text-[#1c1e21] mb-8">
        Choose listing type
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {LISTING_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Link
              key={type.title}
              href={type.href}
              className="bg-white border border-[#dadde1] hover:border-[#1877F2] hover:shadow-md rounded-xl p-6 text-center flex flex-col items-center transition-all"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                  type.featured
                    ? "bg-[#e7f3ff] text-[#1877F2]"
                    : "bg-[#f0f2f5] text-[#1c1e21]"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-[#1c1e21] mb-1.5">
                {type.title}
              </h2>
              <p className="text-xs text-[#65676b] leading-relaxed">
                {type.description}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}