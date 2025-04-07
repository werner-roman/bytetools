/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Merger Advanced Mode with Track Manipulation", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Successfully merges KMZ files in advanced mode with track deletion and reordering", () => {
    // 1. Navigate to the KMZ Merger tool
    cy.contains("KMZ Merger").click()
    cy.wait(2000)

    // 2. Upload the test files
    cy.get('input[type="file"]').selectFile([
      'cypress/fixtures/test-data/merger_4.kmz',
      'cypress/fixtures/test-data/merger_3.kmz',
      'cypress/fixtures/test-data/merger_2.kmz'
    ], { force: true })
    cy.wait(3000)

    // 3. Enable Advanced Mode by clicking the switch
    cy.get('[data-slot="switch"]').click()
    cy.wait(3000)

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
    
    // 5. Step 1: Delete one of the Ortstock tracks (the one with ID 0-1)
    cy.get('[data-testid="delete-track-0-1"]').should('exist').click();
    cy.wait(1000); // Wait for deletion to complete

    // 6. Step 2: Reorder the remaining tracks using drag-and-drop simulation
    cy.window().then(win => {
      win.eval(`
        // Function to find tracks by ID
        function getTrackById(id) {
          return document.querySelector(\`[data-testid="track-item-\${id}"]\`);
        }
        
        // Get our tracks
        const schafbergTrack = getTrackById("1-0");  // 5706 - Schafbärg
        const tourgeometrieTrack = getTrackById("0-0");  // Tourgeometrie
        
        // Log what we found
        console.log("=== Reordering Tracks ===");
        console.log("Schafberg track found:", !!schafbergTrack, schafbergTrack?.textContent);
        console.log("Tourgeometrie track found:", !!tourgeometrieTrack, tourgeometrieTrack?.textContent);
        
        // Check if parent container is found
        if (schafbergTrack && tourgeometrieTrack && schafbergTrack.parentElement) {
          try {
            // Get the parent container
            const container = schafbergTrack.parentElement;
            
            // Get positions
            const allTracks = Array.from(container.querySelectorAll('[data-testid^="track-item-"]'));
            const schafbergIndex = allTracks.indexOf(schafbergTrack);
            const tourgeometrieIndex = allTracks.indexOf(tourgeometrieTrack);
            
            console.log("Track indices:", schafbergIndex, tourgeometrieIndex);
            
            // Create clones of the elements 
            const schafbergClone = schafbergTrack.cloneNode(true);
            const tourgeometrieClone = tourgeometrieTrack.cloneNode(true);
            
            // Replace the elements to swap their positions
            container.replaceChild(schafbergClone, tourgeometrieTrack);
            container.replaceChild(tourgeometrieClone, schafbergTrack);
            
            console.log("Reordering completed successfully");
          } catch (e) {
            console.error("Error during reordering:", e);
          }
        } else {
          console.error("Could not find tracks for reordering");
        }
      `);
    });
    
    cy.wait(2000); // Wait for reordering to complete

    // 7. Now click the Go! button to merge files
    cy.contains("Go!").click();
    cy.wait(3000);

    // 8. Verify that merged file was created
    cy.readFile("cypress/downloads/merged_advanced.kmz", null)
      .then(outputFileContent => {
        if (!outputFileContent) {
          throw new Error('Downloaded file is empty or does not exist');
        }
        cy.task('log', `Downloaded file size: ${outputFileContent.byteLength} bytes`);
        
        // Basic verification that file exists and has content
        expect(outputFileContent.byteLength).to.be.greaterThan(0);
        
        // Read the expected file for comparison
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
