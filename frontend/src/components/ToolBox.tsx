import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Trash2 } from "lucide-react";
import { Toaster, toast } from "sonner";

const ToolBox = ({
  toolName,
  onBack,
}: {
  toolName: string;
  onBack: () => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    const kmzFiles = acceptedFiles.filter(file => file.name.endsWith(".kmz"));
    const newFiles = kmzFiles.filter(
      file => !files.some(existingFile => existingFile.name === file.name)
    );

    if (newFiles.length < kmzFiles.length) {
      toast.error(
        <div className="flex justify-between items-center">
          <span>Some files were already uploaded and were skipped.</span>
          <button
            onClick={() => toast.dismiss()}
            className="ml-4 text-m text-gray-400 hover:underline"
          >
            X
          </button>
        </div>
      );
    }

    setFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const removeFile = (fileName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.google-earth.kmz': ['.kmz'] },
    multiple: true,
  });

  return (
    <div className="w-full max-w-2xl">
      <Toaster position="bottom-right" theme="dark" />
      <button
        onClick={onBack}
        className="mb-4 text-xl text-gray-400 hover:text-white"
      >
        ← Back
      </button>
      <div className="border-2 border-gray-400 rounded-lg p-4 mb-8">
        <h1 className="text-xl font-bold mb-2">{toolName}</h1>
        <div
          {...getRootProps()}
          className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg p-8 mb-4 cursor-pointer ${
            isDragActive ? 'bg-gray-700' : ''
          }`}
        >
          <input {...getInputProps()} className="hidden" />
          <p className="mb-4">
            {isDragActive ? (
              "Drop the files here ..."
            ) : (
              "Drop or upload your .kmz files"
            )}
          </p>
          {files.length > 0 && (
            <ul className="text-gray-400 mt-4 w-full">
              {files.map((file, index) => (
                <li key={index} className="flex justify-between items-center mb-2">
                  {file.name}
                  <button
                    onClick={(event) => removeFile(file.name, event)}
                    className="text-red-500 hover:text-red-700 border-1 border-gray-400 rounded-lg p-2 mb-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-between items-center">
          {files.length > 0 && (
            <button
              onClick={clearAllFiles}
              className="text-red-500 text-sm border-1 border-red-500 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors duration-200"
            >
              Clear All
            </button>
          )}
          <div className="flex-grow"></div>
          <button className="text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200">
            Go!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolBox;
