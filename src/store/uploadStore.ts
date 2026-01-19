// Simple upload store without external dependencies
export interface UploadingDocument {
  tempId: string;
  documentId?: string;
  filename: string;
  fileSize: number;
  status: 'queued' | 'uploading' | 'uploaded' | 'failed';
  progress: number;
  error?: string;
  createdAt: string;
}

interface UploadStore {
  uploadingDocs: UploadingDocument[];
  addUpload: (doc: UploadingDocument) => void;
  updateUpload: (tempId: string, updates: Partial<UploadingDocument>) => void;
  removeUpload: (tempId: string) => void;
  clearCompleted: () => void;
}

class SimpleUploadStore {
  private state: UploadStore = {
    uploadingDocs: [],
    addUpload: (doc: UploadingDocument) => {
      this.state.uploadingDocs = [...this.state.uploadingDocs, doc];
      this.notify();
    },
    updateUpload: (tempId: string, updates: Partial<UploadingDocument>) => {
      this.state.uploadingDocs = this.state.uploadingDocs.map(doc => 
        doc.tempId === tempId ? { ...doc, ...updates } : doc
      );
      this.notify();
    },
    removeUpload: (tempId: string) => {
      this.state.uploadingDocs = this.state.uploadingDocs.filter(doc => doc.tempId !== tempId);
      this.notify();
    },
    clearCompleted: () => {
      this.state.uploadingDocs = this.state.uploadingDocs.filter(doc => 
        doc.status !== 'uploaded' && doc.status !== 'failed'
      );
      this.notify();
    }
  };

  private listeners: (() => void)[] = [];

  getState() {
    return this.state;
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }
}

const store = new SimpleUploadStore();

export const useUploadStore = (selector?: (state: UploadStore) => any) => {
  if (selector) {
    return selector(store.getState());
  }
  return store.getState();
};

// For direct access
export { store as uploadStore };