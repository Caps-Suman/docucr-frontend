import React, { useState } from 'react';
import { Webhook, Plus, Trash2, Edit, Save, X } from 'lucide-react';
import Toast, { ToastType } from '../../Common/Toast';
import styles from './WebhookSettings.module.css';

interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    events: string[];
    active: boolean;
}

const WebhookSettings: React.FC = () => {
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [newWebhook, setNewWebhook] = useState<Partial<WebhookConfig>>({
        name: '',
        url: '',
        events: [],
        active: true
    });
    const [showAddForm, setShowAddForm] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const availableEvents = [
        'document.uploaded',
        'document.processed',
        'document.failed',
        'document.deleted'
    ];

    const handleSave = () => {
        if (!newWebhook.name || !newWebhook.url) {
            setToast({ message: 'Name and URL are required', type: 'error' });
            return;
        }

        const webhook: WebhookConfig = {
            id: Date.now().toString(),
            name: newWebhook.name,
            url: newWebhook.url,
            events: newWebhook.events || [],
            active: newWebhook.active || true
        };

        setWebhooks(prev => [...prev, webhook]);
        setNewWebhook({ name: '', url: '', events: [], active: true });
        setShowAddForm(false);
        setToast({ message: 'Webhook added successfully', type: 'success' });
    };

    const handleDelete = (id: string) => {
        setWebhooks(prev => prev.filter(w => w.id !== id));
        setToast({ message: 'Webhook deleted', type: 'success' });
    };

    const toggleEvent = (event: string) => {
        setNewWebhook(prev => ({
            ...prev,
            events: prev.events?.includes(event) 
                ? prev.events.filter(e => e !== event)
                : [...(prev.events || []), event]
        }));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h2 className={styles.title}>Webhook Settings</h2>
                    <p className={styles.description}>
                        Configure webhooks to receive notifications when document events occur.
                    </p>
                </div>
                <button 
                    className={styles.addButton}
                    onClick={() => setShowAddForm(true)}
                >
                    <Plus size={16} />
                    Add Webhook
                </button>
            </div>

            {showAddForm && (
                <div className={styles.addForm}>
                    <h3>Add New Webhook</h3>
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

                    <div className={styles.formActions}>
                        <button className={styles.cancelButton} onClick={() => setShowAddForm(false)}>
                            <X size={16} />
                            Cancel
                        </button>
                        <button className={styles.saveButton} onClick={handleSave}>
                            <Save size={16} />
                            Save Webhook
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
                                <span className={`${styles.status} ${webhook.active ? styles.active : styles.inactive}`}>
                                    {webhook.active ? 'Active' : 'Inactive'}
                                </span>
                                <button className={styles.actionButton}>
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