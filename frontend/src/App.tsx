import Footer from "./components/Footer";
import TopNav from "./components/TopNav";
import ToolCard from "./components/ToolCard";

function App() {
  return (
    <main>
      <TopNav />
      <h1 className="text-2xl font-bold text-center mt-4 text-gray-400">
        Simple & Open-Source
      </h1>
      <div>
        <ToolCard />
      </div>
      <main className="flex-grow p-4">{/* Your main content goes here */}</main>
      <Footer />
    </main>
  );
}

export default App;
