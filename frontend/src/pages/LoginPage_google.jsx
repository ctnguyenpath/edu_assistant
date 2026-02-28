import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowLeft } from 'lucide-react';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // 1. Decode the Google Token to see user info immediately (Optional)
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("Google User:", decoded);

      // 2. Send this token to your Python Backend to store in MySQL
      const response = await fetch('http://localhost:8000/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential })
      });

      if (response.ok) {
        const data = await response.json();
        // 3. Log the user in via Context using the data from MySQL
        login(data.user);
        navigate('/');
      } else {
        console.error("Backend login failed");
      }
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="h-screen bg-gray-50 dark:bg-[#131314] flex items-center justify-center text-gray-900 dark:text-white relative transition-colors duration-300">
      
      {/* Back Button */}
      <button onClick={() => navigate('/')} className="absolute top-8 left-8 p-2 bg-white dark:bg-[#1E1F20] rounded-full hover:bg-gray-100 dark:hover:bg-[#333] shadow-sm transition-colors">
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="w-full max-w-md p-8 bg-white dark:bg-[#1E1F20] rounded-2xl border border-gray-200 dark:border-[#333] shadow-2xl text-center transition-colors duration-300">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Welcome</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 transition-colors">Sign in to save your progress</p>

        {/* GOOGLE BUTTON */}
        <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.log('Login Failed')}
              theme="filled_black"
              shape="pill"
              size="large"
              width="300"
            />
        </div>
        
        <p className="text-xs text-gray-500 mt-6">
          Your information will be securely stored in our database.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;