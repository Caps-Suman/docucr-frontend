import apiClient from '../utils/apiClient';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export interface Printer {
    id: string;
    name: string;
    ip_address: string;
    port: number;
    protocol: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ERROR';
    created_at?: string;
}

export interface PrinterStats {
    total: number;
    active: number;
    inactive: number;
}

const getPrinters = async (skip = 0, limit = 100): Promise<Printer[]> => {
    const response = await apiClient(`${API_URL}/api/printers?skip=${skip}&limit=${limit}`);
    if (!response.ok) throw new Error('Failed to fetch printers');
    return response.json();
};

const createPrinter = async (data: Omit<Printer, 'id'>): Promise<Printer> => {
    const response = await apiClient(`${API_URL}/api/printers/`, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to create printer');
    }
    return response.json();
};

const updatePrinter = async (id: string, data: Partial<Printer>): Promise<Printer> => {
    const response = await apiClient(`${API_URL}/api/printers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to update printer');
    }
    return response.json();
};

const deletePrinter = async (id: string): Promise<void> => {
    const response = await apiClient(`${API_URL}/api/printers/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete printer');
    }
};

const testConnection = async (ip_address: string, port: number): Promise<{ success: boolean; message: string }> => {
    try {
        const response = await apiClient(`${API_URL}/api/printers/test-connection`, {
            method: 'POST',
            body: JSON.stringify({ ip_address, port })
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                message: error.detail || 'Connection failed'
            };
        }
        return response.json();
    } catch (error: any) {
        return {
            success: false,
            message: error.message || 'Connection failed'
        };
    }
};

const discoverPrinters = async (): Promise<Array<Partial<Printer>>> => {
    const response = await apiClient(`${API_URL}/api/printers/discover`);
    if (!response.ok) throw new Error('Failed to discover printers');
    return response.json();
};

export interface PrintOptions {
    copies: number;
    colorMode: 'COLOR' | 'MONO';
    duplex: boolean;
}

const printDocument = async (printerId: string, documentId: number, options?: PrintOptions): Promise<void> => {
    const payload = {
        document_id: documentId,
        ...(options && {
            copies: options.copies,
            color_mode: options.colorMode,
            duplex: options.duplex
        })
    };

    const response = await apiClient(`${API_URL}/api/printers/${printerId}/print`, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to print document');
    }
};

const printerService = {
    getPrinters,
    createPrinter,
    updatePrinter,
    deletePrinter,
    testConnection,
    discoverPrinters,
    printDocument
};

export default printerService;
