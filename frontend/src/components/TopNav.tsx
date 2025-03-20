import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import logo from "../assets/logo.png";

export default function TopNav() {
  const { user } = useUser();
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = async () => {
    if (!user?.id) {
      console.warn("User ID is not available. Skipping fetchCredits.");
      return; // Exit if user is not available
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/get-credits?userId=${user.id}`);
      if (response.ok) {
        const { credits } = await response.json();
        setCredits(credits);
      } else {
        console.error("Failed to fetch credits:", response.status);
        setCredits(0); // Default to 0 or handle error as needed
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
      setCredits(0); // Default to 0 or handle error as needed
    }
  };

  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user]);

  useEffect(() => {
    const handleUpdateCredits = () => {
      fetchCredits(); // This will now only run if user?.id is available
    };

    window.addEventListener("updateCredits", handleUpdateCredits);

    return () => {
      window.removeEventListener("updateCredits", handleUpdateCredits);
    };
  }, [user]); // Add `user` as a dependency to ensure it updates when `user` changes

  return (
    <nav className="flex w-full items-center justify-between p-1 text-2xl font-bold bg-asphalt-950">
      <div>
        <img src={logo} className="w-25 h-auto" alt="Vite logo" />
        <div className="text-gray-400">Bytetools</div>
      </div>
      <div className="flex flex-row items-center gap-4">
        <div className="flex items-center justify-center mr-3">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="text-gray-400 mr-4 text-sm">
              Credits: {credits !== null ? credits : "Loading..."}
            </div>
            <UserButton />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
