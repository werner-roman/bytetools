import JSZip from "jszip";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { toast } from "sonner";

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
      // Removed unsupported 'declaration' property
    });

    for (const file of files) {
      const fileData = await file.arrayBuffer();
      const kmz = await JSZip.loadAsync(fileData);
      const kmlFile = Object.keys(kmz.files).find(name => name.endsWith(".kml"));

      if (kmlFile) {
        const kmlContent = await kmz.files[kmlFile].async("string");
        const parsedKml = parser.parse(kmlContent);

        // Reverse the direction of the Placemark coordinates
        if (parsedKml.kml.Document.Placemark) {
          const placemarks = Array.isArray(parsedKml.kml.Document.Placemark)
            ? parsedKml.kml.Document.Placemark
            : [parsedKml.kml.Document.Placemark];

          placemarks.forEach((placemark: { LineString?: { coordinates?: string } }) => {
            if (placemark?.LineString?.coordinates) {
              placemark.LineString.coordinates = placemark.LineString.coordinates.split(" ").reverse().join(" ");
            }
          });
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