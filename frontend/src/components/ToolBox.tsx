import { useState } from "react";
import { useDropzone } from "react-dropzone";

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
    setFiles(prevFiles => [...prevFiles, ...kmzFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.google-earth.kmz': ['.kmz'] },
    multiple: true,
  });

  return (
    <div className="w-full max-w-2xl">
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
            <ul className="text-gray-400 mt-4">
              {files.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-end">
          <button className="text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200">
            Go!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolBox;
