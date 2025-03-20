import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { Trash2 } from "lucide-react";
import { Toaster, toast } from "sonner";
import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

const ToolBox = ({
  toolName,
  onBack,
}: {
  toolName: string;
  onBack: () => void;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

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

  const mergeKMZFiles = async () => {
    if (files.length < 2) {
      toast.error("Please upload at least two KMZ files to merge.");
      return;
    }

    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const parser = new XMLParser();
      const builder = new XMLBuilder();
      let mergedKmlContent = null;

      for (const file of files) {
        const fileData = await file.arrayBuffer();
        const kmz = await JSZip.loadAsync(fileData);
        const kmlFile = Object.keys(kmz.files).find(name => name.endsWith(".kml"));

        if (kmlFile) {
          const kmlContent = await kmz.files[kmlFile].async("string");
          const parsedKml = parser.parse(kmlContent);

          if (!mergedKmlContent) {
            mergedKmlContent = parsedKml;
            // Ensure Placemark is an array
            if (!Array.isArray(mergedKmlContent.kml.Document.Placemark)) {
              mergedKmlContent.kml.Document.Placemark = [];
            }
          } else {
            // Merge <Placemark> elements from the current KML into the merged KML
            const placemarks = parsedKml.kml.Document.Placemark || [];
            if (!Array.isArray(placemarks)) {
              mergedKmlContent.kml.Document.Placemark.push(placemarks);
            } else {
              mergedKmlContent.kml.Document.Placemark.push(...placemarks);
            }
          }
        }
      }

      if (mergedKmlContent) {
        const mergedKmlString = builder.build(mergedKmlContent);
        zip.file("merged.kml", mergedKmlString);

        const mergedKmzBlob = await zip.generateAsync({ type: "blob" });
        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(mergedKmzBlob);
        downloadLink.download = "merged.kmz";
        downloadLink.click();

        toast.success("KMZ files merged and downloaded successfully!");
      } else {
        toast.error("No valid KML files found in the uploaded KMZ files.");
      }
    } catch (error) {
      console.error("Error merging KMZ files:", error);
      toast.error("An error occurred while merging KMZ files.");
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.google-earth.kmz": [".kmz"] },
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
            isDragActive ? "bg-gray-700" : ""
          }`}
        >
          <input {...getInputProps()} className="hidden" />
          <p className="mb-4">
            {isDragActive ? "Drop the files here ..." : "Drop or upload your .kmz files"}
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
          <button
            onClick={mergeKMZFiles}
            disabled={isProcessing}
            className={`text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200 ${
              isProcessing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isProcessing ? "Processing..." : "Go!"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolBox;
