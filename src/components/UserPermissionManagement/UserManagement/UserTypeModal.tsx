import React, { useState, useEffect } from "react";
import { X, User, Briefcase, ChevronRight } from "lucide-react";

/**
 * Types and Interfaces
 */
type UserType = "internal" | "client";

interface UserTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (type: UserType) => void;
}

/**
 * Production-ready User Type Selection Modal
 * Features:
 * - Functional close (X) button and backdrop dismissal
 * - Disabled "Continue" state until selection is made
 * - Standard CSS transitions (no external animation libraries)
 * - Accessibility (A11y) and responsive design
 */
export const UserTypeModal: React.FC<UserTypeModalProps> = ({
  isOpen,
  onClose,
  onNext,
}) => {
  // Set initial state to null so user is forced to make a choice
  const [selectedType, setSelectedType] = useState<UserType | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Sync animation state and reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      setSelectedType(null); 
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isOpen]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if the backdrop itself was clicked, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNext = () => {
    if (selectedType) {
      onNext(selectedType);
    }
  };

  // If modal is not open and not in the middle of closing animation, don't render
  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ease-out ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ 
        backgroundColor: "rgba(0, 0, 0, 0.5)", 
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)" // Support for Safari
      }}
      onClick={handleBackdropClick}
      onTransitionEnd={() => {
        if (!isOpen) setIsAnimating(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className={`w-full max-w-md overflow-hidden bg-white rounded-2xl shadow-2xl dark:bg-slate-900 transform transition-all duration-300 ease-out ${
          isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        onClick={(e) => e.stopPropagation()} // Extra safety to prevent backdrop click trigger
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2
            id="modal-title"
            className="text-xl font-semibold text-slate-800 dark:text-white"
          >
            Select User Type
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Choose the account type that best describes your role to continue
            the setup process.
          </p>

          <div className="grid gap-4">
            {/* Internal User Option */}
            <button
              type="button"
              onClick={() => setSelectedType("internal")}
              className={`flex items-start gap-4 p-4 text-left transition-all border-2 rounded-xl group outline-none focus:ring-2 focus:ring-blue-500/50 ${
                selectedType === "internal"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
              }`}
            >
              <div
                className={`p-3 rounded-lg transition-colors ${
                  selectedType === "internal"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700"
                }`}
              >
                <User size={24} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 dark:text-white">
                  Internal User
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Access company tools, dashboards, and internal resources.
                </div>
              </div>
              <div className="mt-1 flex-shrink-0">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedType === "internal"
                      ? "border-blue-500"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {selectedType === "internal" && (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            </button>

            {/* Client User Option */}
            <button
              type="button"
              onClick={() => setSelectedType("client")}
              className={`flex items-start gap-4 p-4 text-left transition-all border-2 rounded-xl group outline-none focus:ring-2 focus:ring-blue-500/50 ${
                selectedType === "client"
                  ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                  : "border-slate-100 dark:border-slate-800 hover:border-slate-200"
              }`}
            >
              <div
                className={`p-3 rounded-lg transition-colors ${
                  selectedType === "client"
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:text-slate-700"
                }`}
              >
                <Briefcase size={24} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-slate-800 dark:text-white">
                  Client User
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  View projects, approve deliverables, and communicate with the team.
                </div>
              </div>
              <div className="mt-1 flex-shrink-0">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selectedType === "client"
                      ? "border-blue-500"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {selectedType === "client" && (
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  )}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium transition-colors rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!selectedType}
            className={`flex items-center gap-2 px-6 py-2 text-sm font-medium text-white transition-all rounded-lg shadow-lg ${
              selectedType
                ? "bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-500/20"
                : "bg-slate-300 cursor-not-allowed shadow-none"
            }`}
          >
            Continue
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-slate-100 p-4">
      <h1 className="text-2xl font-bold text-slate-800">Registration Flow</h1>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-xl shadow-lg hover:bg-blue-700 transition-all"
      >
        Open User Selection
      </button>

      <UserTypeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onNext={(type) => {
          console.log("Selected type:", type);
          setIsOpen(false);
        }}
      />
    </div>
  );
}