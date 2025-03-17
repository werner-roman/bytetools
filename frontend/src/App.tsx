import Footer from './components/Footer';
import TopNav from './components/TopNav';
import ToolCard from './components/ToolCard';

function App() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <TopNav />
      <h1 className="text-2xl font-bold text-center mt-4 text-gray-200">
        Simple & Open-Source
      </h1>
      <div className="flex-grow flex items-center justify-center w-full">
        <div className="w-full max-w-md mt-8">
          <ToolCard title="KMZ-Reverse" description="Reverse the direction of a KMZ file" />
          <ToolCard title="KMZ-Merger" description="Merge multiple KMZ files into one" />
          <ToolCard title="KMZ-Merger" description="Merge multiple KMZ files into one" />
          <ToolCard title="KMZ-Merger" description="Merge multiple KMZ files into one" />
          <ToolCard title="KMZ-Merger" description="Merge multiple KMZ files into one" />
          <ToolCard title="KMZ-Merger" description="Merge multiple KMZ files into one" />
          <ToolCard title="KMZ-Merger" description="Merge multiple KMZ files into one" />
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default App;
