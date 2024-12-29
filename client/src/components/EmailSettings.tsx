import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useUser } from "../hooks/use-user";

export default function EmailSettings() {
  const { user } = useUser();
  const deliveryEmail = `${user?.id}@remarkable-email.example.com`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Settings</CardTitle>
        <CardDescription>Your personal email delivery address</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="delivery-email">Delivery Email</Label>
          <Input
            id="delivery-email"
            value={deliveryEmail}
            readOnly
            className="font-mono"
          />
          <p className="text-sm text-muted-foreground">
            Send or forward emails to this address to deliver documents to your reMarkable
          </p>
        </div>

        <div className="space-y-2">
          <Label>Email Validation Status</Label>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${user?.emailValidated ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-sm">
              {user?.emailValidated ? 'Verified' : 'Pending verification'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}