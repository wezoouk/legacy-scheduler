import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock, Bell, Mail, Phone, AlertTriangle, Plus, X } from "lucide-react";

const reminderSchema = z.object({
  id: z.string(),
  daysBefore: z.number().min(1, "Must be at least 1 day").max(365, "Cannot exceed 365 days"),
  timeUnit: z.enum(['days', 'weeks', 'months']),
  method: z.enum(['email', 'sms', 'push']),
});

const dmsActivationSchema = z.object({
  frequencyDays: z.number().min(1, "Must be at least 1 day").max(365, "Cannot exceed 365 days"),
  graceDays: z.number().min(0, "Cannot be negative").max(30, "Cannot exceed 30 days"),
  durationDays: z.number().min(1, "Must be at least 1 day").max(365, "Cannot exceed 365 days"),
  checkInReminderHours: z.number().min(1, "Must be at least 1 hour").max(168, "Cannot exceed 7 days"),
  channels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
  authorReminders: z.array(reminderSchema).optional(),
});

type DmsActivationForm = z.infer<typeof dmsActivationSchema>;

interface DmsActivationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate: (config: DmsActivationForm) => void;
}

export function DmsActivationDialog({ open, onOpenChange, onActivate }: DmsActivationDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authorReminders, setAuthorReminders] = useState<Array<{
    id: string;
    daysBefore: number;
    timeUnit: 'days' | 'weeks' | 'months';
    method: 'email' | 'sms' | 'push';
  }>>([]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DmsActivationForm>({
    resolver: zodResolver(dmsActivationSchema),
    defaultValues: {
      frequencyDays: 7,
      graceDays: 3,
      durationDays: 30,
      checkInReminderHours: 24,
      channels: {
        email: true,
        sms: false,
        push: true,
      },
    },
  });

  const watchedChannels = watch('channels');

  const addReminder = () => {
    const newReminder = {
      id: crypto.randomUUID(),
      daysBefore: 1,
      timeUnit: 'days' as const,
      method: 'email' as const,
    };
    setAuthorReminders([...authorReminders, newReminder]);
  };

  const removeReminder = (id: string) => {
    setAuthorReminders(authorReminders.filter(r => r.id !== id));
  };

  const updateReminder = (id: string, field: string, value: any) => {
    setAuthorReminders(authorReminders.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const onSubmit = async (data: DmsActivationForm) => {
    setIsSubmitting(true);
    try {
      const configWithReminders = {
        ...data,
        authorReminders: authorReminders,
      };
      await onActivate(configWithReminders);
      onOpenChange(false);
    } catch (error) {
      console.error('Error activating DMS:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyDays = watch('frequencyDays');
  const graceDays = watch('graceDays');
  const durationDays = watch('durationDays');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Activate Dead Man's Switch
          </DialogTitle>
          <DialogDescription>
            Configure your DMS settings to protect this message
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Quick Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="frequencyDays" className="text-sm">Check-in Every</Label>
              <Input
                id="frequencyDays"
                type="number"
                min="1"
                max="365"
                className="h-8 text-sm"
                {...register("frequencyDays", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">days</p>
              {errors.frequencyDays && (
                <p className="text-xs text-destructive">{errors.frequencyDays.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="graceDays" className="text-sm">Grace Period</Label>
              <Input
                id="graceDays"
                type="number"
                min="0"
                max="30"
                className="h-8 text-sm"
                {...register("graceDays", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">days</p>
              {errors.graceDays && (
                <p className="text-xs text-destructive">{errors.graceDays.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="durationDays" className="text-sm">DMS Duration</Label>
              <Input
                id="durationDays"
                type="number"
                min="1"
                max="365"
                className="h-8 text-sm"
                {...register("durationDays", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">days</p>
              {errors.durationDays && (
                <p className="text-xs text-destructive">{errors.durationDays.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="checkInReminderHours" className="text-sm">Reminder</Label>
              <Input
                id="checkInReminderHours"
                type="number"
                min="1"
                max="168"
                className="h-8 text-sm"
                {...register("checkInReminderHours", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">hours before</p>
              {errors.checkInReminderHours && (
                <p className="text-xs text-destructive">{errors.checkInReminderHours.message}</p>
              )}
            </div>
          </div>

          {/* Notification Channels */}
          <div className="space-y-2">
            <Label className="text-sm">Notifications</Label>
            <div className="flex gap-3">
              <div className="flex items-center space-x-1">
                <Checkbox
                  checked={watchedChannels.email}
                  onCheckedChange={(checked) => setValue('channels.email', !!checked)}
                />
                <Mail className="h-3 w-3" />
                <span className="text-sm">Email</span>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  checked={watchedChannels.sms}
                  onCheckedChange={(checked) => setValue('channels.sms', !!checked)}
                />
                <Phone className="h-3 w-3" />
                <span className="text-sm">SMS</span>
              </div>
              <div className="flex items-center space-x-1">
                <Checkbox
                  checked={watchedChannels.push}
                  onCheckedChange={(checked) => setValue('channels.push', !!checked)}
                />
                <Bell className="h-3 w-3" />
                <span className="text-sm">Push</span>
              </div>
            </div>
          </div>

          {/* Author Reminders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Author Reminders</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addReminder}
                className="h-7 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Reminder
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Set up reminders to be sent to you before check-in deadlines
            </p>
            
            {authorReminders.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                <Bell className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reminders configured</p>
                <p className="text-xs">Click "Add Reminder" to set up check-in notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {authorReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50 dark:bg-gray-900">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={reminder.daysBefore}
                      onChange={(e) => updateReminder(reminder.id, 'daysBefore', parseInt(e.target.value) || 1)}
                      className="w-16 h-7 text-xs"
                    />
                    <Select
                      value={reminder.timeUnit}
                      onValueChange={(value) => updateReminder(reminder.id, 'timeUnit', value)}
                    >
                      <SelectTrigger className="w-20 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-xs text-muted-foreground">Before</span>
                    <Select
                      value={reminder.method}
                      onValueChange={(value) => updateReminder(reminder.id, 'method', value)}
                    >
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">via Email</SelectItem>
                        <SelectItem value="sms">via SMS</SelectItem>
                        <SelectItem value="push">via Push</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeReminder(reminder.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-blue-900/20 border border-blue-700/30 p-3 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-blue-300" />
              <span className="text-sm font-medium text-blue-300">DMS Summary</span>
            </div>
            <div className="text-xs text-blue-400 space-y-1">
              <p>• Check in every <Badge variant="outline" className="text-xs bg-blue-800/30 border-blue-600 text-blue-300">{frequencyDays} days</Badge></p>
              <p>• <Badge variant="outline" className="text-xs bg-blue-800/30 border-blue-600 text-blue-300">{graceDays} days</Badge> grace period after missed check-in</p>
              <p>• DMS active for <Badge variant="outline" className="text-xs bg-blue-800/30 border-blue-600 text-blue-300">{durationDays} days</Badge></p>
              <p>• Reminder <Badge variant="outline" className="text-xs bg-blue-800/30 border-blue-600 text-blue-300">{watch('checkInReminderHours')} hours</Badge> before check-in</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-yellow-500 hover:bg-yellow-600 text-black border-yellow-500 hover:border-yellow-600">
              {isSubmitting ? 'Activating...' : 'Activate DMS'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


