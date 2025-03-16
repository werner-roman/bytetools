import Footer from './components/Footer';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="p-4">
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <p className="text-gray-400">
          Click on the Vite and React logos to learn more
        </p>
      </header>
      <main className="flex-grow p-4">
        {/* Your main content goes here */}
      </main>
      <Footer />
    </div>
  );
}

export default App;
