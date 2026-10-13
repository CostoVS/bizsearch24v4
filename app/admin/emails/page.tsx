'use client'

import React, { useEffect, useState } from 'react';

type Business = any;

async function fetchJson(url: string, opts?: any) {
  const res = await fetch(url, opts);
  return res.json();
}

export default function AdminBulkEmailPanel() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({ province: '', category: '' });
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const b = await fetchJson('/api/admin/businesses');
      if (b && b.success) setBusinesses(b.businesses || []);
      const t = await fetchJson('/api/admin/email-templates');
      if (t && t.success) setTemplates(t.templates || []);
    })();
  }, []);

  useEffect(() => {
    if (!selectedTemplate) return;
    const t = templates.find(x => x.id === selectedTemplate);
    if (t) {
      setSubject(t.subject || '');
      setHtml(t.html || '');
    }
  }, [selectedTemplate, templates]);

  const toggle = (id: string) => {
    const s = new Set(selectedIds);
    if (s.has(id)) s.delete(id); else s.add(id);
    setSelectedIds(s);
  };

  const applyFilters = () => {
    // no-op client side; server send will filter
  };

  const sendEmails = async () => {
    setSending(true);
    try {
      const body: any = { subject, html };
      if (selectedIds.size > 0) body.targetIds = Array.from(selectedIds);
      else if (filters.province || filters.category) body.filters = filters;

      const res = await fetch('/api/admin/send-bulk-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json();
      alert('Send result: ' + (out?.success ? `sent ${out.count}` : out.error || 'failed'));
    } catch (e) {
      alert('Failed to send emails: ' + String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Admin — Bulk Email & Business Directory</h2>

      <div className="mb-4">
        <label className="block text-sm font-medium">Template</label>
        <select className="mt-1 w-full border px-2 py-1" value={selectedTemplate || ''} onChange={e => setSelectedTemplate(e.target.value || null)}>
          <option value="">(none)</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">Subject</label>
          <input className="mt-1 w-full border px-2 py-1" value={subject} onChange={e => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Filters</label>
          <div className="flex gap-2 mt-1">
            <input placeholder="Province" className="border px-2 py-1 flex-1" value={filters.province} onChange={e => setFilters(prev => ({ ...prev, province: e.target.value }))} />
            <input placeholder="Category" className="border px-2 py-1 flex-1" value={filters.category} onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">HTML Body</label>
        <textarea className="mt-1 w-full border px-2 py-1 h-48" value={html} onChange={e => setHtml(e.target.value)} />
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button className="bg-emerald-600 text-white px-4 py-2 rounded" onClick={sendEmails} disabled={sending}>{sending ? 'Sending...' : 'Send Emails'}</button>
        <div className="text-sm text-slate-600">Selected: {selectedIds.size} businesses</div>
      </div>

      <div>
        <h3 className="font-semibold mb-2">Businesses ({businesses.length}) — click to select</h3>
        <div className="max-h-64 overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="p-2 text-left">Select</th>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Town</th>
                <th className="p-2 text-left">Province</th>
                <th className="p-2 text-left">Email</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.id} className="border-t">
                  <td className="p-2"><input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggle(b.id)} /></td>
                  <td className="p-2">{b.name}</td>
                  <td className="p-2">{b.town || b.city}</td>
                  <td className="p-2">{b.province}</td>
                  <td className="p-2">{b.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
