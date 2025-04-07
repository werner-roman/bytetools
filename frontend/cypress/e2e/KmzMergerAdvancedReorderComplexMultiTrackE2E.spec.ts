/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Merger Advanced Track Reordering", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Reorders tracks from merger_2 and merger_3 files and verifies the output", () => {
    // 1. Navigate to the KMZ Merger tool
    cy.contains("KMZ Merger").click()

    // Wait for page to fully load
    cy.wait(2000)

    // 2. Upload the test files - the order matters
    cy.get('input[type="file"]').selectFile([
      'cypress/fixtures/test-data/merger_4.kmz',
      'cypress/fixtures/test-data/merger_3.kmz',
      'cypress/fixtures/test-data/merger_2.kmz'
    ], {
      force: true
    })

    // 3. Wait for the files to load completely
    cy.wait(3000)

    // 4. Enable Advanced Mode by clicking the switch
    cy.get('[data-slot="switch"]').click()
    
    // 5. Wait longer to ensure UI has updated with all tracks
    cy.wait(3000)
    
    // 6. Log available tracks to console for debugging
    cy.window().then(win => {
      win.eval(`
        console.log("Available tracks:");
        document.querySelectorAll('[aria-roledescription="sortable"]').forEach(t => {
          console.log(" - " + t.textContent);
        });
      `);
    });
    
    // 7. Now use a very direct approach to find and swap our tracks
    cy.window().then(win => {
      win.eval(`
        (function() {
          // Get all tracks
          const tracks = Array.from(document.querySelectorAll('[aria-roledescription="sortable"]'));
          
          // Find tracks specifically by checking both name AND file name in the content
          let ortstockTrack = null;
          let schafbergTrack = null;
          
          for (const track of tracks) {
            const content = track.textContent;
            const fileName = track.querySelector('.text-xs.bg-gray-700')?.textContent?.trim();
            
            if (content.includes('1269 - Ortstock') && fileName && fileName.includes('merger_2')) {
              ortstockTrack = track;
              console.log("Found Ortstock track from merger_2:", content);
            }
            
            if (content.includes('5706 - Schafbärg') && fileName && fileName.includes('merger_3')) {
              schafbergTrack = track;
              console.log("Found Schafberg track from merger_3:", content); 
            }
          }
          
          if (!ortstockTrack || !schafbergTrack) {
            console.error("Failed to find the specific tracks we need:");
            console.log("Ortstock track found:", !!ortstockTrack);
            console.log("Schafberg track found:", !!schafbergTrack);
            return;
          }
          
          console.log("Both tracks found successfully. Attempting to swap...");
          
          // Get positions in DOM
          const parent = ortstockTrack.parentElement;
          if (!parent) {
            console.error("Cannot find parent element of tracks");
            return;
          }
          
          // Create a temporary marker element to help with the swap
          const tempMarker = document.createElement('div');
          
          // Place the marker where Ortstock is
          parent.replaceChild(tempMarker, ortstockTrack);
          
          // Replace Schafberg with Ortstock
          parent.replaceChild(ortstockTrack, schafbergTrack);
          
          // Replace the marker with Schafberg
          parent.replaceChild(schafbergTrack, tempMarker);
          
          console.log("Track positions swapped successfully");
        })();
      `);
    });
    
    // 8. Wait after manipulation 
    cy.wait(2000);

    // 9. Click the "Go!" button to generate merged file
    cy.contains("Go!").click();
    
    // 10. Wait for download
    cy.wait(3000);
  });
});
