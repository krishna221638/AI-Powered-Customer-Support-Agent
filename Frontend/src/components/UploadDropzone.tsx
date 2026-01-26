import { FC, useCallback, useState } from 'react';
import { Upload, File, AlertCircle, Check } from 'lucide-react';

interface UploadDropzoneProps {
  accept: string[];
  onFileSelect: (file: File) => void;
  fileName: string | null;
  fileSize?: number | null;
  error?: string | null;
  label: string;
  description: string;
  icon?: React.ReactNode;
}

const UploadDropzone: FC<UploadDropzoneProps> = ({
  accept,
  onFileSelect,
  fileName,
  fileSize,
  error,
  label,
  description,
  icon = <File size={36} />
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length) {
      const file = files[0];
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      
      if (accept.includes(fileExtension) || accept.includes(file.type)) {
        onFileSelect(file);
      }
    }
  }, [accept, onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  const formatFileSize = (bytes: number | undefined | null): string => {
    if (!bytes) return '';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center transition-colors cursor-pointer ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : error 
              ? 'border-red-300 bg-red-50' 
              : fileName 
                ? 'border-green-300 bg-green-50' 
                : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input
          id="fileInput"
          type="file"
          className="hidden"
          accept={accept.join(',')}
          onChange={handleFileChange}
        />
        
        <div className="text-center">
          {fileName ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{fileName}</p>
              {fileSize && (
                <p className="text-xs text-gray-500">{formatFileSize(fileSize)}</p>
              )}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-3">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <p className="text-sm font-medium text-red-800 mb-1">{error}</p>
              <p className="text-xs text-gray-500">Please try again with a valid file</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                {icon || <Upload className="h-6 w-6 text-gray-400" />}
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
              <p className="text-xs text-gray-500 mb-3">{description}</p>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {accept.join(', ')}
              </span>
            </>
          )}
        </div>
      </div>
      
      {error && !fileName && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default UploadDropzone;