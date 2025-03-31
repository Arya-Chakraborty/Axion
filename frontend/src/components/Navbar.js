import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { UserButton, useUser } from "@clerk/clerk-react";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useUser();

  return (
    <nav className="fixed top-0 left-0 w-full backdrop-blur-lg bg-gray-900/95 shadow-lg border-b border-gray-800 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-2 flex justify-between items-center">
        
        {/* Logo and Brand Name */}
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <img 
            src="/logo.png" 
            alt="Axion Logo" 
            className="h-8 w-8 object-contain" 
          />
          <span className="text-2xl font-bold tracking-wide bg-gradient-to-r from-purple-500 to-orange-500 bg-clip-text text-transparent">
            Axion
          </span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-6 items-center">
          <NavItem to={isSignedIn ? "/dashboard" : "/login"} text="Dashboard" />
          <NavItem to="/xplore" text="Explore" />
          <NavItem to={isSignedIn ? "/analytics" : '/login'} text="Analytics" />
          <NavItem to="/about" text="About Us" />
          <div className="ml-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-4">
          <UserButton afterSignOutUrl="/" />
          <button 
            className="text-white hover:text-purple-400 transition-transform" 
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown - Made darker to match */}
      {isOpen && (
        <div className="md:hidden bg-gray-900/95 backdrop-blur-lg border-t border-gray-800">
          <div className="flex flex-col items-center gap-3 py-3">
            <NavItem to="/dashboard" text="Dashboard" onClick={() => setIsOpen(false)} />
            <NavItem to="/explore" text="Explore" onClick={() => setIsOpen(false)} />
            <NavItem to="/analytics" text="Analytics" onClick={() => setIsOpen(false)} />
            <NavItem to="/about" text="About Us" onClick={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
};

// Reusable Nav Item Component (unchanged)
const NavItem = ({ to, text, onClick }) => {
  return (
    <Link 
      to={to} 
      onClick={onClick}
      className="relative text-white font-medium text-base px-2 py-1 transition-all duration-300 hover:text-orange-400 group"
    >
      {text}
      <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-orange-400 transition-all duration-300 transform -translate-x-1/2 group-hover:w-full"></span>
    </Link>
  );
};

export default Navbar;