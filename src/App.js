import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@supabase/supabase-js";
import jsPDF from "jspdf";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function BirthCertificateRequest() {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingNumber, setExistingNumber] = useState("");
  const [statusToUpdate, setStatusToUpdate] = useState("");
  const [notes, setNotes] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();
  }, []);

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      alert("Login failed");
    } else {
      setUser(data.user);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);

    const uniqueNumber = Math.floor(1000 + Math.random() * 9000);
    const timestamp = new Date().toLocaleString();

    const { error } = await supabase.from("birth_cert_requests").insert([
      { number: uniqueNumber, status: "in progress" },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      setSubmitting(false);
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text("Embassy of Egypt – Frankfurt", 20, 20);
    doc.text("-------------------------------------------", 20, 28);
    doc.text(`Name: ${name}`, 20, 40);
    doc.text(`Request #: ${uniqueNumber}`, 20, 50);
    doc.text(`Date: ${timestamp}`, 20, 60);
    doc.text(`Transaction: Birth Certificates`, 20, 70);
    doc.text("\nPlease keep this number for tracking.", 20, 90);

    const safeFileName = name.replace(/[\\/:*?"<>|]/g, "").trim();
    doc.save(`${safeFileName}.pdf`);
    setSubmitting(false);
    setName("");
  };

  const handleUpdateStatus = async () => {
    const number = parseInt(existingNumber);
    if (!number || !statusToUpdate) return;

    const { data, error: fetchError } = await supabase
      .from("birth_cert_requests")
      .select("id")
      .eq("number", number)
      .single();

    if (fetchError || !data) {
      alert("Number not found in database.");
      return;
    }

    const { error: updateError } = await supabase
      .from("birth_cert_requests")
      .update({ status: statusToUpdate, notes })
      .eq("number", number);

    if (updateError) {
      console.error("Error updating status:", updateError);
      alert("Failed to update status.");
    } else {
      alert("Status updated successfully.");
      setExistingNumber("");
      setStatusToUpdate("");
      setNotes("");
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-center">Login</h2>
            <Input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">
            Birth Certificate Request
          </h2>
          <Input
            placeholder="Enter full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Submitting..." : "Submit Request"}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-md">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-center">
            Update Request Status
          </h2>
          <Input
            placeholder="Enter request number"
            value={existingNumber}
            onChange={(e) => setExistingNumber(e.target.value)}
          />
          <select
            value={statusToUpdate}
            onChange={(e) => setStatusToUpdate(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">Select status</option>
            <option value="transaction arrived">Transaction Arrived</option>
            <option value="not arrived">Not Arrived</option>
            <option value="documents required">Documents Required</option>
          </select>
          <Textarea
            placeholder="Optional notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <Button onClick={handleUpdateStatus} className="w-full">
            Update Status
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
