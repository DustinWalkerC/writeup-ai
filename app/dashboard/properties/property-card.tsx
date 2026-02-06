"use client";

import Link from "next/link";
import type { Property } from "@/lib/supabase";
import { deleteProperty } from "@/app/actions/properties";
import { useState } from "react";

export function PropertyCard({ property }: { property: Property }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this property?")) return;

    setIsDeleting(true);
    try {
      await deleteProperty(property.id);
      // Server Action revalidates the page; UI will refresh on next navigation/load.
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete property");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-lg text-slate-900 mb-2">
        {property.name}
      </h3>

      {(property.city || property.state) && (
        <p className="text-slate-500 text-sm mb-2">
          📍 {[property.city, property.state].filter(Boolean).join(", ")}
        </p>
      )}

      {property.units && (
        <p className="text-slate-500 text-sm mb-4">🏠 {property.units} units</p>
      )}

      <div className="flex gap-2 pt-4 border-t border-slate-100">
        <Link
          href={`/dashboard/reports/new?property=${property.id}`}
          className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          Create Report
        </Link>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="px-3 py-2 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          {isDeleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
