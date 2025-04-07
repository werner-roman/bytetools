/// <reference types="cypress" />
/// <reference types="cypress-file-upload" />
import 'cypress-file-upload'

const JSZip = require('jszip')

describe("KMZ Merger Advanced Reorder E2E", () => {
  beforeEach(() => {
    cy.visit("/")
  })

  it("Merges KMZ files in advanced mode with track reordering and compares the output", () => {
    // 1. Navigate to the KMZ Merger tool
    cy.contains("KMZ Merger").click()

    // Wait for page to fully load
    cy.wait(2000)

    // 2. Upload the test files in this specific order
    cy.get('input[type="file"]').selectFile([
      // Change the order here - put merger_2 first, merger_3 second, merger_1 last
      'cypress/fixtures/test-data/merger_2.kmz',
      'cypress/fixtures/test-data/merger_3.kmz', 
      'cypress/fixtures/test-data/merger_1.kmz'
    ], {
      force: true
    })

    cy.wait(1000) // wait for processing & upload to complete

    // 3. Enable Advanced Mode by clicking the switch
    cy.get('[data-slot="switch"]').click()
    cy.wait(1000) // wait for UI to update after toggle

    // 4. Click the "Go!" button (Merge)
    cy.contains("Go!").click()

    // Wait for download
    cy.wait(1000)

    cy.task('log', 'Starting file comparison...')

    // Create a proper promise chain for file processing
    cy.readFile("cypress/downloads/merged_advanced.kmz", null)
      .then(outputFileContent => {
        if (!outputFileContent) {
          throw new Error('Downloaded file is empty or does not exist')
        }
        cy.task('log', `Downloaded file size: ${outputFileContent.byteLength} bytes`)

        // Read the expected file
        return cy.fixture("test-data/merged_advanced_Reorder.kmz", null)
          .then(expectedFileContent => {
            if (!expectedFileContent) {
              throw new Error('Expected file is empty or does not exist')
            }
            cy.task('log', `Expected file size: ${expectedFileContent.byteLength} bytes`)

            // Safe access to JSZip - check it exists before using
            if (typeof JSZip !== 'function' && typeof JSZip.loadAsync !== 'function') {
              throw new Error(`JSZip not properly loaded: ${typeof JSZip}`)
            }

            // Create promises for both zip files
            const zipPromises = [
              JSZip.loadAsync(outputFileContent),
              JSZip.loadAsync(expectedFileContent)
            ]

            // Wait for both zip objects to be loaded
            return Promise.all(zipPromises)
          })
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
  })
})
