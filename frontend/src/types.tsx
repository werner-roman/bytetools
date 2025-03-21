export interface KMZParsedTrack {
  name: string
  coordinates: string
}

export interface KMZFileWithTracks extends File {
  tracks?: KMZParsedTrack[];
  waypoints?: KMZParsedTrack[];
}