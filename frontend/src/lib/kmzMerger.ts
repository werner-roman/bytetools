import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { toast } from "sonner";
import { KMZFileWithTracks } from "@/types";
import { TrackItem } from "@/components/FileDropzone";

/**
 * Recursively extracts all LineString coordinates from a KML object
 * @param obj The KML object to search
 * @returns Array of found coordinate strings 
 */
const extractAllLineStringCoordinates = (obj: any): string[] => {
  const coordinates: string[] = [];
  
  if (!obj || typeof obj !== 'object') return coordinates;
  
  // Check if this object is a LineString with coordinates
  if (obj.LineString && typeof obj.LineString === 'object' && typeof obj.LineString.coordinates === 'string') {
    coordinates.push(obj.LineString.coordinates.trim());
    console.log("Found LineString coordinates:", obj.LineString.coordinates.substring(0, 50) + "...");
  }
  
  // Special case for MultiGeometry which often contains LineString directly
  if (obj.MultiGeometry && typeof obj.MultiGeometry === 'object') {
    console.log("Found MultiGeometry, checking for LineString inside...");
    
    // Check if MultiGeometry has LineString
    if (obj.MultiGeometry.LineString && typeof obj.MultiGeometry.LineString.coordinates === 'string') {
      coordinates.push(obj.MultiGeometry.LineString.coordinates.trim());
      console.log("Found LineString inside MultiGeometry:", obj.MultiGeometry.LineString.coordinates.substring(0, 50) + "...");
    }
  }
  
  // Recursively search through all properties
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      // Handle arrays
      if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          coordinates.push(...extractAllLineStringCoordinates(obj[key][i]));
        }
      } else {
        // Handle nested objects
        coordinates.push(...extractAllLineStringCoordinates(obj[key]));
      }
    }
  }
  
  return coordinates;
};

/**
 * Extract all waypoints from a KML object
 * @param obj The KML object to search
 * @returns Array of waypoint objects
 */
const extractAllWaypoints = (obj: any): { name: string; coordinates: string }[] => {
  const waypoints: { name: string; coordinates: string }[] = [];
  
  if (!obj || typeof obj !== 'object') return waypoints;
  
  // Check if this is a Point Placemark
  if (obj.Placemark) {
    const placemarks = Array.isArray(obj.Placemark) ? obj.Placemark : [obj.Placemark];
    
    interface KMLPlacemark {
      name?: string;
      Point?: {
      coordinates: string;
      };
    }

    placemarks.forEach((placemark: KMLPlacemark) => {
      if (placemark.Point && typeof placemark.Point === 'object' && 
        typeof placemark.Point.coordinates === 'string') {
      const name: string = placemark.name || "Waypoint";
      waypoints.push({
        name,
        coordinates: placemark.Point.coordinates.trim()
      });
      }
    });
  }
  
  // Recursively search through all properties
  for (const key in obj) {
    if (typeof obj[key] === 'object' && key !== 'Placemark') {
      // Handle arrays
      if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          waypoints.push(...extractAllWaypoints(obj[key][i]));
        }
      } else {
        // Handle nested objects
        waypoints.push(...extractAllWaypoints(obj[key]));
      }
    }
  }
  
  return waypoints;
};

export const mergeKMZFiles = async (files: File[], setIsProcessing: (isProcessing: boolean) => void) => {
  if (files.length < 2) {
    toast.error("Please upload at least two KMZ files to merge.");
    return;
  }

  setIsProcessing(true);
  try {
    const zip = new JSZip();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true
    });
    const builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      format: true,
      suppressEmptyNode: true,
    });
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
          if (!mergedKmlContent.kml.Document.Placemark) {
            mergedKmlContent.kml.Document.Placemark = [];
          } else if (!Array.isArray(mergedKmlContent.kml.Document.Placemark)) {
            mergedKmlContent.kml.Document.Placemark = [mergedKmlContent.kml.Document.Placemark];
          }
        } else {
          const placemarks = parsedKml.kml.Document.Placemark;
          if (placemarks) {
            if (Array.isArray(placemarks)) {
              mergedKmlContent.kml.Document.Placemark.push(...placemarks);
            } else {
              mergedKmlContent.kml.Document.Placemark.push(placemarks);
            }
          }
        }
      }
    }

    if (mergedKmlContent) {
      const kmlString = builder.build(mergedKmlContent);
      zip.file("doc.kml", kmlString, { 
        binary: false,
        createFolders: true
      });

      const mergedKmzBlob = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        mimeType: "application/vnd.google-earth.kmz"
      });
      
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

export const mergeKMZFilesAdvanced = async (
  filesWithTracks: KMZFileWithTracks[],
  globalTracks: TrackItem[],
  setIsProcessing: (isProcessing: boolean) => void
) => {
  if (filesWithTracks.length === 0) {
    toast.error("No tracks available to merge.");
    return;
  }

  setIsProcessing(true);
  try {
    const zip = new JSZip();
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      parseAttributeValue: true
    });

    // If using global sort, use the already processed tracks
    let finalCoordinates: string[] = [];
    if (globalTracks && globalTracks.length > 0) {
      console.log(`Using ${globalTracks.length} tracks from global tracks array`);
      finalCoordinates = globalTracks.map((track) => track.coordinates);
    } else {
      // For files that might not have had their tracks properly extracted,
      // re-parse and extract all track coordinates recursively
      console.log(`Analyzing ${filesWithTracks.length} files for track data`);
      
      for (const file of filesWithTracks) {
        console.log(`Processing file: ${file.name}`);
        
        try {
          // Always reanalyze the file to ensure we catch all possible LineString coordinates
          const fileData = await file.arrayBuffer();
          const kmz = await JSZip.loadAsync(fileData);
          const kmlFile = Object.keys(kmz.files).find(name => name.endsWith(".kml"));
          
          if (kmlFile) {
            console.log(`Found KML file in ${file.name}: ${kmlFile}`);
            const kmlContent = await kmz.files[kmlFile].async("string");
            const parsedKml = parser.parse(kmlContent);
            
            // Log a sample of the parsed KML structure to help debug
            console.log(`Parsed KML structure sample for ${file.name}:`, 
                        JSON.stringify(parsedKml).substring(0, 300) + "...");
            
            // Extract all LineString coordinates recursively
            const extractedCoordinates = extractAllLineStringCoordinates(parsedKml);
            console.log(`Found ${extractedCoordinates.length} coordinate sets in ${file.name}`);
            
            if (extractedCoordinates.length > 0) {
              finalCoordinates = [...finalCoordinates, ...extractedCoordinates];
            } else if (file.tracks && file.tracks.length > 0) {
              // Fall back to pre-extracted tracks if we couldn't find any new ones
              console.log(`Using ${file.tracks.length} pre-extracted tracks from ${file.name}`);
              file.tracks.forEach(track => {
                finalCoordinates.push(track.coordinates);
              });
            } else {
              console.warn(`No tracks found in ${file.name} using either method`);
            }
          } else {
            console.warn(`No KML file found in ${file.name}`);
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          
          // Fall back to pre-extracted tracks if available
          if (file.tracks && file.tracks.length > 0) {
            console.log(`Falling back to ${file.tracks.length} pre-extracted tracks due to error`);
            file.tracks.forEach(track => {
              finalCoordinates.push(track.coordinates);
            });
          }
        }
      }
    }

    // Extract all waypoints
    let allWaypoints: { name: string; coordinates: string }[] = [];
    
    console.log(`Extracting waypoints from ${filesWithTracks.length} files`);
    for (const file of filesWithTracks) {
      if (file.waypoints && file.waypoints.length > 0) {
        console.log(`Using ${file.waypoints.length} pre-extracted waypoints from ${file.name}`);
        allWaypoints = [...allWaypoints, ...file.waypoints];
      } else {
        // Otherwise, try to extract waypoints from the raw file
        try {
          const fileData = await file.arrayBuffer();
          const kmz = await JSZip.loadAsync(fileData);
          const kmlFile = Object.keys(kmz.files).find(name => name.endsWith(".kml"));
          
          if (kmlFile) {
            const kmlContent = await kmz.files[kmlFile].async("string");
            const parsedKml = parser.parse(kmlContent);
            
            const extractedWaypoints = extractAllWaypoints(parsedKml);
            console.log(`Found ${extractedWaypoints.length} waypoints in ${file.name}`);
            allWaypoints = [...allWaypoints, ...extractedWaypoints];
          }
        } catch (error) {
          console.error(`Error extracting waypoints from ${file.name}:`, error);
        }
      }
    }

    if (finalCoordinates.length === 0) {
      console.error("No coordinates found in any file");
      toast.error("No track coordinates found in any of the files.");
      setIsProcessing(false);
      return;
    }

    console.log(`Final coordinates count: ${finalCoordinates.length}`);
    const trackCoordinatesString = finalCoordinates.join(" ");
    console.log(`Total coordinates string length: ${trackCoordinatesString.length}`);

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
      <kml xmlns="http://www.opengis.net/kml/2.2">
        <Document>
          <Placemark>
            <LineString>
              <coordinates>${trackCoordinatesString}</coordinates>
            </LineString>
          </Placemark>
          ${allWaypoints
            .map(
              (wp) => `
            <Placemark>
              <name>${wp.name}</name>
              <Point>
                <coordinates>${wp.coordinates}</coordinates>
              </Point>
            </Placemark>
          `
            )
            .join("")}
        </Document>
      </kml>`;

    zip.file("doc.kml", kml, { binary: false });

    const mergedKmzBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      mimeType: "application/vnd.google-earth.kmz",
    });

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(mergedKmzBlob);
    downloadLink.download = "merged_advanced.kmz";
    downloadLink.click();

    toast.success("KMZ files merged successfully!");
  } catch (error) {
    console.error("Error merging KMZ files:", error);
    toast.error("An error occurred while merging KMZ files.");
  } finally {
    setIsProcessing(false);
  }
};