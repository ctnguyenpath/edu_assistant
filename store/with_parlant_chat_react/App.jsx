// App.jsx
import React from 'react';
import ParlantChatbox from 'parlant-chat-react';

// Make sure to import the component's CSS
//import 'parlant-chat-react/dist/style.css'; 

export default function App() {
  return (
    <div>
      {/* Your other app components can go here */}
      
      <ParlantChatbox
        server="http://localhost:8800" // Your Parlant server URL
        agentId="wtSzS9KSAb"       // The ID of the agent you want to chat with
        float={false}                 // Set to false to embed it, true for a popup
      />
    </div>
  );
}