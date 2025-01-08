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
});

export default function DeviceRegistration() {
  const { registerDevice } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [emailId, setEmailId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oneTimeCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await registerDevice(values);
      form.reset();
      setEmailId(response.emailId);
      toast({
        title: "Device registered successfully",
        description: `Your delivery email address is: ${response.emailId}`,
      });
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
        <CardTitle>Device Registration</CardTitle>
        <CardDescription>
          Register your reMarkable device to enable email delivery
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

            <p className="text-war">
             Warning: {" "}
              <a
                className="text-blue-500 hover:underline"
                target="_blank"
                href="https://my.remarkable.com/device/mobile/connect"
              >
                https://my.remarkable.com/device/mobile/connect
              </a>
            </p>

            <Button type="submit" disabled={isLoading}>
              Register Device
            </Button>

            {emailId && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Your delivery email address:
                </p>
                <p className="text-sm font-mono mt-1">{emailId}</p>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
