const ToolCard = ({ title, description }: { title: string; description: string }) => {
    return (
        <div className="border-2 border-gray-400 rounded-lg p-4 mb-8 hover:bg-gravel-500 hover:text-white transition-colors duration-300">
          <h2 className="text-xl font-bold mb-2">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      );
}


export default ToolCard;
