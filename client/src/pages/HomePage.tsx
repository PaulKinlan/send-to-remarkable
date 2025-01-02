
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">SendVia me</h1>
          <p className="text-xl text-muted-foreground">
            Email documents directly to your reMarkable tablet
          </p>
        </div>
        
        <div className="space-y-6 text-center">
          <p className="text-lg">
            Simply register your device, get a unique email address, and send documents as email attachments.
            Your files will appear on your tablet within seconds.
          </p>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Supports PDF and EPUB files, plus HTML emails are automatically converted to PDF.
            </p>
            <p className="text-sm text-muted-foreground italic">
              This is an independent project and is not affiliated with, endorsed by, 
              or connected to reMarkable AS, the makers of the reMarkable tablet.
            </p>
          </div>

          <Button asChild size="lg">
            <Link href="/dashboard">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
