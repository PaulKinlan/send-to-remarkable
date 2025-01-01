import { useState, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  GoogleReCaptchaProvider,
  GoogleReCaptcha,
} from "react-google-recaptcha-v3";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";

const registerFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  recaptchaToken: z
    .string()
    .min(1, "Please complete the reCAPTCHA verification"),
});

const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterFormData = z.infer<typeof registerFormSchema>;
type LoginFormData = z.infer<typeof loginFormSchema>;

const RECAPTCHA_SITE_KEY = "6LcYRKkqAAAAAEcuWK8LBvsqElzKLPwCZMGBmejQ";

// Add debug logging
console.log("RECAPTCHA_SITE_KEY available:", !!RECAPTCHA_SITE_KEY);

if (!RECAPTCHA_SITE_KEY) {
  console.error("Missing RECAPTCHA_SITE_KEY environment variable");
}

export default function AuthPage() {
  const { login, register } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(
    null,
  );
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const [refreshReCaptcha, setRefreshReCaptcha] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      toast({
        title: "Email Verified",
        description: "Your email has been verified. You can now log in.",
      });
      setLocation("/", { replace: true });
      setActiveTab("login");
    }
  }, [toast, setLocation]);

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      email: "",
      password: "",
      recaptchaToken: "",
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const verifyReCaptcha = useCallback((token: string) => {
    setRecaptchaError(null);

    registerForm.setValue("recaptchaToken", token);
    setRecaptchaToken(token);
  }, []);

  async function onSubmit(values: RegisterFormData, isLogin: boolean) {
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(values);
      } else {
        if (!RECAPTCHA_SITE_KEY) {
          toast({
            title: "Error",
            description:
              "Registration is temporarily unavailable. Please try again later.",
            variant: "destructive",
          });
          return;
        }
        const result = await register({
          email: values.email,
          password: values.password,
          recaptchaToken: values.recaptchaToken,
        });
        if (result.requiresVerification) {
          setVerificationStatus(
            "Please check your email to verify your account before logging in.",
          );
          setActiveTab("login");
          registerForm.reset();
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setRefreshReCaptcha(!refreshReCaptcha);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>remarkable-email</CardTitle>
          <CardDescription>
            Send documents to your reMarkable device via email.
          </CardDescription>
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

            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit((values) =>
                    onSubmit(values, true),
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={loginForm.control}
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
                    control={loginForm.control}
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
              </Form>
            </TabsContent>
            <TabsContent value="register">
              <Form {...registerForm}>
                <form
                  onSubmit={registerForm.handleSubmit((values) =>
                    onSubmit(values, false),
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={registerForm.control}
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
                    control={registerForm.control}
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
                  {RECAPTCHA_SITE_KEY ? (
                    <div className="flex justify-center my-4">
                      <GoogleReCaptchaProvider
                        reCaptchaKey={RECAPTCHA_SITE_KEY}
                      >
                        <GoogleReCaptcha
                          onVerify={verifyReCaptcha}
                          refreshReCaptcha={refreshReCaptcha}
                        />
                      </GoogleReCaptchaProvider>
                    </div>
                  ) : (
                    <div className="text-red-500 text-center p-2">
                      Registration temporarily unavailable
                    </div>
                  )}
                  {recaptchaError && (
                    <div className="text-red-500 text-sm text-center">
                      {recaptchaError}
                    </div>
                  )}
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      isLoading || !recaptchaToken || !RECAPTCHA_SITE_KEY
                    }
                  >
                    Register
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
