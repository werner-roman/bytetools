import { useState } from "react";
import { Toaster } from "sonner";
import { mergeKMZFiles, mergeKMZFilesAdvanced } from "@/lib/kmzMerger";
import { reverseKMZFiles } from "@/lib/kmzReverser";
import FileDropzone, { TrackItem } from "./FileDropzone";
import { Switch } from "@/components/ui/switch";
import { KMZFileWithTracks } from "@/types";

const ToolBox = ({
	toolName,
	onBack,
}: {
	toolName: string;
	onBack: () => void;
}) => {
	const [files, setFiles] = useState<File[]>([]);
	const [reorderedFiles, setReorderedFiles] = useState<KMZFileWithTracks[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);
	const [globalSortEnabled, setGlobalSortEnabled] = useState(false);
	const [globalTracks, setGlobalTracks] = useState<TrackItem[]>([]);

	const removeFile = (fileName: string, event: React.MouseEvent) => {
		event.stopPropagation();
		setFiles((prev) => prev.filter((file) => file.name !== fileName));
	};

	const clearAllFiles = () => {
		setFiles([]);
	};

	const handleMergeKMZFiles = async () => {
		if (globalSortEnabled) {
			await mergeKMZFilesAdvanced(reorderedFiles, globalTracks, setIsProcessing);
		} else {
			await mergeKMZFiles(files, setIsProcessing);
		}
	};

	const handleReverseKMZFiles = async () => {
		await reverseKMZFiles(files, setIsProcessing);
	};

	return (
		<div className="w-full max-w-2xl">
			<Toaster position="bottom-right" theme="dark" />
			<button onClick={onBack} className="mb-4 text-xl text-gray-400 hover:text-white">
				← Back
			</button>
			<div className="border-2 border-gray-400 rounded-lg p-4 mb-8">
				<h1 className="text-xl font-bold mb-2">{toolName}</h1>
				<p className="text-sm text-gray-400 mb-4">
					{toolName === "KMZ Reverse" && "Reverse the direction of any given KMZ file"}
					{toolName === "KMZ Merger" &&
						"Merge multiple KMZ files into one. Enable 'Advanced Mode' to merge all tracks into one, rearrange or remove specific tracks."}
				</p>
				<FileDropzone
					files={files}
					setFiles={setFiles}
					removeFile={removeFile}
					globalSortEnabled={globalSortEnabled}
					onTracksReordered={setReorderedFiles}
					onGlobalTracksReorder={setGlobalTracks}
				/>
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
					{toolName === "KMZ Merger" && (
						<div className="flex items-center space-x-4 bg-gray-500 rounded-md">
							<div className="flex items-center space-x-2 bg ml-2">
								<Switch
									checked={globalSortEnabled}
									onCheckedChange={(checked) => setGlobalSortEnabled(checked)}
								/>
								<label className="text-sm text-gray-300">Advanced Mode</label>
							</div>
							<button
								onClick={handleMergeKMZFiles}
								disabled={isProcessing}
								className={`text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200 ${
									isProcessing ? "opacity-50 cursor-not-allowed" : ""
								}`}
							>
								{isProcessing ? "Processing..." : "Go!"}
							</button>
						</div>
					)}
					{toolName === "KMZ Reverse" && (
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
