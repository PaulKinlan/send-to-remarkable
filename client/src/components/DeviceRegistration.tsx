import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "../hooks/use-user";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  oneTimeCode: z
    .string()
    .length(8, "One-time code must be exactly 8 characters"),
  deviceId: z.number().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  deviceId?: number;
  emailId?: string;
  onSuccess?: () => void;
}

export default function DeviceRegistration({ deviceId, emailId, onSuccess }: Props) {
  const { registerDevice, reRegisterDevice } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmailId, setRegisteredEmailId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oneTimeCode: "",
      deviceId: deviceId,
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    try {
      let response;
      if (deviceId) {
        // Re-register existing device
        response = await reRegisterDevice({
          oneTimeCode: values.oneTimeCode,
          deviceId,
        });
        toast({
          title: "Device re-registered successfully",
          description: `Your existing delivery email address ${response.emailId} has been reconnected.`,
        });
      } else {
        // Register new device
        response = await registerDevice(values);
        toast({
          title: "Device registered successfully",
          description: `Your delivery email address is: ${response.emailId}`,
        });
      }

      form.reset();
      setRegisteredEmailId(response.emailId);
      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to register device. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{deviceId ? "Reconnect Device" : "Device Registration"}</CardTitle>
        <CardDescription>
          {deviceId 
            ? "Re-register your reMarkable device to restore email delivery"
            : "Register your reMarkable device to enable email delivery"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="oneTimeCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>One-time Code</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter code from https://my.remarkable.com/device/mobile/connect"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-muted-foreground">
              Get a one-time code from{" "}
              <a
                className="text-blue-500 hover:underline"
                target="_blank"
                href="https://my.remarkable.com/device/mobile/connect"
              >
                https://my.remarkable.com/device/mobile/connect
              </a>
            </p>

            {emailId && (
              <p className="text-sm text-muted-foreground">
                This will reconnect your device to the email address: <strong>{emailId}</strong>
              </p>
            )}

            <Button type="submit" disabled={isLoading}>
              {deviceId ? "Reconnect Device" : "Register Device"}
            </Button>

            {registeredEmailId && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Your delivery email address:
                </p>
                <p className="text-sm font-mono mt-1">{registeredEmailId}</p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}