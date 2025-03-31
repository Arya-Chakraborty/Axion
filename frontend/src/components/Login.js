import React from 'react';
import { useClerk, SignedIn, SignedOut, SignIn, UserButton, useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import Waves from './Waves';

const Login = () => {
  const { loaded } = useClerk();
  const { user } = useUser();
  const navigate = useNavigate();

  if (!loaded) {
    return <div className="flex items-center justify-center h-screen text-lg font-semibold text-gray-300">Loading...</div>;
  }

  return (
    <div className="relative flex flex-col lg:flex-row items-center justify-center min-h-screen px-6 lg:px-20 bg-gradient-to-br from-black via-gray-900 to-gray-950 text-white overflow-hidden">
      {/* Waves background component */}
      <div className="absolute inset-0 z-0">
        <Waves
          lineColor="rgba(255, 255, 255, 0.1)"
          backgroundColor="rgba(15, 23, 42, 0.3)" // Tailwind's gray-900 with opacity
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>

      <div className="relative z-10 mb-10 lg:mb-0 lg:w-1/2 pt-8">
        {/* Logo and heading in one line */}
        <div className="flex items-center gap-4">
          <img 
            src="/logo.png" 
            alt="Axion Logo" 
            className="h-12 w-12 object-contain mt-2" 
          />
          <h1 className="text-5xl font-bold bg-clip-text text-transparent" 
              style={{
                backgroundImage: 'linear-gradient(90deg, #673ab7, #ff9800)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text'
              }}>
            Axion
          </h1>
        </div>
        {/* Tagline directly below, aligned with logo */}
        <p className="text-lg text-gray-400 mt-2">Next-gen funds management and AI analytics</p>
      </div>

      {/* Login form container */}
      <div className="relative z-10 w-full lg:w-2/5 p-6 bg-gray-900 rounded-2xl shadow-lg border border-gray-800 backdrop-blur-sm bg-opacity-80">
        <SignedIn>
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <UserButton afterSignOutUrl="/" />
              <span className="text-lg font-medium text-gray-300">Hello, {user?.fullName || "User"} 👋</span>
            </div>
            <button
              onClick={() => navigate("/xplore")}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-500 to-orange-500 text-white font-medium rounded-lg shadow-md hover:opacity-90 transition duration-300"
            >
              Go to Market
            </button>
          </div>
        </SignedIn>

        <SignedOut>
          <div className="flex flex-col items-center text-center">
            <SignIn
              redirectUrl="/xplore"
            />
          </div>
        </SignedOut>
      </div>
    </div>
  );
};

export default Login;