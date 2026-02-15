import React, { useState, useEffect } from "react";
import { X, Share, Users, Mail, Lock, Search } from "lucide-react";
import { fetchWithAuth } from "../../../utils/api";
import styles from "./ShareDocumentsModal.module.css";

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Props {
  mode: "client" | "internal" | null;   // IMPORTANT
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

  const [activeTab, setActiveTab] = useState<"internal" | "email">("internal");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // 🔎 SEARCH + DEBOUNCE
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // load users when open
  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen, debouncedSearch, activeTab, mode]);

  const finalMode = mode || activeTab;

  const loadUsers = async () => {
    try {
      setLoading(true);

      let url = "/api/users?";

      if (finalMode === "client") {
        url += "type=client";
      } else {
        url += "type=internal";
      }

      if (debouncedSearch) {
        url += `&search=${encodeURIComponent(debouncedSearch)}`;
      }

      const res = await fetchWithAuth(url);

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || data);
      }
    } catch (err) {
      console.error("load users failed", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
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
        setSelectedUsers([]);
      }
    } catch (err) {
      console.error("share error", err);
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* HEADER */}
        <div className={styles.header}>
          <h3>
            <Share size={18} /> Share Documents ({documentIds.length})
          </h3>
          <button onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* TABS (only if not forced mode) */}
        {!forcedMode && (
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${
                activeTab === "internal" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("internal")}
            >
              <Users size={16} /> Internal Team
            </button>

            <button
              className={`${styles.tab} ${
                activeTab === "email" ? styles.activeTab : ""
              }`}
              onClick={() => setActiveTab("email")}
            >
              <Mail size={16} /> External Email
            </button>
          </div>
        )}

        {/* CONTENT */}
        <div className={styles.content}>
          {finalMode !== "email" && (
            <>
              {/* SEARCH */}
              <div className={styles.searchBox}>
                <Search size={14} />
                <input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* USERS */}
              {loading ? (
                <div className={styles.loading}>Loading users...</div>
              ) : (
                <div className={styles.userList}>
                  {users.map((u) => (
                    <label key={u.id} className={styles.userItem}>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                      />
                      <div>
                        <div>
                          {u.first_name} {u.last_name}
                        </div>
                        <div className={styles.email}>{u.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <button onClick={onClose}>Cancel</button>

          <button
            className={styles.shareBtn}
            onClick={handleShare}
            disabled={sharing || selectedUsers.length === 0}
          >
            {sharing ? "Sharing..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareDocumentsModal;
