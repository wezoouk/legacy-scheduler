import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { Mail, Lock, Loader2, AlertTriangle } from "lucide-react";

const signInSchema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof signInSchema>;

export function SignInPage() {
  const [error, setError] = useState("");
  const { login, isLoading } = useAuth();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    try {
      setError("");
      await login(data.email, data.password);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Invalid email or password";
      setError(errorMessage);
    }
  };

  const fillDemoCredentials = async () => {
    // Fill the form fields with demo credentials
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('password') as HTMLInputElement;
    if (emailInput) emailInput.value = 'demo@legacyscheduler.com';
    if (passwordInput) passwordInput.value = 'demo123456';
  };

  const loginAsAdmin = async () => {
    try {
      setError("");
      await login('davwez@gmail.com', 'admin123456');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to login as admin";
      setError(errorMessage);
    }
  };

  const loginAsDemo = async () => {
    try {
      setError("");
      await login('demo@legacyscheduler.com', 'demo123456');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to login as demo user";
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Legacy Scheduler account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  className="pl-10"
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || isLoading}
            >
              {(isSubmitting || isLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link to="/auth/sign-up" className="text-primary hover:underline">
              Sign up
            </Link>
          </div>

          {/* Demo Helper */}
          <div className="mt-4 pt-4 border-t">
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loginAsDemo}
                className="w-full text-xs"
                disabled={isLoading || isSubmitting}
              >
                {(isLoading || isSubmitting) && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Login as Demo User
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loginAsAdmin}
                className="w-full text-xs bg-purple-50 hover:bg-purple-100 text-purple-700"
                disabled={isLoading || isSubmitting}
              >
                {(isLoading || isSubmitting) && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Login as Admin (davwez@gmail.com)
              </Button>
            </div>
          </div>

          {/* Manual Demo Helper */}
          <div className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const emailInput = document.getElementById('email') as HTMLInputElement;
                const passwordInput = document.getElementById('password') as HTMLInputElement;
                if (emailInput) emailInput.value = 'demo@legacyscheduler.com';
                if (passwordInput) passwordInput.value = 'demo123456';
              }}
              className="w-full text-xs"
            >
              Fill Demo Credentials (Manual)
            </Button>
          </div>

          {/* Local Mode Notice */}
          <div className="mt-4 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Running in local mode - data stored in browser
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}