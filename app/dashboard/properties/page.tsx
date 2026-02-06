import Link from "next/link";
import { getProperties } from "@/app/actions/properties";
import { PropertyCard } from "./property-card";

export default async function PropertiesPage() {
  const properties = await getProperties();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Properties</h1>
          <p className="text-slate-500">Manage your multifamily portfolio</p>
        </div>

        <Link
          href="/dashboard/properties/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Add Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <div className="text-5xl mb-4">🏢</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No properties yet
          </h3>
          <p className="text-slate-500 mb-4">
            Add your first property to start generating reports
          </p>
          <Link
            href="/dashboard/properties/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            + Add Your First Property
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  );
}
