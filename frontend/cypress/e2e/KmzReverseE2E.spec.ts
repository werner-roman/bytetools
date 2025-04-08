/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Reverse E2E", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Reverses multiple KMZ files and compares the outputs", () => {
    // 1. Navigate to the KMZ Reverse tool
    cy.contains("KMZ Reverse").click()

    // Wait longer for page to fully load
    cy.wait(2000)

    // Define the test files
    const fileNames = Array.from({ length: 8 }, (_, i) => `reverse_${i + 1}.kmz`);

    // Debug - log all input elements on page
    cy.get('input[type="file"]').then($elements => {
      cy.task('log', `Found ${$elements.length} file inputs`)
    })

    // Create an array of file paths for selectFile
    const filePaths = fileNames.map(file => `cypress/fixtures/test-data/${file}`);
    
    // Upload all files
    cy.get('input[type="file"]').selectFile(filePaths, {
      force: true
    })

    cy.wait(1000)

    // 3. Click the "Go!" button (Reverse)
    cy.contains("Go!").click()

    // Wait for all files to be processed and downloaded
    cy.wait(fileNames.length * 500)
    
    // Now verify each downloaded file against its expected counterpart
    fileNames.forEach((fileName, index) => {
      cy.task('log', `Verifying file ${index + 1}/${fileNames.length}: ${fileName}`)
      
      const downloadedFile = `cypress/downloads/reversed_${fileName}`;
      const expectedFile = `test-data/reversed_${fileName}`;
      
      // Compare the downloaded file with the expected result
      cy.readFile(downloadedFile, null)
        .then(outputFileContent => {
          if (!outputFileContent) {
            throw new Error(`Downloaded file ${downloadedFile} is empty or does not exist`);
          }
          cy.task('log', `Downloaded file size for ${fileName}: ${outputFileContent.byteLength} bytes`);
          
          return cy.fixture(expectedFile, null)
            .then(expectedFileContent => {
              if (!expectedFileContent) {
                throw new Error(`Expected file ${expectedFile} is empty or does not exist`);
              }
              cy.task('log', `Expected file size: ${expectedFileContent.byteLength} bytes`);
              
              // Create promises for both zip files
              const zipPromises = [
                JSZip.loadAsync(outputFileContent),
                JSZip.loadAsync(expectedFileContent)
              ];
              
              return Promise.all(zipPromises);
            });
        })
        .then(([outputZip, expectedZip]) => {
          // Extract doc.kml from both zips
          const kmlPromises = [
            outputZip.file("doc.kml")?.async("string"),
            expectedZip.file("doc.kml")?.async("string")
          ];
          
          if (!kmlPromises[0] || !kmlPromises[1]) {
            throw new Error(`doc.kml not found in one of the zip files for ${fileName}`);
          }
          
          return Promise.all(kmlPromises);
        })
        .then(([outputKml, expectedKml]) => {
          // Compare the KML contents
          cy.task('log', `Successfully extracted both KML files for ${fileName}`);
          expect(outputKml).to.equal(expectedKml);
        });
    });
  });
});
