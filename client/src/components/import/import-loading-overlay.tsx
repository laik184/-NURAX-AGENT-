import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportLoadingOverlayProps {
  serviceName: string;
  serviceColor: string;
  serviceIcon: React.ReactNode;
  steps: string[];
}

export function ImportLoadingOverlay({
  serviceName,
  serviceColor,
  serviceIcon,
  steps,
}: ImportLoadingOverlayProps) {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);

  const stepDuration = 6000 / steps.length;

  useEffect(() => {
    // Progress bar
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / 6000) * 100, 100);
      setProgress(pct);
      if (pct >= 100) clearInterval(progressInterval);
    }, 30);

    // Steps
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      if (i === 0) return; // step 0 is already active
      const t = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, i - 1]);
        setCurrentStep(i);
      }, stepDuration * i);
      stepTimers.push(t);
    });

    // Final: complete last step and navigate
    const finalTimer = setTimeout(() => {
      setCompletedSteps((prev) => [...prev, steps.length - 1]);
      setTimeout(() => setLocation("/workspace"), 400);
    }, 6000);

    return () => {
      clearInterval(progressInterval);
      stepTimers.forEach(clearTimeout);
      clearTimeout(finalTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "hsl(222,30%,7%)" }}
    >
      {/* Glow blob */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${serviceColor}18 0%, transparent 70%)`,
        }}
      />

      <div className="relative flex flex-col items-center w-full max-w-sm px-6">
        {/* Pulsing icon */}
        <div className="relative mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${serviceColor}33, ${serviceColor}18)`,
              border: `1px solid ${serviceColor}40`,
              boxShadow: `0 0 40px ${serviceColor}30`,
            }}
          >
            {serviceIcon}
          </div>
          {/* Orbit rings */}
          <div
            className="absolute inset-0 rounded-2xl animate-ping opacity-20"
            style={{ border: `2px solid ${serviceColor}` }}
          />
        </div>

        <h2 className="text-xl font-semibold text-white mb-1">
          Importing from {serviceName}
        </h2>
        <p className="text-sm text-muted-foreground mb-8 text-center">
          Setting up your workspace, please wait…
        </p>

        {/* Progress bar */}
        <div
          className="w-full h-1 rounded-full mb-8 overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-75"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${serviceColor}, #a78bfa)`,
              boxShadow: `0 0 8px ${serviceColor}80`,
            }}
          />
        </div>

        {/* Steps */}
        <div className="w-full space-y-3">
          {steps.map((step, i) => {
            const isCompleted = completedSteps.includes(i);
            const isActive = currentStep === i && !isCompleted;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 transition-all duration-300",
                  isCompleted || isActive ? "opacity-100" : "opacity-30"
                )}
              >
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : isActive ? (
                    <Loader2
                      className="w-4 h-4 animate-spin"
                      style={{ color: serviceColor }}
                    />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm transition-colors duration-300",
                    isCompleted
                      ? "text-green-400"
                      : isActive
                      ? "text-white"
                      : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
