import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Share2, Users, UserPlus, Search, ArrowLeft, Loader2, Mail, ShieldCheck, AlertCircle } from "lucide-react";
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

  const [step, setStep] = useState<"type" | "users" | "method" | "email-config">(mode ? "users" : "type");
  const [shareType, setShareType] = useState<"internal" | "client">(mode || "internal");
  const [shareMethod, setShareMethod] = useState<"system" | "email">("system");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
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
    setPassword("");
    setPasswordError("");
    setShareMethod("system");

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

  const toggleUser = (user: User) => {
    setSelectedUsers(prev =>
      prev.find(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) return;

    if (shareMethod === "email" && !password) {
      setPasswordError("Password is required for email sharing");
      return;
    }

    try {
      setSharing(true);

      if (shareMethod === "system") {
        // Internal/System sharing
        const res = await fetchWithAuth("/api/documents/share", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            document_ids: documentIds,
            user_ids: selectedUsers.map(u => u.id),
          }),
        });

        if (res.ok) {
          onShare();
          onClose();
        }
      } else {
        // Email sharing (External)
        const sharePromises = selectedUsers.map(user => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!user.email || !emailRegex.test(user.email)) {
            throw new Error(`Invalid email for ${user.first_name} ${user.last_name}: ${user.email}`);
          }

          return fetchWithAuth("/api/documents/share/external/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              document_ids: documentIds.map(id => parseInt(id)),
              email: user.email,
              password: password,
              expires_in_days: 7
            }),
          });
        });

        const results = await Promise.all(sharePromises);
        const allOk = results.every(res => res.ok);

        if (allOk) {
          onShare();
          onClose();
        } else {
          console.error("Some email shares failed");
        }
      }
    } catch (err: any) {
      console.error("Sharing failed:", err);
      alert(err.message || "Sharing failed. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.iconWrapper}>
              <Share2 size={20} />
            </div>
            <div className={styles.headerText}>
              <h3>Share Documents</h3>
              <p className={styles.headerSubtitle}>
                {documentIds.length} item{documentIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
<button
  onClick={() => !sharing && onClose()}
  className={styles.closeButton}
>
  <X size={20} />
</button>

        </div>

        {/* BODY */}
        <div className={styles.body}>
          {/* STEP 1: SELECT TYPE */}
          {step === "type" && !forcedMode && (
            <div className={styles.typeStep}>
              <p className={styles.stepLabel}>Select share destination</p>

              <button
                onClick={() => { setShareType("internal"); setStep("users"); }}
                className={styles.typeCard}
              >
                <div className={styles.typeIcon}>
                  <Users size={22} />
                </div>
                <div className={styles.typeInfo}>
                  <strong>Internal Team</strong>
                  <p>Collaborate with members within your organization</p>
                </div>
              </button>

              <button
                onClick={() => { setShareType("client"); setStep("users"); }}
                className={styles.typeCard}
              >
                <div className={styles.typeIcon}>
                  <UserPlus size={22} />
                </div>
                <div className={styles.typeInfo}>
                  <strong>Client Users</strong>
                  <p>Share with client administrators</p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 2: SELECT USERS */}
          {step === "users" && (
            <div className={styles.userStep}>
              <div className={styles.searchContainer}>
                <div className={styles.searchWrapper}>
                  <Search className={styles.searchIcon} size={16} />
                  <input
                    autoFocus
                    placeholder="Search users..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              <div className={styles.userList}>
                {loading ? (
                  <div className={styles.loadingState}>
                    <Loader2 className={styles.loadingIcon} size={24} />
                    <span>Loading users...</span>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No users found.</p>
                  </div>
                ) : (
                  filteredUsers.map(u => (
                    <label
                      key={u.id}
                      className={`${styles.userItem} ${selectedUsers.find(su => su.id === u.id) ? styles.selectedUserItem : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={!!selectedUsers.find(su => su.id === u.id)}
                        onChange={() => toggleUser(u)}
                      />
                      <div className={styles.userDetails}>
                        <div className={styles.userName}>
                          {u.first_name} {u.last_name}
                        </div>
                        <div className={styles.userEmail}>
                          <Mail size={12} /> {u.email}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SELECT METHOD */}
          {step === "method" && (
            <div className={styles.methodStep}>
              <p className={styles.stepLabel}>How would you like to share?</p>

              <button
                onClick={() => setShareMethod("system")}
                className={`${styles.methodCard} ${shareMethod === "system" ? styles.selectedMethodCard : ""}`}
              >
                <div className={styles.methodIcon}>
                  <ShieldCheck size={22} />
                </div>
                <div className={styles.methodInfo}>
                  <strong>In System</strong>
                  <p>Documents will appear in the user's dashboard</p>
                </div>
              </button>

              <button
                onClick={() => setShareMethod("email")}
                className={`${styles.methodCard} ${shareMethod === "email" ? styles.selectedMethodCard : ""}`}
              >
                <div className={styles.methodIcon}>
                  <Mail size={22} />
                </div>
                <div className={styles.methodInfo}>
                  <strong>Over Email</strong>
                  <p>Send a secure password-protected link via email</p>
                </div>
              </button>
            </div>
          )}

          {/* STEP 4: EMAIL CONFIG */}
          {step === "email-config" && (
            <div className={styles.emailConfigStep}>
              <p className={styles.stepLabel}>Secure Email Sharing</p>
              <div className={styles.emailForm}>
                <div className={styles.formField}>
                  <label>Secure Password</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Set a password for the users..."
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      if (e.target.value) setPasswordError("");
                    }}
                  />
                  {passwordError && (
                    <span className={styles.errorText}>
                      <AlertCircle size={12} /> {passwordError}
                    </span>
                  )}
                  <p className={styles.headerSubtitle}>
                    Users will need this password to access the documents.
                  </p>
                </div>
              </div>

              <div className={styles.userDetails}>
                <p className={styles.headerSubtitle} style={{ marginTop: '16px' }}>Sharing with {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}:</p>
                <div className={styles.userList} style={{ maxHeight: '100px', overflowY: 'auto', border: 'none' }}>
                  {selectedUsers.map(u => (
                    <div key={u.id} className={styles.userEmail} style={{ padding: '4px 0' }}>
                      <Mail size={10} /> {u.email}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            {step === "users" && !forcedMode && (
              <button
                className={styles.backButton}
                onClick={() => setStep("type")}
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
            {step === "method" && (
              <button
                className={styles.backButton}
                onClick={() => setStep("users")}
              >
                <ArrowLeft size={16} /> Back to Users
              </button>
            )}
            {step === "email-config" && (
              <button
                className={styles.backButton}
                onClick={() => setStep("method")}
              >
                <ArrowLeft size={16} /> Back
              </button>
            )}
          </div>

          <div className={styles.footerActions}>
<button
  onClick={onClose}
  disabled={sharing}
  className={styles.cancelButton}
>
  Cancel
</button>


            {step === "users" ? (
              <button
                disabled={selectedUsers.length === 0 || sharing}
                onClick={() => setStep("method")}
                className={styles.continueButton}
              >
                Continue
              </button>
            ) : step === "method" ? (
             <button
  onClick={() => {
    if (shareMethod === "system") {
      handleShare();
    } else {
      setStep("email-config");
    }
  }}
  disabled={sharing}
  className={styles.shareButton}
>
  {sharing ? (
    <>
      <Loader2 className={styles.loadingIcon} size={16} />
      <span>Sharing...</span>
    </>
  ) : shareMethod === "system" ? (
    <>
      <ShieldCheck size={16} />
      <span>Share in System</span>
    </>
  ) : (
    <>
      <span>Continue to Config</span>
      <ArrowLeft style={{ transform: "rotate(180deg)" }} size={16} />
    </>
  )}
</button>

            ) : step === "email-config" ? (
             <button
  onClick={handleShare}
  disabled={sharing || !password}
  className={styles.shareButton}
>
  {sharing ? (
    <>
      <Loader2 className={styles.loadingIcon} size={16} />
      <span>Sharing...</span>
    </>
  ) : (
    <>
      <ShieldCheck size={16} />
      <span>Share Over Email</span>
    </>
  )}
</button>

            ) : null}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ShareDocumentsModal;
