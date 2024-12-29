import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "../hooks/use-user";
import DeviceRegistration from "../components/DeviceRegistration";
import EmailSettings from "../components/EmailSettings";

export default function DashboardPage() {
  const { user, logout } = useUser();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.username}</h1>
            <p className="text-muted-foreground">Manage your reMarkable email delivery settings</p>
          </div>
          <Button variant="outline" onClick={() => logout()}>Logout</Button>
        </div>

        <div className="grid gap-8">
          <DeviceRegistration />
          <EmailSettings />

          <Card>
            <CardHeader>
              <CardTitle>How it works</CardTitle>
              <CardDescription>Send documents to your reMarkable device via email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">1. Register your device</h3>
                <p className="text-muted-foreground">
                  Get a one-time code from https://my.remarkable.com/device/mobile/connect
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">2. Verify your email</h3>
                <p className="text-muted-foreground">
                  Verify your email address to start sending documents
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium">3. Send documents</h3>
                <p className="text-muted-foreground">
                  Forward emails with attachments or send PDFs directly to your personal delivery address
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
