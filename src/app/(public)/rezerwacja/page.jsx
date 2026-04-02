import PublicBookingWidget from "@/components/features/calendar/PublicBookingWidget";

export default function BookingPage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-4xl flex-col justify-center px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">Rezerwacja rozmowy</h1>
        <p className="text-muted-foreground">
          Wybierz dogodny termin i zostaw kontakt, a potwierdzimy spotkanie.
        </p>
      </div>
      <PublicBookingWidget />
    </section>
  );
}
