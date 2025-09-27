import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email("Invalid email address").min(1, "Email is required"),
});

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    setError("");
    setSuccess("");
    try {
      if (!supabase) throw new Error("Supabase not configured");
      const redirectTo = `${window.location.origin}/auth/update-password`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo,
      });
      if (resetError) throw new Error(resetError.message);
      setSuccess("If that email exists, a reset link has been sent.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to send reset email";
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>We'll email you a password reset link</CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="Enter your email" className="pl-10" {...register("email")} />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


