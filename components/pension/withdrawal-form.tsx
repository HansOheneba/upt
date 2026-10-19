"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignaturePad } from "@/components/pension/signature-pad";
import { memberName } from "@/lib/pension/metrics";
import type { PensionMember, WithdrawalDestination } from "@/lib/pension/types";
import { usePensionStore } from "@/store/pensionStore";

const REASONS = ["School fees", "Medical", "Rent", "Partial withdrawal", "Other"];

const GHANA_MOBILE = /^0\d{9}$/;

type WithdrawalFormProps = {
  member: PensionMember;
  onDone: () => void;
};

export function WithdrawalForm({ member, onDone }: WithdrawalFormProps) {
  const addWithdrawal = usePensionStore((state) => state.addWithdrawal);
  const [name, setName] = useState(memberName(member));
  const [mobile, setMobile] = useState(member.mobile);
  const [profession, setProfession] = useState(member.profession);
  const [location, setLocation] = useState(member.location);
  const [nextOfKin, setNextOfKin] = useState(member.nextOfKin);
  const [nextOfKinContact, setNextOfKinContact] = useState(member.nextOfKinContact);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [destinationType, setDestinationType] = useState<WithdrawalDestination>("momo");
  const [destination, setDestination] = useState(member.mobile);
  const [signature, setSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!name.trim() || !profession.trim() || !location.trim() || !nextOfKin.trim()) {
      setError("Fill in your details and your next of kin.");
      return;
    }
    if (!GHANA_MOBILE.test(mobile.trim()) || !GHANA_MOBILE.test(nextOfKinContact.trim())) {
      setError("Mobile numbers should be 10 digits starting with 0.");
      return;
    }
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter the amount you want paid out.");
      return;
    }
    if (!destination.trim()) {
      setError(
        destinationType === "momo"
          ? "Enter the Mobile Money number to pay."
          : "Enter the bank account to pay.",
      );
      return;
    }
    if (!signature) {
      setError("Sign in the box before you submit.");
      return;
    }
    addWithdrawal({
      amount: parsed,
      reason,
      destinationType,
      destination: destination.trim(),
      signatureDataUrl: signature,
      name: name.trim(),
      mobile: mobile.trim(),
      profession: profession.trim(),
      location: location.trim(),
      nextOfKin: nextOfKin.trim(),
      nextOfKinContact: nextOfKinContact.trim(),
    });
    setError(null);
    onDone();
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Name" id="wd-name" value={name} onChange={setName} />
      <Field label="Mobile number" id="wd-mobile" value={mobile} onChange={setMobile} />
      <Field label="Profession" id="wd-profession" value={profession} onChange={setProfession} />
      <Field label="Location" id="wd-location" value={location} onChange={setLocation} />
      <Field label="Next of kin" id="wd-kin" value={nextOfKin} onChange={setNextOfKin} />
      <Field
        label="Next of kin contact"
        id="wd-kin-phone"
        value={nextOfKinContact}
        onChange={setNextOfKinContact}
      />
      <Field
        label="Amount (GHS)"
        id="wd-amount"
        value={amount}
        onChange={setAmount}
        type="number"
      />
      <div className="space-y-2">
        <Label htmlFor="wd-reason">Reason</Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger id="wd-reason" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REASONS.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="wd-destination-type">Pay to</Label>
        <Select
          value={destinationType}
          onValueChange={(value) => setDestinationType(value as WithdrawalDestination)}
        >
          <SelectTrigger id="wd-destination-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="momo">MTN Mobile Money</SelectItem>
            <SelectItem value="bank">Bank account</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Field
        label={destinationType === "momo" ? "Mobile Money number" : "Bank account"}
        id="wd-destination"
        value={destination}
        onChange={setDestination}
      />
      <div className="space-y-2 sm:col-span-2">
        <Label>Signature</Label>
        <SignaturePad onChange={setSignature} />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit">Submit withdrawal</Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        min={type === "number" ? 1 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
