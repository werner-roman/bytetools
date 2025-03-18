import { useState } from "react";

const ToolBox = ({
  toolName,
  onBack,
}: {
  toolName: string;
  onBack: () => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const uploadedFiles = Array.from(event.target.files).filter(file =>
        file.name.endsWith(".kmz")
      );
      setFiles(uploadedFiles);
    }
  };

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
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg p-8 mb-4">
          <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer">
            <p className="mb-4">Drop or <span className="underline">upload</span> your .kmz files</p>
            <input
              type="file"
              accept=".kmz"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
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
