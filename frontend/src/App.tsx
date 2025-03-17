import { useState } from "react";
import Footer from "./components/Footer";
import TopNav from "./components/TopNav";
import ToolCard from "./components/ToolCard";
import ToolBox from "./components/ToolBox";

function App() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  const handleToolSelect = (toolName: string) => {
    setSelectedTool(toolName);
  };

  const handleBack = () => {
    setSelectedTool(null);
  };

  return (
    <main className="min-h-screen flex flex-col items-center">
      <TopNav />
      <h1 className="text-2xl font-bold text-center mt-4 text-gray-200">
        Simple & Open-Source
      </h1>
      <div className="flex-grow flex items-center justify-center w-full">
        {!selectedTool ? (
          <div className="w-full max-w-md mt-8 overflow-y-auto">
            <div onClick={() => handleToolSelect("KMZ-Reverse")}>
              <ToolCard
                title="KMZ-Reverse"
                description="Reverse the direction of a KMZ file"
              />
            </div>
            <div onClick={() => handleToolSelect("KMZ-Merger")}>
              <ToolCard
                title="KMZ-Merger"
                description="Merge multiple KMZ files into one"
              />
            </div>
          </div>
        ) : (
          <div className="w-full flex-grow flex flex-col items-center px-4">
            <ToolBox toolName={selectedTool} onBack={handleBack} />
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

export default App;
