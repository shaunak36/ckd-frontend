"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { supabase } from "@/lib/supabaseClient";
import ReactMarkdown from "react-markdown";

interface PatientRecord {
  id: string;
  patient_name: string;
  created_at: string;
}

function AssistantContent() {
  const router = useRouter();

  const [userRole, setUserRole] = useState<"doctor" | "patient" | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [screenings, setScreenings] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedId, setSelectedId] = useState<string>("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from("user_profiles")
          .select("role, full_name")
          .eq("id", user.id)
          .single();

        if (profile) {
          if (!cancelled) {
            setUserRole(profile.role);
            setUserName(profile.full_name || "");
          }
        }

        // Fetch user's screenings
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/patients?created_by=${user.id}`);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        
        const data: PatientRecord[] = await res.json();
        
        if (!cancelled) {
          // Sort by newest first
          const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setScreenings(sorted);
          if (sorted.length > 0) {
            setSelectedId(String(sorted[0].id));
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? `Could not load data: ${err.message}`
              : "Something went wrong."
          );
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // When selected screening changes, reset chat
  useEffect(() => {
    setMessages([]);
    setChatError(null);
  }, [selectedId]);

  async function handleSendChat(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading || !selectedId) return;

    const question = chatInput.trim();
    setChatInput("");
    setChatError(null);
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: selectedId, question }),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      const data = await res.json();
      const answer = data.answer || data.response || data.message || "No response provided.";
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch (err) {
      setChatError("Failed to send message. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  const initials = userName 
    ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : (userRole === 'doctor' ? 'DR' : 'PT');

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 flex w-64 flex-col border-r border-slate-200 bg-white z-20">
        <div className="flex h-16 items-center px-6">
          <Link href={userRole === 'doctor' ? "/dashboard" : "/my-results"} className="text-xl font-bold tracking-tight text-sky-700">
            <Image src="/logo.png" alt="CKD One Logo" width={120} height={50} priority className="object-contain" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {userRole === 'doctor' ? (
            <>
              <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Overview
              </Link>
              <Link href="/screening" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                Screening
              </Link>
              <Link href="/patients" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Patients
              </Link>
              <Link href="/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </Link>
            </>
          ) : (
            <>
              <Link href="/my-results" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                My Results
              </Link>
              <Link href="/screening" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Screening
              </Link>
              <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-400 cursor-not-allowed">
                <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Reports
              </div>
            </>
          )}

          <Link href="/assistant" className="flex items-center gap-3 rounded-md bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
            <svg className="h-5 w-5 opacity-75" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI Assistant
          </Link>
          
          <Link href="/history" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </Link>
        </nav>
        
        <div className="px-3 pb-4">
          <div className="mb-2 space-y-1">
             <Link href="/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
             </Link>
             <Link href="/help" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900">
                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Help
             </Link>
          </div>

          <div className="flex items-center justify-between px-2 pb-2">
            <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
             <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                   {initials}
                </div>
                <div className="flex flex-col truncate">
                   <span className="truncate text-sm font-semibold text-slate-900">{userName || 'User'}</span>
                   <span className="truncate text-xs text-slate-500">
                     {userRole === 'doctor' ? 'Nephrologist' : 'Patient'}
                   </span>
                </div>
             </div>
             <button
               onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
               className="p-1 text-slate-400 hover:text-slate-600 transition"
               title="Log out"
             >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
          <div className="flex flex-1 items-center gap-4">
             <div className="relative w-full max-w-md">
                <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                   type="text"
                   placeholder="Search..."
                   className="w-full rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                />
             </div>
          </div>
          <div className="flex items-center gap-4 ml-4">
             <button className="relative text-slate-400 hover:text-slate-600 transition">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
             </button>
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                {initials}
             </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
           <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  AI Assistant
                </h1>
                <p className="mt-1 text-sm text-slate-500">Ask questions and explore CKD insights based on your screening results.</p>
              </div>
           </div>

           {loading ? (
             <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 shadow-sm">
               <p className="text-sm text-slate-500">Loading screenings…</p>
             </div>
           ) : error ? (
             <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
               {error}
             </div>
           ) : screenings.length === 0 ? (
             <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
               <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               <h2 className="mt-4 text-lg font-semibold text-slate-900">No screenings available</h2>
               <p className="mt-2 text-sm text-slate-500">Complete a screening first to chat about your results.</p>
               <Link
                 href="/screening"
                 className="mt-6 rounded-lg bg-sky-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
               >
                 Start a Screening
               </Link>
             </div>
           ) : (
             <div className="flex flex-col gap-6 max-w-4xl">
               <div className="flex flex-col gap-2">
                 <label htmlFor="screening-select" className="text-sm font-medium text-slate-700">
                   Select a screening to discuss
                 </label>
                 <select
                   id="screening-select"
                   value={selectedId}
                   onChange={(e) => setSelectedId(e.target.value)}
                   className="w-full sm:max-w-md rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                 >
                   <option value="" disabled>Select...</option>
                   {screenings.map((s) => (
                     <option key={s.id} value={s.id}>
                       {s.patient_name || "Unnamed"} - {formatDate(s.created_at)}
                     </option>
                   ))}
                 </select>
               </div>

               {selectedId && (
                 <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                   <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                     <h3 className="font-semibold text-slate-900">Chat Session</h3>
                   </div>
                   <div className="flex max-h-[500px] min-h-[300px] flex-col overflow-y-auto p-6">
                     {messages.length === 0 ? (
                       <div className="flex flex-1 items-center justify-center text-center">
                         <p className="text-sm text-slate-500">
                           Ask a question about this screening. For example:<br/>
                           <span className="italic">"Why was the risk score so high?"</span> or <span className="italic">"What does specific gravity mean?"</span>
                         </p>
                       </div>
                     ) : (
                       <div className="flex flex-col gap-4">
                         {messages.map((msg, i) => {
                           const isUser = msg.role === "user";
                           return (
                             <div
                               key={i}
                               className={`flex w-max max-w-[85%] flex-col rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                 isUser
                                   ? "self-end bg-sky-600 text-white"
                                   : "self-start bg-slate-100 shadow-sm"
                               }`}
                             >
                               {isUser ? (
                                 msg.text
                               ) : (
                                 <div className="prose prose-sm prose-slate max-w-none">
                                   <ReactMarkdown>
                                     {msg.text}
                                   </ReactMarkdown>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                         {chatLoading && (
                           <div className="self-start rounded-2xl bg-slate-100 px-4 py-2.5 text-sm text-slate-500 shadow-sm">
                             Thinking…
                           </div>
                         )}
                         {chatError && (
                           <div className="self-center text-xs text-red-500">
                             {chatError}
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                   <div className="border-t border-slate-100 bg-slate-50 p-4">
                     <form onSubmit={handleSendChat} className="flex gap-3">
                       <input
                         type="text"
                         value={chatInput}
                         onChange={(e) => setChatInput(e.target.value)}
                         placeholder="Type your question..."
                         className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                         disabled={chatLoading}
                       />
                       <button
                         type="submit"
                         disabled={!chatInput.trim() || chatLoading}
                         className="inline-flex items-center justify-center rounded-full bg-sky-600 px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                         Send
                       </button>
                     </form>
                     <p className="mt-2 text-center text-[10px] text-slate-400">
                       This assistant explains your screening result and provides general CKD education. It cannot diagnose or recommend treatment.
                     </p>
                   </div>
                 </div>
               )}
             </div>
           )}
        </main>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <AuthGuard>
      <AssistantContent />
    </AuthGuard>
  );
}
