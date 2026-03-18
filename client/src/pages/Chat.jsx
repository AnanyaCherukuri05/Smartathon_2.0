import React, { useState, useEffect, useRef } from "react";
import { Send, Mic, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "../lib/apiClient";

const Chat = () => {

const [chats,setChats] = useState([]);
const [activeChat,setActiveChat] = useState(null);
const [messages,setMessages] = useState([]);
const [input,setInput] = useState("");
const [listening,setListening] = useState(false);

const endRef = useRef(null);
const recognitionRef = useRef(null);

/*
====================
MIC SETUP
====================
*/

useEffect(()=>{

const SpeechRecognition =
window.SpeechRecognition || window.webkitSpeechRecognition;

if(!SpeechRecognition) return;

const recognition = new SpeechRecognition();

recognition.lang = navigator.language || "en-IN";

recognition.onstart = ()=>setListening(true);
recognition.onend = ()=>setListening(false);

recognition.onresult = e=>{
const text = e.results[0][0].transcript;
setInput(prev=>prev+" "+text);
};

recognitionRef.current = recognition;

},[]);

const startMic = ()=> recognitionRef.current?.start();

/*
====================
NEW CHAT
====================
*/

const newChat = ()=>{

const id = Date.now();

const chat={
id,
title:"New Chat",
messages:[]
};

setChats(prev=>[chat,...prev]);
setActiveChat(id);
setMessages([]);

};

/*
====================
DELETE SINGLE CHAT
====================
*/

const deleteChat=(id)=>{

const updated = chats.filter(c=>c.id!==id);

setChats(updated);

if(activeChat===id){
setActiveChat(null);
setMessages([]);
}

};

/*
====================
CLEAR ALL CHATS
====================
*/

const clearAllChats=()=>{
setChats([]);
setMessages([]);
setActiveChat(null);
};

/*
====================
LOAD CHAT
====================
*/

const loadChat=(chat)=>{
setActiveChat(chat.id);
setMessages(chat.messages);
};

/*
====================
SEND MESSAGE
====================
*/

const sendMessage = async ()=>{

if(!input.trim()) return;

const userMsg = {role:"user",content:input};

const updated=[...messages,userMsg];

setMessages(updated);
setInput("");

try{

const res = await apiFetch("/api/chat",{
method:"POST",
body:{messages:updated}
});

const aiMsg={
role:"assistant",
content:res.reply
};

setMessages(prev=>[...prev,aiMsg]);

}catch(err){
console.error(err);

const errorMsg = {
role:"assistant",
content: err?.message
? `Unable to get AI response: ${err.message}`
: "Unable to get AI response right now. Please try again."
};

setMessages(prev=>[...prev,errorMsg]);
}

};

useEffect(()=>{
endRef.current?.scrollIntoView({behavior:"smooth"});
},[messages]);

return(

<div className="flex h-screen bg-[#f9fafb]">

{/* SIDEBAR */}

<div className="w-64 bg-white border-r flex flex-col">

<div className="p-4 space-y-3">

<button
onClick={newChat}
className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg w-full"
>
<Plus size={18}/>
New chat
</button>

<button
onClick={clearAllChats}
className="flex items-center gap-2 border px-3 py-2 rounded-lg w-full text-sm"
>
<Trash2 size={16}/>
Clear history
</button>

</div>

<div className="flex-1 overflow-y-auto">

{chats.map(chat=>(

<div
key={chat.id}
className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-100 cursor-pointer"
>

<span onClick={()=>loadChat(chat)}>
{chat.title}
</span>

<button
onClick={()=>deleteChat(chat.id)}
className="text-gray-400 hover:text-red-500"
>
<Trash2 size={16}/>
</button>

</div>

))}

</div>

</div>

{/* CHAT AREA */}

<div className="flex-1 flex flex-col">

{/* MESSAGES */}

<div className="flex-1 overflow-y-auto p-8 space-y-6">

{messages.length===0 && (
<div className="text-center text-gray-400 mt-20">
<h2 className="text-3xl font-semibold mb-3">
KisanSetu AI
</h2>
<p>Ask anything about crops, weather, pests, or markets.</p>
</div>
)}

{messages.map((m,i)=>{

const isUser = m.role==="user";

return(

<div
key={i}
className={`flex ${isUser?"justify-end":"justify-start"}`}
>

<div
className={`max-w-[60%] px-5 py-3 rounded-xl text-sm ${
isUser
?"bg-green-600 text-white"
:"bg-white border"
}`}
>
{m.content}
</div>

</div>

);

})}

<div ref={endRef}/>

</div>

{/* INPUT */}

<div className="border-t p-4 flex justify-center">

<div className="flex items-center gap-2 w-full max-w-3xl bg-white border rounded-full px-4 py-2 shadow">

<input
value={input}
onChange={e=>setInput(e.target.value)}
placeholder="Ask anything..."
className="flex-1 outline-none"
/>

<button
onClick={startMic}
className={`${listening?"text-red-500":"text-gray-500"}`}
>
<Mic size={20}/>
</button>

<button
onClick={sendMessage}
className="bg-green-600 text-white p-2 rounded-full"
>
<Send size={18}/>
</button>

</div>

</div>

</div>

</div>

);

};

export default Chat;