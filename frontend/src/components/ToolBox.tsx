const ToolBox = ({ title }: { title: string }) => {
  return (
    <div>
      <div className="border-2 border-gray-400 rounded-lg p-4 mb-8">
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-400 rounded-lg p-8 mb-4">
          <p className="mb-4">Drop or upload your file</p>
        </div>

        <div className="flex justify-end">
          <button className="text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200">
            Go!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToolBox;
