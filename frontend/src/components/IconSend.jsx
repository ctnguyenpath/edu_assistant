import React from "react";

export default function IconSend({ className = "w-5 h-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M22 2l-7 20  -4-9-9-4 20-7z" />
    </svg>
  );
}
