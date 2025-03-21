import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { downloadStravaActivities, fetchActivitiesCount } from "@/lib/stravaUtils";
import { Progress } from "@/components/ui/progress";
import {
  connectToStrava,
  handleTokenExchange,
  handleLogout as stravaLogout,
} from "@/lib/stravaAuth";
import { addDays, format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { useUser } from "@clerk/clerk-react";

const DateRangePicker = ({
  selectedRange,
  onRangeChange,
}: {
  selectedRange: DateRange | undefined;
  onRangeChange: (range: DateRange | undefined) => void;
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal bg-asphalt-950 text-white border-gray-400",
            !selectedRange && "text-white"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedRange?.from ? (
            selectedRange.to ? (
              <>
                {format(selectedRange.from, "LLL dd, y")} -{" "}
                {format(selectedRange.to, "LLL dd, y")}
              </>
            ) : (
              format(selectedRange.from, "LLL dd, y")
            )
          ) : (
            <span>Pick a date range</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-gray-400" align="start">
        <Calendar
          mode="range"
          selected={selectedRange}
          onSelect={onRangeChange}
          numberOfMonths={2}
          className="bg-asphalt-950 text-white"
        />
      </PopoverContent>
    </Popover>
  );
};

const StravaToolBox = ({
  toolName,
  onBack,
}: {
  toolName: string;
  onBack: () => void;
}) => {
  const [isStravaConnected, setIsStravaConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stravaToken, setStravaToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [filterType, setFilterType] = useState<"dateRange" | "lastActivities">("dateRange");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: addDays(new Date(), 7),
  });
  const [lastActivitiesCount, setLastActivitiesCount] = useState<number>(0);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [activitiesCount, setActivitiesCount] = useState<number | null>(null);
  const { user } = useUser();

  useEffect(() => {
    const storedToken = localStorage.getItem("stravaToken");
    const storedExpiresAt = localStorage.getItem("expiresAt");

    if (storedToken && storedExpiresAt) {
      const expiresAtTime = parseInt(storedExpiresAt, 10);
      if (Date.now() < expiresAtTime) {
        setStravaToken(storedToken);
        setExpiresAt(expiresAtTime);
        setIsStravaConnected(true);
      } else {
        logout();
      }
    }

    if (window.location.pathname === "/strava-bulk-download") {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get("code");

      if (authCode) {
        handleTokenExchangeWrapper(authCode);
      }
    }
  }, []);

  const handleTokenExchangeWrapper = async (code: string) => {
    await handleTokenExchange(
      code,
      setStravaToken,
      setExpiresAt,
      setIsStravaConnected
    );
  };

  const handleConnectStrava = () => {
    const redirectUri = `${window.location.origin}/strava-bulk-download`;
    connectToStrava(redirectUri);
  };

  const logout = () => {
    stravaLogout();
    setStravaToken(null);
    setExpiresAt(null);
    setIsStravaConnected(false);
    toast.success("Successfully disconnected from Strava.");
  };

  const handleDownloadActivities = async () => {
    if (!stravaToken) {
      toast.error("Please connect to Strava first.");
      return;
    }

    let count = 0;

    try {
      // Determine the number of activities to download
      if (filterType === "dateRange" && dateRange?.from && dateRange?.to) {
        count = await fetchActivitiesCount(stravaToken, dateRange.from, dateRange.to);
      } else if (filterType === "lastActivities" && lastActivitiesCount > 0) {
        count = lastActivitiesCount;
      }

      setActivitiesCount(count);

      // Step 1: Fetch user's current credits
      const creditsResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/get-credits?userId=${user?.id}`
      );

      if (!creditsResponse.ok) {
        const data = await creditsResponse.json();
        toast.error(data.error || "Failed to fetch user credits.");
        return;
      }

      const { credits } = await creditsResponse.json();

      // Step 2: Check if the user has enough credits
      if (credits < count) {
        toast.error("Not enough credits to download the selected activities.");
        return;
      }

      // Step 3: Deduct credits
      const deductResponse = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/deduct-credits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user?.id,
            activitiesCount: count,
          }),
        }
      );

      if (!deductResponse.ok) {
        const data = await deductResponse.json();
        toast.error(data.error || "Failed to deduct credits.");
        return;
      }

      // Trigger top navigation to fetch updated credit count
      if (typeof window !== "undefined" && window.dispatchEvent) {
        window.dispatchEvent(new Event("updateCredits"));
      }

      // Step 4: Proceed with the download
      setIsAlertOpen(true);
    } catch (error) {
      console.error("Error fetching activities count or deducting credits:", error);
      toast.error("An error occurred while processing your request.");
    }
  };

  const proceedWithDownload = async () => {
    setIsAlertOpen(false); // Close the dialog instantly
    setIsProcessing(true);
    setDownloadProgress(0);
    try {
      await downloadStravaActivities(
        stravaToken!,
        (progress: number) => setDownloadProgress(progress),
        filterType === "lastActivities" ? lastActivitiesCount : undefined,
        filterType === "dateRange" && dateRange && dateRange.from && dateRange.to
          ? { from: dateRange.from, to: dateRange.to }
          : undefined
      );
      toast.success("Activities downloaded successfully!");
      setDownloadProgress(100);
    } catch (error) {
      console.error("Error downloading activities:", error);
      toast.error("Failed to download activities.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <Toaster position="bottom-right" theme="dark" />
      <button
        onClick={onBack}
        className="mb-4 text-xl text-gray-400 hover:text-white"
      >
        ← Back
      </button>
      <div className="border-2 border-gray-400 rounded-lg p-4 mb-8">
        <h1 className="text-xl font-bold mb-2">{toolName}</h1>
        {!isStravaConnected ? (
          <button
            onClick={handleConnectStrava}
            className="text-white text-xl border-2 border-gray-400 bg-warning-500 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200"
          >
            Connect to Strava
          </button>
        ) : (
          <div className="flex flex-col items-center">
            <div className="border-2 border-dashed border-gray-400 rounded-lg p-4 mt-4 w-full">
              <h2 className="text-lg font-bold mb-2">Download Activities</h2>
              <p className="mb-4">Select how you want to filter your activities for download</p>
              <div className="flex flex-col mb-4">
                <label className="flex items-center mb-2">
                  <input
                    type="radio"
                    name="filterType"
                    value="dateRange"
                    checked={filterType === "dateRange"}
                    onChange={() => setFilterType("dateRange")}
                    className="mr-2"
                  />
                  Date Range
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="filterType"
                    value="lastActivities"
                    checked={filterType === "lastActivities"}
                    onChange={() => setFilterType("lastActivities")}
                    className="mr-2"
                  />
                  Number of Last Activities
                </label>
              </div>
              {filterType === "dateRange" && (
                <div className="flex flex-col mb-4">
                  <label className="mb-2">
                    Date Range
                    <DateRangePicker
                      selectedRange={dateRange}
                      onRangeChange={setDateRange}
                    />
                  </label>
                </div>
              )}
              {filterType === "lastActivities" && (
                <div className="flex flex-col mb-4">
                  <label className="mb-2">
                    Number of Last Activities
                    <Input
                      type="number"
                      value={lastActivitiesCount}
                      onChange={(e) => setLastActivitiesCount(Number(e.target.value))}
                      className="w-full p-2 border border-gray-400 rounded"
                    />
                  </label>
                </div>
              )}
              {isProcessing && (
                <Progress value={downloadProgress} className="w-full mt-2 border-2 border-gray-400 [&>div]:bg-green-600" />
              )}
            </div>
            <div className="flex justify-between w-full mt-4">
              <button
                onClick={logout}
                className="text-red-500 text-sm border-1 border-red-500 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition-colors duration-200"
              >
                Logout from Strava
              </button>
              <button
                onClick={handleDownloadActivities}
                disabled={isProcessing}
                className={`text-white text-xl border-2 border-gray-400 bg-gravel-950 px-4 py-2 rounded hover:bg-gravel-500 hover:text-white transition-colors duration-200 ${
                  isProcessing ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isProcessing ? "Downloading..." : "Download"}
              </button>
            </div>
          </div>
        )}
      </div>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent className="bg-asphalt-950 text-white border-gray-400">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Confirm Download</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You are about to download <span className="text-red-600 text-lg">{activitiesCount}</span> activities within the selected date range. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsAlertOpen(false)} className="border-gray-400 text-gray-800 hover:bg-gray-400 hover:text-white">
              Cancel
            </Button>
            <Button onClick={proceedWithDownload} className="bg-orange-900 text-black hover:bg-orange-700">
              Confirm
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StravaToolBox;