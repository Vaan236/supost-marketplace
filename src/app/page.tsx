"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Tag, Plus, MapPin, PackageOpen, Store } from "lucide-react";
import { supabase, Listing, CATEGORIES, formatTimeAgo } from "@/lib/supabase";

function isJustListed(isoString: string) {
  return Date.now() - new Date(isoString).getTime() < 1000 * 60 * 60 * 6; // under 6 hours
}

export default function MarketplaceHomePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(`Failed to load listings: ${error.message}`);
      } else {
        setListings((data as Listing[]) || []);
      }
    } catch {
      setErrorMsg("Network error connecting to Supabase.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [listings, selectedCategory, searchQuery]);

  return (
    <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row min-h-[calc(100vh-3.5rem)] bg-[#f0f2f5]">
      {/* Facebook Marketplace Left Sidebar */}
      <aside className="hidden md:flex md:flex-col w-80 shrink-0 bg-white border-r border-[#dadde1] p-4 space-y-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#65676b] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Marketplace"
              className="w-full bg-[#f0f2f5] text-[#1c1e21] rounded-full pl-9 pr-3 py-2 text-sm placeholder:text-[#65676b] focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
            />
          </div>

          <button
            type="button"
            onClick={() => setSelectedCategory("All")}
            className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              selectedCategory === "All"
                ? "bg-[#e7f3ff] text-[#1877F2]"
                : "text-[#1c1e21] hover:bg-[#f2f3f5]"
            }`}
          >
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                selectedCategory === "All"
                  ? "bg-[#1877F2] text-white"
                  : "bg-[#e4e6eb] text-[#1c1e21]"
              }`}
            >
              <Store className="w-4 h-4" />
            </span>
            <span>Browse all</span>
          </button>

          <Link
            href="/create"
            className="w-full flex items-center justify-center gap-1.5 bg-[#e7f3ff] hover:bg-[#dbeafe] text-[#1877F2] font-semibold text-sm py-2.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create new listing</span>
          </Link>
        </div>

        <div className="border-t border-[#e4e6eb] pt-3">
          <h2 className="text-base font-bold text-[#1c1e21] mb-2 px-1">
            Categories
          </h2>
          <nav className="space-y-0.5">
            {CATEGORIES.filter((c) => c !== "All").map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-sm font-medium text-left transition-colors cursor-pointer ${
                    active
                      ? "bg-[#e7f3ff] text-[#1877F2] font-semibold"
                      : "text-[#1c1e21] hover:bg-[#f2f3f5]"
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      active
                        ? "bg-[#1877F2] text-white"
                        : "bg-[#e4e6eb] text-[#1c1e21]"
                    }`}
                  >
                    <Tag className="w-4 h-4" />
                  </span>
                  <span className="truncate">{category}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Feed */}
      <main className="flex-1 p-4 sm:p-6 space-y-5">
        {/* Top Search & Mobile Category Pills */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#65676b] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search listings (e.g., Nintendo Switch, bike, desk)..."
                className="w-full bg-white text-[#1c1e21] border border-[#ced0d4] rounded-full pl-10 pr-4 py-2 text-sm placeholder:text-[#65676b] focus:outline-none focus:border-[#1877F2]"
              />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="px-4 py-2 rounded-full bg-[#e4e6eb] hover:bg-[#d8dadf] text-xs font-semibold text-[#1c1e21] cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex md:hidden gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((category) => {
              const active = selectedCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-[#1877F2] text-white"
                      : "bg-white border border-[#dadde1] text-[#1c1e21]"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section Heading */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1c1e21]">
            {selectedCategory === "All" ? "Today's picks" : selectedCategory}
          </h1>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#1877F2]">
            <MapPin className="w-3.5 h-3.5" />
            <span>
              {filteredListings.length}{" "}
              {filteredListings.length === 1 ? "item" : "items"} available
            </span>
          </span>
        </div>

        {/* Error State */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={fetchListings}
              className="underline font-bold cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Facebook Marketplace Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="aspect-square rounded-lg bg-[#e4e6eb]" />
                <div className="h-4 w-16 bg-[#e4e6eb] rounded-xs" />
                <div className="h-3.5 w-3/4 bg-[#e4e6eb] rounded-xs" />
                <div className="h-3 w-1/2 bg-[#e4e6eb] rounded-xs" />
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white border border-[#dadde1] rounded-xl p-12 text-center max-w-md mx-auto mt-6 space-y-3">
            <PackageOpen className="w-10 h-10 text-[#65676b] mx-auto" />
            <h3 className="text-base font-bold text-[#1c1e21]">
              No listings found
            </h3>
            <p className="text-xs text-[#65676b]">
              Try clearing your search or create a new listing in this category.
            </p>
            <Link
              href="/create/item"
              className="inline-block bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold px-4 py-2 rounded-lg"
            >
              + Create Listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredListings.map((item) => (
              <Link
                key={item.id}
                href={`/item/${item.id}`}
                className="group flex flex-col space-y-2"
              >
                <div className="aspect-square rounded-lg bg-white border border-[#dadde1] overflow-hidden relative shadow-2xs">
                  {item.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-[#65676b]">
                      No photo
                    </div>
                  )}

                  {isJustListed(item.created_at) && (
                    <span className="absolute top-2 left-2 bg-white/95 text-[#1c1e21] text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                      Just listed
                    </span>
                  )}
                </div>

                <div className="px-0.5 space-y-0.5">
                  <div className="text-base font-bold text-[#1c1e21]">
                    ${Number(item.price).toLocaleString()}
                  </div>
                  <div className="text-sm text-[#1c1e21] leading-snug line-clamp-1 group-hover:underline">
                    {item.title}
                  </div>
                  <div className="text-xs text-[#65676b] truncate">
                    {item.location} · {formatTimeAgo(item.created_at).replace("Listed ", "")}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}