/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Merger Advanced Mode with Track Deletion", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Merges KMZ files in advanced mode with track deletion and compares the output", () => {
    // 1. Navigate to the KMZ Merger tool
    cy.contains("KMZ Merger").click()

    // Wait for page to fully load
    cy.wait(2000)

    // 2. Upload the test files
    cy.get('input[type="file"]').selectFile([
      'cypress/fixtures/test-data/merger_4.kmz',
      'cypress/fixtures/test-data/merger_3.kmz',
      'cypress/fixtures/test-data/merger_2.kmz'
    ], {
      force: true
    })

    cy.wait(1000) // wait for processing & upload to complete

    // 3. Enable Advanced Mode by clicking the switch
    cy.get('[data-slot="switch"]').click()
    cy.wait(2000) // wait for UI to update and show sortable tracks

    // 4. Log track information to help with debugging
    cy.window().then(win => {
      win.eval(`
        // Log all tracks and their IDs
        console.log("=== Track Information ===");
        const tracks = Array.from(document.querySelectorAll('[data-testid^="track-item-"]'));
        tracks.forEach((t, i) => {
          const testId = t.getAttribute('data-testid');
          console.log(\`Track \${i}: \${t.textContent}, TestID: \${testId}\`);
        });

        // Log delete buttons
        console.log("=== Delete Buttons ===");
        const deleteButtons = Array.from(document.querySelectorAll('[data-testid^="delete-track-"]'));
        deleteButtons.forEach((btn, i) => {
          const testId = btn.getAttribute('data-testid');
          const trackId = testId.replace('delete-track-', '');
          console.log(\`Delete button \${i}: \${testId}, Track ID: \${trackId}\`);
          
          // Get the parent track
          const trackItem = document.querySelector(\`[data-testid="track-item-\${trackId}"]\`);
          console.log(\`  Associated track: \${trackItem ? trackItem.textContent : 'unknown'}\`);
        });
      `);
    });
    
    // 5. Delete one of the Ortstock tracks (the one with ID 0-1)
    cy.get('[data-testid="delete-track-0-1"]').should('exist').click();
    cy.wait(1000) // Wait for deletion to complete

    // 6. Log the tracks after deletion for verification
    cy.window().then(win => {
      win.eval(`
        console.log("=== Tracks After Deletion ===");
        const remainingTracks = Array.from(document.querySelectorAll('[data-testid^="track-item-"]'));
        remainingTracks.forEach((t, i) => {
          console.log(\`Track \${i}: \${t.textContent}, TestID: \${t.getAttribute('data-testid')}\`);
        });
      `);
    });

    // 7. Click the "Go!" button (Merge)
    cy.contains("Go!").click();

    // Wait for download
    cy.wait(3000);

    cy.task('log', 'Starting file comparison...');

    // 8. Compare downloaded file with expected file
    cy.readFile("cypress/downloads/merged_advanced.kmz", null)
      .then(outputFileContent => {
        if (!outputFileContent) {
          throw new Error('Downloaded file is empty or does not exist');
        }
        cy.task('log', `Downloaded file size: ${outputFileContent.byteLength} bytes`);

        // Read the expected file
        return cy.fixture("test-data/merged_advanced_Reorder_Complex_Multi_Track.kmz", null)
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
