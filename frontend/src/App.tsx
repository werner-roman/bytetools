import Footer from './components/Footer';

function App() {
  return (
    <div>
        <h1 className="text-3xl font-bold underline">Hello world!</h1>
        <p className="text-gray-400">
          Click on the Vite and React logos to learn more
        </p>
      <main className="flex-grow p-4">
        {/* Your main content goes here */}
      </main>
      <Footer />
    </div>
  );
}

export default App;
