import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { toast } from "sonner";
import { KMZFileWithTracks } from "@/types";
import { TrackItem } from "@/components/FileDropzone";

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
      // Removed unsupported 'declaration' property
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

  setIsProcessing(true)
  try {
    const zip = new JSZip()

    // If using global sort, build the line from globalTracks in that order
    let finalCoordinates: string[] = []
    if (globalTracks && globalTracks.length > 0) {
      finalCoordinates = globalTracks.map((track) => track.coordinates)
    } else {
      // Fallback: combine from each file in its own order
      filesWithTracks.forEach((file) => {
        file.tracks?.forEach((track) => {
          finalCoordinates.push(track.coordinates)
        })
      })
    }

    // Same for waypoints (still read them from files)
    // ...existing code to gather waypoints...
    let allWaypoints: { name: string; coordinates: string }[] = []
    filesWithTracks.forEach((file) => {
      if (file.waypoints) {
        allWaypoints = [...allWaypoints, ...file.waypoints]
      }
    })

    const trackCoordinatesString = finalCoordinates.join(" ")

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
      </kml>`

    zip.file("doc.kml", kml, { binary: false })

    const mergedKmzBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      mimeType: "application/vnd.google-earth.kmz",
    })

    const downloadLink = document.createElement("a")
    downloadLink.href = URL.createObjectURL(mergedKmzBlob)
    downloadLink.download = "merged_advanced.kmz"
    downloadLink.click()

    toast.success("KMZ files merged successfully!")
  } catch (error) {
    console.error("Error merging KMZ files:", error);
    toast.error("An error occurred while merging KMZ files.");
  } finally {
    setIsProcessing(false)
  }
}