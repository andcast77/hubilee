export default async function ReportPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporte: {type}</h1>
        <p className="text-gray-600">Reporte específico</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <p className="text-gray-500">Reporte {type} en desarrollo...</p>
      </div>
    </div>
  );
} 