import JSZip from "jszip";
import { toast } from "sonner";

// Replace with your Strava Client ID and Redirect URI
const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;

export const connectToStrava = (redirectUri: string) => {
  const clientId = STRAVA_CLIENT_ID; // Strava client ID from environment variables
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read,activity:read_all`; // Removed approval_prompt=force

  window.location.href = authUrl; // Redirect to Strava authorization URL
};

export const downloadStravaActivities = async (
  token: string,
  onProgress: (progress: number) => void,
  lastActivitiesCount?: number,
  dateRange?: { from: Date; to: Date }
) => {
  try {
    const activities = dateRange
      ? await fetchStravaActivitiesByDateRange(token, dateRange.from, dateRange.to)
      : await fetchStravaActivities(token, lastActivitiesCount);

    const zip = new JSZip();
    const totalActivities = activities.length;
    let completedActivities = 0;

    for (const activity of activities) {
      const gpxContent = await fetchActivityAsGPX(token, activity.id);
      if (gpxContent) {
        zip.file(`activity_${activity.id}.gpx`, gpxContent);
      }
      completedActivities++;
      const progress = (completedActivities / totalActivities) * 100;
      onProgress(progress);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadFile(zipBlob, "activities.zip", "application/zip");

    toast.success("All activities downloaded as a ZIP file!");
  } catch (error) {
    console.error("Error downloading Strava activities:", error);
    toast.error("Failed to download activities.");
  }
};

export const fetchActivitiesCount = async (token: string, from: Date, to: Date): Promise<number> => {
  try {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(from.getTime() / 1000)}&before=${Math.floor(to.getTime() / 1000)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch activities count: ${response.status} ${response.statusText}`);
    }

    const activities = await response.json();
    return activities.length;
  } catch (error) {
    console.error("Error fetching activities count:", error);
    throw error;
  }
};

const fetchStravaActivities = async (
  token: string,
  limit: number = 10,
  page: number = 1,
  perPage: number = 10
) => {
  const activities: any[] = [];
  try {
    while (activities.length < limit) {
      const response = await fetch(
        `https://www.strava.com/api/v3/athlete/activities?page=${page}&per_page=${perPage}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch activities: ${response.status} ${response.statusText}`
        );
      }

      const pageActivities = await response.json();
      activities.push(...pageActivities);

      if (pageActivities.length < perPage) {
        break; // No more activities to fetch
      }

      page++;
    }

    return activities.slice(0, limit); // Return only the requested number of activities
  } catch (error) {
    console.error("Error fetching Strava activities:", error);
    throw error;
  }
};

const fetchActivityAsGPX = async (token: string, activityId: number): Promise<string | null> => {
  try {
    const response = await fetch(`https://www.strava.com/api/v3/activities/${activityId}/streams?keys=latlng,time,altitude&key_by_type=true`, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch activity streams: ${response.status} ${response.statusText}`);
    }

    const streams = await response.json();
    return convertStreamsToGPX(streams);
  } catch (error) {
    console.error(`Error fetching activity ${activityId}:`, error);
    toast.error(`Failed to fetch activity ${activityId}.`);
    return null;
  }
};

const convertStreamsToGPX = (streams: any): string => {
  if (!streams.latlng || !streams.time) {
    console.warn("Required streams (latlng, time) are missing.");
    return "";
  }

  const { latlng, time, altitude } = streams;
  const gpx = `<?xml version="1.0" encoding="UTF-8"?>
    <gpx version="1.1" creator="Bytetools Strava Downloader" xmlns="http://www.topografix.com/GPX/1/1">
      <metadata>
        <name>Strava Activity</name>
      </metadata>
      <trk>
        <trkseg>
          ${latlng.data.map((coords: [number, number], index: number) => {
            const [latitude, longitude] = coords;
            const elevation = altitude?.data[index] || 0;
            const timestamp = new Date(time.data[index] * 1000).toISOString(); // Strava provides time in seconds

            return `<trkpt lat="${latitude}" lon="${longitude}">
                      <ele>${elevation}</ele>
                      <time>${timestamp}</time>
                    </trkpt>`;
          }).join('')}
        </trkseg>
      </trk>
    </gpx>`;

  return gpx;
};

const downloadFile = (content: Blob, filename: string, contentType: string) => {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
};

const fetchStravaActivitiesByDateRange = async (token: string, from: Date, to: Date) => {
  const response = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${Math.floor(from.getTime() / 1000)}&before=${Math.floor(to.getTime() / 1000)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch activities: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};