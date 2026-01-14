
import React from 'react';
import { SignIn, SignUp, SignInButton } from '@clerk/clerk-react';

// Clerk-powered login screen
const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1d] p-4">
      <div className="w-full max-w-lg space-y-10">
        <div className="text-center">
          <h1 className="text-6xl font-black text-white tracking-tighter italic uppercase leading-none">The Foundry</h1>
          <p className="mt-2 text-slate-400 text-sm">Sign in or sign up to access your portfolio</p>
        </div>
        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800">
          <SignIn routing="path" path="/sign-in" />
          <div className="my-6 border-t border-slate-800"></div>
          <SignUp routing="path" path="/sign-up" />
        </div>
      </div>
    </div>
  );
};

export default Login;
