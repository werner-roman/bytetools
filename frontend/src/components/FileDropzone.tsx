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
  uniqueId: string;
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
  const [trackIdsToDelete, setTrackIdsToDelete] = useState<Set<string>>(new Set());

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
              const trackId = `${fIndex}-${tIndex}`;
              const uniqueId = `${f.name}:${tIndex}:${t.name}`;

              if (!trackIdsToDelete.has(uniqueId)) {
                allTracks.push({
                  id: trackId,
                  name: t.name,
                  coordinates: t.coordinates,
                  fileIndex: fIndex,
                  fileName: f.name,
                  uniqueId: uniqueId,
                });
              }
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
  }, [files, globalSortEnabled, trackIdsToDelete]);

  useEffect(() => {
    setTrackIdsToDelete((prev) => {
      const updated = new Set(prev);
      const currentFileNames = new Set(files.map((file) => file.name));
      for (const uniqueId of updated) {
        const [fileName] = uniqueId.split(":");
        if (!currentFileNames.has(fileName)) {
          updated.delete(uniqueId);
        }
      }
      return updated;
    });
  }, [files]);

  useEffect(() => {
    // If there are no files but we still have tracks, clear the tracks
    if (files.length === 0 && globalTracks.length > 0) {
      console.log("Inconsistent state detected: Files empty but tracks exist, clearing tracks");
      setGlobalTracks([]);
      setKmzFilesWithTracks([]);
      if (onGlobalTracksReorder) onGlobalTracksReorder([]);
      if (onTracksReordered) onTracksReordered([]);
    }
  }, [files, globalTracks, onGlobalTracksReorder, onTracksReordered]);

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

    const currentTracks = [...globalTracks];
    const trackToRemove = currentTracks.find((t) => t.id === trackId);

    if (!trackToRemove) return;

    // Add the track to the deletion set first
    setTrackIdsToDelete((prev) => {
      const updated = new Set(prev);
      updated.add(trackToRemove.uniqueId);
      return updated;
    });

    // Get the file information for the track being deleted
    const fileIndex = trackToRemove.fileIndex;
    const fileName = trackToRemove.fileName;

    // Filter out the track from our local state
    const updatedTracks = currentTracks.filter((t) => t.id !== trackId);
    setGlobalTracks(updatedTracks);

    // Determine if this was the last track from the file
    const remainingTracksFromSameFile = updatedTracks.some((t) => t.fileIndex === fileIndex);
    
    console.log(`Tracks remaining from ${fileName}: ${remainingTracksFromSameFile ? 'Yes' : 'No'}`);
    
    // If no tracks remain from this file, remove the file
    if (!remainingTracksFromSameFile) {
      console.log(`No tracks remain from file: ${fileName}, removing file immediately`);
      
      // Execute file removal in a separate function to ensure it runs properly
      const removeEmptyFile = () => {
        console.log(`Executing file removal for ${fileName}`);
        
        // Update kmzFilesWithTracks directly as well
        setKmzFilesWithTracks(prev => prev.filter(file => file.name !== fileName));
        
        // Update files state
        setFiles((prevFiles) => {
          const updatedFiles = prevFiles.filter((file) => file.name !== fileName);
          console.log(`Files before removal: ${prevFiles.length}, after: ${updatedFiles.length}`);
          return updatedFiles;
        });

        // If this was the last file, forcibly clear all tracks
        if (files.length <= 1) {
          console.log("This was the last file, clearing all tracks");
          setGlobalTracks([]);
          onGlobalTracksReorder?.([]);
        }

        toast.info(`File "${fileName}" removed`, {
          description: "All tracks were deleted from this file",
          duration: 2000,
        });
      };
      
      // Execute the file removal immediately
      removeEmptyFile();
    } else {
      toast.success(`Track "${trackToRemove.name}" deleted`, {
        description: `Removed from ${trackToRemove.fileName}`,
        duration: 2000,
      });
    }

    // Update parent components with the updated tracks
    if (onGlobalTracksReorder) {
      onGlobalTracksReorder(updatedTracks);
    }
    
    if (onTracksReordered) {
      const updatedFiles = syncGlobalTracksToFiles(updatedTracks);
      onTracksReordered(updatedFiles);
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
        {kmzFilesWithTracks.length > 0 && files.length > 0 && (
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
      {globalSortEnabled && globalTracks.length > 0 && files.length > 0 && (
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