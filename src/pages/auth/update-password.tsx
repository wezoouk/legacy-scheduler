import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof schema>;

export function UpdatePasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    // When the user follows the email link, Supabase sets a recovery session
    const init = async () => {
      try {
        if (!supabase) throw new Error("Supabase not configured");
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          setHasRecoverySession(true);
        }
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
          if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
            setHasRecoverySession(true);
          }
        });
        return () => subscription.unsubscribe();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Initialization error");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const onSubmit = async (data: FormValues) => {
    setError("");
    setSuccess("");
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (updateError) throw new Error(updateError.message);
      setSuccess("Your password has been updated. You can now sign in.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
          <CardDescription>Choose a strong new password</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasRecoverySession && (
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                We couldn’t detect a recovery session. Please open this page using the password reset link sent to your email.
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="Enter a new password" className="pl-10" {...register("password")} />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="confirmPassword" type="password" placeholder="Confirm your new password" className="pl-10" {...register("confirmPassword")} />
              </div>
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || !hasRecoverySession}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


