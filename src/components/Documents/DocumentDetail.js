import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Download, Share, Trash2 } from 'lucide-react';

const DocumentDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Mock data lookup
    const doc = {
        id,
        name: 'Invoice_2024_001.pdf',
        type: 'Invoice',
        date: '2024-03-10',
        status: 'Processed',
        content: 'This is a placeholder for the extracted text content of the document...'
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '16px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'white', border: '1px solid #e2e8f0', padding: '8px', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}
                >
                    <ArrowLeft size={20} color="#64748b" />
                </button>
                <div>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>{doc.name}</h1>
                    <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Processed on {doc.date}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
                    <button style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                        <Download size={16} /> Export
                    </button>
                    <button style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                        <Share size={16} /> Share
                    </button>
                    <button style={{ padding: '8px', background: '#fee2e2', border: 'none', borderRadius: '6px', cursor: 'pointer', color: '#ef4444' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

                {/* Main Content (Preview) */}
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px', minHeight: '500px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Document Preview</h3>
                    <div style={{ width: '100%', height: '400px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                        [ PDF Viewer Component Placeholder ]
                    </div>
                </div>

                {/* Sidebar (Details/Metadata) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Details</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase' }}>Type</label>
                                <div style={{ color: '#334155', fontWeight: '500' }}>{doc.type}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase' }}>Status</label>
                                <div style={{ marginTop: '4px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        backgroundColor: '#dcfce7',
                                        color: '#166534'
                                    }}>
                                        {doc.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase' }}>ID</label>
                                <div style={{ color: '#334155', fontFamily: 'monospace' }}>#{doc.id}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#1e293b' }}>Extracted Data</h3>
                        <p style={{ fontSize: '14px', color: '#64748b' }}>No key-value pairs extracted yet.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default DocumentDetail;
