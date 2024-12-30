import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Device {
  id: number;
  emailId: string;
  registered: boolean;
  createdAt: string;
}

export default function DevicesList() {
  const { data: devices, isLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>Loading your devices...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!devices?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
          <CardDescription>No devices registered yet</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Devices</CardTitle>
        <CardDescription>
          Your registered devices and their delivery addresses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="p-4 border rounded-lg bg-muted"
            >
              <p className="text-sm font-medium">Delivery Email:</p>
              <p className="text-sm font-mono mt-1">{device.emailId}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Registered on {new Date(device.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
