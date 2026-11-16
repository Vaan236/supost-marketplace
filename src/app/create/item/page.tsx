"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Upload, X } from "lucide-react";
import { supabase, CATEGORIES } from "@/lib/supabase";

const LISTING_CATEGORIES = CATEGORIES.filter((c) => c !== "All");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface QueuedListing {
  id: string;
  title: string;
  category: string;
  price: number;
  location: string;
  sellerEmail: string;
  description: string;
  photoFile: File | null;
  photoPreview: string | null;
}

function CreateItemContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listingType = searchParams.get("type") || "item";

  const isMultiple = listingType === "multiple";
  const isVehicle = listingType === "vehicle";
  const isHome = listingType === "home";

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(
    isVehicle ? "Vehicles" : isHome ? "Property Rentals" : "Electronics"
  );
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("Palo Alto, CA");
  const [sellerEmail, setSellerEmail] = useState("");
  const [description, setDescription] = useState("");

  // Vehicle-specific fields
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleMakeModel, setVehicleMakeModel] = useState("");
  const [vehicleMileage, setVehicleMileage] = useState("");

  // Home-specific fields
  const [propertyDealType, setPropertyDealType] = useState("For Rent");
  const [bedrooms, setBedrooms] = useState("2");
  const [bathrooms, setBathrooms] = useState("1");

  // Batch queue for "Create multiple listings"
  const [queue, setQueue] = useState<QueuedListing[]>([]);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isVehicle) setCategory("Vehicles");
    else if (isHome) setCategory("Property Rentals");
  }, [isVehicle, isHome]);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    setErrorMsg(null);

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (JPEG, PNG, GIF, or WebP).");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg("Image exceeds the 5MB size limit.");
      return;
    }

    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetFormFields = () => {
    setTitle("");
    setPrice("");
    setDescription("");
    setVehicleYear("");
    setVehicleMakeModel("");
    setVehicleMileage("");
    clearPhoto();
  };

  const buildFullDescription = () => {
    const specs: string[] = [];

    if (isVehicle) {
      if (vehicleYear.trim()) specs.push(`Year: ${vehicleYear.trim()}`);
      if (vehicleMakeModel.trim())
        specs.push(`Make & Model: ${vehicleMakeModel.trim()}`);
      if (vehicleMileage.trim())
        specs.push(`Mileage: ${Number(vehicleMileage).toLocaleString()} miles`);
    }

    if (isHome) {
      specs.push(`Listing Type: ${propertyDealType}`);
      specs.push(`Layout: ${bedrooms} Bed • ${bathrooms} Bath`);
    }

    const baseDesc = description.trim();
    if (specs.length === 0) return baseDesc;
    return baseDesc ? `${specs.join(" | ")}\n\n${baseDesc}` : specs.join(" | ");
  };

  const uploadPhotoToStorage = async (file: File | null) => {
    if (!file) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("listing-images")
      .upload(fileName, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      throw new Error(`Photo upload failed: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from("listing-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleAddToQueue = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericPrice = parseFloat(price);
    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }
    if (!sellerEmail.trim() || !sellerEmail.includes("@")) {
      setErrorMsg("Please enter a valid contact email.");
      return;
    }

    setQueue((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: title.trim(),
        category,
        price: numericPrice,
        location: location.trim() || "Palo Alto, CA",
        sellerEmail: sellerEmail.trim(),
        description: description.trim(),
        photoFile,
        photoPreview,
      },
    ]);

    resetFormFields();
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handlePublishBatch = async () => {
    if (queue.length === 0) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const rows = await Promise.all(
        queue.map(async (item) => {
          const imageUrl = await uploadPhotoToStorage(item.photoFile);
          return {
            title: item.title,
            category: item.category,
            price: item.price,
            location: item.location,
            seller_email: item.sellerEmail,
            description: item.description,
            image_url: imageUrl,
          };
        })
      );

      const { error } = await supabase.from("listings").insert(rows);
      if (error) {
        setErrorMsg(`Batch upload failed: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      setQueue([]);
      router.push("/");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to publish listings."
      );
      setIsSubmitting(false);
    }
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericPrice = parseFloat(price);
    if (!title.trim()) {
      setErrorMsg("Please enter a title.");
      return;
    }
    if (isNaN(numericPrice) || numericPrice < 0) {
      setErrorMsg("Please enter a valid price.");
      return;
    }
    if (!sellerEmail.trim() || !sellerEmail.includes("@")) {
      setErrorMsg("Please enter a valid contact email.");
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrl = await uploadPhotoToStorage(photoFile);

      const { data, error } = await supabase
        .from("listings")
        .insert({
          title: title.trim(),
          category,
          price: numericPrice,
          location: location.trim() || "Palo Alto, CA",
          seller_email: sellerEmail.trim(),
          description: buildFullDescription(),
          image_url: imageUrl,
        })
        .select()
        .single();

      if (error) {
        setErrorMsg(`Could not create listing: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      resetFormFields();
      router.push(`/item/${data.id}`);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Network error while creating listing."
      );
      setIsSubmitting(false);
    }
  };

  const formHeading = isMultiple
    ? "Create multiple listings"
    : isVehicle
    ? "Vehicle for sale"
    : isHome
    ? "Home for sale or rent"
    : "Item for sale";

  const previewDescription = buildFullDescription();

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-16">
      <Link
        href="/create"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1877F2] hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to listing types</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 items-start">
        {/* Left Form Column */}
        <form
          onSubmit={isMultiple ? handleAddToQueue : handleSingleSubmit}
          autoComplete="off"
          className="bg-white border border-[#dadde1] rounded-xl p-5 space-y-4 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[#1c1e21]">{formHeading}</h1>
            {isMultiple && (
              <span className="text-xs font-bold bg-[#e7f3ff] text-[#1877F2] px-2.5 py-1 rounded-full">
                {queue.length} queued
              </span>
            )}
          </div>

          {/* Photo Upload Box */}
          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1.5">
              Photos
            </label>
            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileChange(e.dataTransfer.files?.[0]);
                }}
                className="border-2 border-dashed border-[#ced0d4] hover:border-[#1877F2] rounded-lg p-6 text-center cursor-pointer transition-colors bg-[#f7f8fa]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => handleFileChange(e.target.files?.[0])}
                  className="hidden"
                />
                <Upload className="w-6 h-6 mx-auto text-[#65676b] mb-1.5" />
                <p className="text-sm font-semibold text-[#1c1e21]">
                  Add photos
                </p>
                <p className="text-[11px] text-[#65676b] mt-0.5">
                  JPEG, PNG, GIF, or WebP (max 5MB)
                </p>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-[#dadde1] bg-[#f0f2f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoPreview}
                  alt="Upload preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  type="button"
                  onClick={clearPhoto}
                  aria-label="Remove photo"
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Vehicle-Specific Inputs */}
          {isVehicle && (
            <div className="bg-[#f7f8fa] border border-[#dadde1] rounded-lg p-3 space-y-3">
              <div className="text-xs font-bold text-[#1877F2]">
                Vehicle Details
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#1c1e21] mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max="2027"
                    value={vehicleYear}
                    onChange={(e) => setVehicleYear(e.target.value)}
                    placeholder="2022"
                    className="w-full border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1c1e21] mb-1">
                    Mileage (mi)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={vehicleMileage}
                    onChange={(e) => setVehicleMileage(e.target.value)}
                    placeholder="24500"
                    className="w-full border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#1c1e21] mb-1">
                  Make & Model
                </label>
                <input
                  type="text"
                  value={vehicleMakeModel}
                  onChange={(e) => setVehicleMakeModel(e.target.value)}
                  placeholder="e.g., Honda Civic EX"
                  className="w-full border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-sm"
                />
              </div>
            </div>
          )}

          {/* Home-Specific Inputs */}
          {isHome && (
            <div className="bg-[#f7f8fa] border border-[#dadde1] rounded-lg p-3 space-y-3">
              <div className="text-xs font-bold text-[#1877F2]">
                Property Details
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#1c1e21] mb-1">
                    Type
                  </label>
                  <select
                    value={propertyDealType}
                    onChange={(e) => setPropertyDealType(e.target.value)}
                    className="w-full border border-[#ced0d4] rounded-lg px-2 py-1.5 text-xs bg-white"
                  >
                    <option value="For Rent">For Rent</option>
                    <option value="For Sale">For Sale</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1c1e21] mb-1">
                    Beds
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value)}
                    className="w-full border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#1c1e21] mb-1">
                    Baths
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value)}
                    className="w-full border border-[#ced0d4] rounded-lg px-2.5 py-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isVehicle
                  ? "e.g., 2022 Honda Civic EX"
                  : isHome
                  ? "e.g., 2BR Sunny Apartment near Campus"
                  : "What are you selling?"
              }
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#1877F2]"
            >
              {LISTING_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              {isHome && propertyDealType === "For Rent"
                ? "Monthly Rent ($) *"
                : "Price ($) *"}
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Palo Alto, CA"
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              Contact Email *
            </label>
            <input
              type="email"
              required
              value={sellerEmail}
              onChange={(e) => setSellerEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1c1e21] mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item..."
              className="w-full border border-[#ced0d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1877F2] resize-none"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-300 text-red-700 text-xs px-3 py-2 rounded-lg">
              {errorMsg}
            </div>
          )}

          {isMultiple ? (
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#e7f3ff] hover:bg-[#dbeafe] text-[#1877F2] font-bold text-sm py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Item to Batch ({queue.length})</span>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#1877F2] hover:bg-[#166fe5] disabled:bg-[#9cb4d8] text-white font-bold text-sm py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              {isSubmitting ? "Creating Listing..." : "Create Listing"}
            </button>
          )}
        </form>

        {/* Right Column: Batch Queue (if Multiple) + Sticky Live Preview */}
        <div className="space-y-5 lg:sticky lg:top-20">
          {isMultiple && (
            <div className="bg-white border border-[#dadde1] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#1c1e21]">
                    Batch Queue ({queue.length}{" "}
                    {queue.length === 1 ? "item" : "items"})
                  </h2>
                  <p className="text-xs text-[#65676b]">
                    Add items using the form on the left, then publish them all
                    at once.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={queue.length === 0 || isSubmitting}
                  onClick={handlePublishBatch}
                  className="bg-[#1877F2] hover:bg-[#166fe5] disabled:bg-[#9cb4d8] text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  {isSubmitting
                    ? "Publishing..."
                    : `Publish All (${queue.length})`}
                </button>
              </div>

              {queue.length === 0 ? (
                <div className="border border-dashed border-[#dadde1] rounded-lg py-8 text-center text-xs text-[#65676b]">
                  Your batch queue is empty. Fill out the form on the left and
                  click &ldquo;Add Item to Batch&rdquo;.
                </div>
              ) : (
                <div className="divide-y divide-[#e4e6eb] border border-[#dadde1] rounded-lg overflow-hidden">
                  {queue.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between gap-3 bg-white"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-md bg-[#f0f2f5] border border-[#dadde1] overflow-hidden shrink-0 flex items-center justify-center text-[10px] text-[#65676b]">
                          {item.photoPreview ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.photoPreview}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            "No photo"
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#1c1e21] truncate">
                            {item.title}
                          </div>
                          <div className="text-xs text-[#65676b]">
                            ${item.price.toLocaleString()} · {item.category}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromQueue(item.id)}
                        aria-label="Remove from queue"
                        className="p-1.5 text-[#65676b] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Live Preview Card */}
          <div className="bg-white border border-[#dadde1] rounded-xl p-5 space-y-4">
            <div className="text-sm font-bold text-[#65676b]">Preview</div>

            <div className="border border-[#dadde1] rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[1.3fr_1fr]">
              <div className="aspect-square md:aspect-auto md:min-h-[380px] bg-[#e7f3ff] flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoPreview}
                    alt="Listing preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-[#65676b]">
                    Your listing photo will appear here
                  </span>
                )}
              </div>

              <div className="p-5 space-y-4 border-t md:border-t-0 md:border-l border-[#dadde1]">
                <div>
                  <h2 className="text-xl font-bold text-[#1c1e21] break-words">
                    {title.trim() || "Title"}
                  </h2>
                  <div className="text-lg font-bold text-[#1c1e21] mt-0.5">
                    {price
                      ? `$${Number(price).toLocaleString()}${
                          isHome && propertyDealType === "For Rent" ? " / mo" : ""
                        }`
                      : "Price"}
                  </div>
                  <p className="text-xs text-[#65676b] mt-1">
                    Listed just now in {location.trim() || "Palo Alto, CA"}
                  </p>
                </div>

                <div className="text-xs text-[#65676b]">
                  Category:{" "}
                  <span className="font-semibold text-[#1c1e21]">
                    {category}
                  </span>
                </div>

                <div className="border-t border-[#e4e6eb] pt-3">
                  <div className="text-xs font-bold text-[#1c1e21] mb-1">
                    Description
                  </div>
                  <p className="text-xs text-[#65676b] whitespace-pre-wrap break-words">
                    {previewDescription || "Description will appear here."}
                  </p>
                </div>

                <div className="border-t border-[#e4e6eb] pt-3">
                  <div className="text-xs font-bold text-[#1c1e21] mb-1">
                    Seller Information
                  </div>
                  <p className="text-xs text-[#65676b] break-all">
                    {sellerEmail.trim() || "seller@email.com"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateItemPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white border border-[#dadde1] rounded-xl h-96 animate-pulse" />
        </div>
      }
    >
      <CreateItemContent />
    </Suspense>
  );
}