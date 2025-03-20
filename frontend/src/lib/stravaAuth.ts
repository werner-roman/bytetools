import { toast } from "sonner";

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export const connectToStrava = (redirectUri: string) => {
  const clientId = STRAVA_CLIENT_ID;
  const authUrl = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read,activity:read_all`;

  window.location.href = authUrl;
};

export const exchangeCodeForToken = async (
  code: string
): Promise<{
  token: string;
  expiresAt: number;
  error: string | null;
}> => {
  try {
    const response = await fetch(`${BACKEND_URL}/strava/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (response.ok) {
      const token = data.access_token;
      const expiresIn = data.expires_in;
      const newExpiresAt = Date.now() + expiresIn * 1000;
      return { token, expiresAt: newExpiresAt, error: null };
    } else {
      return { token: "", expiresAt: 0, error: data.error || "Failed to exchange code for token." };
    }
  } catch (error: any) {
    console.error("Error exchanging code for token:", error);
    return { token: "", expiresAt: 0, error: "Failed to exchange code for token." };
  }
};

export const handleTokenExchange = async (
  code: string,
  setStravaToken: (token: string | null) => void,
  setExpiresAt: (expiresAt: number | null) => void,
  setIsStravaConnected: (isConnected: boolean) => void
) => {
  const { token, expiresAt, error } = await exchangeCodeForToken(code);

  if (token && expiresAt) {
    setStravaToken(token);
    setExpiresAt(expiresAt);
    localStorage.setItem("stravaToken", token);
    localStorage.setItem("expiresAt", expiresAt.toString());
    setIsStravaConnected(true);
    toast.success("Successfully connected to Strava!");

    // Remove the code from the URL only after successful token exchange
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete("code");
    window.history.replaceState(
      {},
      document.title,
      `${window.location.pathname}?${urlParams.toString()}`
    );
  } else {
    toast.error(error || "Failed to exchange code for token.");
  }
};

export const handleLogout = () => {
  localStorage.removeItem("stravaToken");
  localStorage.removeItem("expiresAt");
};