import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkSession();
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert('Login failed. Please check your credentials.');
    } else {
      setUser(data.user);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setConfirmation(null);

    let nextNumber = null;
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const { data, error } = await supabase
        .from('birth_cert_requests')
        .select('number')
        .eq('number', randomNum)
        .maybeSingle();

      if (!data) {
        nextNumber = randomNum;
        break;
      }
      attempts++;
    }

    if (!nextNumber) {
      alert("Could not generate a unique request number. Please try again.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase
      .from('birth_cert_requests')
      .insert([{ number: nextNumber, status: 'in progress' }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      alert('Failed to submit request.');
      setSubmitting(false);
      return;
    }

    const timestamp = new Date().toLocaleString();
    setConfirmation({ name, number: nextNumber });

    const rowData = [{
      name,
      number: nextNumber,
      status: 'in progress',
      date: timestamp
    }];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rowData);
    XLSX.utils.book_append_sheet(wb, ws, 'Requests');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([wbout], { type: 'application/octet-stream' }), 'data.xlsx');

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
      alert('Number not found.');
      return;
    }

    const { error: updateError } = await supabase
      .from('birth_cert_requests')
      .update({ status: statusToUpdate, notes })
      .eq('number', number);

    if (updateError) {
      console.error('Update error:', updateError);
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

      {confirmation && (
        <div style={{ marginTop: 20, padding: 10, background: '#f4f4f4' }}>
          <h4>Your request was submitted successfully.</h4>
          <p><strong>Name:</strong> {confirmation.name}</p>
          <p><strong>Request #:</strong> {confirmation.number}</p>
        </div>
      )}

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
