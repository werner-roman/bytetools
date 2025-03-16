import logo from "../assets/logo.png";

export default function TopNav() {
  return (
    <nav className="flex w-full items-center justify-between p-1 text-2xl font-bold bg-asphalt-950">
      <div>
        <img src={logo} className="w-25 h-auto" alt="Vite logo" />
        <div>Bytetools</div>
      </div>
      <div className="flex flex-row items-center gap-4">
        {/* potential signin/signup buttons */}
      </div>
    </nav>
  );
}
