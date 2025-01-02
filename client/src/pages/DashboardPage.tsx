import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "../hooks/use-user";
import DeviceRegistration from "../components/DeviceRegistration";
import DevicesList from "../components/DevicesList";
import EmailSettings from "../components/EmailSettings";

export default function DashboardPage() {
  const { user, logout } = useUser();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome</h1>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" onClick={() => logout()}>
            Logout
          </Button>
        </div>

        <div className="grid gap-8">
          <DeviceRegistration />
          <DevicesList />
          <EmailSettings />
        </div>
      </div>
    </div>
  );
}
