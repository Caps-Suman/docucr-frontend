import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MoreVertical, Calendar } from 'lucide-react';

const mockDocuments = [
    { id: 1, name: 'Invoice_2024_001.pdf', type: 'Invoice', date: '2024-03-10', status: 'Processed' },
    { id: 2, name: 'Contract_Acme_v2.pdf', type: 'Contract', date: '2024-03-12', status: 'Pending' },
    { id: 3, name: 'Receipt_Lunch.jpg', type: 'Receipt', date: '2024-03-15', status: 'Failed' },
    { id: 4, name: 'Q1_Report.pdf', type: 'Report', date: '2024-03-18', status: 'Processed' },
];

const DocumentList = () => {
    const navigate = useNavigate();

    const handleRowClick = (id) => {
        navigate(`/dashboard/documents/${id}`);
    };

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b' }}>Documents</h1>
                <button style={{
                    backgroundColor: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                }}>
                    Upload New
                </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                            <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Name</th>
                            <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Type</th>
                            <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Date</th>
                            <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '16px', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mockDocuments.map((doc) => (
                            <tr
                                key={doc.id}
                                onClick={() => handleRowClick(doc.id)}
                                style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background-color 0.1s' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                            >
                                <td style={{ padding: '16px', color: '#334155', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FileText size={18} color="#64748b" />
                                    {doc.name}
                                </td>
                                <td style={{ padding: '16px', color: '#64748b' }}>{doc.type}</td>
                                <td style={{ padding: '16px', color: '#64748b' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={14} />
                                        {doc.date}
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        padding: '4px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        backgroundColor: doc.status === 'Processed' ? '#dcfce7' : doc.status === 'Failed' ? '#fee2e2' : '#fef3c7',
                                        color: doc.status === 'Processed' ? '#166534' : doc.status === 'Failed' ? '#991b1b' : '#92400e'
                                    }}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td style={{ padding: '16px', textAlign: 'right' }}>
                                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DocumentList;
