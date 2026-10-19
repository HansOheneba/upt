"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { CelereyLoader } from "@/components/login/celerey-loader";
import { useClientGate } from "@/hooks/useClientGate";
import { isOnboarded } from "@/lib/client-data";
import { finishPensionJoin } from "@/lib/pension/enter";
import { formatGhs } from "@/lib/pension/metrics";

const STAGES = [
  { label: "You", steps: [1] },
  { label: "Next of kin", steps: [2] },
  { label: "Contributions", steps: [3] },
  { label: "Review", steps: [4] },
];

const GHANA_MOBILE = /^0\d{9}$/;

type Draft = {
  firstName: string;
  lastName: string;
  mobile: string;
  profession: string;
  location: string;
  nextOfKin: string;
  nextOfKinContact: string;
  monthlyContribution: string;
};

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  mobile: "",
  profession: "",
  location: "",
  nextOfKin: "",
  nextOfKinContact: "",
  monthlyContribution: "300",
};

export function PensionOnboarding() {
  const router = useRouter();
  const { ready, auth } = useClientGate();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!auth.loggedIn) {
      router.replace("/");
      return;
    }
    if (isOnboarded()) router.replace("/dashboard");
  }, [ready, auth.loggedIn, router]);

  if (!ready || !auth.loggedIn || isOnboarded()) return <CelereyLoader />;

  function patch(partial: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...partial }));
  }

  function nextFromYou() {
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.profession.trim() || !draft.location.trim()) {
      setError("Enter your name, profession, and where you live.");
      return;
    }
    if (!GHANA_MOBILE.test(draft.mobile.trim())) {
      setError("Enter a 10-digit Ghana mobile number starting with 0.");
      return;
    }
    setError(null);
    setStep(2);
  }

  function nextFromKin() {
    if (!draft.nextOfKin.trim()) {
      setError("Enter your next of kin.");
      return;
    }
    if (!GHANA_MOBILE.test(draft.nextOfKinContact.trim())) {
      setError("Enter a 10-digit contact number for your next of kin.");
      return;
    }
    setError(null);
    setStep(3);
  }

  function nextFromContribution() {
    const amount = Number(draft.monthlyContribution);
    if (!Number.isFinite(amount) || amount < 20) {
      setError("Enter a monthly contribution of at least GHS 20.");
      return;
    }
    setError(null);
    setStep(4);
  }

  function finish() {
    finishPensionJoin({
      firstName: draft.firstName,
      lastName: draft.lastName,
      mobile: draft.mobile.trim(),
      profession: draft.profession,
      location: draft.location,
      nextOfKin: draft.nextOfKin,
      nextOfKinContact: draft.nextOfKinContact.trim(),
      monthlyContribution: Number(draft.monthlyContribution),
    });
    router.replace("/dashboard");
  }

  return (
    <OnboardingShell currentStep={step} totalSteps={4} stages={STAGES}>
      <div className="space-y-6">
        {step === 1 ? (
          <>
            <Heading
              title="Your My Own Pension account"
              body="This is the membership we already collect when someone joins on Mobile Money."
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" value={draft.firstName} onChange={(value) => patch({ firstName: value })} />
              <Field label="Last name" value={draft.lastName} onChange={(value) => patch({ lastName: value })} />
              <Field label="Mobile number" value={draft.mobile} onChange={(value) => patch({ mobile: value })} />
              <Field label="Profession" value={draft.profession} onChange={(value) => patch({ profession: value })} />
              <div className="sm:col-span-2">
                <Field label="Location" value={draft.location} onChange={(value) => patch({ location: value })} />
              </div>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Heading
              title="Next of kin"
              body="The same details a claim form asks for, kept on the member record."
            />
            <div className="grid gap-4">
              <Field label="Next of kin" value={draft.nextOfKin} onChange={(value) => patch({ nextOfKin: value })} />
              <Field
                label="Next of kin contact"
                value={draft.nextOfKinContact}
                onChange={(value) => patch({ nextOfKinContact: value })}
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Heading
              title="How you contribute"
              body="Personal pension contributions come in through MTN Mobile Money on My Own Pension."
            />
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">MTN Mobile Money</p>
              <p className="text-muted-foreground">USSD or the My Own Pension app. We do not ask you to sign up again.</p>
            </div>
            <Field
              label="Monthly contribution (GHS)"
              value={draft.monthlyContribution}
              onChange={(value) => patch({ monthlyContribution: value })}
              type="number"
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Heading
              title="Review"
              body="Check these details before you open the account. Contributions post from MTN Mobile Money."
            />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Item label="Name" value={`${draft.firstName} ${draft.lastName}`} />
              <Item label="Mobile" value={draft.mobile} />
              <Item label="Profession" value={draft.profession} />
              <Item label="Location" value={draft.location} />
              <Item label="Next of kin" value={draft.nextOfKin} />
              <Item label="Next of kin contact" value={draft.nextOfKinContact} />
              <Item label="Channel" value="MTN Mobile Money · My Own Pension" />
              <Item label="Monthly" value={formatGhs(Number(draft.monthlyContribution) || 0, 0)} />
            </dl>
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" onClick={() => { setError(null); setStep(step - 1); }}>
              Back
            </Button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <Button type="button" onClick={nextFromYou}>Continue</Button>
          ) : null}
          {step === 2 ? (
            <Button type="button" onClick={nextFromKin}>Continue</Button>
          ) : null}
          {step === 3 ? (
            <Button type="button" onClick={nextFromContribution}>Review</Button>
          ) : null}
          {step === 4 ? (
            <Button type="button" onClick={finish}>Open my pension</Button>
          ) : null}
        </div>
      </div>
    </OnboardingShell>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        min={type === "number" ? 20 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
