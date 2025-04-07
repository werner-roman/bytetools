import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Trash2 } from "lucide-react"
import { useState } from "react"

import { TrackItem } from "./FileDropzone" 

interface SortableGlobalItemProps {
  track: TrackItem
  removeTrack: (trackId: string) => void
}

export function SortableGlobalItem({ track, removeTrack }: SortableGlobalItemProps) {
  const [isDeleteHovered, setIsDeleteHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: track.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Completely separate handler for delete operation
  const handleDelete = (e: React.MouseEvent) => {
    // Prevent any DnD events from triggering
    e.stopPropagation();
    e.preventDefault();
    
    console.log("Delete button clicked for track:", track.name);
    
    removeTrack(track.id);
    
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between bg-asphalt-950 text-gray-200 p-2 mb-2 rounded"
      // Add title attribute to show uniqueId on hover for debugging
      title={track.uniqueId || `${track.fileName}:${track.name}`}
    >
      {/* Drag handle area */}
      <div
        {...attributes}
        {...listeners}
        className="flex-grow cursor-grab"
      >
        {track.name}
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
          {track.fileName}
        </span>
        {/* Completely separated delete button with no DnD listeners */}
        <div
          onClick={handleDelete}
          onMouseEnter={() => setIsDeleteHovered(true)}
          onMouseLeave={() => setIsDeleteHovered(false)}
          className={`p-2 text-red-500 hover:text-red-700 hover:bg-gray-800 rounded transition-colors duration-200 cursor-pointer ${
            isDeleteHovered ? 'scale-110' : ''
          }`}
        >
          <Trash2 size={16} />
        </div>
      </div>
    </div>
  )
}
