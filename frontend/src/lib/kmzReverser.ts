import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { toast } from "sonner";

/**
 * Recursively searches through the KML object structure and reverses any LineString coordinates found
 * @param obj The object to search through
 * @param reversed Counter for tracking how many LineString elements were reversed
 * @returns Number of LineString elements that were reversed
 */
const reverseLineStringCoordinates = (obj: any, reversed = 0): number => {
  if (!obj || typeof obj !== 'object') return reversed;
  
  // Directly check if this object is a LineString with coordinates
  if (obj.LineString && typeof obj.LineString === 'object') {
    // Handle both direct coordinates and nested coordinates object
    if (typeof obj.LineString.coordinates === 'string') {
      const trimmed = obj.LineString.coordinates.trim();
      obj.LineString.coordinates = trimmed.split(/\s+/).reverse().join(' ');
      reversed++;
      console.log("Reversed LineString coordinates:", obj.LineString.coordinates.substring(0, 50) + "...");
    }
  }
  
  // Look through all child properties recursively
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      // Special handling for MultiGeometry which might contain LineString
      if (key === 'MultiGeometry') {
        console.log("Found MultiGeometry, inspecting children...");
      }
      
      // Handle arrays
      if (Array.isArray(obj[key])) {
        for (let i = 0; i < obj[key].length; i++) {
          reversed = reverseLineStringCoordinates(obj[key][i], reversed);
        }
      } else {
        // Handle nested objects
        reversed = reverseLineStringCoordinates(obj[key], reversed);
      }
    }
  }
  
  return reversed;
};

export const reverseKMZFiles = async (files: File[], setIsProcessing: (isProcessing: boolean) => void) => {
  if (files.length === 0) {
    toast.error("Please upload at least one KMZ file to reverse.");
    return;
  }

  setIsProcessing(true);
  try {
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

    for (const file of files) {
      const fileData = await file.arrayBuffer();
      const kmz = await JSZip.loadAsync(fileData);
      const kmlFile = Object.keys(kmz.files).find(name => name.endsWith(".kml"));

      if (kmlFile) {
        const kmlContent = await kmz.files[kmlFile].async("string");
        const parsedKml = parser.parse(kmlContent);
        
        // Debug: Log structure before processing
        console.log(`Processing file: ${file.name}`);
        console.log("KML Structure (sample):", JSON.stringify(parsedKml).substring(0, 300) + "...");
        
        // Process entire KML structure recursively
        const reversedCount = reverseLineStringCoordinates(parsedKml);
        
        if (reversedCount === 0) {
          console.warn(`No LineString coordinates found to reverse in ${file.name}`);
          toast.warning(`No tracks found to reverse in ${file.name}`);
          continue;
        }

        const reversedKmlString = builder.build(parsedKml);
        const zip = new JSZip();
        zip.file("doc.kml", reversedKmlString, { binary: false });

        const reversedKmzBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          mimeType: "application/vnd.google-earth.kmz"
        });

        const downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(reversedKmzBlob);
        downloadLink.download = `reversed_${file.name}`;
        downloadLink.click();
        
        console.log(`Successfully reversed ${reversedCount} track(s) in ${file.name}`);
      } else {
        toast.error(`No KML file found in ${file.name}`);
      }
    }

    toast.success("KMZ files reversed and downloaded successfully!");
  } catch (error) {
    console.error("Error reversing KMZ files:", error);
    toast.error("An error occurred while reversing KMZ files.");
  } finally {
    setIsProcessing(false);
  }
};