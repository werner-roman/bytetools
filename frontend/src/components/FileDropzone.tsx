import { useDropzone } from "react-dropzone";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableItem } from "./SortableItem";
import { SortableGlobalItem } from "./SortableGlobalItem";
import { KMZFileWithTracks } from "@/types";

export interface TrackItem {
  id: string;
  name: string;
  coordinates: string;
  fileIndex: number;
  fileName: string;
}

interface FileDropzoneProps {
  files: File[];
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  removeFile: (fileName: string, event: React.MouseEvent) => void;
  onTracksReordered?: (reorderedFiles: KMZFileWithTracks[]) => void;
  globalSortEnabled?: boolean;
  onGlobalTracksReorder?: (tracks: TrackItem[]) => void;
}

export default function FileDropzone({
  files,
  setFiles,
  removeFile,
  onTracksReordered,
  globalSortEnabled = false,
  onGlobalTracksReorder,
}: FileDropzoneProps) {
  const [kmzFilesWithTracks, setKmzFilesWithTracks] = useState<KMZFileWithTracks[]>([]);
  const [globalTracks, setGlobalTracks] = useState<TrackItem[]>([]);

  useEffect(() => {
    const extractTracks = async () => {
      if (globalSortEnabled) {
        const filesWithTracks = await Promise.all(
          files.map(async (file) => {
            try {
              const fileData = await file.arrayBuffer();
              const kmz = await JSZip.loadAsync(fileData);
              const kmlFile = Object.keys(kmz.files).find((name) => name.endsWith(".kml"));
              if (!kmlFile) return { ...file, name: file.name, tracks: [], waypoints: [] };

              const kmlContent = await kmz.files[kmlFile].async("string");
              const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", parseAttributeValue: true });
              const parsedKml = parser.parse(kmlContent);

              const placemarks = parsedKml?.kml?.Document?.Placemark
                ? Array.isArray(parsedKml.kml.Document.Placemark)
                  ? parsedKml.kml.Document.Placemark
                  : [parsedKml.kml.Document.Placemark]
                : [];

              const tracks = placemarks.filter((p: any) => p?.LineString?.coordinates)
                .map((p: any) => ({
                  name: p?.name || "Unnamed Track",
                  coordinates: p.LineString.coordinates.trim(),
                }));

              const waypoints = placemarks.filter((p: any) => p?.Point?.coordinates)
                .map((p: any) => ({
                  name: p?.name || "Unnamed Waypoint",
                  coordinates: p.Point.coordinates.trim(),
                }));

              return { ...file, name: file.name, tracks, waypoints };
            } catch {
              return { ...file, name: file.name, tracks: [], waypoints: [] };
            }
          })
        );
        setKmzFilesWithTracks(filesWithTracks);
        onTracksReordered?.(filesWithTracks);

        if (globalSortEnabled) {
          let allTracks: TrackItem[] = [];
          filesWithTracks.forEach((f, fIndex) => {
            f.tracks?.forEach((t: { name: string; coordinates: string }, tIndex: number) => {
              allTracks.push({
                id: `${fIndex}-${tIndex}`,
                name: t.name,
                coordinates: t.coordinates,
                fileIndex: fIndex,
                fileName: f.name,
              });
            });
          });
          setGlobalTracks(allTracks);
          onGlobalTracksReorder?.(allTracks);
        } else {
          setGlobalTracks([]);
        }
      } else {
        setKmzFilesWithTracks(files as KMZFileWithTracks[]);
        onTracksReordered?.(files as KMZFileWithTracks[]);
        setGlobalTracks([]);
      }
    };
    extractTracks();
  }, [files, globalSortEnabled]);

  const syncGlobalTracksToFiles = (updatedGlobalTracks: TrackItem[]) => {
    const newFilesWithTracks = structuredClone(kmzFilesWithTracks);
    newFilesWithTracks.forEach((f) => {
      if (f.tracks) f.tracks = [];
    });
    updatedGlobalTracks.forEach((track) => {
      const f = newFilesWithTracks[track.fileIndex];
      if (f && f.tracks) {
        f.tracks.push({
          name: track.name,
          coordinates: track.coordinates,
        });
      }
    });
    return newFilesWithTracks;
  };

  const handleGlobalDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setGlobalTracks((prev) => {
      const oldIndex = prev.findIndex((t) => t.id === active.id);
      const newIndex = prev.findIndex((t) => t.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);

      if (onGlobalTracksReorder) {
        onGlobalTracksReorder(reordered);
      }

      if (onTracksReordered) {
        onTracksReordered(syncGlobalTracksToFiles(reordered));
      }
      return reordered;
    });
  };

  const removeGlobalTrack = (trackId: string) => {
    console.log("removeGlobalTrack called with ID:", trackId);
    
    // Find track before updating state 
    const currentTracks = [...globalTracks];
    const trackToRemove = currentTracks.find(t => t.id === trackId);
    const updatedTracks = currentTracks.filter(t => t.id !== trackId);
    
    // Update our component state
    setGlobalTracks(updatedTracks);
    
    // Update parent components directly without setTimeout
    // which might be causing issues
    if (onGlobalTracksReorder) {
      console.log("Calling onGlobalTracksReorder");
      onGlobalTracksReorder(updatedTracks);
    }
    
    if (onTracksReordered) {
      console.log("Calling onTracksReordered");
      const updatedFiles = syncGlobalTracksToFiles(updatedTracks);
      onTracksReordered(updatedFiles);
    }
    
    // Show success notification
    if (trackToRemove) {
      toast.success(`Track "${trackToRemove.name}" deleted`, {
        description: `Removed from ${trackToRemove.fileName}`,
        duration: 2000,
      });
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    const kmzFiles = acceptedFiles.filter((file) => file.name.endsWith(".kmz"));
    const newFiles = kmzFiles.filter(
      (file) => !files.some((existingFile) => existingFile.name === file.name)
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

    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleDragEnd = (event: any, fileIndex: number) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setKmzFilesWithTracks((prevFiles) => {
        const updatedFiles = [...prevFiles];
        const file = updatedFiles[fileIndex];
        const updatedTracks = arrayMove(file.tracks || [], active.id, over.id);
        updatedFiles[fileIndex] = { ...file, tracks: updatedTracks };
        onTracksReordered?.(updatedFiles);
        return updatedFiles;
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/vnd.google-earth.kmz": [".kmz"] },
    multiple: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div>
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
        {kmzFilesWithTracks.length > 0 && (
          <ul className="text-gray-400 mt-4 w-full">
            {kmzFilesWithTracks.map((file, fileIndex) => (
              <li key={fileIndex} className="flex flex-col items-start mb-4">
                <div className="flex justify-between items-center w-full">
                  <span className="font-medium">{file.name}</span>
                  <button
                    onClick={(event) => removeFile(file.name, event)}
                    className="text-red-500 hover:text-red-700 border-1 border-gray-400 rounded-lg p-2"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
                {!globalSortEnabled && (file.tracks?.length ?? 0) > 0 && (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(event, fileIndex)}
                  >
                    <SortableContext
                      items={(file.tracks ?? []).map((_, index) => index)}
                      strategy={verticalListSortingStrategy}
                    >
                      <ul className="ml-6 mt-2 w-full">
                        {(file.tracks ?? []).map((track, trackIndex) => (
                          <SortableItem key={trackIndex} id={trackIndex}>
                            <li className="text-sm text-gray-300">{track.name}</li>
                          </SortableItem>
                        ))}
                      </ul>
                    </SortableContext>
                  </DndContext>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {globalSortEnabled && globalTracks.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-white mb-2">
            Track Order (drag to reorder, click trash to delete)
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleGlobalDragEnd}
          >
            <SortableContext
              items={globalTracks.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {globalTracks.map((track) => (
                <SortableGlobalItem key={track.id} track={track} removeTrack={removeGlobalTrack} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}