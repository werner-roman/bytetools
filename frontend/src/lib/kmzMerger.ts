import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { toast } from "sonner";

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