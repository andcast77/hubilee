'use client';

import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}

export default function EmployeeImportModal({ isOpen, onClose, onImportSuccess }: EmployeeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fieldMapping, setFieldMapping] = useState({
    firstName: 'nombre',
    lastName: 'apellido',
    email: 'email',
    position: 'posicion',
    department: 'departamento',
    status: 'estado'
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validar tipo de archivo
      const validTypes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      if (!validTypes.includes(selectedFile.type)) {
        alert('Por favor selecciona un archivo CSV o Excel válido.');
        return;
      }
      
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('fieldMapping', JSON.stringify(fieldMapping));

    try {
      const { API_URL } = await import('@/lib/api/client');
      const response = await fetch(`${API_URL}/v1/hr/employees/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const result = await response.json().catch(() => ({}));
      const imported = typeof result?.data?.imported === 'number'
        ? result.data.imported
        : typeof result?.imported === 'number'
          ? result.imported
          : 0;
      const errors = Array.isArray(result?.data?.errors)
        ? result.data.errors
        : Array.isArray(result?.errors)
          ? result.errors
          : [];
      const message = result?.message || result?.error || 'Error en la importación';

      if (response.ok) {
        setImportResult({
          success: true,
          message: `Importación exitosa: ${imported} empleados importados`,
          imported,
          errors
        });
        onImportSuccess();
      } else {
        setImportResult({
          success: false,
          message,
          imported: 0,
          errors
        });
      }
    } catch {
      setImportResult({
        success: false,
        message: 'Error de conexión',
        imported: 0,
        errors: ['Error de red al importar el archivo']
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setImportResult(null);
    setFieldMapping({
      firstName: 'nombre',
      lastName: 'apellido',
      email: 'email',
      position: 'posicion',
      department: 'departamento',
      status: 'estado'
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Importar Empleados</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File Upload */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">1. Seleccionar Archivo</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="space-y-4">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600">
                    Arrastra tu archivo aquí o{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-500 font-medium"
                    >
                      haz clic para seleccionar
                    </button>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Formatos soportados: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>
                {file && (
                  <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                    <FileText size={16} />
                    <span>{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Field Mapping */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">2. Mapeo de Campos</h3>
            <p className="text-sm text-gray-600 mb-4">
              Especifica qué columnas de tu archivo corresponden a cada campo de empleado:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(fieldMapping).map(([field, value]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field === 'firstName' && 'Nombre'}
                    {field === 'lastName' && 'Apellido'}
                    {field === 'email' && 'Email'}
                    {field === 'position' && 'Posición'}
                    {field === 'department' && 'Departamento'}
                    {field === 'status' && 'Estado'}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setFieldMapping(prev => ({
                      ...prev,
                      [field]: e.target.value
                    }))}
                    placeholder="Nombre de la columna"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`p-4 rounded-lg border ${
              importResult.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    importResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {importResult.message}
                  </h4>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-red-700 font-medium">Errores encontrados:</p>
                      <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isUploading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                !file || isUploading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isUploading ? 'Importando...' : 'Importar Empleados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 

