import { useState, useEffect } from "react";
import Footer from "./components/Footer";
import TopNav from "./components/TopNav";
import ToolCard from "./components/ToolCard";
import ToolBox from "./components/ToolBox";
import StravaToolBox from "./components/StravaToolBox";
import {
  createBrowserRouter,
  RouterProvider,
  useNavigate,
  useLocation,
} from "react-router"; // React Router v7 uses the same imports
import { ClerkProvider, useUser, SignInButton } from "@clerk/clerk-react";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const toolDisplayNames: Record<string, string> = {
  "kmz-reverse": "KMZ Reverse",
  "kmz-merger": "KMZ Merger",
  "strava-bulk-download": "Strava bulk download",
};

function App() {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { isSignedIn } = useUser();

  useEffect(() => {
    // Determine selected tool from the URL path
    const path = location.pathname.slice(1); // Remove leading slash
    if (["kmz-reverse", "kmz-merger", "strava-bulk-download"].includes(path)) {
      setSelectedTool(path);
    } else {
      setSelectedTool(null);
    }
  }, [location.pathname]);

  const handleToolSelect = (toolName: string) => {
    const toolPath = toolName.toLowerCase().replace(/ /g, "-");
    setSelectedTool(toolPath);
    navigate(`/${toolPath}`); // Navigate to the tool's route
  };

  const handleBack = () => {
    setSelectedTool(null);
    navigate("/"); // Navigate back to the home route
  };

  const renderToolbox = () => {
    if (selectedTool === "strava-bulk-download") {
      if (!isSignedIn) {
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="mb-4 text-lg text-gray-400">
              You must be signed in to use the Strava Bulk Download tool.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleBack}
                className="text-gray-400 text-xl border-2 border-gray-400 bg-transparent px-4 py-2 rounded hover:bg-gray-700 hover:text-white transition-colors duration-200"
              >
                ← Back
              </button>
              <SignInButton mode="modal" >
                <button className="text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        );
      }
      return (
        <StravaToolBox
          toolName={selectedTool ? toolDisplayNames[selectedTool] : ""}
          onBack={handleBack}
        />
      );
    } else {
      return (
        <ToolBox
          toolName={selectedTool ? toolDisplayNames[selectedTool] : ""}
          onBack={handleBack}
        />
      );
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center">
      <TopNav/>
      <h1 className="text-2xl font-bold text-center mt-4 text-gray-200">
        Simple & Open-Source
      </h1>
      <div className="flex-grow flex items-center justify-center w-full">
        {!selectedTool ? (
          <div className="w-full max-w-md mt-8 overflow-y-auto">
            <div onClick={() => handleToolSelect("KMZ Reverse")}>
              <ToolCard
                title="KMZ Reverse"
                description="Reverse the direction of a KMZ file"
              />
            </div>
            <div onClick={() => handleToolSelect("KMZ Merger")}>
              <ToolCard
                title="KMZ Merger"
                description="Merge multiple KMZ files into one"
              />
            </div>
            <div onClick={() => handleToolSelect("Strava bulk-download")}>
              <ToolCard
                title="Strava bulk download"
                description="Download GPX of multiple activities"
              />
            </div>
          </div>
        ) : (
          <div className="w-full flex-grow flex flex-col items-center px-4">
            {renderToolbox()}
          </div>
        )}
      </div>
      <Footer selectedTool={selectedTool}/>
    </main>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/kmz-reverse",
    element: <App />,
  },
  {
    path: "/kmz-merger",
    element: <App />,
  },
  {
    path: "/strava-bulk-download",
    element: <App />,
  },
]);

function AppWrapper() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <RouterProvider router={router} />
    </ClerkProvider>
  );
}

export default AppWrapper;
