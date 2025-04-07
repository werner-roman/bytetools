/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Merger Advanced Complex Reorder E2E", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Merges KMZ files in advanced mode with complex track reordering and compares the output", () => {
    // 1. Navigate to the KMZ Merger tool
    cy.contains("KMZ Merger").click()

    // Wait for page to fully load
    cy.wait(2000)

    // 2. Upload the test files IN REVERSE ORDER
    cy.get('input[type="file"]').selectFile([
      'cypress/fixtures/test-data/merger_4.kmz',  // This brings the 5706 track
      'cypress/fixtures/test-data/merger_3.kmz'   // This brings both Tourgeometrie and 1269 tracks
    ], {
      force: true
    })

    cy.wait(2000) // wait for processing & upload to complete

    // 3. Enable Advanced Mode by clicking the switch
    cy.get('[data-slot="switch"]').click()
    cy.wait(2000) // wait for UI to update and show sortable tracks

    // 4. Log track information for debugging
    cy.window().then(win => {
      win.eval(`
        // Log all tracks and their data-testids
        console.log("=== Track Information ===");
        const tracks = Array.from(document.querySelectorAll('[data-testid^="track-item-"]'));
        tracks.forEach((t, i) => {
          const testId = t.getAttribute('data-testid');
          console.log(\`Track \${i}: \${t.textContent}, TestID: \${testId}\`);
        });
      `);
    });

    // 5. Use the exposed helper function to swap tracks directly
    cy.window().then(win => {
      // First get the track IDs
      const tracks = Cypress.$('[data-testid^="track-item-"]');
      const trackIds: { id: string; text: string | null }[] = [];
      
      tracks.each((i, el) => {
        const trackId = el.getAttribute('data-testid')?.replace('track-item-', '') || '';
        const trackText = el.textContent;
        trackIds.push({ id: trackId, text: trackText });
        cy.task('log', `Track ${i}: ${trackText}, ID: ${trackId}`);
      });
      
      // Find the Ortstock and Schafberg tracks
      const track1269 = trackIds.find(t => t.text?.includes("1269 - Ortstock"));
      const track5706 = trackIds.find(t => t.text?.includes("5706 - Schafbärg"));
      
      if (track1269 && track5706) {
        cy.task('log', `Found tracks to swap: ${track1269.id} and ${track5706.id}`);
        
        // Use the exposed helper function to swap them
        (win as any).byteToolsTestHelpers.manuallySwapTracks(track1269.id, track5706.id);
        cy.task('log', 'Tracks swapped using the helper function');
      } else {
        cy.task('log', 'Could not find both tracks to swap');
      }
    });
    
    // 6. Wait for the state to update
    cy.wait(2000);

    // 7. Verify the swap worked by checking the DOM order
    cy.window().then(win => {
      win.eval(`
        console.log("=== Track Order After Reordering ===");
        const updatedTracks = Array.from(document.querySelectorAll('[data-testid^="track-item-"]'));
        updatedTracks.forEach((t, i) => {
          const testId = t.getAttribute('data-testid');
          console.log(\`Track \${i}: \${t.textContent}, TestID: \${testId}\`);
        });
      `);
    });

    // 8. Click the "Go!" button to merge
    cy.contains("Go!").click();

    // Wait for download
    cy.wait(3000);

    cy.task('log', 'Starting file comparison...');

    // 9. Compare downloaded file with expected file
    cy.readFile("cypress/downloads/merged_advanced.kmz", null)
      .then(outputFileContent => {
        if (!outputFileContent) {
          throw new Error('Downloaded file is empty or does not exist');
        }
        cy.task('log', `Downloaded file size: ${outputFileContent.byteLength} bytes`);

        // Read the expected file
        return cy.fixture("test-data/merged_advanced_Reorder_Complex.kmz", null)
          .then(expectedFileContent => {
            if (!expectedFileContent) {
              throw new Error('Expected file is empty or does not exist');
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
        ]

        if (!kmlPromises[0] || !kmlPromises[1]) {
          throw new Error("doc.kml not found in one of the zip files")
        }

        return Promise.all(kmlPromises)
      })
      .then(([outputKml, expectedKml]) => {
        // Compare the KML contents
        cy.task('log', 'Successfully extracted both KML files')
        expect(outputKml).to.equal(expectedKml)
      })
  });
});

