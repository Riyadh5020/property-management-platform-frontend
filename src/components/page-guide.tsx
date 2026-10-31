import { useRouterState } from "@tanstack/react-router";
import { CircleHelp } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { guideForPath } from "@/lib/page-guides";

const LANGUAGE_KEY = "estateops.guideLanguage";
type Language = "bn" | "en";

const LABELS = {
  bn: { steps: "কীভাবে করবেন", example: "উদাহরণ" },
  en: { steps: "How to use it", example: "Example" },
};

// A help button for the current page, in Bangla and English.
export function PageGuide() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const guide = guideForPath(pathname);
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<Language>("bn");

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LANGUAGE_KEY) === "en") setLanguage("en");
    } catch {
      // The choice just won't be remembered.
    }
  }, []);

  if (!guide) return null;

  const choose = (next: Language) => {
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_KEY, next);
    } catch {
      // The choice just won't be remembered.
    }
  };

  const text = guide[language];
  const labels = LABELS[language];

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} title="Page guide">
        <CircleHelp className="size-4" /> Guide
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <div className="mb-2 flex w-fit gap-1 rounded-md border border-border p-0.5">
              <Button
                size="sm"
                className="h-7"
                variant={language === "bn" ? "secondary" : "ghost"}
                onClick={() => choose("bn")}
              >
                বাংলা
              </Button>
              <Button
                size="sm"
                className="h-7"
                variant={language === "en" ? "secondary" : "ghost"}
                onClick={() => choose("en")}
              >
                English
              </Button>
            </div>
            <DialogTitle>{text.title}</DialogTitle>
            <DialogDescription>{text.purpose}</DialogDescription>
          </DialogHeader>
          <div>
            <h3 className="text-sm font-semibold">{labels.steps}</h3>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
              {text.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <h3 className="text-sm font-semibold">{labels.example}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text.example}</p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
