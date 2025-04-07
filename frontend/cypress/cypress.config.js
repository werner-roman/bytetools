import { defineConfig } from "cypress";
import * as fs from 'fs';
import { dirname } from 'path';

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    video: false,
    specPattern: "cypress/e2e/**/*.spec.{js,jsx,ts,tsx}",
    supportFile: false,
    setupNodeEvents(on, config) {
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },
        listFiles(folderPath) {
          if (fs.existsSync(folderPath)) {
            return fs.readdirSync(folderPath);
          }
          return [];
        },
        ensureDir(dirPath) {
          if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          return null;
        }
      });
    },
  },
});
