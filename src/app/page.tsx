import Link from "next/link";
import { ArrowRight, CalendarClock, LinkIcon, ListChecks } from "lucide-react";
import { SignedIn, SignedOut } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground text-sm">
              A
            </span>
            AsyncStand
          </Link>
          <nav className="flex items-center gap-2">
            <SignedOut>
              <Button asChild variant="ghost">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/sign-up">Get started</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            </SignedIn>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Async standups without the Slack chaos.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create a standup form, share a link, and see clean latest updates
            from your team — no employee accounts required.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3">
            <SignedOut>
              <Button asChild size="lg">
                <Link href="/sign-up">
                  Get started <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </SignedOut>
            <SignedIn>
              <Button asChild size="lg">
                <Link href="/dashboard">
                  Go to dashboard <ArrowRight />
                </Link>
              </Button>
            </SignedIn>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3">
          {[
            {
              icon: ListChecks,
              title: "Reusable templates",
              body: "Build standup forms with ordered questions you can reuse across sessions.",
            },
            {
              icon: LinkIcon,
              title: "Share a public link",
              body: "Teammates answer from one link. We keep only their latest response.",
            },
            {
              icon: CalendarClock,
              title: "Recurring schedules",
              body: "Run daily or weekday standups that open and auto-close on time.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-6">
              <f.icon className="size-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">
          AsyncStand — a B2B async standup MVP.
        </div>
      </footer>
    </div>
  );
}
