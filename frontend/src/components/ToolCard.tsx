import React from 'react';

interface ToolCardProps {
  title: string;
  description: string;
}

const ToolCard: React.FC<ToolCardProps> = ({ title, description }) => {
  return (
    <div className={`border-2 border-gray-400 rounded-lg p-4 mb-8`}>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
};

export default ToolCard;
