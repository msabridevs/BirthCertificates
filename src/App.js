import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import jsPDF from 'jspdf';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

function App() {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingNumber, setExistingNumber] = useState('');
  const [statusToUpdate, setStatusToUpdate] = useState('');
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert('Login failed');
    } else {
      setUser(data.user);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);

    const uniqueNumber = Math.floor(1000 + Math.random() * 9000);
    const timestamp = new Date().toLocaleString();

    const { error } = await supabase.from('birth_cert_requests').insert([
      { number: uniqueNumber, status: 'in progress' },
    ]);

    if (error) {
      console.error('Supabase insert error:', error);
      setSubmitting(false);
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text('Embassy of Egypt – Frankfurt', 20, 20);
    doc.text('-------------------------------', 20, 28);
    doc.text(`Name: ${name}`, 20, 40);
    doc.text(`Request #: ${uniqueNumber}`, 20, 50);
    doc.text(`Date: ${timestamp}`, 20, 60);
    doc.text(`Transaction: Birth Certificates`, 20, 70);
    doc.text('\nPlease keep this number for tracking.', 20, 90);

    const safeFileName = name.replace(/[\\\\/:*?"<>|]/g, '').trim();
    doc.save(`${safeFileName}.pdf`);
    setSubmitting(false);
    setName('');
  };

  const handleUpdateStatus = async () => {
    const number = parseInt(existingNumber);
    if (!number || !statusToUpdate) return;

    const { data, error: fetchError } = await supabase
      .from('birth_cert_requests')
      .select('id')
      .eq('number', number)
      .single();

    if (fetchError || !data) {
      alert('Number not found in database.');
      return;
    }

    const { error: updateError } = await supabase
      .from('birth_cert_requests')
      .update({ status: statusToUpdate, notes })
      .eq('number', number);

    if (updateError) {
      console.error('Error updating status:', updateError);
      alert('Failed to update status.');
    } else {
      alert('Status updated successfully.');
      setExistingNumber('');
      setStatusToUpdate('');
      setNotes('');
    }
  };

  if (!user) {
    return (
      <div style={{ padding: 30 }}>
        <h2>Login</h2>
        <input
          placeholder='Email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        /><br />
        <input
          type='password'
          placeholder='Password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        /><br />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 30 }}>
      <h2>Birth Certificate Request</h2>
      <input
        placeholder='Enter full name'
        value={name}
        onChange={(e) => setName(e.target.value)}
      /><br />
      <button onClick={handleSubmit} disabled={submitting}>
        {submitting ? 'Submitting...' : 'Submit Request'}
      </button>

      <hr />

      <h2>Update Request Status</h2>
      <input
        placeholder='Enter request number'
        value={existingNumber}
        onChange={(e) => setExistingNumber(e.target.value)}
      /><br />
      <select
        value={statusToUpdate}
        onChange={(e) => setStatusToUpdate(e.target.value)}
      >
        <option value=''>Select status</option>
        <option value='transaction arrived'>Transaction Arrived</option>
        <option value='not arrived'>Not Arrived</option>
        <option value='documents required'>Documents Required</option>
      </select><br />
      <textarea
        placeholder='Optional notes'
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      /><br />
      <button onClick={handleUpdateStatus}>Update Status</button>
    </div>
  );
}

export default App;
