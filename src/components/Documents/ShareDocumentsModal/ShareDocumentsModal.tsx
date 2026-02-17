// import React, { useState, useEffect } from "react";
// import { X, Share, Users, Mail, Lock, Search } from "lucide-react";
// import { fetchWithAuth } from "../../../utils/api";
// import styles from "./ShareDocumentsModal.module.css";
// import authService from "../../../services/auth.service";

// interface User {
//   id: string;
//   first_name: string;
//   last_name: string;
//   email: string;
// }

// interface Props {
//   mode: "client" | "internal" | null;   // IMPORTANT
//   isOpen: boolean;
//   onClose: () => void;
//   documentIds: string[];
//   onShare: () => void;
// }

// const ShareDocumentsModal: React.FC<Props> = ({
//   mode,
//   isOpen,
//   onClose,
//   documentIds,
//   onShare,
// }) => {
//   const forcedMode = mode !== null;

//   const [activeTab, setActiveTab] = useState<"internal" | "email">("internal");
//   const [users, setUsers] = useState<User[]>([]);
//   const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [sharing, setSharing] = useState(false);

//   // 🔎 SEARCH + DEBOUNCE
//   const [search, setSearch] = useState("");
//   const [debouncedSearch, setDebouncedSearch] = useState("");

//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedSearch(search), 400);
//     return () => clearTimeout(t);
//   }, [search]);

//   // load users when open
//   useEffect(() => {
//     if (isOpen) {
//       loadUsers();
//     }
//   }, [isOpen, debouncedSearch, activeTab, mode]);
// useEffect(() => {
//   if (!isOpen) {
//     setUsers([]);
//     setSelectedUsers([]);
//     setSearch("");
//     setActiveTab("internal");   // reset
//   }
// }, [isOpen]);

// const finalMode = forcedMode ? mode : activeTab;

// const loadUsers = async () => {
//   try {
//     setLoading(true);

//     let url = "/api/users/share/users?";

//     if (finalMode === "internal") {
//       url += "is_client=false";
//     }

//     if (finalMode === "client") {
//       url += "is_client=true";
//     }

//     if (debouncedSearch) {
//       url += `&search=${encodeURIComponent(debouncedSearch)}`;
//     }

//     const res = await fetchWithAuth(url);

//     if (res.ok) {
//       const data = await res.json();

//       if (Array.isArray(data.users)) {
//         setUsers(data.users);
//       } else {
//         setUsers([]);
//       }
//     }
//   } catch (err) {
//     console.error("load users failed", err);
//     setUsers([]);
//   } finally {
//     setLoading(false);
//   }
// };


//   const toggleUser = (id: string) => {
//     setSelectedUsers((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const handleShare = async () => {
//     if (selectedUsers.length === 0) return;

//     try {
//       setSharing(true);

//       const res = await fetchWithAuth("/api/documents/share", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           document_ids: documentIds,
//           user_ids: selectedUsers,
//         }),
//       });

//       if (res.ok) {
//         onShare();
//         onClose();
//         setSelectedUsers([]);
//       }
//     } catch (err) {
//       console.error("share error", err);
//     } finally {
//       setSharing(false);
//     }
//   };

//   if (!isOpen) return null
//   return (
//     <div className={styles.overlay}>
//       <div className={styles.modal}>
//         {/* HEADER */}
//         <div className={styles.header}>
//           <h3>
//             <Share size={18} /> Share Documents ({documentIds.length})
//           </h3>
//           <button onClick={onClose}>
//             <X size={20} />
//           </button>
//         </div>

//         {/* TABS (only if not forced mode) */}
//         {!forcedMode && (
//           <div className={styles.tabs}>
//             <button
//               className={`${styles.tab} ${
//                 activeTab === "internal" ? styles.activeTab : ""
//               }`}
//               onClick={() => setActiveTab("internal")}
//             >
//               <Users size={16} /> Internal Team
//             </button>

//             <button
//               className={`${styles.tab} ${
//                 activeTab === "email" ? styles.activeTab : ""
//               }`}
//               onClick={() => setActiveTab("email")}
//             >
//               <Mail size={16} /> External Email
//             </button>
//           </div>
//         )}

//         {/* CONTENT */}
//         <div className={styles.content}>
//           {finalMode !== "email" && (
//             <>
//               {/* SEARCH */}
//               <div className={styles.searchBox}>
//                 <Search size={14} />
//                 <input
//                   placeholder="Search users..."
//                   value={search}
//                   onChange={(e) => setSearch(e.target.value)}
//                 />
//               </div>

//               {/* USERS */}
//               {loading ? (
//                 <div className={styles.loading}>Loading users...</div>
//               ) : (
//                 <div className={styles.userList}>
//                   {users.map((u) => (
//                     <label key={u.id} className={styles.userItem}>
//                       <input
//                         type="checkbox"
//                         checked={selectedUsers.includes(u.id)}
//                         onChange={() => toggleUser(u.id)}
//                       />
//                       <div>
//                         <div>
//                           {u.first_name} {u.last_name}
//                         </div>
//                         <div className={styles.email}>{u.email}</div>
//                       </div>
//                     </label>
//                   ))}
//                 </div>
//               )}
//             </>
//           )}
//         </div>

//         {/* FOOTER */}
//         <div className={styles.footer}>
//           <button onClick={onClose}>Cancel</button>

//           <button
//             className={styles.shareBtn}
//             onClick={handleShare}
//             disabled={sharing || selectedUsers.length === 0}
//           >
//             {sharing ? "Sharing..." : "Share"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ShareDocumentsModal;

import React, { useState, useEffect, useMemo } from "react";
import { X, Share2, Users, UserPlus, Search, ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { fetchWithAuth } from "../../../utils/api";
import styles from "./ShareDocumentsModal.module.css";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Props {
  mode: "client" | "internal" | null;
  isOpen: boolean;
  onClose: () => void;
  documentIds: string[];
  onShare: () => void;
}

const ShareDocumentsModal: React.FC<Props> = ({
  mode,
  isOpen,
  onClose,
  documentIds,
  onShare,
}) => {
  const forcedMode = mode !== null;

  const [step, setStep] = useState<"type" | "users">(mode ? "users" : "type");
  const [shareType, setShareType] = useState<"internal" | "client">(mode || "internal");


  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

useEffect(() => {
  if (!isOpen) return;

  setUsers([]);
  setSelectedUsers([]);
  setSearch("");

  if (mode) {
    setStep("users");
    setShareType(mode);
  } else {
    setStep("type");
    setShareType("internal");
  }
}, [isOpen, mode]);



  useEffect(() => {
    if (isOpen && step === "users") loadUsers();
  }, [isOpen, step, debouncedSearch, shareType]);

  const loadUsers = async () => {
    try {
      setLoading(true);

      let url = "/api/users/share/users?";
      url += shareType === "client" ? "is_client=true" : "is_client=false";

      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (err) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setSharing(true);

      const res = await fetchWithAuth("/api/documents/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_ids: documentIds,
          user_ids: selectedUsers,
        }),
      });

      if (res.ok) {
        onShare();
        onClose();
      }
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>

        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Share2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                Share Documents
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {documentIds.length} item{documentIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto min-h-[350px]">
          
          {/* STEP 1: SELECT TYPE */}
          {step === "type" && !forcedMode && (
            <div className="p-6 space-y-4 animate-in slide-in-from-right-4 duration-300">
              <p className="text-sm text-slate-500 mb-2 font-medium uppercase tracking-wider">Select share destination</p>
              
              <button
                onClick={() => { setShareType("internal"); setStep("users"); }}
                className="w-full group flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left"
              >
                <div className="mt-1 p-2.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 rounded-lg transition-colors">
                  <Users size={22} />
                </div>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-base">Internal Team</strong>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Collaborate with members within your organization</p>
                </div>
              </button>

              <button
                onClick={() => { setShareType("client"); setStep("users"); }}
                className="w-full group flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all text-left"
              >
                <div className="mt-1 p-2.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 rounded-lg transition-colors">
                  <UserPlus size={22} />
                </div>
                <div>
                  <strong className="block text-slate-900 dark:text-white text-base">Client Users</strong>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Share with client administrators</p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: SELECT USERS */}
          {step === "users" && (
            <div className="flex flex-col h-full animate-in slide-in-from-right-4 duration-300">
              
              <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16}/>
                  <input
                    autoFocus
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="px-2 py-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 italic">
                    <Loader2 className="animate-spin mb-2" size={24} />
                    <span className="text-sm font-medium">Loading users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <p className="text-slate-400 text-sm italic">No users found.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredUsers.map(u => (
                      <label 
                        key={u.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 group ${
                          selectedUsers.includes(u.id) ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all cursor-pointer accent-indigo-600"
                          checked={selectedUsers.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {u.first_name} {u.last_name}
                          </div>
                          <div className="text-xs text-slate-500 truncate flex items-center gap-1">
                            <Mail size={12} className="opacity-70" /> {u.email}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex items-center justify-between gap-3">
          <div className="flex items-center">
            {step === "users" && !forcedMode && (
              <button 
                className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                onClick={() => setStep("type")}
              >
                <ArrowLeft size={16}/> Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleShare}
              disabled={sharing || selectedUsers.length === 0}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all shadow-sm
                ${selectedUsers.length > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}
              `}
            >
              {sharing ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Share {selectedUsers.length > 0 && `(${selectedUsers.length})`}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
//     <div className={styles.overlay}>
//       <div className={styles.modal}>

//         {/* HEADER */}
//         <div className={styles.header}>
//           <h3><Share2 size={18}/> Share Documents ({documentIds.length})</h3>
//           <button onClick={onClose}><X size={20}/></button>
//         </div>

//         {/* STEP 1 — TYPE */}
//         {step === "type" &&  !forcedMode &&(
//           <div className={styles.typeContainer}>
//             <button
//               className={styles.typeCard}
//               onClick={() => { setShareType("internal"); setStep("users"); }}
//             >
//               <Users size={22}/>
//               <div>
//                 <strong>Internal Team</strong>
//                 <p>Share with organization users</p>
//               </div>
//             </button>

//             <button
//               className={styles.typeCard}
//               onClick={() => { setShareType("client"); setStep("users"); }}
//             >
//               <UserPlus size={22}/>
//               <div>
//                 <strong>Client Users</strong>
//                 <p>Share with client admins</p>
//               </div>
//             </button>
//           </div>
//         )}

//         {/* STEP 2 — USERS */}

//         {/* FOOTER */}
//         <div className={styles.footer}>

//         {step === "users"  && !forcedMode &&  (
//           <>
//               <button className={styles.backBtn} onClick={() => setStep("type")}>
//                 <ArrowLeft size={14}/> Back
//               </button>

//             <div className={styles.searchBox}>
//               <Search size={14}/>
//               <input
//                 placeholder="Search users..."
//                 value={search}
//                 onChange={e => setSearch(e.target.value)}
//               />
//             </div>

//             <div className={styles.content}>
//               {loading ? (
//                 <div className={styles.loading}>Loading...</div>
//               ) : (
//                 <div className={styles.userList}>
//                   {users.map(u => (
//                     <label key={u.id} className={styles.userItem}>
//                       <input
//                         type="checkbox"
//                         checked={selectedUsers.includes(u.id)}
//                         onChange={() => toggleUser(u.id)}
//                       />
//                       <div>
//                         <div>{u.first_name} {u.last_name}</div>
//                         <div className={styles.email}>{u.email}</div>
//                       </div>
//                     </label>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </>
//         )}
//           <button onClick={onClose}>Cancel</button>

//           <button
//             className={styles.shareBtn}
//             onClick={handleShare}
//             disabled={sharing || selectedUsers.length === 0}
//           >
//             {sharing ? "Sharing..." : "Share"}
//           </button>
//         </div>

//       </div>
//     </div>
//   );
};

export default ShareDocumentsModal;

