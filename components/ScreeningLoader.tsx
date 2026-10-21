"use client";

import React, { useEffect, useState } from "react";

const SCREENING_MESSAGES = [
  "Reading your values...",
  "Running the risk model...",
  "Calculating contributing factors...",
  "Checking explanation stability...",
  "Writing your plain-English summary...",
];

const UPLOAD_MESSAGES = [
  "Uploading report...",
  "Extracting lab values...",
  "Auto-filling form...",
];

export function ScreeningOverlay({ isOpen }: { isOpen: boolean }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setIndex(0);
      return;
    }

    setIndex(0);
    const interval = setInterval(() => {
      setIndex((prev) => {
        if (prev < SCREENING_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all"
    >
      <div className="flex w-full max-w-sm flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-2xl">
        {/* Pulsing & spinning ring */}
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-sky-500/20 dark:bg-sky-400/20 animate-ping" />
          <div className="h-14 w-14 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-sky-600 dark:border-t-sky-400 animate-spin" />
        </div>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Analyzing Assessment
        </h3>

        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 min-h-[1.5rem] transition-opacity duration-300">
          {SCREENING_MESSAGES[index]}
        </p>

        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Please keep this window open while we compute your risk estimate.
        </p>
      </div>
    </div>
  );
}

export function UploadLoader({ isUploading }: { isUploading: boolean }) {
  const [index, setIndex] = useState(0);
  const [showSlowNotice, setShowSlowNotice] = useState(false);

  useEffect(() => {
    if (!isUploading) {
      setIndex(0);
      setShowSlowNotice(false);
      return;
    }

    setIndex(0);
    setShowSlowNotice(false);

    const messageInterval = setInterval(() => {
      setIndex((prev) => {
        if (prev < UPLOAD_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2000);

    const slowTimer = setTimeout(() => {
      setShowSlowNotice(true);
    }, 8000);

    return () => {
      clearInterval(messageInterval);
      clearTimeout(slowTimer);
    };
  }, [isUploading]);

  if (!isUploading) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-2 text-center"
    >
      <div className="relative mb-3 flex h-10 w-10 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-sky-500/20 dark:bg-sky-400/20 animate-ping" />
        <div className="h-8 w-8 rounded-full border-2 border-slate-200 dark:border-slate-800 border-t-sky-600 dark:border-t-sky-400 animate-spin" />
      </div>

      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        {UPLOAD_MESSAGES[index]}
      </p>

      {showSlowNotice && (
        <p className="mt-2 max-w-xs text-xs font-normal text-amber-600 dark:text-amber-400 transition-opacity duration-300">
          Server is waking up, this can take up to a minute on first use.
        </p>
      )}
    </div>
  );
}

export default ScreeningOverlay;
