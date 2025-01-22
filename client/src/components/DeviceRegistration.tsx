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
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  oneTimeCode: z.string().length(8, "One-time code must be exactly 8 characters"),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  deviceId?: number;
  emailId?: string;
  onSuccess?: () => void;
  mode?: 'register' | 'reconnect';
}

export default function DeviceRegistration({ deviceId, emailId, onSuccess, mode = 'register' }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmailId, setRegisteredEmailId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oneTimeCode: "",
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    try {
      let response;

      if (mode === 'reconnect' && deviceId) {
        // Reconnect existing device
        const res = await fetch(`/api/device/${deviceId}/reconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ oneTimeCode: values.oneTimeCode }),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        response = await res.json();
        toast({
          title: "Device reconnected successfully",
          description: `Your device has been reconnected with email address: ${response.emailId}`,
        });
      } else {
        // Register new device
        const res = await fetch('/api/device/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });

        if (!res.ok) {
          throw new Error(await res.text());
        }

        response = await res.json();
        toast({
          title: "Device registered successfully",
          description: `Your delivery email address is: ${response.emailId}`,
        });
      }

      form.reset();
      setRegisteredEmailId(response.emailId);
      onSuccess?.();
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to register device",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === 'reconnect' ? 'Reconnect Device' : 'Device Registration'}
        </CardTitle>
        <CardDescription>
          {mode === 'reconnect'
            ? `Reconnect your reMarkable device using the same email address: ${emailId}`
            : 'Register your reMarkable device to enable email delivery'}
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
                      placeholder="Enter code from my.remarkable.com"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <p className="text-sm text-muted-foreground">
              Get a one-time code from{" "}
              <a
                className="text-blue-500 hover:underline"
                target="_blank"
                href="https://my.remarkable.com/device/mobile/connect"
              >
                my.remarkable.com/device/mobile/connect
              </a>
            </p>

            <Button type="submit" disabled={isLoading}>
              {mode === 'reconnect' ? 'Reconnect Device' : 'Register Device'}
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