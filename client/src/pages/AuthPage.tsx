import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import ReCAPTCHA from "react-google-recaptcha";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "../hooks/use-user";
import { useLocation } from "wouter";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  recaptchaToken: z.string().min(1, "Please complete the reCAPTCHA verification")
});

export default function AuthPage() {
  const { login, register } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);

  useEffect(() => {
    // Check for verification success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      toast({
        title: "Email Verified",
        description: "Your email has been verified. You can now log in.",
      });
      setLocation('/', { replace: true }); // Clear the URL parameter
      setActiveTab('login');
    }
  }, [toast, setLocation]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      recaptchaToken: ""
    },
  });

  function onRecaptchaChange(token: string | null) {
    if (token) {
      form.setValue('recaptchaToken', token);
      setRecaptchaToken(token);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>, isLogin: boolean) {
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(values);
      } else {
        // Only include recaptchaToken for registration
        const result = await register({
          email: values.email,
          password: values.password,
          recaptchaToken: values.recaptchaToken
        });
        if (result.requiresVerification) {
          setVerificationStatus("Please check your email to verify your account before logging in.");
          setActiveTab("login");
          form.reset();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>remarkable-email</CardTitle>
          <CardDescription>Send documents to your reMarkable device via email.</CardDescription>
        </CardHeader>
        <CardContent>
          {verificationStatus && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-md">
              {verificationStatus}
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <Form {...form}>
              <TabsContent value="login">
                <form onSubmit={form.handleSubmit((values) => onSubmit(values, true))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    Login
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={form.handleSubmit((values) => onSubmit(values, false))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-center my-4">
                    <ReCAPTCHA
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                      onChange={onRecaptchaChange}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading || !recaptchaToken}>
                    Register
                  </Button>
                </form>
              </TabsContent>
            </Form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}