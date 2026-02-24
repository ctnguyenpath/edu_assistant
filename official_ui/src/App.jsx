import React, { useState, useEffect, useRef, useMemo } from 'react';
import ParlantChatbox from 'parlant-chat-react';
import { ParlantClient } from 'parlant-client';
import { Paperclip, UploadCloud, X, Send, RefreshCw, Clock } from 'lucide-react'; 
import './index.css';

// ✅ HÀM TRỢ GIÚP TẠO HIỆU ỨNG GÕ CHỮ AN TOÀN (Không làm hỏng HTML/Markdown)
const applyTypingEffect = (element) => {
  // Tìm tất cả các node là "Text" bên trong tin nhắn
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue.trim() !== '') {
      textNodes.push(node);
    }
  }

  let wordIndex = 0;
  textNodes.forEach((textNode) => {
    // Tách câu thành các từ nhưng giữ lại dấu cách
    const words = textNode.nodeValue.split(/(\s+)/); 
    const fragment = document.createDocumentFragment();
    
    words.forEach((word) => {
      if (word.trim() === '') {
        fragment.appendChild(document.createTextNode(word));
      } else {
        const span = document.createElement('span');
        span.textContent = word;
        span.className = 'typing-word';
        // Tốc độ gõ: 20ms cho mỗi từ
        span.style.animationDelay = `${wordIndex * 20}ms`; 
        fragment.appendChild(span);
        wordIndex++;
      }
    });
    
    // Thay thế text cũ bằng đoạn text đã được bọc span hiệu ứng
    textNode.parentNode.replaceChild(fragment, textNode);
  });
};

function App() {
  const [agentId, setAgentId] = useState(null);
  const [sessionId, setSessionId] = useState(null); 
  const [sessionDate, setSessionDate] = useState(""); 
  const [error, setError] = useState(null);
  
  // Loading & Upload States
  const [isUploading, setIsUploading] = useState(false);
  
  // Drag & Drop States
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [userMessage, setUserMessage] = useState("");

  const fileInputRef = useRef(null);
  
  // ENV Variables
  const SERVER_URL = import.meta.env.VITE_PARLANT_URL || 'http://localhost:8802';
  const UPLOAD_URL = import.meta.env.VITE_FILE_UPLOAD_URL || 'http://localhost:8005';

  // Stabilize the Client
  const client = useMemo(() => new ParlantClient({ environment: SERVER_URL }), [SERVER_URL]);

  // Stabilize ClassNames
  const chatboxClassNames = useMemo(() => ({
    chatboxWrapper: "custom-wrapper", 
    chatbox: "custom-chatbox", 
    messagesArea: "custom-messages"
  }), []);

  // ✅ UPDATED: Observer ẩn chữ "chào bạn", thêm giờ, và KÍCH HOẠT TYPING EFFECT
  useEffect(() => {
    const TARGET_TEXT = "chào bạn";
    
    const observer = new MutationObserver((mutations) => {
      // 1. Hide System Message
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          // Use toLowerCase() to catch variations like "Chào bạn" or "chào bạn"
          if (node.nodeType === 1 && node.innerText?.trim().toLowerCase() === TARGET_TEXT) {
            node.style.display = 'none';
          }
        });
      });

      // 2. Inject Timestamps & Typing Effect
      const messageArea = document.querySelector('.custom-messages');
      if (messageArea) {
        const messageRows = messageArea.children;
        
        Array.from(messageRows).forEach((row) => {
          // Bỏ qua nếu đã xử lý hoặc là tin nhắn hệ thống
          if (row.classList.contains('processed-message') || row.innerText?.trim().toLowerCase() === TARGET_TEXT) {
            return;
          }

          // A) Thêm thời gian
          const now = new Date();
          const timeString = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const timeDiv = document.createElement('div');
          timeDiv.innerText = timeString;
          timeDiv.className = "message-timestamp";
          row.appendChild(timeDiv);
          
          // B) Kích hoạt hiệu ứng Typing (Gõ từng từ)
          // Tùy chọn: Bạn có thể thêm điều kiện để chỉ áp dụng cho tin nhắn của bot
          // nếu ParlantChatbox có class phân biệt (vd: row.classList.contains('message-bot'))
          applyTypingEffect(row);
          
          // Đánh dấu là đã xử lý
          row.classList.add('processed-message');
        });
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // 1. Initialize Connection & PERSIST SESSION
  useEffect(() => {
    const init = async () => {
      try {
        const agents = await client.agents.list();
        const targetAgent = agents.find(a => a.name === "LDC Assistant") || agents[0];
        
        if (!targetAgent) { setError('Agent not found'); return; }
        setAgentId(targetAgent.id);

        // Check for existing session in localStorage
        let activeSession = localStorage.getItem("parlant_active_session_id");
        let activeDate = localStorage.getItem("parlant_active_session_date");

        if (activeSession) {
          try { 
            // Attempt to resume the old session so user can continue
            await client.sessions.retrieve(activeSession); 
            setSessionId(activeSession);
            if (activeDate) setSessionDate(activeDate);
            console.log("✅ Resumed existing session:", activeSession);
          } 
          catch (e) { 
            // If session expired or invalid on server, create new one
            console.log("⚠️ Old session invalid, creating a new one.");
            await createNewSession(targetAgent.id);
          }
        } else {
          // No session found, create a new one
          await createNewSession(targetAgent.id);
        }

      } catch (err) { console.error(err); setError("Connection Error"); }
    };
    init();
  }, [client]);

  // Helper: Create Session & Record Datetime
  const createNewSession = async (aid) => {
    if (!aid) return null;
    try {
      const session = await client.sessions.create({ agentId: aid });
      
      // Generate formatted datetime (e.g., "14:30 - 18/02/2026")
      const now = new Date();
      const formattedDate = now.toLocaleString('vi-VN', {
        hour: '2-digit', minute: '2-digit',
        day: '2-digit', month: '2-digit', year: 'numeric'
      });

      // Save to localStorage
      localStorage.setItem("parlant_active_session_id", session.id);
      localStorage.setItem("parlant_active_session_date", formattedDate);
      
      // Send "chào bạn" instead of "__START__" to trigger Vietnamese greeting
      await client.sessions.createEvent(session.id, { 
        kind: "message", 
        source: "customer", 
        message: "chào bạn" 
      });
      
      setSessionDate(formattedDate);
      setSessionId(session.id);
      return session.id;
    } catch (e) { 
      console.error(e); 
      return null;
    }
  };

  // Robust "New Chat" Handler (Wipes localStorage and starts fresh)
  const handleNewChat = async () => {
    if (!agentId) return;

    // 1. Clear UI & Storage immediately
    setSessionId(null); 
    setPendingFile(null);
    setUserMessage("");
    setShowConfirmModal(false);
    localStorage.removeItem("parlant_active_session_id");
    localStorage.removeItem("parlant_active_session_date");

    // 2. Create new session immediately
    await createNewSession(agentId);
  };

  // 2. Upload Logic
  const handleConfirmUpload = async () => {
    if (!pendingFile || !sessionId) return;

    setIsUploading(true); 
    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("user_id", sessionId);

    try {
      const res = await fetch(`${UPLOAD_URL}/upload`, { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload Service failed");
      const data = await res.json();

      // Format tin nhắn thành tiếng Việt nhưng vẫn giữ chuỗi [System] File ID cho AI hiểu
      const textPrefix = userMessage.trim() ? `${userMessage.trim()}\n\n` : ``;
      const hiddenSystemInfo = `Upload thành công file: [System] File ID: ${data.data.file_id} - ${data.data.original_filename}`;

      // Send to Parlant
      await client.sessions.createEvent(sessionId, {
        kind: "message", 
        source: "customer", 
        message: textPrefix + hiddenSystemInfo
      });

      // Cleanup UI
      setIsUploading(false);
      closeModal();

    } catch (err) {
      alert("Upload failed: " + err.message);
      setIsUploading(false);
    }
  };

  // UI Helpers
  const stageFileForUpload = (file) => { 
    if (!file) return; 
    setPendingFile(file); 
    setIsDragging(false); 
    setShowConfirmModal(true); 
    dragCounter.current = 0; 
  };

  const closeModal = () => { 
    setShowConfirmModal(false); 
    setPendingFile(null); 
    setUserMessage(""); 
    if (fileInputRef.current) fileInputRef.current.value = ""; 
  };

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current += 1; if (e.dataTransfer.items.length > 0) setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); dragCounter.current -= 1; if (dragCounter.current === 0) setIsDragging(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); dragCounter.current = 0; if (e.dataTransfer.files.length > 0) stageFileForUpload(e.dataTransfer.files[0]); };

  if (error) return <div className="center-screen error">⚠️ {error}</div>;
  if (!agentId) return <div className="center-screen">🤖 Đang kết nối...</div>;

  return (
    <div 
      className="full-screen-container relative" 
      onDragEnter={handleDragEnter} 
      onDragLeave={handleDragLeave} 
      onDragOver={handleDragOver} 
      onDrop={handleDrop}
    >
      
      {/* Conversation Datetime Header */}
      {sessionDate && (
        <div className="absolute top-2 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-white/80 backdrop-blur text-gray-500 text-[10px] font-medium px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-gray-200">
            <Clock size={10} /> Phiên trò chuyện: {sessionDate}
          </div>
        </div>
      )}

      {/* Chatbox Component - Only renders when sessionId exists */}
      {sessionId && (
        <ParlantChatbox 
          key={sessionId} 
          server={SERVER_URL} 
          agentId={agentId} 
          sessionId={sessionId} 
          float={false} 
          classNames={chatboxClassNames} 
        />
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="dropzone-overlay active">
          <div className="dropzone-content">
            <UploadCloud size={64} className="drop-icon" />
            <p><b>Thả file vào đây</b></p>
          </div>
        </div>
      )}

      {/* Upload Confirmation Modal */}
      {showConfirmModal && ( 
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Xác nhận gửi file</h3>
              <button onClick={closeModal} className="close-btn"><X size={18} /></button>
            </div>
            
            <div className="file-preview">
              <UploadCloud size={24} color="#007bff" />
              <span className="file-name">{pendingFile?.name}</span>
            </div>
            
            <textarea 
              className="modal-input" 
              placeholder="Nhập tin nhắn..." 
              value={userMessage} 
              onChange={(e) => setUserMessage(e.target.value)} 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirmUpload(); }}} 
              autoFocus 
            />
            
            <button className="confirm-btn" onClick={handleConfirmUpload} disabled={isUploading}>
              <Send size={18} />
              <span>{isUploading ? "Đang gửi..." : "Gửi báo cáo"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={(e) => stageFileForUpload(e.target.files[0])} 
      />

      {/* Control Buttons */}
      <div className="control-buttons flex gap-2">
        <button 
          className="ctrl-btn new-chat bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-transform active:scale-95" 
          onClick={handleNewChat} 
          title="Cuộc hội thoại mới" 
          type="button"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Upload Button */}
      <button 
        className="upload-btn" 
        onClick={() => fileInputRef.current.click()} 
        disabled={isUploading}
      >
        <Paperclip size={20} />
      </button>

      <div className="my-custom-footer">Powered by <b> NCB Risk System</b></div>
    </div>
  );
}

export default App;