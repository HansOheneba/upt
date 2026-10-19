// app/dashboard/concierge/page.tsx
"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ServiceInquiryDialog,
  type ConciergeService,
} from "@/components/dashboard/services/ServiceInquiryDialog";

type ServiceCard = {
  number: string;
  title: string;
  audience: string;
  description: string;
  focusAreas: string[];
  deliverable: string;
  advisorType: string;
  serviceId: string;
};

const SERVICES: ServiceCard[] = [
  {
    number: "01",
    title: "Wealth & Portfolio Review",
    audience:
      "For clients with existing investments seeking an independent, expert second opinion.",
    description:
      "A structured session with an accredited wealth planner to review your current holdings, assess suitability against your goals and risk profile, identify gaps or concentrations, and provide clear recommendations.",
    focusAreas: [
      "Portfolio diagnostic",
      "Suitability assessment",
      "Concentration & risk analysis",
      "Reallocation recommendations",
    ],
    deliverable: "Written Advisory Opinion & Recommended Allocation",
    advisorType: "Accredited Wealth Planner",
    serviceId: "wealth-portfolio-review",
  },
  {
    number: "02",
    title: "Tax Optimisation",
    audience:
      "For individuals and business owners seeking to structure their affairs more efficiently.",
    description:
      "A dedicated session with an accredited tax advisor to review your current tax position and identify opportunities, including forward-looking structuring ahead of a liquidity event, inheritance, or business transaction.",
    focusAreas: [
      "Current tax position review",
      "Opportunity identification",
      "Pre-event structuring advice",
      "Cross-border considerations",
    ],
    deliverable: "Tax Plan & Written Advisory Opinion",
    advisorType: "Accredited Tax Advisor",
    serviceId: "tax-optimisation",
  },
  {
    number: "03",
    title: "Legacy & Estate Planning",
    audience:
      "For individuals and families thinking seriously about generational wealth and governance.",
    description:
      "A high-value engagement with an accredited wealth manager focused on the structures that protect and transfer wealth across generations, including family governance frameworks, trust structures, succession planning, and wealth transfer strategies.",
    focusAreas: [
      "Trust & family structure review",
      "Succession planning",
      "Intergenerational transfer strategy",
      "Governance framework overview",
    ],
    deliverable: "Legacy Strategy Report & Structural Recommendations",
    advisorType: "Accredited Wealth Manager",
    serviceId: "legacy-estate-planning",
  },
  {
    number: "04",
    title: "International Property Advisory",
    audience:
      "For clients acquiring, financing, or structuring real estate across jurisdictions.",
    description:
      "A specialist session with an accredited property consultant covering the full picture of an international acquisition - from ownership structures and offshore financing to yield expectations, jurisdiction-specific risks, and portfolio fit.",
    focusAreas: [
      "Acquisition structure analysis",
      "Offshore financing review",
      "Yield & valuation assessment",
      "Jurisdiction risk overview",
    ],
    deliverable: "Property Advisory Report & Structuring Guidance",
    advisorType: "Accredited Property Consultant",
    serviceId: "international-property-advisory",
  },
  {
    number: "05",
    title: "Business Financing & Capital Strategy",
    audience:
      "For founders and SME owners navigating debt, growth capital, or balance sheet restructuring.",
    description:
      "A structured advisory session with a senior financial advisor focused on capital decisions including optimal debt structures, refinancing opportunities, equity vs. debt trade-offs, and how to position your business for banks, private credit, or investors.",
    focusAreas: [
      "Capital needs assessment",
      "Debt optimisation review",
      "Equity vs. debt analysis",
      "Lender / investor positioning",
    ],
    deliverable: "Financing Plan & Capital Strategy Recommendations",
    advisorType: "Senior Financial Advisor",
    serviceId: "business-financing-capital-strategy",
  },
];

export default function ConciergePage() {
  const [selectedId, setSelectedId] = React.useState<string>(
    SERVICES[0]?.serviceId || "",
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<ConciergeService | null>(null);

  const selectedService = SERVICES.find((s) => s.serviceId === selectedId);

  function openInquiry(service: ServiceCard) {
    const picked: ConciergeService = {
      id: service.serviceId,
      title: service.title,
      subtitle: service.audience,
    };

    setSelected(picked);
    setDialogOpen(true);
  }

  function openCustomInquiry() {
    const picked: ConciergeService = {
      id: "custom",
      title: "Custom request",
      subtitle: "Share what you need and we’ll confirm scope and next steps.",
    };

    setSelected(picked);
    setDialogOpen(true);
  }

  async function handleSubmit(payload: any) {
    console.log("Service inquiry submitted:", payload);
  }

  return (
    <div className="w-full">
      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* LEFT PANEL (LIST) */}
        <div className="rounded-2xl border border-black/10 bg-white p-3" data-tour="primary-action">
          <p className="px-3 pb-3 text-sm font-semibold text-neutral-900">
            Advisory services
          </p>

          <div className="space-y-1">
            {SERVICES.map((service) => {
              const isActive = service.serviceId === selectedId;

              return (
                <button
                  key={service.serviceId}
                  onClick={() => setSelectedId(service.serviceId)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition ${
                    isActive ? "bg-[#1a1856]/5" : "hover:bg-neutral-50"
                  }`}
                >
                  <p className="text-xs text-neutral-500">{service.number}</p>
                  <p className="text-sm font-medium text-neutral-900">
                    {service.title}
                  </p>
                  <p className="mt-1 text-xs text-neutral-600 line-clamp-2">
                    {service.audience}
                  </p>
                </button>
              );
            })}
          </div>

          {/* CUSTOM REQUEST */}
          <div className="mt-3 border-t pt-3">
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={openCustomInquiry}
            >
              Custom request
            </Button>
          </div>
        </div>

        {/* RIGHT PANEL (DETAIL) */}
        <motion.div
          key={selectedService?.serviceId}
          initial={{ opacity: 0, transform: "translateY(10px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-4"
        >
          {/* MAIN CARD */}
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            {!selectedService ? (
              <p className="text-sm text-neutral-500">
                Select a service to view details
              </p>
            ) : (
              <div className="space-y-6">
                {/* HEADER */}
                <div>
                  <p className="text-xs text-neutral-500">
                    {selectedService.number}
                  </p>
                  <h2 className="text-xl font-semibold text-neutral-900">
                    {selectedService.title}
                  </h2>
                  <p className="mt-2 text-sm text-neutral-600 max-w-xl">
                    {selectedService.audience}
                  </p>
                </div>

                {/* DESCRIPTION */}
                <p className="text-sm leading-6 text-neutral-700 max-w-2xl">
                  {selectedService.description}
                </p>

                {/* FOCUS */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Focus areas
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedService.focusAreas.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>

                {/* META */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-neutral-500">Deliverable</p>
                    <p className="text-sm text-neutral-800">
                      {selectedService.deliverable}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-neutral-500">Advisor</p>
                    <p className="text-sm text-neutral-800">
                      {selectedService.advisorType}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-2">
                  <Button
                    className="rounded-full bg-[#1a1856] text-white hover:bg-[#1a1856]/90"
                    onClick={() => openInquiry(selectedService)}
                  >
                    Request service
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* LOWER GRID (fills space nicely) */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* WHAT YOU GET */}
            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-5">
              <p className="text-xs tracking-[0.2em] text-neutral-500">
                WHAT YOU RECEIVE
              </p>
              <p className="mt-2 text-sm leading-6 text-neutral-700">
                Each engagement leads to a clear written outcome - an opinion,
                structured plan, allocation recommendation, or advisory report
                tailored to your situation.
              </p>
            </div>

            {/* HOW IT WORKS */}
            <div className="rounded-2xl border border-black/10 bg-neutral-50 p-5">
              <p className="text-xs tracking-[0.2em] text-neutral-500">
                HOW IT WORKS
              </p>

              <div className="mt-3 space-y-3 text-sm text-neutral-700">
                <p>1. Choose a service</p>
                <p>2. Share your context</p>
                <p>3. We confirm scope & next steps</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <ServiceInquiryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={selected}
        onSubmit={handleSubmit}
      />
    </div>
  );
}