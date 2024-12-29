import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUser } from "../hooks/use-user";

const formSchema = z.object({
  oneTimeCode: z.string().length(8, "One-time code must be exactly 8 characters"),
});

export default function DeviceRegistration() {
  const { registerDevice } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      oneTimeCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await registerDevice(values);
      form.reset();
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
                    <Input {...field} placeholder="Enter code from my.remarkable.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading}>
              Register Device
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
