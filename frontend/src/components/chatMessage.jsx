import React from "react";

export default function ChatMessage({ role = "assistant", children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} px-4 py-2`}>
      <div
        className={`rounded-2xl p-3 max-w-[78%] break-words whitespace-pre-wrap text-sm 
          ${isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"} shadow-sm`}
      >
        {children}
      </div>
    </div>
  );
}
