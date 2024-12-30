import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useUser } from "../hooks/use-user";

export default function EmailSettings() {
  const { user } = useUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>Your email verification status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Email Validation Status</Label>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${user?.emailValidated ? "bg-green-500" : "bg-yellow-500"}`}
            />
            <span className="text-sm">
              {user?.emailValidated ? "Verified" : "Pending verification"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {user?.emailValidated 
              ? "Your email is verified. You can now receive documents via email." 
              : "Please verify your email to start receiving documents."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}