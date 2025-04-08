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

const extractTracksRecursively = (obj: any, tracks: any[] = []): { name: string; coordinates: string }[] => {
  if (!obj || typeof obj !== 'object') return tracks;

  // Tracks found at this level
  let foundTracksAtThisLevel: { name: string; coordinates: string; priority: number; source: string }[] = [];

  // Priority 1: Direct LineString in a named Placemark - most likely the main track
  if (obj.LineString && typeof obj.LineString === 'object' && typeof obj.LineString.coordinates === 'string') {
    const name = obj.name || "Unnamed Track";
    foundTracksAtThisLevel.push({
      name,
      coordinates: obj.LineString.coordinates.trim(),
      priority: obj.name ? 1 : 3, // Higher priority for named tracks
      source: "direct"
    });
  }

  // Priority 2: LineString in MultiGeometry within a Placemark
  if (obj.MultiGeometry && typeof obj.MultiGeometry === 'object') {
    if (obj.MultiGeometry.LineString && typeof obj.MultiGeometry.LineString.coordinates === 'string') {
      const name = obj.name || "MultiGeometry Track";
      foundTracksAtThisLevel.push({
        name,
        coordinates: obj.MultiGeometry.LineString.coordinates.trim(),
        priority: obj.name ? 2 : 4, // Higher priority for named tracks
        source: "multigeometry"
      });
    }
  }

  // Continue recursively searching other branches 
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any) => {
          extractTracksRecursively(item, tracks);
        });
      } else {
        // Don't recurse into already processed MultiGeometry to avoid duplicates
        if (key !== 'MultiGeometry' && key !== 'LineString') {
          extractTracksRecursively(obj[key], tracks);
        }
      }
    }
  }

  // Only add tracks from this level if they're not duplicates of existing tracks
  for (const track of foundTracksAtThisLevel) {
    // Check for duplicates by comparing coordinates or first/last points
    const isDuplicate = tracks.some(existingTrack => {
      // For exact match comparison
      if (existingTrack.coordinates === track.coordinates) {
        return true;
      }
      
      // For "similar enough" comparison (compare first and last coords)
      const existingCoords = existingTrack.coordinates.split(/\s+/);
      const newCoords = track.coordinates.split(/\s+/);
      
      if (existingCoords.length > 0 && newCoords.length > 0 &&
          existingCoords[0] === newCoords[0] && 
          existingCoords[existingCoords.length-1] === newCoords[newCoords.length-1]) {
        console.log(`Found duplicate track with same start/end points: ${track.name}`);
        return true;
      }
      
      return false;
    });

    if (!isDuplicate) {
      tracks.push({
        name: track.name,
        coordinates: track.coordinates
      });
      console.log(`Added track: ${track.name} (source: ${track.source}, priority: ${track.priority})`);
    } else {
      console.log(`Skipped duplicate track: ${track.name} (source: ${track.source})`);
    }
  }

  return tracks;
};

const extractWaypointsRecursively = (obj: any, waypoints: any[] = []): { name: string; coordinates: string }[] => {
  if (!obj || typeof obj !== 'object') return waypoints;

  if (obj.Point && typeof obj.Point === 'object' && typeof obj.Point.coordinates === 'string') {
    const name = obj.name || "Unnamed Waypoint";
    waypoints.push({
      name,
      coordinates: obj.Point.coordinates.trim()
    });
  }

  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      if (Array.isArray(obj[key])) {
        obj[key].forEach((item: any) => {
          extractWaypointsRecursively(item, waypoints);
        });
      } else {
        extractWaypointsRecursively(obj[key], waypoints);
      }
    }
  }

  return waypoints;
};

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

              const extractedTracks = extractTracksRecursively(parsedKml);
              console.log(`File ${file.name} has ${extractedTracks.length} unique tracks:`);
              extractedTracks.forEach((track, i) => {
                console.log(`  ${i+1}. ${track.name} (${track.coordinates.substring(0, 20)}...)`);
              });

              const waypoints = extractWaypointsRecursively(parsedKml);
              console.log(`Found ${waypoints.length} waypoints recursively in ${file.name}`);

              return { ...file, name: file.name, tracks: extractedTracks, waypoints };
            } catch (error) {
              console.error(`Error processing file ${file.name}:`, error);
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.byteToolsTestHelpers = window.byteToolsTestHelpers || {};
      window.byteToolsTestHelpers.manuallySwapTracks = (id1: string, id2: string) => {
        setGlobalTracks((prev) => {
          const index1 = prev.findIndex(t => t.id === id1);
          const index2 = prev.findIndex(t => t.id === id2);
          
          if (index1 === -1 || index2 === -1) return prev;
          
          const reordered = arrayMove(prev, index1, index2);
          
          if (onGlobalTracksReorder) {
            onGlobalTracksReorder(reordered);
          }
          
          if (onTracksReordered) {
            onTracksReordered(syncGlobalTracksToFiles(reordered));
          }
          
          return reordered;
        });
        return true;
      };
      
      window.byteToolsTestHelpers.getGlobalTracks = () => globalTracks;
    }
    
    return () => {
      if (typeof window !== 'undefined' && window.byteToolsTestHelpers) {
        delete window.byteToolsTestHelpers.manuallySwapTracks;
        delete window.byteToolsTestHelpers.getGlobalTracks;
      }
    };
  }, [globalTracks, onGlobalTracksReorder, onTracksReordered]);

  const removeGlobalTrack = (trackId: string) => {
    console.log("removeGlobalTrack called with ID:", trackId);

    const currentTracks = [...globalTracks];
    const trackToRemove = currentTracks.find((t) => t.id === trackId);

    if (!trackToRemove) return;

    setTrackIdsToDelete((prev) => {
      const updated = new Set(prev);
      updated.add(trackToRemove.uniqueId);
      return updated;
    });

    const fileIndex = trackToRemove.fileIndex;
    const fileName = trackToRemove.fileName;

    const updatedTracks = currentTracks.filter((t) => t.id !== trackId);
    setGlobalTracks(updatedTracks);

    const remainingTracksFromSameFile = updatedTracks.some((t) => t.fileIndex === fileIndex);
    
    console.log(`Tracks remaining from ${fileName}: ${remainingTracksFromSameFile ? 'Yes' : 'No'}`);
    
    if (!remainingTracksFromSameFile) {
      console.log(`No tracks remain from file: ${fileName}, removing file immediately`);
      
      const removeEmptyFile = () => {
        console.log(`Executing file removal for ${fileName}`);
        
        setKmzFilesWithTracks(prev => prev.filter(file => file.name !== fileName));
        
        setFiles((prevFiles) => {
          const updatedFiles = prevFiles.filter((file) => file.name !== fileName);
          console.log(`Files before removal: ${prevFiles.length}, after: ${updatedFiles.length}`);
          return updatedFiles;
        });

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
      
      removeEmptyFile();
    } else {
      toast.success(`Track "${trackToRemove.name}" deleted`, {
        description: `Removed from ${trackToRemove.fileName}`,
        duration: 2000,
      });
    }

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

declare global {
  interface Window {
    byteToolsTestHelpers?: {
      manuallySwapTracks?: (id1: string, id2: string) => boolean;
      getGlobalTracks?: () => any[];
    };
  }
}