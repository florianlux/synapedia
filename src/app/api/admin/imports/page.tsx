import React from "react";

async function getImports() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/imports`, {
    cache: "no-store",
  });
  return res.json();
}

export default async function ImportOverviewPage() {
  const imports = await getImports();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Import Overview</h1>

      <div className="grid gap-4">
        {imports?.map((imp: any) => (
          <div
            key={imp.import_batch_id}
            className="border rounded-lg p-4 shadow-sm bg-white"
          >
            <div className="flex justify-between">
              <div>
                <p className="font-semibold">{imp.import_batch_id}</p>
                <p className="text-sm text-gray-500">{imp.import_source}</p>
              </div>
              <div className="text-sm text-gray-600">
                {new Date(imp.first_created).toLocaleString()}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
              <div>Total: {imp.total_substances}</div>
              <div>Draft: {imp.drafts}</div>
              <div>Review: {imp.reviews}</div>
              <div>Published: {imp.published}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
