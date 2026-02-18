import React, { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import Toast, { ToastType } from '../../Common/Toast';
import Loading from '../../Common/Loading';
import webhookService, { WebhookConfig } from '../../../services/webhook.service';
import styles from './WebhookSettings.module.css';

const WebhookSettings: React.FC = () => {
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [newWebhook, setNewWebhook] = useState<Partial<WebhookConfig>>({
        name: '',
        url: '',
        events: [],
        is_active: true
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const availableEvents = [
        'document.uploaded',
        'document.processed',
        'document.failed',
        'document.deleted'
    ];

    useEffect(() => {
        loadWebhooks();
    }, []);

    const loadWebhooks = async () => {
        try {
            const data = await webhookService.getWebhooks();
            setWebhooks(data);
        } catch (err) {
            setToast({ message: 'Failed to load webhooks', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!newWebhook.name || !newWebhook.url) {
            setToast({ message: 'Name and URL are required', type: 'error' });
            return;
        }

        try {
            if (editingId) {
                await webhookService.updateWebhook(editingId, newWebhook);
                setToast({ message: 'Webhook updated successfully', type: 'success' });
            } else {
                await webhookService.createWebhook(newWebhook);
                setToast({ message: 'Webhook added successfully', type: 'success' });
            }
            setShowForm(false);
            setEditingId(null);
            setNewWebhook({ name: '', url: '', events: [], is_active: true });
            loadWebhooks();
        } catch (err) {
            setToast({ message: 'Failed to save webhook', type: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this webhook?')) return;
        try {
            await webhookService.deleteWebhook(id);
            setToast({ message: 'Webhook deleted', type: 'success' });
            loadWebhooks();
        } catch (err) {
            setToast({ message: 'Failed to delete webhook', type: 'error' });
        }
    };

    const handleEdit = (webhook: WebhookConfig) => {
        setNewWebhook(webhook);
        setEditingId(webhook.id);
        setShowForm(true);
    };

    const toggleEvent = (event: string) => {
        setNewWebhook(prev => ({
            ...prev,
            events: prev.events?.includes(event)
                ? prev.events.filter(e => e !== event)
                : [...(prev.events || []), event]
        }));
    };

    if (loading) return <Loading message="Loading webhooks..." />;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Webhook Settings</h2>
                    <p className={styles.description}>
                        Configure webhooks to receive notifications when document events occur.
                    </p>
                </div>
                {!showForm && (
                    <button
                        className={styles.comingSoonButton}
                        disabled
                    >
                        Coming Soon
                    </button>
                )}
            </div>

            {showForm && (
                <div className={styles.addForm}>
                    <h3>{editingId ? 'Edit Webhook' : 'Add New Webhook'}</h3>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label>Name</label>
                            <input
                                type="text"
                                value={newWebhook.name || ''}
                                onChange={(e) => setNewWebhook(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Webhook name"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>URL</label>
                            <input
                                type="url"
                                value={newWebhook.url || ''}
                                onChange={(e) => setNewWebhook(prev => ({ ...prev, url: e.target.value }))}
                                placeholder="https://your-endpoint.com/webhook"
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Events</label>
                        <div className={styles.eventGrid}>
                            {availableEvents.map(event => (
                                <label key={event} className={styles.eventCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={newWebhook.events?.includes(event) || false}
                                        onChange={() => toggleEvent(event)}
                                    />
                                    {event}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.eventCheckbox}>
                            <input
                                type="checkbox"
                                checked={newWebhook.is_active || false}
                                onChange={(e) => setNewWebhook(prev => ({ ...prev, is_active: e.target.checked }))}
                            />
                            Active
                        </label>
                    </div>

                    <div className={styles.formActions}>
                        <button className={styles.cancelButton} onClick={() => setShowForm(false)}>
                            <X size={16} />
                            Cancel
                        </button>
                        <button className={styles.saveButton} onClick={handleSave}>
                            <Save size={16} />
                            {editingId ? 'Update Webhook' : 'Save Webhook'}
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.webhookList}>
                {webhooks.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Webhook size={48} />
                        <p>No webhooks configured</p>
                        <span>Add a webhook to receive notifications</span>
                    </div>
                ) : (
                    webhooks.map(webhook => (
                        <div key={webhook.id} className={styles.webhookItem}>
                            <div className={styles.webhookInfo}>
                                <h4>{webhook.name}</h4>
                                <p>{webhook.url}</p>
                                <div className={styles.events}>
                                    {webhook.events.map(event => (
                                        <span key={event} className={styles.eventBadge}>
                                            {event}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className={styles.webhookActions}>
                                <span className={`${styles.status} ${webhook.is_active ? styles.active : styles.inactive}`}>
                                    {webhook.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button className={styles.actionButton} onClick={() => handleEdit(webhook)}>
                                    <Edit size={16} />
                                </button>
                                <button
                                    className={styles.deleteButton}
                                    onClick={() => handleDelete(webhook.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};

export default WebhookSettings;