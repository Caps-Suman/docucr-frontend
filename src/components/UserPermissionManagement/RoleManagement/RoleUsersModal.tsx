import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, Search, User, Loader2 } from 'lucide-react';
import styles from './RoleManagement.module.css';
import roleService, { RoleUser } from '../../../services/role.service';
import CommonPagination from '../../Common/CommonPagination';

interface RoleUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    roleId: string;
    roleName: string;
}

const RoleUsersModal: React.FC<RoleUsersModalProps> = ({
    isOpen,
    onClose,
    roleId,
    roleName
}) => {
    const [users, setUsers] = useState<RoleUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        if (isOpen && roleId) {
            fetchUsers();
        } else {
            setUsers([]);
            setSearchTerm('');
            setCurrentPage(0);
        }
    }, [isOpen, roleId, currentPage, pageSize, debouncedSearch]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await roleService.getRoleUsers(roleId, currentPage + 1, pageSize, debouncedSearch);
            setUsers(data.items);
            setTotal(data.total);
        } catch (error) {
            console.error("Failed to fetch role users:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div className={styles.headerTitle}>
                        <div className={styles.iconWrapper}>
                            <User size={20} className={styles.headerIcon} />
                        </div>
                        <div className={styles.headerText}>
                            <h3>Mapped users</h3>
                            <p className={styles.headerSubtitle}>Role: {roleName}</p>
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    <div className={styles.searchContainer}>
                        <Search className={styles.searchIcon} size={16} />
                        <input
                            type="text"
                            placeholder="Search by name, email or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.listContainer}>
                        {loading ? (
                            <div className={styles.loadingState}>
                                <Loader2 className={styles.spinner} size={24} />
                                <p>Loading users...</p>
                            </div>
                        ) : users.length === 0 ? (
                            <div className={styles.emptyState}>
                                <p>No users found mapped to this role.</p>
                            </div>
                        ) : (
                            <table className={styles.usersTable}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Phone</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.phone || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <CommonPagination
                        show={total > 0}
                        pageCount={Math.ceil(total / pageSize)}
                        currentPage={currentPage}
                        onPageChange={({ selected }) => setCurrentPage(selected)}
                        totalItems={total}
                        itemsPerPage={pageSize}
                        onItemsPerPageChange={(newSize) => {
                            setPageSize(newSize);
                            setCurrentPage(0);
                        }}
                        renderInPlace={true}
                    />
                </div>
            </div>
        </div>,
        document.body
    );
};

export default RoleUsersModal;
