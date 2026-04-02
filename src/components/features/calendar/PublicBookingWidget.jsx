"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";

import {
  bookPublicMeeting,
  getPublicAvailableSlots,
} from "@/app/actions/publicBookingActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatDayLabel(dateIso) {
  return format(new Date(dateIso), "EEE, dd LLL", { locale: pl });
}

function formatSlotLabel(slotIso) {
  return format(new Date(slotIso), "HH:mm", { locale: pl });
}

export default function PublicBookingWidget() {
  const [isMounted, setIsMounted] = useState(false);
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isLoading, startLoading] = useTransition();
  const [isBooking, startBooking] = useTransition();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    startLoading(async () => {
      const res = await getPublicAvailableSlots(21);
      if (!res?.success) {
        setStatus({
          type: "error",
          message: res?.error || "Nie udało się pobrać terminów.",
        });
        return;
      }

      const nextDays = res.days || [];
      setDays(nextDays);
      const firstDay = nextDays[0]?.date || "";
      setSelectedDay(firstDay);
      setSelectedSlot(nextDays[0]?.slots?.[0] || "");
    });
  }, [isMounted]);

  const currentSlots = useMemo(() => {
    const selected = days.find((d) => d.date === selectedDay);
    return selected?.slots || [];
  }, [days, selectedDay]);

  const onSubmit = (e) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    startBooking(async () => {
      const res = await bookPublicMeeting({
        name,
        email,
        phone,
        slotStart: selectedSlot,
      });

      if (!res?.success) {
        setStatus({
          type: "error",
          message: res?.error || "Nie udało się zarezerwować rozmowy.",
        });
        return;
      }

      setStatus({
        type: "success",
        message: "Termin został zarezerwowany. Otrzymasz potwierdzenie mailowo.",
      });
      setName("");
      setEmail("");
      setPhone("");
    });
  };

  if (!isMounted) {
    return (
      <Card className="w-full border-primary/20 bg-background/90 shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Umów rozmowę</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Ładowanie formularza...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-primary/20 bg-background/90 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">Umów rozmowę</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid gap-3">
          <Label>Dostępne dni</Label>
          <div className="flex flex-wrap gap-2">
            {days.map((day) => (
              <Button
                key={day.date}
                type="button"
                size="sm"
                variant={selectedDay === day.date ? "default" : "outline"}
                onClick={() => {
                  setSelectedDay(day.date);
                  setSelectedSlot(day.slots[0] || "");
                }}
              >
                {formatDayLabel(day.date)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          <Label>Dostępne godziny</Label>
          <div className="flex flex-wrap gap-2">
            {currentSlots.map((slot) => (
              <Button
                key={slot}
                type="button"
                size="sm"
                variant={selectedSlot === slot ? "default" : "outline"}
                onClick={() => setSelectedSlot(slot)}
              >
                {formatSlotLabel(slot)}
              </Button>
            ))}
            {!currentSlots.length && !isLoading ? (
              <div className="text-sm text-muted-foreground">
                Brak dostępnych godzin dla wybranego dnia.
              </div>
            ) : null}
          </div>
        </div>

        <form className="grid gap-3" onSubmit={onSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="booking-name">Imię i nazwisko</Label>
            <Input
              id="booking-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jan Kowalski"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-email">E-mail</Label>
            <Input
              id="booking-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jan@firma.pl"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="booking-phone">Telefon (opcjonalnie)</Label>
            <Input
              id="booking-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+48 500 600 700"
            />
          </div>

          <Button type="submit" disabled={!selectedSlot || isBooking || isLoading}>
            {isBooking ? "Rezerwowanie..." : "Rezerwuj rozmowę"}
          </Button>
        </form>

        {status.message ? (
          <div
            className={
              status.type === "success"
                ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700"
                : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            }
          >
            {status.message}
          </div>
        ) : null}

        {isLoading ? (
          <div className="text-sm text-muted-foreground">Ładowanie terminów...</div>
        ) : null}
      </CardContent>
    </Card>
  );
}
