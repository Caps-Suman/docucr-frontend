import { useState } from "react";

type UserType = "internal" | "client";

interface UserTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNext: (type: UserType) => void;
}

export const UserTypeModal: React.FC<UserTypeModalProps> = ({
  isOpen,
  onClose,
  onNext,
}) => {
  const [type, setType] = useState<UserType>("internal");

  if (!isOpen) return null;

  return (
    <div className="modalOverlay">
      <div className="modalContent">
        <h2>Select User Type</h2>

        <label>
          <input
            type="radio"
            checked={type === "internal"}
            onChange={() => setType("internal")}
          />
          Internal User
        </label>

        <label>
          <input
            type="radio"
            checked={type === "client"}
            onChange={() => setType("client")}
          />
          Client User
        </label>

        <div style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onNext(type)}>Next</button>
        </div>
      </div>
    </div>
  );
};
