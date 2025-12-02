import { useState, useEffect } from "react";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { Link } from "react-router";

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    const name = localStorage.getItem("admin_name") || "User";
    const email = localStorage.getItem("admin_email") || "yourmail@example.com";
    // const avatar = localStorage.getItem("admin_avatar_url"); // nếu có

    setAdminName(name);
    setAdminEmail(email);
    // setAvatarUrl(avatar);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_name");
    localStorage.removeItem("admin_email");
    // localStorage.removeItem("admin_avatar_url");

    window.location.href = "/signin";
  };

  const handleGoProfile = () => {
    closeDropdown();
    window.location.href = "/profile";
  };

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  // Avatar chữ cái đầu
  const renderInitialAvatar = () => {
    const letter = adminName ? adminName.charAt(0).toUpperCase() : "U";
    return (
      <div className="h-11 w-11 flex items-center justify-center rounded-full bg-green-500 text-white font-bold text-lg">
        {letter}
      </div>
    );
  };

  return (
    <div className="relative">
      {/* BUTTON */}
      <button
        onClick={toggleDropdown}
        className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
      >
        <span className="mr-3 overflow-hidden rounded-full h-11 w-11">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="User"
              className="h-full w-full object-cover"
            />
          ) : (
            renderInitialAvatar()
          )}
        </span>

        <span className="block mr-1 font-medium text-theme-sm">
          {adminName}
        </span>

        <svg
          className={`stroke-gray-500 dark:stroke-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          width="18"
          height="20"
          viewBox="0 0 18 20"
          fill="none"
        >
          <path
            d="M4.3125 8.65625L9 13.3437L13.6875 8.65625"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* DROPDOWN */}
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* USER INFO */}
        <div>
          <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
            {adminName}
          </span>
          <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400">
            {adminEmail}
          </span>
        </div>

        {/* MENU ITEMS */}
        <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <li>
            <button
              onClick={handleGoProfile}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Edit profile
            </button>
          </li>
          <li>
            <DropdownItem
              to="/profile"
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Account settings
            </DropdownItem>
          </li>
          <li>
            <DropdownItem
              to="/support"
              onItemClick={closeDropdown}
              className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:hover:bg-white/5"
            >
              Support
            </DropdownItem>
          </li>
        </ul>

        {/* LOGOUT */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 dark:hover:bg-white/5"
        >
          Sign out
        </button>
      </Dropdown>
    </div>
  );
}
