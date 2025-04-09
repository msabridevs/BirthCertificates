import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BirthCertApp() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [checkId, setCheckId] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [dataRow, setDataRow] = useState(null);
  const [message, setMessage] = useState("");

  const generateUniqueId = async () => {
    let id;
    let exists = true;
    while (exists) {
      id = Math.floor(1000 + Math.random() * 9000);
      const { data } = await supabase
        .from("birth_cert_requests")
        .select("id")
        .eq("id", id);
      if (!data || data.length === 0) exists = false;
    }
    return id;
  };

  const handleSubmit = async () => {
    if (!name) return setMessage("Please enter a name");

    const id = await generateUniqueId();

    const { data, error } = await supabase.from("birth_cert_requests").insert([
      {
        id,
        status: "in progress..",
        notes: notes || null,
      },
    ]);

    if (error) return setMessage("Error: " + error.message);

    setDataRow({ id, status: "in progress..", notes, name });
    setMessage("Entry added successfully");
  };

  const handleStatusUpdate = async () => {
    const idNum = parseInt(checkId);
    if (isNaN(idNum)) return setMessage("Invalid ID format");

    const { data, error } = await supabase
      .from("birth_cert_requests")
      .select("*")
      .eq("id", idNum);

    if (error || !data || data.length === 0)
      return setMessage("ID not found");

    const row = data[0];

    if (row.status !== "in progress..") {
      return setMessage(
        `Warning: ID ${idNum} already has status '${row.status}' and cannot be changed.`
      );
    }

    const newStatus = prompt(
      "Enter new status: request dismissed, approved, or extra docs required"
    );

    if (
      !["request dismissed", "approved", "extra docs required"].includes(
        newStatus
      )
    ) {
      return setMessage("Invalid status entered");
    }

    const { error: updateError } = await supabase
      .from("birth_cert_requests")
      .update({ status: newStatus, notes: statusNote || null })
      .eq("id", idNum);

    if (updateError) return setMessage("Update error: " + updateError.message);

    setMessage(`Status for ID ${idNum} updated successfully.`);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <Card>
        <CardContent className="space-y-2 p-4">
          <Input
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={handleSubmit}>Submit</Button>
        </CardContent>
      </Card>

      {dataRow && (
        <Card>
          <CardContent className="p-4">
            <p><strong>Name:</strong> {dataRow.name}</p>
            <p><strong>ID:</strong> {dataRow.id}</p>
            <p><strong>Status:</strong> {dataRow.status}</p>
            <p><strong>Notes:</strong> {dataRow.notes}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2 p-4">
          <Input
            placeholder="Enter ID to update"
            value={checkId}
            onChange={(e) => setCheckId(e.target.value)}
          />
          <Input
            placeholder="Update notes"
            value={statusNote}
            onChange={(e) => setStatusNote(e.target.value)}
          />
          <Button onClick={handleStatusUpdate}>Update Status</Button>
        </CardContent>
      </Card>

      {message && <p className="text-center text-red-600">{message}</p>}
    </div>
  );
}
