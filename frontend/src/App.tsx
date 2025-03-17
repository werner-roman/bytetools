import Footer from './components/Footer';
import TopNav from './components/TopNav';
import ToolCard from './components/ToolCard';

function App() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <TopNav />
      <h1 className="text-2xl font-bold text-center mt-4 text-gray-400">
        Simple & Open-Source
      </h1>
      <div className="w-full max-w-md mt-8">
        <ToolCard title="KMZ-Reverse" description="Reverse the direction of a KMZ file" />
        <ToolCard title="KMZ-Merger" description="Mege multiple KMZ files into one" />
      </div>
      <Footer />
    </main>
  );
}

export default App;
