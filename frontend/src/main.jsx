import React from 'react'
import ReactDOM from 'react-dom/client'
//import App from './App_pclient_customize.jsx'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google';

// Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID ="1086725271827-odk49dtsjb79jn44rhb02o2cqs9msp8c.apps.googleusercontent.com"; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)