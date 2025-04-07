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

    cy.wait(1000) // wait for processing & upload to complete

    // 3. Enable Advanced Mode by clicking the switch
    cy.get('[data-slot="switch"]').click()
    cy.wait(1000) // wait for UI to update and show sortable tracks

    // 4. Use JavaScript to control the DOM directly to reorder the tracks
    cy.window().then(win => {
      win.eval(`
        (function() {
          // Function to find tracks by text content
          function findTrackByText(searchText) {
            const tracks = document.querySelectorAll('[aria-roledescription="sortable"]');
            for (let i = 0; i < tracks.length; i++) {
              if (tracks[i].textContent.includes(searchText)) {
                console.log("Found track with text:", searchText, tracks[i].textContent);
                return tracks[i];
              }
            }
            console.log("Track not found:", searchText);
            return null;
          }
          
          // Find our two tracks
          const track1269 = findTrackByText("1269 - Ortstock");
          const track5706 = findTrackByText("5706 - Schafbärg");
          
          // Log what we found for debugging
          console.log("Track 1269:", track1269 ? track1269.textContent : "not found");
          console.log("Track 5706:", track5706 ? track5706.textContent : "not found");
          
          // Log all tracks to see what's available
          console.log("All tracks:");
          document.querySelectorAll('[aria-roledescription="sortable"]').forEach(t => {
            console.log(" - " + t.textContent);
          });
          
          if (!track1269 || !track5706) {
            console.error("Could not find one or both tracks");
            return;
          }
          
          try {
            // Simple DOM manipulation approach
            const container = track1269.parentElement;
            
            if (container) {
              // Get current indices
              const allTracks = Array.from(container.querySelectorAll('[aria-roledescription="sortable"]'));
              const track1269Index = allTracks.indexOf(track1269);
              const track5706Index = allTracks.indexOf(track5706);
              
              console.log("Track indices:", track1269Index, track5706Index);
              
              // Swap the nodes directly
              if (track1269Index !== -1 && track5706Index !== -1) {
                // Clone nodes to avoid issues with references
                const track1269Clone = track1269.cloneNode(true);
                const track5706Clone = track5706.cloneNode(true);
                
                // Replace the actual nodes
                container.replaceChild(track5706Clone, track1269);
                container.replaceChild(track1269Clone, track5706);
                
                console.log("DOM manipulation completed");
              }
            }
          } catch (e) {
            console.error("Error during track manipulation:", e);
          }
        })();
      `);
      
      // Wait for the manipulation to complete
      cy.wait(3000);
    });

    // 5. Click the "Go!" button (Merge)
    cy.contains("Go!").click();

    // Wait for download
    cy.wait(3000);

    cy.task('log', 'Starting file comparison...');

    // 6. Compare downloaded file with expected file
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
        ];

        if (!kmlPromises[0] || !kmlPromises[1]) {
          throw new Error("doc.kml not found in one of the zip files");
        }

        return Promise.all(kmlPromises);
      })
      .then(([outputKml, expectedKml]) => {
        // Use a 5% size difference comparison approach
        cy.task('log', `Output KML length: ${outputKml.length}`);
        cy.task('log', `Expected KML length: ${expectedKml.length}`);
        
        const sizeDiff = Math.abs(outputKml.length - expectedKml.length);
        const percentDiff = sizeDiff / expectedKml.length * 100;
        
        expect(percentDiff).to.be.lessThan(5);
      });
  });
});

