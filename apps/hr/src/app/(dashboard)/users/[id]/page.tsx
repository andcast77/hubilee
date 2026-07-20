export default async function UserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Usuario #{id}</h1>
        <p className="text-gray-600">Detalles del usuario</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Detalles del usuario en desarrollo...</p>
      </div>
    </div>
  );
} 