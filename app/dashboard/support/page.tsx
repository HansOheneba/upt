"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faQuestionCircle,
  faEnvelope,
  faCreditCard,
  faDatabase,
  faCommentDots,
  faChevronDown,
  faChevronUp,
  faCheckCircle,
  faStar as faStarSolid,
  faRoute,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardTheme } from "@/lib/dashboard-theme";
import { DashboardSectionLabelWide as SectionLabel } from "@/components/dashboard/section-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useClientGate } from "@/hooks/useClientGate";
import { useFinancialStore } from "@/store/financialStore";
import { getAuth, setSubscriptionData } from "@/lib/client-data";
import { cancelSubscription } from "@/lib/dashboard-api";
import { toast } from "sonner";
import { resetGuidedTour, TOUR_RESTART_EVENT } from "@/lib/dashboard-tour";
import { useRouter } from "next/navigation";
import { brand } from "@/lib/tenant";

// ─── Brand colour ─────────────────────────────────────────────────────────────
const PRIMARY = "var(--brand-primary)";

// ─── Animation variants ───────────────────────────────────────────────────────
const container = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: {
    opacity: 1,
    transform: "translateY(0px)",
    transition: { duration: 0.35, staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, transform: "translateY(8px)" },
  show: { opacity: 1, transform: "translateY(0px)", transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const } },
};

// ─── FAQ data ─────────────────────────────────────────────────────────────────
const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "How is my net worth calculated?",
    answer:
      `Your net worth is computed by summing the current value of all assets - including investment holdings, property, and cash accounts - then subtracting all outstanding liabilities. ${brand.name} refreshes this figure automatically whenever you update any asset or liability entry.`,
  },
  {
    question: "How does the retirement projection work?",
    answer:
      "The projection starts from your current invested balance and adds your monthly savings over the years remaining until your target retirement age, compounded at your chosen expected return rate. It then models whether the resulting pot can sustain your desired monthly income using the safe withdrawal rate you configure.",
  },
  {
    question: "Is my financial data secure?",
    answer:
      "All data is encrypted in transit via TLS and at rest using AES-256. We follow industry-standard security practices and never sell or share your personal financial information with third parties.",
  },
  {
    question: "How do I export my data?",
    answer:
      "Navigate to Support › Data & Privacy and click Export my data. A JSON file containing your full financial profile will be downloaded to your device immediately - no waiting and no email required.",
  },
  {
    question: "Can I connect my bank account?",
    answer:
      "Add income, expenses, and cash accounts on Cash Flow. Your dashboard updates as soon as you save an entry.",
  },
  {
    question: "How do I cancel my subscription?",
    answer:
      "Open Support › Subscription management and click Cancel subscription. You'll be prompted to confirm before anything changes. If you need further help, contact us via the form on this page.",
  },
  {
    question: "What is the emergency fund runway?",
    answer:
      "The emergency fund runway shows how many months your current cash balance would cover if all income stopped. It is calculated by dividing your total available cash by your average monthly expenses.",
  },
  {
    question: "What is a safe withdrawal rate?",
    answer:
      "A safe withdrawal rate (SWR) is the percentage of your retirement portfolio you can withdraw each year with a high probability of not running out of money over a 30-year horizon. The widely cited baseline is 4%, but you can adjust this in your retirement settings.",
  },
  {
    question: "How do I add a partner or family member to my account?",
    answer:
      "Multi-user household accounts are coming in a future release. At the moment each account is individual, though you can model a partner's income and expenses within the cash-flow section.",
  },
  {
    question: "What currencies are supported?",
    answer:
      `${brand.name} currently operates in your account's base currency, which is set during onboarding. Multi-currency display and real-time FX conversion are planned for an upcoming update.`,
  },
];

// ─── Section label component ──────────────────────────────────────────────────

// ─── Guided tour restart ───────────────────────────────────────────────────────

function GuidedTourSection() {
  const router = useRouter();
  const user = useFinancialStore((s) => s.user);

  function handleRestartTour() {
    const userId = user?.user_id ?? getAuth().email;
    if (!userId) return;
    resetGuidedTour(userId);
    window.dispatchEvent(new CustomEvent(TOUR_RESTART_EVENT));
    router.push("/dashboard");
  }

  return (
    <motion.div variants={item}>
      <Card className="border-[color-mix(in_srgb,var(--brand-accent)_28%,transparent)]">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faRoute}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            <CardTitle className="text-base font-semibold">
              Guided dashboard tour
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Walk through every section of {brand.name} step by step. 
          </p>
          <Button
            size="sm"
            onClick={handleRestartTour}
            style={{ backgroundColor: PRIMARY }}
            className="text-white hover:opacity-90 shrink-0"
          >
            Restart guided tour
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── FAQ section ─────────────────────────────────────────────────────────────
function FaqSection() {
  const [query, setQuery] = React.useState("");
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faQuestionCircle}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            <CardTitle className="text-base font-semibold">
              Frequently asked questions
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search questions…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenIndex(null);
            }}
            className="max-w-sm"
          />

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No results for &ldquo;{query}&rdquo;.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((faq, idx) => (
                <div key={faq.question} className="py-3">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 text-left"
                    onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {faq.question}
                    </span>
                    <FontAwesomeIcon
                      icon={openIndex === idx ? faChevronUp : faChevronDown}
                      className="h-3.5 w-3.5 shrink-0 text-gray-400"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {openIndex === idx && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Contact form section ─────────────────────────────────────────────────────
type ContactCategory =
  | "Billing"
  | "Technical issue"
  | "Account"
  | "Data & Privacy"
  | "Feature request"
  | "Other";

function ContactFormSection() {
  const [category, setCategory] = React.useState<ContactCategory | "">("");
  const [subject, setSubject] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faEnvelope}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            <CardTitle className="text-base font-semibold">
              Contact support
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="h-8 w-8 text-emerald-500"
              />
              <p className="text-sm font-medium text-gray-800">
                We&apos;ve received your message and will respond within 24
                hours.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSubmitted(false);
                  setCategory("");
                  setSubject("");
                  setMessage("");
                }}
              >
                Send another message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ContactCategory)}
                  required
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      [
                        "Billing",
                        "Technical issue",
                        "Account",
                        "Data & Privacy",
                        "Feature request",
                        "Other",
                      ] as ContactCategory[]
                    ).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Please describe your issue in detail…"
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={!category || !subject.trim() || !message.trim()}
                style={{ backgroundColor: PRIMARY }}
                className="text-white hover:opacity-90"
              >
                Send message
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Subscription management section ─────────────────────────────────────────
function formatPeriodEnd(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SubscriptionSection() {
  const { sub } = useClientGate();
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  async function confirmCancel() {
    setCancelling(true);
    try {
      const data = await cancelSubscription();
      setSubscriptionData(data);
      const end = data.current_period_end
        ? formatPeriodEnd(data.current_period_end)
        : null;
      toast.success(
        end
          ? `Your plan stays active until ${end}.`
          : "Your plan will cancel at the end of this billing period.",
      );
      setCancelOpen(false);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not cancel the subscription.",
      );
    } finally {
      setCancelling(false);
    }
  }

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faCreditCard}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            <CardTitle className="text-base font-semibold">
              Subscription management
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {sub.status === "active" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-600">
                  <FontAwesomeIcon
                    icon={faCheckCircle}
                    className="h-3.5 w-3.5"
                  />
                  Your plan is active
                </span>
              </p>
              {sub.cancelAtPeriodEnd ? (
                <p className="text-sm text-gray-700">
                  Cancellation is scheduled. You keep access
                  {sub.currentPeriodEnd
                    ? ` until ${formatPeriodEnd(sub.currentPeriodEnd)}`
                    : " until the end of this billing period"}
                  .
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  style={{ backgroundColor: PRIMARY }}
                  className="text-white hover:opacity-90"
                  onClick={() => (window.location.href = "/choose-plan")}
                >
                  Manage billing
                </Button>
                {sub.cancelAtPeriodEnd ? null : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel subscription
                  </Button>
                )}
              </div>
            </div>
          )}

          {sub.status === "trialing" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                You&apos;re on a free trial.
              </p>
              {sub.cancelAtPeriodEnd ? (
                <p className="text-sm text-gray-700">
                  Cancellation is scheduled. You keep access
                  {sub.currentPeriodEnd
                    ? ` until ${formatPeriodEnd(sub.currentPeriodEnd)}`
                    : " until the trial ends"}
                  .
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  style={{ backgroundColor: PRIMARY }}
                  className="text-white hover:opacity-90"
                  onClick={() => (window.location.href = "/choose-plan")}
                >
                  Upgrade now
                </Button>
                {sub.cancelAtPeriodEnd ? null : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => setCancelOpen(true)}
                  >
                    Cancel subscription
                  </Button>
                )}
              </div>
            </div>
          )}

          {sub.status === "none" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-700">
                You don&apos;t have an active plan.
              </p>
              <Button
                size="sm"
                style={{ backgroundColor: PRIMARY }}
                className="text-white hover:opacity-90"
                onClick={() => (window.location.href = "/choose-plan")}
              >
                Choose a plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel confirmation dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel subscription?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to cancel your subscription? You&apos;ll
            retain access until the end of your current billing period.
          </p>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCancelOpen(false)}
              disabled={cancelling}
            >
              Keep subscription
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => void confirmCancel()}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Confirm cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Data & Privacy section ───────────────────────────────────────────────────
function DataPrivacySection() {
  const store = useFinancialStore();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteRequested, setDeleteRequested] = React.useState(false);

  function handleExport() {
    const json = JSON.stringify(store, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${brand.id}-data-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDeleteConfirm() {
    setDeleteOpen(false);
    setDeleteRequested(true);
  }

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faDatabase}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            <CardTitle className="text-base font-semibold">
              Data &amp; Privacy
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {deleteRequested && (
            <p className="text-sm text-emerald-600 font-medium">
              Request submitted. Our team will process this within 48 hours.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Export card */}
            <div className="rounded-lg border border-gray-200 p-4 space-y-3">
              <SectionLabel>Export my data</SectionLabel>
              <p className="text-sm text-muted-foreground">
                Your data will be downloaded as a JSON file.
              </p>
              <Button size="sm" variant="outline" onClick={handleExport}>
                Download export
              </Button>
            </div>

            {/* Delete card */}
            <div className="rounded-lg border border-red-100 p-4 space-y-3">
              <SectionLabel>Delete my account</SectionLabel>
              <p className="text-sm text-muted-foreground">
                Permanently remove your account and all associated data.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setDeleteOpen(true)}
              >
                Delete account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete your account and all your data. This
            cannot be undone.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteConfirm}
            >
              Delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Feedback section ─────────────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="text-amber-400 focus:outline-none"
          aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
        >
          <FontAwesomeIcon
            icon={star <= value ? faStarSolid : faStarRegular}
            className="h-5 w-5"
          />
        </button>
      ))}
    </div>
  );
}

function FeedbackSection() {
  // Feedback dialog
  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [feedbackText, setFeedbackText] = React.useState("");
  const [rating, setRating] = React.useState(0);
  const [feedbackDone, setFeedbackDone] = React.useState(false);

  // Feature request dialog
  const [featureOpen, setFeatureOpen] = React.useState(false);
  const [featureName, setFeatureName] = React.useState("");
  const [featureDesc, setFeatureDesc] = React.useState("");
  const [featureDone, setFeatureDone] = React.useState(false);

  function submitFeedback(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedbackDone(true);
  }

  function closeFeedback() {
    setFeedbackOpen(false);
    setFeedbackDone(false);
    setFeedbackText("");
    setRating(0);
  }

  function submitFeature(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeatureDone(true);
  }

  function closeFeature() {
    setFeatureOpen(false);
    setFeatureDone(false);
    setFeatureName("");
    setFeatureDesc("");
  }

  return (
    <motion.div variants={item}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faCommentDots}
              className="h-4 w-4"
              style={{ color: PRIMARY }}
            />
            <CardTitle className="text-base font-semibold">Feedback</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeedbackOpen(true)}
          >
            Send feedback
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFeatureOpen(true)}
          >
            Request a feature
          </Button>
        </CardContent>
      </Card>

      {/* Send feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={closeFeedback}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send feedback</DialogTitle>
          </DialogHeader>
          {feedbackDone ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="h-8 w-8 text-emerald-500"
              />
              <p className="text-sm font-medium">
                Thank you for your feedback!
              </p>
              <Button variant="outline" size="sm" onClick={closeFeedback}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={submitFeedback} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feedback-text">Your feedback</Label>
                <Textarea
                  id="feedback-text"
                  rows={4}
                  placeholder="Tell us what you think…"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeFeedback}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  style={{ backgroundColor: PRIMARY }}
                  className="text-white hover:opacity-90"
                  disabled={rating === 0 || !feedbackText.trim()}
                >
                  Submit
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Request a feature dialog */}
      <Dialog open={featureOpen} onOpenChange={closeFeature}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a feature</DialogTitle>
          </DialogHeader>
          {featureDone ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FontAwesomeIcon
                icon={faCheckCircle}
                className="h-8 w-8 text-emerald-500"
              />
              <p className="text-sm font-medium">
                Thanks! We&apos;ve logged your feature request.
              </p>
              <Button variant="outline" size="sm" onClick={closeFeature}>
                Close
              </Button>
            </div>
          ) : (
            <form onSubmit={submitFeature} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="feature-name">Feature name</Label>
                <Input
                  id="feature-name"
                  placeholder="Short name for the feature"
                  value={featureName}
                  onChange={(e) => setFeatureName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-desc">Description</Label>
                <Textarea
                  id="feature-desc"
                  rows={4}
                  placeholder="Describe the feature and why it would be useful…"
                  value={featureDesc}
                  onChange={(e) => setFeatureDesc(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button variant="outline" type="button" onClick={closeFeature}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  style={{ backgroundColor: PRIMARY }}
                  className="text-white hover:opacity-90"
                  disabled={!featureName.trim() || !featureDesc.trim()}
                >
                  Submit request
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SupportPage() {
  return (
    <div className="min-h-screen from-background to-muted/20">
      <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
     
        {/* Sections */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          <GuidedTourSection />

          <SectionLabel>Frequently asked questions</SectionLabel>
          <FaqSection />

          <SectionLabel>Contact support</SectionLabel>
          <ContactFormSection />

          <SectionLabel>Subscription management</SectionLabel>
          <SubscriptionSection />

          <SectionLabel>Data &amp; Privacy</SectionLabel>
          <DataPrivacySection />

          <SectionLabel>Feedback</SectionLabel>
          <FeedbackSection />
        </motion.div>
      </div>
    </div>
  );
}
