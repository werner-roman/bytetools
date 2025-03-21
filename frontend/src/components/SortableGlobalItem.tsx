import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Trash2 } from "lucide-react"

import { TrackItem } from "./FileDropzone" 
// (If needed, you can define TrackItem locally again, or import from a shared types file)

interface SortableGlobalItemProps {
  track: TrackItem
  removeTrack: (trackId: string) => void
}

export function SortableGlobalItem({ track, removeTrack }: SortableGlobalItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: track.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    // basic styling
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between bg-asphalt-950 text-gray-200 p-2 mb-2 rounded"
    >
      <div>
        {/* Track name */}
        {track.name}
      </div>
      <div className="flex items-center space-x-2">
        {/* Badge with file name */}
        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
          {track.fileName}
        </span>
        {/* Delete icon */}
        {/*<button
          onClick={() => removeTrack(track.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 size={16} />
        </button>*/}
      </div>
    </div>
  )
}
