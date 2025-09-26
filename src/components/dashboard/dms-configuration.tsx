import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useMessages } from "@/lib/use-messages";
import { useRecipients } from "@/lib/use-recipients";
import { useAuth } from "@/lib/auth-context";
import { getMessageIcon, getRecipientNames } from "@/lib/use-messages";
import { 
  Shield, 
  Clock, 
  Mail, 
  Phone, 
  AlertTriangle, 
  CheckCircle, 
  Play, 
  Pause,
  Settings,
  Users,
  Calendar,
  Heart,
  Timer,
  Bell,
  Edit
} from "lucide-react";
import { format, addDays } from "date-fns";
import { EditMessageDialog } from "./edit-message-dialog";

// Countdown Timer Component
function CountdownTimer({ targetDate, isPaused = false }: { targetDate: Date; isPaused?: boolean }) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isOverdue: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: false });

  useEffect(() => {
    if (isPaused) {
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const target = targetDate.getTime();
      const difference = target - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds, isOverdue: false });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOverdue: true });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [targetDate, isPaused]);

  // If paused, show paused state
  if (isPaused) {
    return (
      <div className="text-yellow-600 font-bold">
        <Pause className="h-4 w-4 inline mr-1" />
        PAUSED
      </div>
    );
  }

  if (timeLeft.isOverdue) {
    return (
      <div className="text-red-600 font-bold">
        <AlertTriangle className="h-4 w-4 inline mr-1" />
        OVERDUE
      </div>
    );
  }

  return (
    <div className="font-mono text-lg">
      <span className="text-2xl font-bold text-blue-600">{timeLeft.days}</span>
      <span className="text-sm text-muted-foreground">d </span>
      <span className="text-xl font-bold text-blue-600">{timeLeft.hours.toString().padStart(2, '0')}</span>
      <span className="text-sm text-muted-foreground">:</span>
      <span className="text-xl font-bold text-blue-600">{timeLeft.minutes.toString().padStart(2, '0')}</span>
      <span className="text-sm text-muted-foreground">:</span>
      <span className="text-xl font-bold text-blue-600">{timeLeft.seconds.toString().padStart(2, '0')}</span>
    </div>
  );
}

// Local storage helpers
const STORAGE_KEYS = {
  DMS_CONFIG: 'dms-config',
  DMS_CYCLE: 'dms-cycle'
};

const loadDmsConfigFromLocalStorage = (): DmsConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DMS_CONFIG);
    if (stored) {
      const config = JSON.parse(stored);
      return {
        ...config,
        cooldownUntil: config.cooldownUntil ? new Date(config.cooldownUntil) : undefined,
        lastCheckin: config.lastCheckin ? new Date(config.lastCheckin) : undefined,
        nextCheckin: config.nextCheckin ? new Date(config.nextCheckin) : undefined,
      };
    }
  } catch (error) {
    console.error('Error loading DMS config from localStorage:', error);
  }
  return null;
};

const saveDmsConfigToLocalStorage = (config: DmsConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DMS_CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Error saving DMS config to localStorage:', error);
  }
};

const loadDmsCycleFromLocalStorage = (): DmsCycle | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DMS_CYCLE);
    if (stored) {
      const cycle = JSON.parse(stored);
      return {
        ...cycle,
        nextCheckinAt: new Date(cycle.nextCheckinAt),
      };
    }
  } catch (error) {
    console.error('Error loading DMS cycle from localStorage:', error);
  }
  return null;
};

const saveDmsCycleToLocalStorage = (cycle: DmsCycle): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DMS_CYCLE, JSON.stringify(cycle));
  } catch (error) {
    console.error('Error saving DMS cycle to localStorage:', error);
  }
};

const dmsConfigSchema = z.object({
  frequencyDays: z.number().min(1, "Frequency must be at least 1 day").max(365, "Frequency cannot exceed 365 days"),
  graceDays: z.number().min(0, "Grace period cannot be negative").max(30, "Grace period cannot exceed 30 days"),
  durationDays: z.number().min(1, "Duration must be at least 1 day").max(365, "Duration cannot exceed 365 days"),
  checkInReminderHours: z.number().min(1, "Check-in reminder must be at least 1 hour").max(168, "Check-in reminder cannot exceed 7 days"),
  channels: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }),
  escalationContactId: z.string().optional(),
  emergencyInstructions: z.string().optional(),
});

type DmsConfigForm = z.infer<typeof dmsConfigSchema>;

interface DmsConfig {
  id: string;
  frequencyDays: number;
  graceDays: number;
  durationDays: number;
  checkInReminderHours: number;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  escalationContactId?: string;
  emergencyInstructions?: string;
  status: 'INACTIVE' | 'ACTIVE' | 'PAUSED';
  cooldownUntil?: Date;
  lastCheckin?: Date;
  nextCheckin?: Date;
  startDate?: Date;
  endDate?: Date;
}

interface DmsCycle {
  id: string;
  nextCheckinAt: Date;
  state: 'ACTIVE' | 'GRACE' | 'PENDING_RELEASE' | 'RELEASED' | 'PAUSED';
  reminders: number[];
  checkInReminderSent?: boolean;
  lastReminderSent?: Date;
}

export function DmsConfiguration() {
  const [dmsConfig, setDmsConfig] = useState<DmsConfig | null>(null);
  const [currentCycle, setCurrentCycle] = useState<DmsCycle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [editingMessage, setEditingMessage] = useState<any>(null);
  
  const { user } = useAuth();
  const { messages, updateMessage } = useMessages();
  const { recipients } = useRecipients();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DmsConfigForm>({
    resolver: zodResolver(dmsConfigSchema),
    defaultValues: {
      frequencyDays: 7,
      graceDays: 3,
      channels: {
        email: true,
        sms: false,
        push: true,
      },
    },
  });

  const watchedChannels = watch('channels');

  useEffect(() => {
    if (user) {
      fetchDmsConfig();
    }
  }, [user, setValue]);

  const fetchDmsConfig = async () => {
    if (!user) return;

    try {
      // Load DMS config from localStorage
      const configData = loadDmsConfigFromLocalStorage();
      
      if (configData) {
        setDmsConfig(configData);
        
        // Set form values
        setValue('frequencyDays', configData.frequencyDays);
        setValue('graceDays', configData.graceDays);
        setValue('durationDays', configData.durationDays || 30);
        setValue('checkInReminderHours', configData.checkInReminderHours || 24);
        setValue('channels', configData.channels);
        setValue('escalationContactId', configData.escalationContactId || '');
        setValue('emergencyInstructions', configData.emergencyInstructions || '');

        // Load current cycle from localStorage
        const cycleData = loadDmsCycleFromLocalStorage();
        if (cycleData) {
          setCurrentCycle(cycleData);
        }
      }
    } catch (err) {
      console.error('Error in fetchDmsConfig:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: DmsConfigForm) => {
    try {
      if (!user) throw new Error('User not authenticated');

      const configData: DmsConfig = {
        id: dmsConfig?.id || `dms-${user.id}`,
        ...data,
        status: dmsConfig?.status || 'INACTIVE',
        startDate: dmsConfig?.startDate || new Date(),
        endDate: dmsConfig?.endDate || addDays(new Date(), data.durationDays),
      };

      // Save to localStorage
      saveDmsConfigToLocalStorage(configData);
      setDmsConfig(configData);

      // If DMS is active, update the cycle
      if (configData.status === 'ACTIVE') {
        const nextCheckin = addDays(new Date(), configData.frequencyDays);
        const cycleData: DmsCycle = {
          id: currentCycle?.id || `cycle-${configData.id}`,
          nextCheckinAt: nextCheckin,
          state: 'ACTIVE',
          reminders: [1, 3, 7], // Days before to send reminders
        };

        saveDmsCycleToLocalStorage(cycleData);
        setCurrentCycle(cycleData);
      }

      alert('DMS configuration saved successfully!');
    } catch (err) {
      console.error('Failed to save DMS configuration:', err);
      alert('Failed to save configuration');
    }
  };

  const activateDms = () => {
    if (!dmsConfig || !user) return;

    const updatedData = {
      ...dmsConfig,
      status: 'ACTIVE' as const,
    };

    saveDmsConfigToLocalStorage(updatedData);
    setDmsConfig(updatedData);

    const cycleData = {
      id: currentCycle?.id || `cycle-${updatedData.id}`,
      configId: updatedData.id,
      nextCheckinAt: addDays(new Date(), updatedData.frequencyDays),
      state: 'ACTIVE' as const,
      reminders: [1, 3, 7],
    };

    saveDmsCycleToLocalStorage(cycleData);
    setCurrentCycle(cycleData);
  };

  const pauseDms = async () => {
    if (!dmsConfig || !user) return;

    const updatedConfig = {
      ...dmsConfig,
      status: 'PAUSED' as const,
    };

    saveDmsConfigToLocalStorage(updatedConfig);
    setDmsConfig(updatedConfig);

    // Update cycle state to paused
    if (currentCycle) {
      const updatedCycle = {
        ...currentCycle,
        state: 'PAUSED' as const,
      };
      saveDmsCycleToLocalStorage(updatedCycle);
      setCurrentCycle(updatedCycle);
    }
  };

  const resumeDms = async () => {
    if (!dmsConfig || !user) return;

    const updatedConfig = {
      ...dmsConfig,
      status: 'ACTIVE' as const,
    };

    saveDmsConfigToLocalStorage(updatedConfig);
    setDmsConfig(updatedConfig);

    // Update cycle state to active
    if (currentCycle) {
      const updatedCycle = {
        ...currentCycle,
        state: 'ACTIVE' as const,
      };
      saveDmsCycleToLocalStorage(updatedCycle);
      setCurrentCycle(updatedCycle);
    }
  };

  const performCheckin = async () => {
    if (!dmsConfig || !currentCycle || !user) return;

    console.log('Performing check-in...', { dmsConfig, currentCycle, user });

    const now = new Date();
    const nextCheckin = addDays(now, dmsConfig.frequencyDays);

    // Check if DMS has expired
    if (dmsConfig.endDate && now > dmsConfig.endDate) {
      alert('DMS has expired. Please reconfigure to continue.');
      return;
    }

    const cycleData = {
      ...currentCycle,
      nextCheckinAt: nextCheckin,
      state: 'ACTIVE' as const,
      checkInReminderSent: false,
      lastReminderSent: undefined,
    };

    console.log('Saving cycle data:', cycleData);

    saveDmsCycleToLocalStorage(cycleData);
    setCurrentCycle(cycleData);
    setShowCheckIn(false);

    alert('Check-in successful! Your next check-in is due on ' + format(nextCheckin, 'PPP'));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'PAUSED':
        return <Badge className="bg-yellow-100 text-yellow-800">Paused</Badge>;
      case 'INACTIVE':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCycleStateBadge = (state: string) => {
    switch (state) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Active Monitoring</Badge>;
      case 'GRACE':
        return <Badge className="bg-yellow-100 text-yellow-800">Grace Period</Badge>;
      case 'PENDING_RELEASE':
        return <Badge className="bg-orange-100 text-orange-800">Pending Release</Badge>;
      case 'RELEASED':
        return <Badge className="bg-red-100 text-red-800">Messages Released</Badge>;
      case 'PAUSED':
        return <Badge className="bg-gray-100 text-gray-800">Paused</Badge>;
      default:
        return <Badge variant="outline">{state}</Badge>;
    }
  };

  const dmsMessages = messages.filter(m => m.scope === 'DMS');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center">
          <Shield className="h-6 w-6 mr-2 text-red-600" />
          Dead Man's Switch
        </h2>
        <p className="text-muted-foreground mt-2">
          Configure automatic message release when regular check-ins are missed
        </p>
      </div>

      {/* Status Overview */}
      {dmsConfig && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(dmsConfig.status)}</div>
                </div>
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Check-in</p>
                  <div className="mt-1">
                    {currentCycle && dmsConfig.status === 'ACTIVE' ? (
                      <CountdownTimer 
                        targetDate={currentCycle.nextCheckinAt} 
                        isPaused={dmsConfig?.status === 'PAUSED' || currentCycle.state === 'PAUSED'} 
                      />
                    ) : currentCycle ? (
                      <p className="text-muted-foreground">Paused</p>
                    ) : (
                      <p className="text-muted-foreground">Not scheduled</p>
                    )}
                  </div>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Protected Messages</p>
                  <div className="mt-1">
                    <p className="text-2xl font-bold">{dmsMessages.length}</p>
                    <p className="text-xs text-muted-foreground">Ready for release</p>
                  </div>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Check-in Section */}
      {dmsConfig?.status === 'ACTIVE' && currentCycle && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Heart className="h-5 w-5 mr-2" />
              Regular Check-in Required
            </CardTitle>
            <CardDescription className="text-green-700">
              You must check in every {dmsConfig.frequencyDays} days to prevent message release
              {dmsConfig.endDate && (
                <span className="block mt-1">
                  DMS expires on {format(dmsConfig.endDate, 'PPP')}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-green-800">Time Remaining:</p>
                    <CountdownTimer 
                      targetDate={currentCycle.nextCheckinAt} 
                      isPaused={dmsConfig.status === 'PAUSED' || currentCycle.state === 'PAUSED'} 
                    />
                  </div>
                  <p className="text-xs text-green-700">
                    Due: {format(currentCycle.nextCheckinAt, 'PPP p')}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowCheckIn(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Check In Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Check-in Confirmation Dialog */}
      {showCheckIn && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirm Check-in
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-700 mb-4">
              Are you safe and well? This will reset your check-in timer and prevent any scheduled message releases.
            </p>
            <div className="flex space-x-3">
              <Button onClick={performCheckin} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Yes, I'm Safe
              </Button>
              <Button variant="outline" onClick={() => setShowCheckIn(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Cycle Status */}
      {currentCycle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Timer className="h-5 w-5 mr-2" />
              Current Monitoring Cycle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Cycle State:</span>
                {getCycleStateBadge(currentCycle.state)}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Next Check-in Required:</span>
                <div className="text-right">
                  <CountdownTimer 
                    targetDate={currentCycle.nextCheckinAt} 
                    isPaused={dmsConfig?.status === 'PAUSED' || currentCycle.state === 'PAUSED'} 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(currentCycle.nextCheckinAt, 'PPP p')}
                  </p>
                </div>
              </div>
              {currentCycle.nextCheckinAt < new Date() && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center text-red-800">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="font-medium">Check-in Overdue!</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    Your check-in is overdue. Please check in immediately to prevent message release.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            DMS Configuration
          </CardTitle>
          <CardDescription>
            Set up your Dead Man's Switch monitoring parameters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Frequency Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="frequencyDays" className="text-sm">Check-in Frequency (Days)</Label>
                <Input
                  id="frequencyDays"
                  type="number"
                  min="1"
                  max="365"
                  className="h-8 text-sm"
                  {...register("frequencyDays", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  How often to check in
                </p>
                {errors.frequencyDays && (
                  <p className="text-xs text-destructive">{errors.frequencyDays.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="graceDays" className="text-sm">Grace Period (Days)</Label>
                <Input
                  id="graceDays"
                  type="number"
                  min="0"
                  max="30"
                  className="h-8 text-sm"
                  {...register("graceDays", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Extra time before release
                </p>
                {errors.graceDays && (
                  <p className="text-xs text-destructive">{errors.graceDays.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="durationDays" className="text-sm">DMS Duration (Days)</Label>
                <Input
                  id="durationDays"
                  type="number"
                  min="1"
                  max="365"
                  className="h-8 text-sm"
                  {...register("durationDays", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  How long DMS stays active
                </p>
                {errors.durationDays && (
                  <p className="text-xs text-destructive">{errors.durationDays.message}</p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="checkInReminderHours" className="text-sm">Reminder (Hours)</Label>
                <Input
                  id="checkInReminderHours"
                  type="number"
                  min="1"
                  max="168"
                  className="h-8 text-sm"
                  {...register("checkInReminderHours", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  Hours before check-in
                </p>
                {errors.checkInReminderHours && (
                  <p className="text-xs text-destructive">{errors.checkInReminderHours.message}</p>
                )}
              </div>
            </div>

            {/* Notification Channels */}
            <div className="space-y-2">
              <Label className="text-sm">Notification Channels</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={watchedChannels.email}
                    onCheckedChange={(checked) => setValue('channels.email', !!checked)}
                  />
                  <Mail className="h-3 w-3" />
                  <span className="text-sm">Email</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={watchedChannels.sms}
                    onCheckedChange={(checked) => setValue('channels.sms', !!checked)}
                  />
                  <Phone className="h-3 w-3" />
                  <span className="text-sm">SMS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={watchedChannels.push}
                    onCheckedChange={(checked) => setValue('channels.push', !!checked)}
                  />
                  <Bell className="h-3 w-3" />
                  <span className="text-sm">Push</span>
                </div>
              </div>
            </div>

            {/* Escalation Contact */}
            <div className="space-y-1">
              <Label htmlFor="escalationContactId" className="text-sm">Escalation Contact (Optional)</Label>
              <select
                {...register("escalationContactId")}
                className="w-full px-2 py-1 border border-input rounded text-sm h-8"
              >
                <option value="">Select a contact...</option>
                {recipients.map(recipient => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name} ({recipient.email})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Who to notify if you miss check-ins
              </p>
            </div>

            {/* Emergency Instructions */}
            <div className="space-y-1">
              <Label htmlFor="emergencyInstructions" className="text-sm">Emergency Instructions (Optional)</Label>
              <Textarea
                id="emergencyInstructions"
                placeholder="Add any special instructions for emergency contacts..."
                className="min-h-[60px] text-sm"
                {...register("emergencyInstructions")}
              />
              <p className="text-xs text-muted-foreground">
                Instructions included when messages are released
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Control Actions */}
      {dmsConfig && (
        <Card>
          <CardHeader>
            <CardTitle>DMS Controls</CardTitle>
            <CardDescription>
              Activate, pause, or manage your Dead Man's Switch
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex space-x-3">
              {dmsConfig.status === 'INACTIVE' && (
                <Button onClick={activateDms} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Activate DMS
                </Button>
              )}
              {dmsConfig.status === 'ACTIVE' && (
                <Button onClick={pauseDms} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause DMS
                </Button>
              )}
              {dmsConfig.status === 'PAUSED' && (
                <Button onClick={resumeDms} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-2" />
                  Resume DMS
                </Button>
              )}
            </div>
            
            {dmsConfig.status === 'INACTIVE' && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center text-yellow-800">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  <span className="font-medium">DMS Not Active</span>
                </div>
                <p className="text-yellow-700 text-sm mt-1">
                  Your messages will not be automatically released. Activate DMS to begin monitoring.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Protected Messages */}
      {dmsMessages.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Protected Messages ({dmsMessages.length})
              </CardTitle>
              {dmsConfig?.status === 'ACTIVE' && currentCycle && (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Next Check-in:</p>
                    <CountdownTimer targetDate={currentCycle.nextCheckinAt} />
                  </div>
                  <Button 
                    onClick={() => setShowCheckIn(true)}
                    className="bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Check In
                  </Button>
                </div>
              )}
            </div>
            <CardDescription>
              Messages that will be released if check-ins are missed
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dmsConfig?.status === 'ACTIVE' && currentCycle && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center text-blue-800 mb-1">
                      <Timer className="h-4 w-4 mr-2" />
                      <span className="font-medium text-sm">Active Monitoring</span>
                    </div>
                    <p className="text-blue-700 text-xs">
                      These {dmsMessages.length} message{dmsMessages.length !== 1 ? 's' : ''} will be automatically sent if you miss your check-in deadline.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-blue-700 mb-1">Time remaining:</p>
                    <CountdownTimer targetDate={currentCycle.nextCheckinAt} />
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              {dmsMessages.slice(0, 5).map(message => {
                const messageTypes = Array.isArray(message.types) ? message.types : [message.types || 'EMAIL'];
                const primaryType = messageTypes[0];
                const MessageIcon = getMessageIcon(primaryType);
                
                return (
                  <div key={message.id} className="p-4 border rounded-lg hover:bg-white/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <MessageIcon className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{message.title}</h4>
                          <div className="flex space-x-1">
                            {messageTypes.map((type, index) => {
                              const TypeIcon = getMessageIcon(type);
                              return (
                                <div key={index} className="p-1 bg-gray-100 rounded">
                                  <TypeIcon className="w-3 h-3 text-gray-600" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {message.content}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>To: {getRecipientNames(message.recipientIds, recipients)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Created {format(message.createdAt, 'MMM d, yyyy')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-xs text-orange-700 font-medium">Time until auto-release:</p>
                        {currentCycle && dmsConfig?.status === 'ACTIVE' ? (
                          <CountdownTimer 
                            targetDate={addDays(currentCycle.nextCheckinAt, dmsConfig.graceDays)} 
                            isPaused={dmsConfig?.status === 'PAUSED' || currentCycle.state === 'PAUSED'} 
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">DMS not active</p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => setEditingMessage(message)}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {dmsConfig?.status === 'ACTIVE' && currentCycle && (
                          <Button 
                            onClick={performCheckin}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Prevent Release
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {dmsMessages.length > 5 && (
                <div className="text-center py-2">
                  <p className="text-sm text-muted-foreground">
                    And {dmsMessages.length - 5} more protected message{dmsMessages.length - 5 !== 1 ? 's' : ''}...
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Enhanced DMS Message Countdowns */}
      {dmsConfig?.status === 'ACTIVE' && currentCycle && dmsMessages.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center text-orange-800">
                <Bell className="h-5 w-5 mr-2" />
                DMS Messages - Countdown to Release
              </CardTitle>
              <Button 
                onClick={() => setShowCheckIn(true)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Global Check-in
              </Button>
            </div>
            <CardDescription className="text-orange-700">
              All DMS messages will be released together if check-in deadline is missed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-white border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-orange-800">Global Countdown:</p>
                  <p className="text-xs text-orange-700">Time until all messages are released</p>
                </div>
                <div className="text-right">
                  <CountdownTimer 
                    targetDate={addDays(currentCycle.nextCheckinAt, dmsConfig.graceDays)} 
                    isPaused={dmsConfig.status === 'PAUSED' || currentCycle.state === 'PAUSED'} 
                  />
                </div>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              {dmsMessages.map(message => {
                const messageTypes = Array.isArray(message.types) ? message.types : [message.types || 'EMAIL'];
                const MessageIcon = getMessageIcon(messageTypes[0]);
                
                return (
                  <div key={message.id} className="p-4 bg-white border border-orange-200 rounded-lg hover:shadow-sm transition-shadow">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="relative">
                        <div className="p-2 bg-red-100 rounded-lg">
                          <MessageIcon className="w-5 h-5 text-red-600" />
                        </div>
                        {messageTypes.length > 1 && (
                          <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                            {messageTypes.length}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{message.title}</h4>
                          <div className="flex space-x-1">
                            {messageTypes.map((type, index) => {
                              const TypeIcon = getMessageIcon(type);
                              return (
                                <div key={index} className="p-1 bg-gray-100 rounded" title={type}>
                                  <TypeIcon className="w-3 h-3 text-gray-600" />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                          {message.content}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{message.recipientIds.length} recipient{message.recipientIds.length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(message.createdAt, 'MMM d')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-red-100 text-red-800">
                          <Shield className="h-3 w-3 mr-1" />
                          DMS Protected
                        </Badge>
                        {dmsConfig?.status === 'ACTIVE' && currentCycle && (
                          <Button 
                            onClick={() => setShowCheckIn(true)}
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Check In
                          </Button>
                        )}
                      </div>
                    
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <p className="text-xs text-orange-700 mb-1">Auto-release in:</p>
                            <CountdownTimer 
                              targetDate={addDays(currentCycle.nextCheckinAt, dmsConfig.graceDays)} 
                              isPaused={dmsConfig?.status === 'PAUSED' || currentCycle.state === 'PAUSED'} 
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-center space-x-2">
                          <Button 
                            onClick={() => setEditingMessage(message)}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            View/Edit
                          </Button>
                          <Button 
                            onClick={performCheckin}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Prevent Release
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Message Dialog */}
      {editingMessage && (
        <EditMessageDialog
          message={editingMessage}
          open={!!editingMessage}
          onOpenChange={() => setEditingMessage(null)}
          onSave={(updatedMessage) => {
            updateMessage(editingMessage.id, updatedMessage);
            setEditingMessage(null);
          }}
        />
      )}
    </div>
  );
}