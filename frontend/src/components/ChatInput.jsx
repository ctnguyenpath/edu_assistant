import React, { useState } from "react";
import IconSend from "./IconSend";

export default function ChatInput({ onSend, sending }) {
  const [value, setValue] = useState("");

  function handleSend() {
    const text = value.trim();
    if (!text || sending) return;
    setValue("");
    onSend(text);
  }

  return (
    <div className="p-3 border-t border-gray-200 bg-white flex items-center gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSend()}
        placeholder="Ask Otto about products, campaigns, or prices..."
        className="flex-1 rounded-lg px-4 py-2 border border-gray-200 focus:outline-none"
      />
      <button
        onClick={handleSend}
        disabled={sending}
        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      >
        <IconSend className="w-4 h-4" />
        <span className="hidden sm:inline">Send</span>
      </button>
    </div>
  );
}
