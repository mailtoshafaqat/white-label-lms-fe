"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { StudentNav } from "@/components/student-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <StudentNav />
      <main className="mx-auto max-w-md px-6 py-12 text-center">
        <Card>
          <CardContent className="pt-8 pb-8">
            <XCircle className="mx-auto h-12 w-12 text-amber-600" />
            <h1 className="mt-4 text-xl font-bold text-slate-900">Payment cancelled</h1>
            <p className="mt-2 text-slate-600">No charge was made. You can try checkout again anytime.</p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
