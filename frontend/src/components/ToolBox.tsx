import { useState } from "react";
import { Toaster } from "sonner";
import { mergeKMZFiles } from "@/lib/kmzMerger";
import { reverseKMZFiles } from "@/lib/kmzReverser";
import FileDropzone from "./FileDropzone";

const ToolBox = ({
  toolName,
  onBack,
}: {
  toolName: string;
  onBack: () => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const removeFile = (fileName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
  };

  const clearAllFiles = () => {
    setFiles([]);
  };

  const handleMergeKMZFiles = async () => {
    await mergeKMZFiles(files, setIsProcessing);
  };

  const handleReverseKMZFiles = async () => {
    await reverseKMZFiles(files, setIsProcessing);
  };

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
        <FileDropzone
          files={files}
          setFiles={setFiles}
          removeFile={removeFile}
          clearAllFiles={clearAllFiles}
        />
        <div className="flex justify-between items-center">
          <div className="flex-grow"></div>
          {toolName === "KMZ-Merger" && (
            <button
              onClick={handleMergeKMZFiles}
              disabled={isProcessing}
              className={`text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200 ${
                isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? "Processing..." : "Go!"}
            </button>
          )}
          {toolName === "KMZ-Reverse" && (
            <button
              onClick={handleReverseKMZFiles}
              disabled={isProcessing}
              className={`text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200 ${
                isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {isProcessing ? "Processing..." : "Go!"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolBox;
