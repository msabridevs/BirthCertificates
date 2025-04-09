import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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

    let nextNumber = null;
    let attempts = 0;
    const maxAttempts = 10;

    // Generate unique random number
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

    // Insert the number and status
    const { error: insertError } = await supabase
      .from('birth_cert_requests')
      .insert([{ number: nextNumber, status: 'in progress' }]);

    if (insertError) {
      console.error('Insert error:', insertError);
      alert('Failed to submit request.');
      setSubmitting(false);
      return;
    }

    // Create and download .txt file
    const timestamp = new Date().toLocaleString();
    const content =
      `Consulate General of Egypt – Frankfurt\n` +
      `-------------------------------------------\n` +
      `Name: ${name}\n` +
      `Request #: ${nextNumber}\n` +
      `Date: ${timestamp}\n` +
      `Transaction: Birth Certificates\n` +
      `\nPlease keep this number for tracking.\n`;

    const safeFileName = name.replace(/[\\\\/:*?"<>|]/g, '').trim();
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${safeFileName}.txt`;
    link.click();

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
