import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative w-full overflow-hidden bg-background py-24 lg:py-32 flex flex-col items-center justify-center text-center">
      <div className="container px-4 md:px-6 flex flex-col items-center gap-8">
        <div className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          🚀 Nowość: Automatyzacja procesów
        </div>
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-balance">
            Zarządzaj swoim zespołem <br className="hidden sm:block" />
            <span className="text-primary">szybciej i mądrzej</span>
          </h1>
          <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl text-balance leading-relaxed">
            Nasza platforma dostarcza narzędzia, których potrzebujesz, aby usprawnić przepływ pracy, zwiększyć produktywność i skalować swój biznes bez technicznego bólu głowy.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto font-semibold rounded-full">
            Rozpocznij za darmo
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold rounded-full">
            Umów demo
          </Button>
        </div>
        <div className="mx-auto mt-10 w-full max-w-5xl rounded-2xl border bg-muted/20 p-2 md:p-4 shadow-2xl overflow-hidden">
          <div className="aspect-video rounded-xl bg-muted flex items-center justify-center border border-border overflow-hidden">
            <p className="text-muted-foreground font-medium">✨ [Miejsce na podgląd aplikacji] ✨</p>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
        <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-primary to-accent opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
      </div>
    </section>
  );
}