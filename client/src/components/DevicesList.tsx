import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/hooks/use-user";
import { Trash2, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import DeviceRegistration from "./DeviceRegistration";

interface Device {
  id: number;
  emailId: string;
  registered: boolean;
  createdAt: string;
}

export default function DevicesList() {
  const { deleteDevice } = useUser();
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const { data: devices, isLoading, refetch } = useQuery<Device[]>({
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
              className="p-4 border rounded-lg bg-muted flex justify-between items-center"
            >
              <div>
                <p className="text-sm font-medium">Delivery Email:</p>
                <p className="text-sm font-mono mt-1">{device.emailId}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Registered on {new Date(device.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setSelectedDevice(device)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reconnect Device</DialogTitle>
                      <DialogDescription>
                        Get a new one-time code to reconnect your device while keeping the same email address.
                      </DialogDescription>
                    </DialogHeader>
                    {selectedDevice && (
                      <DeviceRegistration
                        mode="reconnect"
                        deviceId={selectedDevice.id}
                        emailId={selectedDevice.emailId}
                        onSuccess={() => {
                          setSelectedDevice(null);
                          refetch();
                        }}
                      />
                    )}
                  </DialogContent>
                </Dialog>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteDevice(device.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}